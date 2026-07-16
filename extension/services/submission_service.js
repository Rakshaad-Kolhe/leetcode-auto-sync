/**
 * @fileoverview Submission service coordinator.
 * Binds submission detector triggers to state transitions and reports updates to background.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, SubmissionState, SubmissionDetector, MessageTypes } = LeetCodeAutoSync;

  /**
   * Dispatches updates to the background worker.
   * @param {Object} message - Message payload.
   */
  function messageBackground(message) {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        Logger.warn("Failed to notify background of submission update:", chrome.runtime.lastError.message);
      } else {
        Logger.info("Background status response:", response);
      }
    });
  }

  const SubmissionService = {
    /**
     * Initializes the service, registers detector event hooks, and binds state machine.
     */
    init() {
      // Initialize the detector
      SubmissionDetector.init();

      // Hook start event
      SubmissionDetector.onSubmissionStarted(() => {
        const state = SubmissionState.getState();
        if (state === SubmissionState.States.IDLE) {
          Logger.log("Submission Started");
          SubmissionState.startSubmission();
          
          messageBackground({
            type: MessageTypes.SUBMISSION_STARTED
          });
        }
      });

      // Hook running event
      SubmissionDetector.onSubmissionRunning(() => {
        const state = SubmissionState.getState();
        if (state === SubmissionState.States.SUBMITTING || state === SubmissionState.States.IDLE) {
          SubmissionState.setRunning();
        }
      });

      // Hook finished event
      SubmissionDetector.onSubmissionFinished((verdict) => {
        const state = SubmissionState.getState();
        // Transition only when actively judging or submitting
        if (state === SubmissionState.States.RUNNING || state === SubmissionState.States.SUBMITTING) {
          Logger.log("Submission Finished");
          Logger.log(`Verdict: ${verdict}`);
          SubmissionState.finishSubmission(verdict);

          messageBackground({
            type: MessageTypes.SUBMISSION_FINISHED,
            verdict: verdict
          });

          // Reset the state machine back to IDLE to prepare for the next submission attempt
          SubmissionState.reset();
        }
      });

      Logger.info("Submission coordinator service initialized");
    }
  };

  LeetCodeAutoSync.SubmissionService = SubmissionService;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
