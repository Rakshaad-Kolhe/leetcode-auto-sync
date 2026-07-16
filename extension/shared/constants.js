/**
 * @fileoverview Shared constants for the LeetCode Auto Sync extension.
 * Exposes PageTypes, MessageTypes, and configuration variables under the LeetCodeAutoSync namespace.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  /**
   * Supported LeetCode page types.
   * @enum {string}
   */
  LeetCodeAutoSync.PageTypes = Object.freeze({
    HOME: "HOME",
    PROBLEM: "PROBLEM",
    CONTEST: "CONTEST",
    EXPLORE: "EXPLORE",
    PROFILE: "PROFILE",
    UNKNOWN: "UNKNOWN"
  });

  /**
   * Message types for communication between extension components.
   * @enum {string}
   */
  LeetCodeAutoSync.MessageTypes = Object.freeze({
    PAGE_CHANGED: "PAGE_CHANGED",
    GET_CURRENT_CONTEXT: "GET_CURRENT_CONTEXT",
    SUBMISSION_STARTED: "SUBMISSION_STARTED",
    SUBMISSION_FINISHED: "SUBMISSION_FINISHED",
    GET_SUBMISSION_STATE: "GET_SUBMISSION_STATE"
  });

  /**
   * Supported LeetCode submission verdicts.
   * @enum {string}
   */
  LeetCodeAutoSync.Verdicts = Object.freeze({
    ACCEPTED: "Accepted",
    WRONG_ANSWER: "Wrong Answer",
    TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
    RUNTIME_ERROR: "Runtime Error",
    COMPILE_ERROR: "Compile Error",
    OUTPUT_LIMIT_EXCEEDED: "Output Limit Exceeded",
    PRESENTATION_ERROR: "Presentation Error",
    UNKNOWN: "Unknown"
  });

  /**
   * Current extension version.
   * @type {string}
   */
  LeetCodeAutoSync.VERSION = "0.1.0";

  /**
   * Future API endpoints for synchronization backend.
   * @enum {string}
   */
  LeetCodeAutoSync.API_ENDPOINTS = Object.freeze({
    SUBMIT: "http://localhost:5000/api/submit",
    STATUS: "http://localhost:5000/api/status"
  });

  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
