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
    GET_CURRENT_CONTEXT: "GET_CURRENT_CONTEXT"
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
