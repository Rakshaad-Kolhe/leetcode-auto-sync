const READY_RESPONSE = Object.freeze({ status: "ready" });

function handleInstalled() {
  console.info("LeetCode Auto Sync background service worker started");
}

function handleMessage(_message, _sender, sendResponse) {
  sendResponse(READY_RESPONSE);
  return false;
}

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleInstalled);
chrome.runtime.onMessage.addListener(handleMessage);
