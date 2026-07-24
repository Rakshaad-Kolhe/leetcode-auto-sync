/**
 * @fileoverview Lightweight observer to detect page navigation (including SPA navigation).
 * Implements navigation sequence versioning, history API monkeypatching, and cache invalidation.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  let lastUrl = typeof window !== "undefined" ? window.location.href : "";
  let navigationVersion = 1;
  const callbacks = [];

  /**
   * Returns current navigation version sequence number.
   * @returns {number}
   */
  function getNavigationVersion() {
    return navigationVersion;
  }

  /**
   * Fires all registered page change callbacks and invalidates caches.
   * @param {string} newUrl - The new URL.
   */
  function notifyChange(newUrl) {
    navigationVersion++;
    Logger.info(`[SPA_NAVIGATION] Navigation detected (v${navigationVersion}) to:`, newUrl);

    // Invalidate stale caches if metadata service exposes reset/clear
    if (LeetCodeAutoSync.MetadataService && typeof LeetCodeAutoSync.MetadataService.clearCache === "function") {
      LeetCodeAutoSync.MetadataService.clearCache();
    }

    callbacks.forEach((callback) => {
      try {
        callback(newUrl, navigationVersion);
      } catch (err) {
        Logger.error("Error in onPageChanged callback:", err);
      }
    });
  }

  /**
   * Checks if the URL has changed and triggers notifications if it has.
   */
  function checkUrlChange() {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      notifyChange(currentUrl);
    }
  }

  /**
   * Registers a callback that fires whenever navigation occurs.
   * @param {function(string, number): void} callback - The callback to trigger.
   */
  function onPageChanged(callback) {
    if (typeof callback === "function") {
      callbacks.push(callback);
    }
  }

  /**
   * Initializes navigation and history listeners.
   */
  function initObserver() {
    if (typeof window === "undefined") return;

    // Monkeypatch history.pushState and history.replaceState for instant SPA navigation detection
    const originalPushState = history.pushState;
    if (typeof originalPushState === "function") {
      history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        checkUrlChange();
        return result;
      };
    }

    const originalReplaceState = history.replaceState;
    if (typeof originalReplaceState === "function") {
      history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        checkUrlChange();
        return result;
      };
    }

    // Listen for back/forward browser navigation
    window.addEventListener("popstate", () => {
      Logger.info("popstate event detected");
      checkUrlChange();
    });

    // Listen for hash routing if applicable
    window.addEventListener("hashchange", () => {
      Logger.info("hashchange event detected");
      checkUrlChange();
    });

    // Observe head title changes or DOM modifications as SPA navigation indicators
    const targetNode = document.querySelector("title") || document.documentElement;
    if (targetNode) {
      const observerOptions = { childList: true, subtree: true };
      const mutationObserver = new MutationObserver(() => {
        checkUrlChange();
      });
      mutationObserver.observe(targetNode, observerOptions);
    }

    // Run a periodic fallback check every 200ms to guarantee SPA changes are captured
    setInterval(checkUrlChange, 200);

    Logger.info("SPA page observer & navigation versioning initialized successfully");
  }

  // Initialize immediately upon script execution
  initObserver();

  LeetCodeAutoSync.Observer = {
    onPageChanged,
    getNavigationVersion,
    checkUrlChange
  };

  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
