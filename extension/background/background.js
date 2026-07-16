/**
 * @fileoverview Background service worker for LeetCode Auto Sync.
 * Manages cache of current page context and responds to popup queries.
 */

// Load shared constants and logger utilities
importScripts("../shared/constants.js", "../shared/logger.js");

const { Logger, MessageTypes } = globalThis.LeetCodeAutoSync;

Logger.info("Background worker script loaded");

// Keep in-memory cache of the current page context and submission state
let activePageContext = null;
let activeSubmissionState = {
  status: "IDLE",
  verdict: null
};

/**
 * Handles extension installation or startup events.
 */
function handleInstalled() {
  Logger.info("LeetCode Auto Sync extension started/updated");
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
    // If navigating to a different page, reset active submission state cache
    if (!activePageContext || activePageContext.url !== message.payload.url) {
      activeSubmissionState = { status: "IDLE", verdict: null };
      Logger.info("Reset active submission state due to page navigation");
    }
    activePageContext = message.payload;
    Logger.info("Context updated from Content Script:", activePageContext);
    sendResponse({ status: "received" });
    return false;
  }

  // Handle SUBMISSION_STARTED message
  if (message.type === MessageTypes.SUBMISSION_STARTED) {
    activeSubmissionState = { status: "RUNNING", verdict: null };
    Logger.info("Background: Submission started cached");
    sendResponse({ status: "received" });
    return false;
  }

  // Handle SUBMISSION_FINISHED message
  if (message.type === MessageTypes.SUBMISSION_FINISHED) {
    activeSubmissionState = { status: "FINISHED", verdict: message.verdict };
    Logger.info("Background: Submission finished cached with verdict", message.verdict);
    sendResponse({ status: "received" });
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

  sendResponse({ status: "unknown_message" });
  return false;
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
