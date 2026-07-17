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
   * @param {any} [payload] - Optional metadata payload (e.g. verdict).
   */
  function notifyListeners(fromState, toState, payload) {
    Logger.info(`Submission State Transition: ${fromState} -> ${toState} (payload: ${payload})`);
    stateChangedListeners.forEach((listener) => {
      try {
        listener(toState, fromState, payload);
      } catch (err) {
        Logger.error("Error in submission state change listener:", err);
      }
    });
  }

  /**
   * Safely transitions state if it has changed.
   * @param {string} toState - The destination state.
   * @param {any} [payload] - Optional metadata payload.
   */
  function transitionTo(toState, payload) {
    if (currentState === toState) return;
    const oldState = currentState;
    currentState = toState;
    notifyListeners(oldState, toState, payload);
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
        transitionTo(States.FINISHED, verdict);
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
     * Returns an unsubscribe function.
     * @param {function(string, string, any): void} callback - Listener.
     * @returns {function(): void} Unsubscribe function.
     */
    onStateChanged(callback) {
      if (typeof callback === "function") {
        stateChangedListeners.push(callback);
        return () => {
          const index = stateChangedListeners.indexOf(callback);
          if (index !== -1) {
            stateChangedListeners.splice(index, 1);
            Logger.info("SubmissionState: Unsubscribed state listener successfully");
          }
        };
      }
      return () => {};
    }
  };

  LeetCodeAutoSync.SubmissionState = SubmissionState;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
