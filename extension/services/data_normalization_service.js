/**
 * DataNormalizationService
 * Normalizes dates to ISO8601 UTC, languages to canonical identifiers,
 * percentages to rounded floats, and paths to forward-slash strings.
 * Ensures data entering DeveloperDataStore is clean and deterministic.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class DataNormalizationService {
    /**
     * Normalize timestamp/date input to ISO8601 UTC string.
     * @param {string|number|Date} dateInput
     * @returns {string} ISO8601 UTC string
     */
    normalizeDate(dateInput) {
      if (!dateInput) return new Date().toISOString();
      try {
        if (typeof dateInput === "number") {
          // Handle unix timestamp in seconds vs milliseconds
          const ms = dateInput < 1e11 ? dateInput * 1000 : dateInput;
          return new Date(ms).toISOString();
        }
        return new Date(dateInput).toISOString();
      } catch (err) {
        return new Date().toISOString();
      }
    }

    /**
     * Normalize programming language strings to canonical identifiers.
     * @param {string} lang
     * @returns {string} Canonical language ID ('cpp', 'python3', 'java', 'javascript', 'typescript', 'golang', 'rust')
     */
    normalizeLanguage(lang = "") {
      const lower = String(lang).trim().toLowerCase();
      if (lower.includes("c++") || lower === "cpp") return "cpp";
      if (lower.includes("python") || lower === "py") return "python3";
      if (lower === "java") return "java";
      if (lower.includes("javascript") || lower === "js") return "javascript";
      if (lower.includes("typescript") || lower === "ts") return "typescript";
      if (lower === "go" || lower === "golang") return "golang";
      if (lower === "rust" || lower === "rs") return "rust";
      return lower || "cpp";
    }

    /**
     * Normalize percentage value to float rounded to 1 decimal place.
     * @param {number|string} val
     * @returns {number} Float percentage (0-100)
     */
    normalizePercentage(val) {
      if (val === null || val === undefined) return 0;
      const num = typeof val === "number" ? val : parseFloat(String(val).replace("%", ""));
      if (isNaN(num)) return 0;
      return Math.min(100, Math.max(0, parseFloat(num.toFixed(1))));
    }

    /**
     * Normalize repository file paths to forward-slash strings.
     * @param {string} pathStr
     * @returns {string} Normalized path
     */
    normalizePath(pathStr = "") {
      return String(pathStr).replace(/\\/g, "/").replace(/\/+/g, "/");
    }

    /**
     * Normalize titleSlug identifiers to canonical lowercase trimmed string without slashes.
     * Rules: null/undefined -> null, trim, lowercase, strip surrounding slashes, preserve hyphens.
     * @param {*} value
     * @returns {string|null} Canonical titleSlug or null if invalid/empty
     */
    normalizeTitleSlug(value) {
      if (value === null || value === undefined) return null;
      let str = String(value).trim().toLowerCase();
      if (!str) return null;
      // Strip leading and trailing slashes
      str = str.replace(/^\/+|\/+$/g, "").trim();
      if (!str) return null;
      return str;
    }

    /**
     * Normalize problem metadata object.
     * @param {Object} meta
     * @returns {Object} Normalized metadata
     */
    normalizeProblemMetadata(meta = {}) {
      return {
        id: parseInt(meta.id || meta.questionId || 0, 10),
        title: String(meta.title || "").trim(),
        slug: this.normalizeTitleSlug(meta.slug || meta.titleSlug) || "",
        difficulty: String(meta.difficulty || "Medium").trim(),
        language: this.normalizeLanguage(meta.language),
        extractedAt: this.normalizeDate(meta.extractedAt)
      };
    }
  }

  LeetCodeAutoSync.DataNormalizationService = new DataNormalizationService();
  LeetCodeAutoSync.normalizeTitleSlug = (val) => LeetCodeAutoSync.DataNormalizationService.normalizeTitleSlug(val);

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));

