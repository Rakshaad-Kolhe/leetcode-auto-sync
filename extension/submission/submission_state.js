/**
 * @fileoverview Pure state machine for managing the LeetCode submission lifecycle.
 * Exposes methods to transition state, reset, and check status/verdict.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  /**
   * Available states for the submission lifecycle state machine.
   * @enum {string}
   */
  const States = Object.freeze({
    IDLE: "IDLE",
    SUBMITTING: "SUBMITTING",
    RUNNING: "RUNNING",
    FINISHED: "FINISHED"
  });

  let currentState = States.IDLE;
  let currentVerdict = null;
  const stateChangedListeners = [];

  /**
   * Triggers callbacks when state transitions occur.
   * @param {string} fromState - Old state.
   * @param {string} toState - New state.
   */
  function notifyListeners(fromState, toState) {
    Logger.info(`Submission State Transition: ${fromState} -> ${toState}`);
    stateChangedListeners.forEach((listener) => {
      try {
        listener(toState, fromState);
      } catch (err) {
        Logger.error("Error in submission state change listener:", err);
      }
    });
  }

  /**
   * Safely transitions state if it has changed.
   * @param {string} toState - The destination state.
   */
  function transitionTo(toState) {
    if (currentState === toState) return;
    const oldState = currentState;
    currentState = toState;
    notifyListeners(oldState, toState);
  }

  const SubmissionState = {
    /**
     * Exposes state constants.
     */
    States,

    /**
     * Starts the submission flow. Transitions from IDLE or FINISHED to SUBMITTING.
     */
    startSubmission() {
      if (currentState === States.IDLE || currentState === States.FINISHED) {
        currentVerdict = null;
        transitionTo(States.SUBMITTING);
      }
    },

    /**
     * Sets status to RUNNING once judging begins.
     */
    setRunning() {
      if (currentState === States.SUBMITTING || currentState === States.IDLE) {
        transitionTo(States.RUNNING);
      }
    },

    /**
     * Finishes the submission with a verdict. Transitions to FINISHED.
     * @param {string} verdict - The verdict string.
     */
    finishSubmission(verdict) {
      if (currentState === States.RUNNING || currentState === States.SUBMITTING) {
        currentVerdict = verdict;
        transitionTo(States.FINISHED);
      }
    },

    /**
     * Resets the state machine back to IDLE.
     */
    reset() {
      currentVerdict = null;
      transitionTo(States.IDLE);
    },

    /**
     * Returns the current state.
     * @returns {string} The current state.
     */
    getState() {
      return currentState;
    },

    /**
     * Returns the current verdict.
     * @returns {string|null} The current verdict, or null if none.
     */
    getVerdict() {
      return currentVerdict;
    },

    /**
     * Registers a listener callback that triggers on state changes.
     * @param {function(string, string): void} callback - Listener.
     */
    onStateChanged(callback) {
      if (typeof callback === "function") {
        stateChangedListeners.push(callback);
      }
    },

    /**
     * Clears all registered state change listeners.
     */
    clearListeners() {
      stateChangedListeners.length = 0;
      Logger.info("SubmissionState: Cleared all registered listeners");
    }
  };

  LeetCodeAutoSync.SubmissionState = SubmissionState;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
