// Load shared constants, logger utilities, models, and backend service
importScripts(
  "../shared/constants.js",
  "../shared/logger.js",
  "../models/metadata_snapshot.js",
  "../models/submission_model.js",
  "../models/accepted_submission.js",
  "../services/backend_service.js"
);

const { Logger, MessageTypes, PageTypes } = globalThis.LeetCodeAutoSync;

Logger.info("Background worker script loaded");

// Keep in-memory cache of the current page context, submission state, and latest accepted details
let activePageContext = null;
let activeSubmissionState = {
  status: "IDLE",
  verdict: null
};
let latestAcceptedSubmission = null;

// Cache for the latest synchronization result
let latestSyncResult = {
  success: null, // null (none), "SYNCING", true (success), false (failed)
  timestamp: null,
  durationMs: null,
  error: null
};
let isSyncing = false;
let activeSyncKey = null;

// Load persisted sync state on worker startup if available
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["latestSyncResult", "latestAcceptedSubmission"], (items) => {
    if (items.latestSyncResult) {
      latestSyncResult = items.latestSyncResult;
      Logger.info("Background: Restored persisted latestSyncResult:", latestSyncResult);
    }
    if (items.latestAcceptedSubmission) {
      latestAcceptedSubmission = items.latestAcceptedSubmission;
      Logger.info("Background: Restored persisted latestAcceptedSubmission:", latestAcceptedSubmission);
    }
  });
}

/**
 * Persists current sync state to chrome.storage.local.
 */
function persistState() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      latestSyncResult,
      latestAcceptedSubmission
    }, () => {
      if (chrome.runtime.lastError) {
        Logger.warn("Background: Failed to persist state to storage:", chrome.runtime.lastError.message);
      }
    });
  }
}

/**
 * Handles extension installation or startup events.
 */
function handleInstalled() {
  Logger.info("LeetCode Auto Sync extension started/updated");
}

/**
 * Sends a message to the popup if it is currently open.
 * @param {Object} msg - The message to relay.
 */
function notifyPopup(msg) {
  chrome.runtime.sendMessage(msg, () => {
    // Access lastError to silence Chrome warnings when the popup is closed
    const err = chrome.runtime.lastError;
  });
}

/**
 * Asynchronously dispatches the accepted solution to the local backend.
 * @param {Object} submissionPayload - Raw data payload.
 */
async function performSync(submissionPayload) {
  Logger.info("Background: performSync() invoked with payload:", submissionPayload);
  const payloadId = submissionPayload && submissionPayload.metadata ? submissionPayload.metadata.id : "0";
  const payloadCode = submissionPayload ? submissionPayload.code || "" : "";
  const currentKey = `${payloadId}_${payloadCode.length}_${submissionPayload.traceId || ""}`;

  if (isSyncing && activeSyncKey === currentKey) {
    Logger.warn(`Background: Sync already in progress for payload key '${currentKey}', skipping duplicate request`);
    return;
  }

  isSyncing = true;
  activeSyncKey = currentKey;
  const startTime = performance.now();

  Logger.info("Background: Synchronization started");

  // Notify popup that synchronization is starting
  latestSyncResult = {
    success: "SYNCING",
    timestamp: new Date().toISOString(),
    durationMs: null,
    error: null
  };
  persistState();
  Logger.info("Background: Notifying popup of SYNCING status");
  notifyPopup({
    type: MessageTypes.SYNC_STATUS_CHANGED,
    payload: latestSyncResult
  });

  try {
    Logger.info("[PIPELINE] performSync invoked with submission payload");
    const { MetadataSnapshot, SubmissionModel, AcceptedSubmission, BackendService } = globalThis.LeetCodeAutoSync;

    Logger.info("Background: Reconstructing SubmissionModel and AcceptedSubmission...");
    // 1. Reconstruct classes to perform deep validation
    const metadataModel = new SubmissionModel(submissionPayload.metadata);
    if (!metadataModel.validate()) {
      throw new Error(`Background: Payload metadata model validation failed for slug '${metadataModel.slug}'`);
    }

    const submission = new AcceptedSubmission({
      metadata: metadataModel,
      code: submissionPayload.code,
      sourceHash: submissionPayload.sourceHash,
      extractedAt: submissionPayload.extractedAt,
      traceId: submissionPayload.traceId
    });

    Logger.info("Background: Reconstructed and validated Submission object:", submission);

    // 2. Dispatch payload via BackendService client
    Logger.info("[PIPELINE] Submitting payload to backend POST /submit...");
    const response = await BackendService.submitSubmission(submission);
    const durationMs = Math.round(performance.now() - startTime);
    Logger.info(`[PIPELINE] Backend response received in ${durationMs}ms:`, response);

    latestSyncResult = {
      success: response.success,
      timestamp: new Date().toISOString(),
      durationMs: durationMs,
      error: response.error
    };
    persistState();

    if (response.success) {
      Logger.info(`[PIPELINE] Synchronization completed successfully in ${durationMs}ms!`);
    } else {
      Logger.error(`[PIPELINE] Synchronization failed after ${durationMs}ms: ${response.error}`);
    }

    // Broadcast synchronization completion to popup
    Logger.info("Background: Notifying popup of sync complete status:", latestSyncResult);
    notifyPopup({
      type: MessageTypes.SYNC_STATUS_CHANGED,
      payload: latestSyncResult
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    latestSyncResult = {
      success: false,
      timestamp: new Date().toISOString(),
      durationMs: durationMs,
      error: err.message || "Sync processing error"
    };
    persistState();
    Logger.error(`[PIPELINE] Synchronization failed with exception after ${durationMs}ms: ${latestSyncResult.error}`, err.message, err.stack);

    notifyPopup({
      type: MessageTypes.SYNC_STATUS_CHANGED,
      payload: latestSyncResult
    });
  } finally {
    isSyncing = false;
    activeSyncKey = null;
  }
}

/**
 * Listens for messages from popup or content script.
 * @param {Object} message - Received message.
 * @param {chrome.runtime.MessageSender} sender - Sender object.
 * @param {function(Object): void} sendResponse - Callback function.
 * @returns {boolean} True to indicate asynchronous response.
 */
function handleMessage(message, sender, sendResponse) {
  if (!message) {
    sendResponse({ status: "error", error: "Empty message" });
    return false;
  }

  // Handle PAGE_CHANGED message from Content Script
  if (message.type === MessageTypes.PAGE_CHANGED) {
    const prevSlug = activePageContext ? activePageContext.slug : null;
    const newSlug = message.payload ? message.payload.slug : null;
    const newPageType = message.payload ? message.payload.pageType : null;

    if (prevSlug !== null) {
      const isDifferentProblem = (newSlug !== null && newSlug !== prevSlug);
      const isLeavingToMainSection = (newSlug === null && newPageType !== PageTypes.UNKNOWN);
      
      if (isDifferentProblem || isLeavingToMainSection) {
        activeSubmissionState = { status: "IDLE", verdict: null };
        Logger.info(`Reset active submission state due to leaving problem context (Slug: ${prevSlug} -> ${newSlug})`);
      } else {
        Logger.info("Background: Navigation within same logical problem session. Preserving active problem context.");
      }
    } else if (newSlug !== null) {
      activeSubmissionState = { status: "IDLE", verdict: null };
    }
    
    activePageContext = message.payload;
    Logger.info("Context updated from Content Script:", activePageContext);
    sendResponse({ status: "received" });
    return false;
  }

  // Handle SUBMISSION_STARTED message
  if (message.type === MessageTypes.SUBMISSION_STARTED) {
    activeSubmissionState = { status: "RUNNING", verdict: null };
    Logger.info("[PIPELINE] Submission detector fired: SUBMISSION_STARTED");
    sendResponse({ status: "received" });
    return false;
  }

  // Handle SUBMISSION_FINISHED message
  if (message.type === MessageTypes.SUBMISSION_FINISHED) {
    activeSubmissionState = { status: "FINISHED", verdict: message.verdict };
    Logger.info("[PIPELINE] Submission detector finished with verdict:", message.verdict);
    sendResponse({ status: "received" });
    return false;
  }

  // Handle SUBMISSION_ACCEPTED message containing complete submission details
  if (message.type === MessageTypes.SUBMISSION_ACCEPTED) {
    Logger.info("[PIPELINE] Stored in background cache. Payload received:", message.payload);
    latestAcceptedSubmission = message.payload;
    Logger.info("Background: Cached accepted submission details successfully:", latestAcceptedSubmission);
    
    // Trigger backend synchronization flow asynchronously
    Logger.info("Background: Triggering performSync()...");
    performSync(latestAcceptedSubmission);

    sendResponse({ status: "received" });
    return false;
  }

  // Handle RETRY_LAST_SYNC message from Popup
  if (message.type === "RETRY_LAST_SYNC") {
    if (latestAcceptedSubmission) {
      Logger.info("Background: Retrying synchronization for last accepted submission");
      performSync(latestAcceptedSubmission);
      sendResponse({ status: "success", started: true });
    } else {
      Logger.warn("Background: Retry requested but no accepted submission cached");
      sendResponse({ status: "error", error: "No cached submission available to retry" });
    }
    return false;
  }

  // Handle GET_CURRENT_CONTEXT message from Popup
  if (message.type === MessageTypes.GET_CURRENT_CONTEXT) {
    Logger.info("Popup requested page context. Sending:", activePageContext);
    sendResponse({
      status: "success",
      context: activePageContext
    });
    return false;
  }

  // Handle GET_SUBMISSION_STATE message from Popup
  if (message.type === MessageTypes.GET_SUBMISSION_STATE) {
    Logger.info("Popup requested submission state. Sending:", activeSubmissionState);
    sendResponse({
      status: "success",
      submissionState: activeSubmissionState
    });
    return false;
  }

  // Handle GET_ACCEPTED_SUBMISSION message from Popup
  if (message.type === MessageTypes.GET_ACCEPTED_SUBMISSION) {
    Logger.info("Popup requested accepted submission details. Sending:", latestAcceptedSubmission);
    sendResponse({
      status: "success",
      metadata: latestAcceptedSubmission
    });
    return false;
  }

  // Handle GET_SYNC_STATUS message from Popup
  if (message.type === MessageTypes.GET_SYNC_STATUS) {
    globalThis.LeetCodeAutoSync.BackendService.checkBackend()
      .then((health) => {
        sendResponse({
          status: "success",
          connected: health.success,
          backendVersion: health.success && health.data ? health.data.version : null,
          latestSync: latestSyncResult
        });
      })
      .catch((err) => {
        sendResponse({
          status: "success",
          connected: false,
          backendVersion: null,
          latestSync: latestSyncResult
        });
      });
    return true; // Keep channel open for async response
  }

  sendResponse({ status: "unknown_message" });
  return false;
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
