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
    GET_SUBMISSION_STATE: "GET_SUBMISSION_STATE",
    SUBMISSION_ACCEPTED: "SUBMISSION_ACCEPTED",
    GET_ACCEPTED_SUBMISSION: "GET_ACCEPTED_SUBMISSION",
    SYNC_STATUS_CHANGED: "SYNC_STATUS_CHANGED",
    GET_SYNC_STATUS: "GET_SYNC_STATUS"
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
  LeetCodeAutoSync.VERSION = "1.0.0";

  /**
   * Future API endpoints for synchronization backend.
   * @enum {string}
   */
  LeetCodeAutoSync.API_ENDPOINTS = Object.freeze({
    SUBMIT: "http://localhost:5000/api/submit",
    STATUS: "http://localhost:5000/api/status"
  });

  /**
   * Generates a unique Trace ID for end-to-end synchronization tracking.
   * Format: SYNC-YYYYMMDD-xxxxxxxx
   * @returns {string}
   */
  LeetCodeAutoSync.generateTraceId = function() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `SYNC-${dateStr}-${randHex}`;
  };

  /**
   * Generates a unique Metadata Snapshot ID for tracking atomic snapshots.
   * Format: SNAP-YYYYMMDD-xxxxxxxx
   * @returns {string}
   */
  LeetCodeAutoSync.generateSnapshotId = function() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `SNAP-${dateStr}-${randHex}`;
  };

  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);

