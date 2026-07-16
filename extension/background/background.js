/**
 * @fileoverview Background service worker for LeetCode Auto Sync.
 * Manages cache of current page context and responds to popup queries.
 */

// Load shared constants and logger utilities
importScripts("../shared/constants.js", "../shared/logger.js");

const { Logger, MessageTypes } = globalThis.LeetCodeAutoSync;

Logger.info("Background worker script loaded");

// Keep in-memory cache of the current page context
let activePageContext = null;

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
    activePageContext = message.payload;
    Logger.info("Context updated from Content Script:", activePageContext);
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

  sendResponse({ status: "unknown_message" });
  return false;
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
