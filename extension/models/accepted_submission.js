/**
 * @fileoverview Data model representing the complete accepted solution (metadata + source code).
 * Includes schema definition and validation methods.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  /**
   * Represents an accepted solution submission.
   */
  class AcceptedSubmission {
    /**
     * @param {Object} params - Input parameters.
     * @param {Object} params.metadata - The SubmissionModel metadata.
     * @param {string} params.code - The full source code content.
     * @param {string} [params.extractedAt] - ISO-8601 timestamp.
     */
    constructor({ metadata, code, extractedAt }) {
      this.metadata = metadata;
      this.code = code;
      this.extractedAt = extractedAt || new Date().toISOString();
    }

    /**
     * Validates that all fields are structurally correct.
     * @returns {boolean} True if the model matches the validation schema.
     */
    validate() {
      // 1. Metadata must be present and validate successfully
      if (!this.metadata || typeof this.metadata.validate !== "function" || !this.metadata.validate()) {
        return false;
      }

      // 2. Code must be a non-empty string and not whitespace-only
      if (typeof this.code !== "string" || !this.code.trim()) {
        return false;
      }

      // 3. Extraction timestamp must be a non-empty string
      if (typeof this.extractedAt !== "string" || !this.extractedAt.trim()) {
        return false;
      }

      return true;
    }
  }

  LeetCodeAutoSync.AcceptedSubmission = AcceptedSubmission;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
