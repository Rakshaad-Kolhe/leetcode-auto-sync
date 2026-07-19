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

  // Unique identity tag so every module can confirm they hold the same singleton
  const _instanceId = `SubmissionState-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  Logger.info(`[SubmissionState LOAD] Singleton created. _instanceId=${_instanceId}`);

  /**
   * Triggers callbacks when state transitions occur.
   * @param {string} fromState - Old state.
   * @param {string} toState - New state.
   * @param {any} [payload] - Optional metadata payload (e.g. verdict).
   */
  function notifyListeners(fromState, toState, payload) {
    Logger.info(`Submission State Transition: ${fromState} -> ${toState} (payload: ${payload}). Notifying ${stateChangedListeners.length} registered listeners.`);
    stateChangedListeners.forEach((listener, index) => {
      try {
        Logger.info(`SubmissionState: Invoking state listener #${index + 1}/${stateChangedListeners.length} (fromState=${fromState}, toState=${toState}, payload=${payload})...`);
        listener(toState, fromState, payload);
        Logger.info(`SubmissionState: Listener #${index + 1} completed successfully.`);
      } catch (err) {
        Logger.error(`SubmissionState: Error executing listener #${index + 1}:`, err);
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
     * Unique instance identifier for singleton verification across modules.
     */
    _instanceId,

    /**
     * Starts the submission flow. Transitions from IDLE or FINISHED to SUBMITTING.
     */
    startSubmission() {
      Logger.info(`SubmissionState: startSubmission() called. Current State: ${currentState}`);
      if (currentState === States.IDLE || currentState === States.FINISHED) {
        currentVerdict = null;
        transitionTo(States.SUBMITTING);
      } else {
        Logger.warn(`SubmissionState: startSubmission ignored. Invalid state transition from: ${currentState}`);
      }
    },

    /**
     * Sets status to RUNNING once judging begins.
     */
    setRunning() {
      Logger.info(`SubmissionState: setRunning() called. Current State: ${currentState}`);
      if (currentState === States.SUBMITTING || currentState === States.IDLE) {
        transitionTo(States.RUNNING);
      } else {
        Logger.warn(`SubmissionState: setRunning ignored. Invalid state transition from: ${currentState}`);
      }
    },

    /**
     * Finishes the submission with a verdict. Transitions to FINISHED.
     * @param {string} verdict - The verdict string.
     */
    finishSubmission(verdict) {
      Logger.info(`SubmissionState: finishSubmission() called with verdict: ${verdict}. Current State: ${currentState}`);
      if (currentState === States.RUNNING || currentState === States.SUBMITTING) {
        currentVerdict = verdict;
        transitionTo(States.FINISHED, verdict);
      } else {
        Logger.warn(`SubmissionState: finishSubmission ignored. Invalid state transition from: ${currentState}`);
      }
    },

    /**
     * Resets the state machine back to IDLE.
     */
    reset() {
      Logger.info(`SubmissionState: reset() called. Current State: ${currentState}`);
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
        Logger.info(`SubmissionState: Registered state listener. Total active listeners: ${stateChangedListeners.length}`);
        return () => {
          const index = stateChangedListeners.indexOf(callback);
          if (index !== -1) {
            stateChangedListeners.splice(index, 1);
            Logger.info(`SubmissionState: Unsubscribed state listener. Remaining active listeners: ${stateChangedListeners.length}`);
          }
        };
      }
      return () => {};
    }
  };

  LeetCodeAutoSync.SubmissionState = SubmissionState;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
