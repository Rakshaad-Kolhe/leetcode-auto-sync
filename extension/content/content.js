/**
 * @fileoverview Main content script for LeetCode Auto Sync.
 * Initializes the page context detection and sends updates to the background worker.
 */

(() => {
  const { Logger, PageContext, Observer, MessageTypes } = window.LeetCodeAutoSync;

  Logger.info("Content script loaded");

  /**
   * Handles page changes: determines context, logs it, and messages background.
   * @param {string} url - The current URL.
   */
  function handlePageChange(url) {
    const pageType = PageContext.getPageType(url);
    const slug = PageContext.getProblemSlug(url);

    const context = {
      pageType,
      slug,
      url
    };

    // Log the page context object as per requirements
    Logger.log("Page context determined:", context);

    // Send page context to background worker
    chrome.runtime.sendMessage({
      type: MessageTypes.PAGE_CHANGED,
      payload: context
    }, (response) => {
      if (chrome.runtime.lastError) {
        Logger.warn("Failed to communicate with background service worker:", chrome.runtime.lastError.message);
      } else {
        Logger.info("Background status response:", response);
      }
    });
  }

  // Register callback for SPA page changes
  Observer.onPageChanged((newUrl) => {
    handlePageChange(newUrl);
  });

  // Handle page state on initial content script load
  handlePageChange(PageContext.getCurrentUrl());
})();
