/**
 * @fileoverview Submission service coordinator.
 * Binds submission detector triggers to state transitions and reports updates to background.
 * Supports service initialization and complete teardown.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, SubmissionState, SubmissionDetector, MessageTypes } = LeetCodeAutoSync;

  // Singleton identity check
  Logger.info(`[SubmissionService LOAD] SubmissionState._instanceId=${SubmissionState ? SubmissionState._instanceId : 'undefined'}`);

  let initialized = false;

  /**
   * Dispatches updates to the background worker.
   * @param {Object} message - Message payload.
   */
  function messageBackground(message) {
    Logger.info("SubmissionService: Sending message to background:", message);
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        Logger.error("SubmissionService: Failed to notify background of submission update:", chrome.runtime.lastError.message);
      } else {
        Logger.info("SubmissionService: Background response received:", response);
      }
    });
  }

  const SubmissionService = {
    /**
     * Initializes the service, registers detector event hooks, and binds state machine.
     */
    init() {
      if (initialized) return;
      initialized = true;

      // Initialize the UI detector
      SubmissionDetector.init();

      // Hook start event
      SubmissionDetector.onSubmissionStarted(() => {
        const state = SubmissionState.getState();
        Logger.info(`SubmissionService: onSubmissionStarted callback. Current State: ${state}`);
        if (state === SubmissionState.States.IDLE || state === SubmissionState.States.FINISHED) {
          Logger.log("Submission Started");
          SubmissionState.startSubmission();

          messageBackground({
            type: MessageTypes.SUBMISSION_STARTED
          });
        } else {
          Logger.warn(`SubmissionService: start submission ignored. State is not IDLE or FINISHED: ${state}`);
        }
      });

      // Hook running event
      SubmissionDetector.onSubmissionRunning(() => {
        const state = SubmissionState.getState();
        Logger.info(`SubmissionService: onSubmissionRunning callback. Current State: ${state}`);
        if (state === SubmissionState.States.SUBMITTING || state === SubmissionState.States.IDLE) {
          SubmissionState.setRunning();
        } else {
          Logger.warn(`SubmissionService: running transition ignored. State is not SUBMITTING or IDLE: ${state}`);
        }
      });

      // Hook finished event
      SubmissionDetector.onSubmissionFinished((verdict) => {
        const state = SubmissionState.getState();
        Logger.info(`SubmissionService: onSubmissionFinished callback with verdict: ${verdict}. Current State: ${state}`);
        // Transition only when actively judging or submitting
        if (state === SubmissionState.States.RUNNING || state === SubmissionState.States.SUBMITTING) {
          Logger.log("Submission Finished");
          Logger.log(`Verdict: ${verdict}`);
          SubmissionState.finishSubmission(verdict);

          messageBackground({
            type: MessageTypes.SUBMISSION_FINISHED,
            verdict: verdict
          });
        } else {
          Logger.warn(`SubmissionService: finished transition ignored. State is not RUNNING or SUBMITTING: ${state}`);
        }
      });

      Logger.info("Submission coordinator service initialized");
    },

    /**
     * Uninitializes bindings and destroys underlying detector components.
     */
    destroy() {
      if (!initialized) return;
      initialized = false;

      // Destroy the UI detector
      SubmissionDetector.destroy();

      Logger.info("Submission coordinator service destroyed");
    }
  };

  LeetCodeAutoSync.SubmissionService = SubmissionService;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
