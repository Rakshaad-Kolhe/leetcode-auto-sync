/**
 * DataProvenance
 * Data Provenance Model tracking authoritative origin, query/scanner method,
 * verification timestamp, confidence score, and validation status for every metric.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class DataProvenance {
    /**
     * @param {Object} params
     * @param {string} params.source Authoritative origin (e.g. 'LeetCode GraphQL', 'Repository Scanner')
     * @param {string} params.queryOrScanner Query name or scanner method (e.g. 'userCalendar', 'ASTParser')
     * @param {string} params.lastVerified ISO8601 UTC timestamp
     * @param {number} params.confidence Confidence percentage (0-100%)
     * @param {string} params.validationStatus Status ('PASSED', 'FAILED', 'PENDING')
     * @param {string|null} params.validationError Error message if validation failed
     */
    constructor({
      source = "Unknown",
      queryOrScanner = "N/A",
      lastVerified = new Date().toISOString(),
      confidence = 100,
      validationStatus = "PENDING",
      validationError = null
    } = {}) {
      this.source = source;
      this.queryOrScanner = queryOrScanner;
      this.lastVerified = lastVerified;
      this.confidence = Math.min(100, Math.max(0, confidence));
      this.validationStatus = validationStatus;
      this.validationError = validationError;
    }

    /**
     * Factory for passed validation provenance.
     */
    static passed(source, queryOrScanner, confidence = 100) {
      return new DataProvenance({
        source,
        queryOrScanner,
        lastVerified: new Date().toISOString(),
        confidence,
        validationStatus: "PASSED",
        validationError: null
      });
    }

    /**
     * Factory for failed validation provenance.
     */
    static failed(source, queryOrScanner, errorMsg) {
      return new DataProvenance({
        source,
        queryOrScanner,
        lastVerified: new Date().toISOString(),
        confidence: 0,
        validationStatus: "FAILED",
        validationError: errorMsg
      });
    }

    toJSONObject() {
      return {
        source: this.source,
        queryOrScanner: this.queryOrScanner,
        lastVerified: this.lastVerified,
        confidence: this.confidence,
        validationStatus: this.validationStatus,
        validationError: this.validationError
      };
    }

    static fromJSON(json) {
      if (!json) return new DataProvenance();
      return new DataProvenance(json);
    }
  }

  LeetCodeAutoSync.DataProvenance = DataProvenance;

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
