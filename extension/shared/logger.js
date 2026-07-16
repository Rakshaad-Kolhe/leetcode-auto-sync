/**
 * @fileoverview Reusable logging utility for LeetCode Auto Sync.
 * Allows enabling/disabling logs from a single setting.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  // Global toggle to enable/disable logging
  let loggingEnabled = true;

  /**
   * Logger utility containing prefixing wrapper methods.
   */
  const Logger = {
    /**
     * Enables extension logging.
     */
    enable() {
      loggingEnabled = true;
    },

    /**
     * Disables extension logging.
     */
    disable() {
      loggingEnabled = false;
    },

    /**
     * Logs informational message.
     * @param {...*} args
     */
    info(...args) {
      if (loggingEnabled) {
        console.info("[LeetCode Auto Sync]", ...args);
      }
    },

    /**
     * Logs general log message.
     * @param {...*} args
     */
    log(...args) {
      if (loggingEnabled) {
        console.log("[LeetCode Auto Sync]", ...args);
      }
    },

    /**
     * Logs warning message.
     * @param {...*} args
     */
    warn(...args) {
      if (loggingEnabled) {
        console.warn("[LeetCode Auto Sync]", ...args);
      }
    },

    /**
     * Logs error message.
     * @param {...*} args
     */
    error(...args) {
      if (loggingEnabled) {
        console.error("[LeetCode Auto Sync]", ...args);
      }
    }
  };

  LeetCodeAutoSync.Logger = Logger;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
