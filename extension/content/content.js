/**
 * @fileoverview Main content script for LeetCode Auto Sync.
 * Initializes the page context detection and sends updates to the background worker.
 */

(() => {
  const { Logger, PageContext, Observer, MessageTypes, PageTypes, SubmissionService, SubmissionState, MetadataService, SolutionService } = window.LeetCodeAutoSync;

  Logger.info("Content script loaded. Initializing services...");

  // Initialize the submission monitoring, metadata, and solution services
  Logger.info("content.js: Calling SubmissionService.init()...");
  SubmissionService.init();
  Logger.info("content.js: Calling MetadataService.init()...");
  MetadataService.init();
  Logger.info("content.js: Calling SolutionService.init()...");
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

    // Only perform complete state resets and service re-initializations if we have logically left the current problem session.
    // We ignore navigation to unknown subpages (e.g. submission detail pages) to prevent premature reset.
    let hasProblemChanged = false;
    if (currentSlug !== null) {
      const isDifferentProblem = (slug !== null && slug !== currentSlug);
      const isLeavingToMainSection = (slug === null && pageType !== PageTypes.UNKNOWN);
      hasProblemChanged = isDifferentProblem || isLeavingToMainSection;
    } else {
      // Entering problem context
      hasProblemChanged = (slug !== null);
    }

    Logger.info("content.js: handlePageChange evaluation details:", {
      url,
      slug,
      currentSlug,
      pageType,
      currentPageType,
      hasProblemChanged
    });

    if (hasProblemChanged) {
      Logger.info(`Page Context Changed: reset and re-initialize services (Slug: ${currentSlug} -> ${slug}, PageType: ${currentPageType} -> ${pageType})`);
      
      currentSlug = slug;
      currentPageType = pageType;

      // Reset submission state on navigation so states do not leak between problems
      Logger.info("content.js: Calling SubmissionState.reset()...");
      SubmissionState.reset();

      // Re-initialize submission service observers and event bindings for the new page context
      Logger.info("content.js: Re-initializing SubmissionService...");
      SubmissionService.destroy();
      SubmissionService.init();

      // Re-initialize metadata service observers and event bindings
      Logger.info("content.js: Re-initializing MetadataService...");
      MetadataService.destroy();
      MetadataService.init();

      // Re-initialize solution service observers and event bindings
      Logger.info("content.js: Re-initializing SolutionService...");
      SolutionService.destroy();
      SolutionService.init();

      // Trigger pre-scraping of problem details (difficulty, title, ID) while description tab is active
      if (window.LeetCodeAutoSync.MetadataParser) {
        window.LeetCodeAutoSync.MetadataParser.preScrape();
      }
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
