/**
 * @fileoverview Submission detector that observes LeetCode UI interactions and changes.
 * Monitors button clicks, keyboard shortcuts, and DOM mutations to trigger callbacks.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, Verdicts } = LeetCodeAutoSync;

  const startedCallbacks = [];
  const runningCallbacks = [];
  const finishedCallbacks = [];
  let mutationObserver = null;

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
   */
  function handleDOMMutation() {
    // Check if actively running first
    const isRunning = checkRunningState();
    if (isRunning) {
      triggerRunning();
      return;
    }

    // Check if a final verdict is visible
    const verdict = detectVerdict();
    if (verdict) {
      triggerFinished(verdict);
    }
  }

  const SubmissionDetector = {
    /**
     * Initializes listener bindings and DOM MutationObservers.
     */
    init() {
      // 1. Click Listener for Submit Button (delegation)
      document.addEventListener("click", (event) => {
        if (isSubmitButton(event.target)) {
          triggerStarted();
        }
      }, true);

      // 2. Keyboard shortcut listener for Submit (Ctrl+Shift+Enter / Cmd+Shift+Enter)
      window.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "Enter") {
          triggerStarted();
        }
      }, true);

      // 3. MutationObserver on the full body to capture text changes in the submission panel
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
     * Registers callback for submission start detection.
     * @param {function(): void} callback
     */
    onSubmissionStarted(callback) {
      if (typeof callback === "function") startedCallbacks.push(callback);
    },

    /**
     * Registers callback for submission running detection.
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
