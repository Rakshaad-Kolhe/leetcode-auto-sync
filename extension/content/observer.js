/**
 * @fileoverview Lightweight observer to detect page navigation (including SPA navigation).
 * Exposes the onPageChanged registration method.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  let lastUrl = window.location.href;
  let navigationVersion = 1;
  const callbacks = [];

  /**
   * Fires all registered page change callbacks.
   * @param {string} newUrl - The new URL.
   * @param {number} version - Current navigation version token.
   */
  function notifyChange(newUrl, version) {
    Logger.info(`Navigation detected to: ${newUrl} [nav_version=${version}]`);
    callbacks.forEach((callback) => {
      try {
        callback(newUrl, version);
      } catch (err) {
        Logger.error("Error in onPageChanged callback:", err);
      }
    });
  }

  /**
   * Checks if the URL has changed and triggers notifications if it has.
   */
  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      navigationVersion++;
      notifyChange(currentUrl, navigationVersion);
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
   * Returns current navigation version.
   * @returns {number}
   */
  function getNavigationVersion() {
    return navigationVersion;
  }

  /**
   * Initializes navigation and history listeners.
   */
  function initObserver() {
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
    const observerOptions = {
      childList: true,
      subtree: true
    };

    const mutationObserver = new MutationObserver(() => {
      checkUrlChange();
    });

    mutationObserver.observe(targetNode, observerOptions);

    // Run a periodic fallback check every 200ms to guarantee SPA changes are captured
    setInterval(checkUrlChange, 200);

    Logger.info("Lightweight page observer initialized successfully");
  }

  // Initialize immediately upon script execution
  initObserver();

  LeetCodeAutoSync.Observer = {
    onPageChanged,
    getNavigationVersion
  };

  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
