/**
 * @fileoverview Reusable logging utility for LeetCode Auto Sync.
 * Allows enabling/disabling logs from a single setting.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  /**
   * Log level numeric weights.
   * @enum {number}
   */
  const Levels = Object.freeze({
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  });

  // CONFIGURE CURRENT LOG LEVEL HERE IN ONE PLACE
  let currentLogLevel = Levels.INFO;

  /**
   * Logger utility containing prefixing wrapper methods.
   */
  const Logger = {
    /**
     * Sets the active log level.
     * @param {keyof typeof Levels} levelName
     */
    setLevel(levelName) {
      if (levelName in Levels) {
        currentLogLevel = Levels[levelName];
      }
    },

    /**
     * Logs debug message.
     * @param {...*} args
     */
    debug(...args) {
      if (currentLogLevel <= Levels.DEBUG) {
        console.debug("[LeetCode Auto Sync] [DEBUG]", ...args);
      }
    },

    /**
     * Logs informational message.
     * @param {...*} args
     */
    info(...args) {
      if (currentLogLevel <= Levels.INFO) {
        console.info("[LeetCode Auto Sync] [INFO]", ...args);
      }
    },

    /**
     * Logs general log message.
     * @param {...*} args
     */
    log(...args) {
      if (currentLogLevel <= Levels.INFO) {
        console.log("[LeetCode Auto Sync] [INFO]", ...args);
      }
    },

    /**
     * Logs warning message.
     * @param {...*} args
     */
    warn(...args) {
      if (currentLogLevel <= Levels.WARN) {
        console.warn("[LeetCode Auto Sync] [WARN]", ...args);
      }
    },

    /**
     * Logs error message.
     * @param {...*} args
     */
    error(...args) {
      if (currentLogLevel <= Levels.ERROR) {
        console.error("[LeetCode Auto Sync] [ERROR]", ...args);
      }
    }
  };

  LeetCodeAutoSync.Logger = Logger;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
