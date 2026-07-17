/**
 * @fileoverview Main content script for LeetCode Auto Sync.
 * Initializes the page context detection and sends updates to the background worker.
 */

(() => {
  const { Logger, PageContext, Observer, MessageTypes, SubmissionService, SubmissionState, MetadataService, SolutionService } = window.LeetCodeAutoSync;

  Logger.info("Content script loaded");

  // Initialize the submission monitoring, metadata, and solution services
  SubmissionService.init();
  MetadataService.init();
  SolutionService.init();

  let currentSlug = null;
  let currentPageType = null;

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

    // Only perform complete state resets and service re-initializations if the actual problem changes
    const hasProblemChanged = (slug !== currentSlug) || (pageType !== currentPageType);

    if (hasProblemChanged) {
      Logger.info(`Page Context Changed: reset and re-initialize services (Slug: ${currentSlug} -> ${slug}, PageType: ${currentPageType} -> ${pageType})`);
      
      currentSlug = slug;
      currentPageType = pageType;

      // Reset submission state on navigation so states do not leak between problems
      SubmissionState.reset();

      // Re-initialize submission service observers and event bindings for the new page context
      SubmissionService.destroy();
      SubmissionService.init();

      // Re-initialize metadata service observers and event bindings
      MetadataService.destroy();
      MetadataService.init();

      // Re-initialize solution service observers and event bindings
      SolutionService.destroy();
      SolutionService.init();
    } else {
      Logger.info("Page context URL updated within the same problem context. Skipping state reset and service re-initialization.");
    }

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
