/**
 * @fileoverview Popup interaction script.
 * Displays extension status and active page context by querying the background worker.
 */

document.addEventListener("DOMContentLoaded", () => {
  const { Logger, MessageTypes } = globalThis.LeetCodeAutoSync;

  Logger.info("Popup opened");

  // DOM element selections
  const versionElement = document.getElementById("version");
  const pageTypeBadge = document.getElementById("page-type");
  const slugContainer = document.getElementById("slug-container");
  const problemSlugText = document.getElementById("problem-slug");
  const currentUrlText = document.getElementById("current-url");
  
  // Submission DOM element selections
  const submissionStateBadge = document.getElementById("submission-state");
  const verdictContainer = document.getElementById("verdict-container");
  const submissionVerdictBadge = document.getElementById("submission-verdict");

  // Metadata DOM element selections
  const metadataCard = document.getElementById("metadata-card");
  const problemTitleText = document.getElementById("problem-title-display");
  const problemIdText = document.getElementById("problem-id-display");
  const problemDifficultyBadge = document.getElementById("problem-difficulty-display");
  const problemLanguageText = document.getElementById("problem-language-display");
  const solutionSizeText = document.getElementById("solution-size-display");
  const extractionStatusBadge = document.getElementById("extraction-status-display");
  const problemUrlLink = document.getElementById("problem-url-display");

  // Settings DOM element selections
  const backendUrlInput = document.getElementById("backend-url-input");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

  // Manual action DOM element selections
  const checkBackendBtn = document.getElementById("check-backend-btn");
  const retrySyncBtn = document.getElementById("retry-sync-btn");

  // Diagnostics DOM element selections
  const diagExtVersionText = document.getElementById("diag-ext-version");
  const diagBackVersionText = document.getElementById("diag-back-version");
  const diagBackUrlText = document.getElementById("diag-back-url");
  const diagBrowserVersionText = document.getElementById("diag-browser-version");
  const copyDiagBtn = document.getElementById("copy-diag-btn");

  // Popup state caching for diagnostics report
  const diagState = {
    extVersion: "1.0.0",
    backVersion: "--",
    backUrl: "http://127.0.0.1:8000",
    browserClient: navigator.userAgent,
    connected: false,
    latestSync: null,
    pageContext: null,
    submissionState: null
  };

  // Fetch extension manifest version
  try {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `Version ${manifest.version}`;
    diagState.extVersion = manifest.version;
  } catch (err) {
    Logger.error("Failed to read extension version:", err);
    versionElement.textContent = "Version unknown";
  }

  /**
   * Refreshes the textual details inside the diagnostics panel.
   */
  function refreshDiagnostics() {
    diagExtVersionText.textContent = `v${diagState.extVersion}`;
    diagBackVersionText.textContent = diagState.backVersion;
    diagBackUrlText.textContent = diagState.backUrl;
    diagBackUrlText.title = diagState.backUrl;
    diagBrowserVersionText.textContent = diagState.browserClient;
    diagBrowserVersionText.title = diagState.browserClient;
  }

  /**
   * Loads the configured backend URL from settings storage.
   */
  function loadSettings() {
    chrome.storage.local.get({ backendUrl: "http://127.0.0.1:8000" }, (items) => {
      const url = items.backendUrl || "http://127.0.0.1:8000";
      backendUrlInput.value = url;
      diagState.backUrl = url;
      refreshDiagnostics();
    });
  }

  /**
   * Updates the popup UI components based on context data.
   * @param {Object|null} context - Context object containing pageType, slug, and url.
   */
  function updateUI(context) {
    diagState.pageContext = context;

    if (!context) {
      pageTypeBadge.textContent = "UNKNOWN";
      pageTypeBadge.className = "badge badge-unknown";
      slugContainer.classList.add("hidden");
      currentUrlText.textContent = "Not on LeetCode";
      currentUrlText.title = "Not on LeetCode";
      return;
    }

    const { pageType, slug, url } = context;

    // Update the Page Type Badge
    pageTypeBadge.textContent = pageType;
    pageTypeBadge.className = `badge badge-${pageType.toLowerCase()}`;

    // Update problem slug display
    if (slug) {
      problemSlugText.textContent = slug;
      problemSlugText.title = slug;
      slugContainer.classList.remove("hidden");
    } else {
      slugContainer.classList.add("hidden");
    }

    // Update URL text field
    currentUrlText.textContent = url;
    currentUrlText.title = url;

    refreshDiagnostics();
  }

  /**
   * Updates the submission status cards and badges.
   * @param {Object} subState - Object containing status and verdict.
   */
  function updateSubmissionUI(subState) {
    diagState.submissionState = subState;

    if (!subState) {
      submissionStateBadge.textContent = "IDLE";
      submissionStateBadge.className = "badge state-idle";
      verdictContainer.classList.add("hidden");
      return;
    }

    const { status, verdict } = subState;

    // Render State Badge
    submissionStateBadge.textContent = status;
    submissionStateBadge.className = `badge state-${status.toLowerCase()}`;

    // Render Verdict Badge if finished
    if (status === "FINISHED" && verdict) {
      submissionVerdictBadge.textContent = verdict;
      const cleanVerdictClass = verdict.toLowerCase().replace(/\s+/g, "-");
      submissionVerdictBadge.className = `badge verdict-${cleanVerdictClass}`;
      verdictContainer.classList.remove("hidden");
    } else if (status === "RUNNING") {
      submissionVerdictBadge.textContent = "Judging...";
      submissionVerdictBadge.className = "badge verdict-judging";
      verdictContainer.classList.remove("hidden");
    } else {
      verdictContainer.classList.add("hidden");
    }

    refreshDiagnostics();
  }

  /**
   * Updates the problem details card with extracted metadata and solution size.
   * @param {Object|null} submission - Extracted AcceptedSubmission model.
   */
  function updateMetadataUI(submission) {
    if (!submission || !submission.metadata) {
      metadataCard.classList.add("hidden");
      return;
    }

    const { metadata, code } = submission;
    const { id, title, difficulty, language, url } = metadata;

    problemTitleText.textContent = title;
    problemTitleText.title = title;

    problemIdText.textContent = `#${id}`;

    problemDifficultyBadge.textContent = difficulty;
    problemDifficultyBadge.className = `badge badge-${difficulty.toLowerCase()}`;

    problemLanguageText.textContent = language;

    // Display solution length and success status
    solutionSizeText.textContent = code ? `${code.length} characters` : "0 characters";
    extractionStatusBadge.textContent = "Success";
    extractionStatusBadge.className = "badge badge-easy"; // reusing green Easy badge for Success

    problemUrlLink.href = url;
    problemUrlLink.textContent = url;
    problemUrlLink.title = url;

    metadataCard.classList.remove("hidden");
  }

  /**
   * Updates the synchronization panel with backend connection and sync result details.
   * @param {boolean} connected - Is connection alive.
   * @param {Object} latestSync - Cached synchronization outcome metrics.
   * @param {string|null} backendVersion - Detected backend version value.
   */
  function updateSyncUI(connected, latestSync, backendVersion) {
    // 1. Connection status rendering
    if (connected) {
      backendConnBadge.textContent = "Connected";
      backendConnBadge.className = "badge badge-easy";
      diagState.connected = true;
    } else {
      backendConnBadge.textContent = "Disconnected";
      backendConnBadge.className = "badge badge-hard";
      diagState.connected = false;
    }

    diagState.backVersion = backendVersion || "--";
    diagState.latestSync = latestSync;

    // 2. Sync result rendering
    if (!latestSync || latestSync.success === null) {
      latestSyncBadge.textContent = "None";
      latestSyncBadge.className = "badge badge-unknown";
      syncTimeContainer.classList.add("hidden");
      syncErrorContainer.classList.add("hidden");
      refreshDiagnostics();
      return;
    }

    const { success, timestamp, error } = latestSync;

    if (success === "SYNCING") {
      latestSyncBadge.textContent = "Syncing...";
      latestSyncBadge.className = "badge badge-contest"; // Reuses blue contest badge styling
      syncTimeContainer.classList.add("hidden");
      syncErrorContainer.classList.add("hidden");
    } else if (success === true) {
      latestSyncBadge.textContent = "Success";
      latestSyncBadge.className = "badge badge-easy"; // Green success

      if (timestamp) {
        const time = new Date(timestamp).toLocaleTimeString();
        latestSyncTimeText.textContent = time;
        syncTimeContainer.classList.remove("hidden");
      } else {
        syncTimeContainer.classList.add("hidden");
      }
      syncErrorContainer.classList.add("hidden");
    } else if (success === false) {
      latestSyncBadge.textContent = "Failed";
      latestSyncBadge.className = "badge badge-hard"; // Red failure

      if (timestamp) {
        const time = new Date(timestamp).toLocaleTimeString();
        latestSyncTimeText.textContent = time;
        syncTimeContainer.classList.remove("hidden");
      } else {
        syncTimeContainer.classList.add("hidden");
      }

      if (error) {
        latestSyncErrorText.textContent = error;
        syncErrorContainer.classList.remove("hidden");
      } else {
        syncErrorContainer.classList.add("hidden");
      }
    }

    refreshDiagnostics();
  }

  /**
   * Dispatches a backend health poll and triggers sync updates.
   */
  function triggerBackendCheck() {
    backendConnBadge.textContent = "Checking...";
    backendConnBadge.className = "badge badge-unknown";

    chrome.runtime.sendMessage({ type: MessageTypes.GET_SYNC_STATUS }, (response) => {
      if (chrome.runtime.lastError) {
        Logger.warn("Check failed:", chrome.runtime.lastError.message);
        updateSyncUI(false, null, null);
        return;
      }

      if (response && response.status === "success") {
        updateSyncUI(response.connected, response.latestSync, response.backendVersion);
      } else {
        updateSyncUI(false, null, null);
      }
    });
  }

  // Trigger manual settings save
  saveSettingsBtn.addEventListener("click", () => {
    const url = backendUrlInput.value.trim();
    if (!url) {
      alert("Backend URL cannot be empty");
      return;
    }

    chrome.storage.local.set({ backendUrl: url }, () => {
      diagState.backUrl = url;
      
      const originalText = saveSettingsBtn.textContent;
      saveSettingsBtn.textContent = "Saved!";
      saveSettingsBtn.className = "badge badge-easy";
      
      setTimeout(() => {
        saveSettingsBtn.textContent = originalText;
        saveSettingsBtn.className = "badge badge-contest";
      }, 1500);

      triggerBackendCheck();
    });
  });

  // Bind manual check button
  checkBackendBtn.addEventListener("click", () => {
    triggerBackendCheck();
  });

  // Bind manual retry button
  retrySyncBtn.addEventListener("click", () => {
    const originalText = retrySyncBtn.textContent;
    retrySyncBtn.textContent = "Retrying...";
    retrySyncBtn.className = "badge badge-contest";
    retrySyncBtn.disabled = true;

    chrome.runtime.sendMessage({ type: "RETRY_LAST_SYNC" }, (response) => {
      retrySyncBtn.disabled = false;
      retrySyncBtn.textContent = originalText;
      retrySyncBtn.className = "badge badge-unknown";

      if (chrome.runtime.lastError) {
        Logger.error("Failed to message background retry dispatcher:", chrome.runtime.lastError.message);
        return;
      }

      if (response && response.status === "success") {
        Logger.info("Manual synchronization retry started successfully");
      } else {
        const error = response && response.error ? response.error : "No cached accepted submission available to retry";
        alert(error);
      }
    });
  });

  // Bind Copy Diagnostics button
  copyDiagBtn.addEventListener("click", () => {
    const report = `LeetCode Auto Sync Diagnostics Report
Generated: ${new Date().toISOString()}

--- Extension Info ---
Extension Version: v${diagState.extVersion}
Current Page Type: ${diagState.pageContext ? diagState.pageContext.pageType : "UNKNOWN"}
Current Page Slug: ${diagState.pageContext && diagState.pageContext.slug ? diagState.pageContext.slug : "None"}
Current Submission State: ${diagState.submissionState ? diagState.submissionState.status : "IDLE"}
Current Submission Verdict: ${diagState.submissionState && diagState.submissionState.verdict ? diagState.submissionState.verdict : "None"}

--- Backend Info ---
Backend Connection: ${diagState.connected ? "Connected" : "Disconnected"}
Backend URL: ${diagState.backUrl}
Backend Version: ${diagState.backVersion}

--- Client Info ---
Browser UserAgent: ${diagState.browserClient}

--- Synchronization Info ---
Latest Sync Success: ${diagState.latestSync ? diagState.latestSync.success : "None"}
Latest Sync Time: ${diagState.latestSync && diagState.latestSync.timestamp ? new Date(diagState.latestSync.timestamp).toLocaleTimeString() : "None"}
Latest Sync Error: ${diagState.latestSync && diagState.latestSync.error ? diagState.latestSync.error : "None"}
`;

    navigator.clipboard.writeText(report).then(() => {
      const originalText = copyDiagBtn.textContent;
      copyDiagBtn.textContent = "Copied!";
      copyDiagBtn.className = "badge badge-easy";
      setTimeout(() => {
        copyDiagBtn.textContent = originalText;
        copyDiagBtn.className = "badge badge-contest";
      }, 1500);
    }).catch((err) => {
      Logger.error("Failed to copy diagnostics report:", err);
    });
  });

  // Request the active page context from background cache
  chrome.runtime.sendMessage({ type: MessageTypes.GET_CURRENT_CONTEXT }, (response) => {
    if (chrome.runtime.lastError) {
      Logger.warn("Failed to retrieve context from background worker:", chrome.runtime.lastError.message);
      updateUI(null);
      return;
    }

    if (response && response.status === "success") {
      updateUI(response.context);
    } else {
      updateUI(null);
    }
  });

  // Request the active submission state from background cache
  chrome.runtime.sendMessage({ type: MessageTypes.GET_SUBMISSION_STATE }, (response) => {
    if (chrome.runtime.lastError) {
      Logger.warn("Failed to retrieve submission state from background worker:", chrome.runtime.lastError.message);
      updateSubmissionUI(null);
      return;
    }

    if (response && response.status === "success") {
      updateSubmissionUI(response.submissionState);
    } else {
      updateSubmissionUI(null);
    }
  });

  // Request the cached accepted problem details from background cache
  chrome.runtime.sendMessage({ type: MessageTypes.GET_ACCEPTED_SUBMISSION }, (response) => {
    if (chrome.runtime.lastError) {
      Logger.warn("Failed to retrieve accepted submission details from background worker:", chrome.runtime.lastError.message);
      updateMetadataUI(null);
      return;
    }

    if (response && response.status === "success") {
      updateMetadataUI(response.metadata);
    } else {
      updateMetadataUI(null);
    }
  });

  // Load configured settings and perform health check
  loadSettings();
  triggerBackendCheck();

  // Listen for live updates (e.g. while the popup is open)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MessageTypes.SUBMISSION_STARTED) {
      Logger.info("Popup: Received SUBMISSION_STARTED event");
      updateSubmissionUI({ status: "RUNNING", verdict: null });
      // When starting a new submission, clear the old metadata and sync display
      updateMetadataUI(null);
      updateSyncUI(false, null, null);
      // Query sync status to update backend connection badge concurrently
      chrome.runtime.sendMessage({ type: MessageTypes.GET_SYNC_STATUS }, (response) => {
        if (response && response.status === "success") {
          updateSyncUI(response.connected, null, response.backendVersion);
        }
      });
    } else if (message.type === MessageTypes.SUBMISSION_FINISHED) {
      Logger.info("Popup: Received SUBMISSION_FINISHED event with verdict", message.verdict);
      updateSubmissionUI({ status: "FINISHED", verdict: message.verdict });
    } else if (message.type === MessageTypes.SUBMISSION_ACCEPTED) {
      Logger.info("Popup: Received SUBMISSION_ACCEPTED event with metadata", message.payload);
      updateMetadataUI(message.payload);
    } else if (message.type === MessageTypes.SYNC_STATUS_CHANGED) {
      Logger.info("Popup: Received SYNC_STATUS_CHANGED event", message.payload);
      // Refresh connect status alongside the sync updates
      chrome.runtime.sendMessage({ type: MessageTypes.GET_SYNC_STATUS }, (response) => {
        if (response && response.status === "success") {
          updateSyncUI(response.connected, response.latestSync, response.backendVersion);
        } else {
          updateSyncUI(message.payload.success === true, message.payload, null);
        }
      });
    } else if (message.type === MessageTypes.PAGE_CHANGED) {
      // If navigation occurs, reset popup views
      updateSubmissionUI({ status: "IDLE", verdict: null });
      updateMetadataUI(null);
      updateSyncUI(false, null, null);
      chrome.runtime.sendMessage({ type: MessageTypes.GET_SYNC_STATUS }, (response) => {
        if (response && response.status === "success") {
          updateSyncUI(response.connected, response.latestSync, response.backendVersion);
        }
      });
    }
  });
});
