/**
 * @fileoverview Domain and diagnostic data models for LeetCode Auto Sync.
 * Provides normalized status enums, check results, and diagnostic events.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  /**
   * Diagnostic health status states.
   * @enum {string}
   */
  const DiagnosticStatus = Object.freeze({
    HEALTHY: "healthy",
    WARNING: "warning",
    ERROR: "error",
    CHECKING: "checking",
    UNKNOWN: "unknown"
  });

  /**
   * Synchronization lifecycle state machine.
   * @enum {string}
   */
  const SyncState = Object.freeze({
    IDLE: "IDLE",
    SCANNING: "SCANNING",
    SYNCING: "SYNCING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    NO_SYNC_HISTORY: "NO_SYNC_HISTORY"
  });

  /**
   * Diagnostic event category types.
   * @enum {string}
   */
  const DiagnosticEventType = Object.freeze({
    SYNC_STARTED: "SYNC_STARTED",
    FETCH_STARTED: "FETCH_STARTED",
    FETCH_COMPLETED: "FETCH_COMPLETED",
    REPOSITORY_ANALYZED: "REPOSITORY_ANALYZED",
    METADATA_FETCHED: "METADATA_FETCHED",
    README_GENERATED: "README_GENERATED",
    FILES_UPDATED: "FILES_UPDATED",
    ROOT_README_UPDATED: "ROOT_README_UPDATED",
    TOPIC_UPDATED: "TOPIC_UPDATED",
    GIT_COMMIT_CREATED: "GIT_COMMIT_CREATED",
    GIT_PUSH_STARTED: "GIT_PUSH_STARTED",
    GIT_PUSH_COMPLETED: "GIT_PUSH_COMPLETED",
    SYNC_COMPLETED: "SYNC_COMPLETED",
    SYNC_FAILED: "SYNC_FAILED",
    DIAGNOSTICS_RUN: "DIAGNOSTICS_RUN",
    CACHE_CLEARED: "CACHE_CLEARED"
  });

  /**
   * Normalized Diagnostic Check Result Model.
   */
  class DiagnosticCheckResult {
    /**
     * @param {Object} param0
     * @param {string} param0.id - Unique check identifier (e.g. "backend", "repository")
     * @param {string} param0.label - Display label (e.g. "Backend", "Repository")
     * @param {string} param0.status - Status state from DiagnosticStatus
     * @param {string} param0.message - Technical/Operational status message
     * @param {number|null} [param0.checkedAt] - Timestamp in milliseconds
     * @param {number|null} [param0.latencyMs] - Round-trip latency in ms if measured
     * @param {Object|null} [param0.details] - Optional technical payload
     */
    constructor({
      id,
      label,
      status = DiagnosticStatus.UNKNOWN,
      message = "",
      checkedAt = Date.now(),
      latencyMs = null,
      details = null
    }) {
      this.id = id;
      this.label = label || id;
      this.status = status;
      this.message = message;
      this.checkedAt = checkedAt || Date.now();
      this.latencyMs = typeof latencyMs === "number" ? latencyMs : null;
      this.details = details || null;
    }

    isHealthy() {
      return this.status === DiagnosticStatus.HEALTHY;
    }

    isWarning() {
      return this.status === DiagnosticStatus.WARNING;
    }

    isError() {
      return this.status === DiagnosticStatus.ERROR;
    }
  }

  /**
   * Diagnostic Event Record.
   */
  class DiagnosticEvent {
    /**
     * @param {Object} param0
     * @param {string} [param0.id]
     * @param {string} param0.type - Event type from DiagnosticEventType
     * @param {number} [param0.timestamp] - Milliseconds timestamp
     * @param {string} [param0.status] - "success" | "warning" | "error" | "info"
     * @param {string} param0.message - Human-readable event description
     * @param {Object|null} [param0.metadata] - Key-value metadata
     */
    constructor({
      id = null,
      type = DiagnosticEventType.DIAGNOSTICS_RUN,
      timestamp = Date.now(),
      status = "info",
      message = "",
      metadata = null
    }) {
      this.id = id || `EVT-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      this.type = type;
      this.timestamp = timestamp || Date.now();
      this.status = status;
      this.message = message;
      this.metadata = metadata || null;
    }
  }

  LeetCodeAutoSync.DiagnosticStatus = DiagnosticStatus;
  LeetCodeAutoSync.SyncState = SyncState;
  LeetCodeAutoSync.DiagnosticEventType = DiagnosticEventType;
  LeetCodeAutoSync.DiagnosticCheckResult = DiagnosticCheckResult;
  LeetCodeAutoSync.DiagnosticEvent = DiagnosticEvent;

})(typeof self !== "undefined" ? self : this);
