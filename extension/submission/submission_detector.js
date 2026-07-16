/**
 * @fileoverview Submission detector that observes LeetCode UI interactions and changes.
 * Monitors button clicks, keyboard shortcuts, and DOM mutations to trigger callbacks.
 * Optimized with state checking, event throttling, and resource cleanup.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, Verdicts } = LeetCodeAutoSync;

  const startedCallbacks = [];
  const runningCallbacks = [];
  const finishedCallbacks = [];
  
  let mutationObserver = null;
  let isScanning = false;
  let initialized = false;

  function triggerStarted() {
    Logger.info("Detector: Submission initiation detected");
    startedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        Logger.error("Error in onSubmissionStarted callback:", err);
      }
    });
  }

  function triggerRunning() {
    runningCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        Logger.error("Error in onSubmissionRunning callback:", err);
      }
    });
  }

  function triggerFinished(verdict) {
    Logger.info(`Detector: Final verdict detected: ${verdict}`);
    finishedCallbacks.forEach((cb) => {
      try {
        cb(verdict);
      } catch (err) {
        Logger.error("Error in onSubmissionFinished callback:", err);
      }
    });
  }

  /**
   * Helper to check if a clicked element represents the LeetCode submit button.
   * @param {Element} element - Target element.
   * @returns {boolean} True if matches.
   */
  function isSubmitButton(element) {
    if (!element) return false;

    // Check specific e2e/cy data attributes
    if (element.getAttribute("data-cy") === "submit-code-btn" ||
        element.getAttribute("data-e2e-locator") === "console-submit-btn") {
      return true;
    }

    // Check standard submit text within button
    if (element.tagName === "BUTTON" && element.textContent.trim() === "Submit") {
      return true;
    }

    // Check ancestors if a child span was clicked
    const parentButton = element.closest("button");
    if (parentButton) {
      if (parentButton.getAttribute("data-cy") === "submit-code-btn" ||
          parentButton.getAttribute("data-e2e-locator") === "console-submit-btn" ||
          parentButton.textContent.trim() === "Submit") {
        return true;
      }
    }

    return false;
  }

  /**
   * Scans the document for active "Pending" or "Judging" states.
   * @returns {boolean} True if running.
   */
  function checkRunningState() {
    const elements = document.querySelectorAll("span, div, p, h3, h4");
    for (const el of elements) {
      if (el.children.length === 0) {
        const text = el.textContent.trim();
        if (text === "Pending" || text === "Judging") {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Scans the document for any matching final submission verdict.
   * @returns {string|null} The matched verdict string, or null.
   */
  function detectVerdict() {
    const elements = document.querySelectorAll("span, div, p, h3, h4, a");
    for (const el of elements) {
      if (el.children.length === 0) {
        const text = el.textContent.trim();
        for (const val of Object.values(Verdicts)) {
          if (val !== Verdicts.UNKNOWN && text === val) {
            return val;
          }
        }
      }
    }
    return null;
  }

  /**
   * Invoked upon DOM changes to update submission detection state.
   * Throttled using requestAnimationFrame to prevent performance issues.
   */
  function handleDOMMutation() {
    // Performance Guard: Short-circuit DOM queries if submission is not active
    const state = LeetCodeAutoSync.SubmissionState ? LeetCodeAutoSync.SubmissionState.getState() : "IDLE";
    if (state !== "SUBMITTING" && state !== "RUNNING") {
      return;
    }

    if (isScanning) return;
    isScanning = true;

    requestAnimationFrame(() => {
      const isRunning = checkRunningState();
      
      if (isRunning) {
        triggerRunning();
        isScanning = false;
        return;
      }

      // If we are currently in RUNNING state and judging is complete, identify final verdict
      if (state === "RUNNING") {
        const verdict = detectVerdict();
        if (verdict) {
          triggerFinished(verdict);
        } else {
          // Graceful fallback: wait briefly for final verdict DOM rendering
          setTimeout(() => {
            const finalVerdict = detectVerdict();
            if (finalVerdict) {
              triggerFinished(finalVerdict);
            } else {
              triggerFinished(Verdicts.UNKNOWN);
            }
          }, 150);
        }
      } else {
        // If still in SUBMITTING state, look for early/instant verdicts
        const verdict = detectVerdict();
        if (verdict) {
          triggerFinished(verdict);
        }
      }

      isScanning = false;
    });
  }

  function handleClick(event) {
    if (isSubmitButton(event.target)) {
      triggerStarted();
    }
  }

  function handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "Enter") {
      triggerStarted();
    }
  }

  const SubmissionDetector = {
    /**
     * Initializes listener bindings and DOM MutationObservers.
     */
    init() {
      if (initialized) return;
      initialized = true;

      // Click event listener using capture phase
      document.addEventListener("click", handleClick, true);

      // Keyboard hotkeys event listener
      window.addEventListener("keydown", handleKeydown, true);

      // MutationObserver on the body
      mutationObserver = new MutationObserver(() => {
        handleDOMMutation();
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      Logger.info("Submission Detector initialized successfully");
    },

    /**
     * Cleans up event listeners and disconnects MutationObserver to prevent memory leaks.
     */
    destroy() {
      if (!initialized) return;
      initialized = false;

      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }

      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeydown, true);

      // Empty callback lists to release memory
      startedCallbacks.length = 0;
      runningCallbacks.length = 0;
      finishedCallbacks.length = 0;
      isScanning = false;

      Logger.info("Submission Detector cleaned up and destroyed");
    },

    /**
     * Registers callback for submission start detection.
     * @param {function(): void} callback
     */
    onSubmissionStarted(callback) {
      if (typeof callback === "function") startedCallbacks.push(callback);
    },

    /**
     * Registers callback for submission running/judging detection.
     * @param {function(): void} callback
     */
    onSubmissionRunning(callback) {
      if (typeof callback === "function") runningCallbacks.push(callback);
    },

    /**
     * Registers callback for submission finished detection.
     * @param {function(string): void} callback
     */
    onSubmissionFinished(callback) {
      if (typeof callback === "function") finishedCallbacks.push(callback);
    }
  };

  LeetCodeAutoSync.SubmissionDetector = SubmissionDetector;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
