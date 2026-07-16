/**
 * @fileoverview Data model representing extracted LeetCode problem metadata.
 * Provides schema definition and validation methods.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  /**
   * Represents LeetCode problem submission metadata.
   */
  class SubmissionModel {
    /**
     * @param {Object} data - Input data properties.
     * @param {number} data.id - Problem number ID.
     * @param {string} data.title - Problem title name.
     * @param {string} data.slug - Problem URL slug.
     * @param {"Easy" | "Medium" | "Hard"} data.difficulty - Problem difficulty level.
     * @param {string} data.language - Programming language code.
     * @param {string} data.url - Problem URL.
     * @param {string} data.verdict - Submission execution verdict (e.g. Accepted).
     * @param {string} data.extractedAt - ISO-8601 timestamp.
     */
    constructor({ id, title, slug, difficulty, language, url, verdict, extractedAt }) {
      this.id = id;
      this.title = title;
      this.slug = slug;
      this.difficulty = difficulty;
      this.language = language;
      this.url = url;
      this.verdict = verdict;
      this.extractedAt = extractedAt || new Date().toISOString();
    }

    /**
     * Validates that all required fields are populated and valid.
     * @returns {boolean} True if the model matches the structural schema.
     */
    validate() {
      // 1. ID must be a positive integer
      if (typeof this.id !== "number" || isNaN(this.id) || this.id <= 0) {
        return false;
      }

      // 2. Title must be a non-empty string
      if (typeof this.title !== "string" || !this.title.trim()) {
        return false;
      }

      // 3. Slug must be a non-empty string
      if (typeof this.slug !== "string" || !this.slug.trim()) {
        return false;
      }

      // 4. Difficulty must be one of Easy, Medium, or Hard
      if (this.difficulty !== "Easy" && this.difficulty !== "Medium" && this.difficulty !== "Hard") {
        return false;
      }

      // 5. Language must be a non-empty string
      if (typeof this.language !== "string" || !this.language.trim()) {
        return false;
      }

      // 6. URL must be a valid URL string
      if (typeof this.url !== "string" || !this.url.startsWith("http")) {
        return false;
      }

      return true;
    }
  }

  LeetCodeAutoSync.SubmissionModel = SubmissionModel;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
