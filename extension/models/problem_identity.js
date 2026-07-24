/**
 * @fileoverview Unified immutable ProblemIdentity model representing captured LeetCode problem identity.
 * Prevents metadata divergence and stale state during SPA navigation.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  /**
   * Represents an immutable snapshot of a LeetCode problem's identity.
   */
  class ProblemIdentity {
    /**
     * @param {Object} params - Input parameters.
     * @param {number|string} params.frontendId - Frontend problem number ID (e.g. 9 or "9").
     * @param {string} params.title - Exact problem title (e.g. "Palindrome Number").
     * @param {string} params.slug - URL slug (e.g. "palindrome-number").
     * @param {"Easy"|"Medium"|"Hard"} params.difficulty - Difficulty level.
     * @param {string} [params.url] - Canonical problem URL.
     * @param {number} [params.navigationVersion] - SPA navigation version sequence number.
     * @param {string} [params.capturedAt] - ISO-8601 timestamp.
     * @param {string} [params.traceId] - Unique trace ID.
     */
    constructor({ frontendId, title, slug, difficulty, url, navigationVersion, capturedAt, traceId }) {
      this.frontendId = typeof frontendId === "string" ? parseInt(frontendId, 10) : frontendId;
      this.title = (title || "").trim();
      this.slug = (slug || "").trim().toLowerCase();
      this.difficulty = difficulty;
      this.url = url || `https://leetcode.com/problems/${this.slug}/`;
      this.navigationVersion = typeof navigationVersion === "number" ? navigationVersion : 1;
      this.capturedAt = capturedAt || new Date().toISOString();
      this.traceId = traceId || (
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `tr_${Math.random().toString(36).substring(2, 11)}`
      );

      // Freeze object instance to guarantee immutability across async operations
      Object.freeze(this);
    }

    /**
     * Validates internal consistency across all identity attributes.
     * @returns {boolean} True if identity is fully consistent.
     */
    validate() {
      if (typeof this.frontendId !== "number" || isNaN(this.frontendId) || this.frontendId <= 0) {
        return false;
      }
      if (!this.title || !this.slug) {
        return false;
      }
      if (this.difficulty !== "Easy" && this.difficulty !== "Medium" && this.difficulty !== "Hard") {
        return false;
      }

      // Check URL slug alignment with identity slug
      const slugFromUrl = ProblemIdentity.extractSlugFromUrl(this.url);
      if (slugFromUrl && slugFromUrl !== this.slug) {
        return false;
      }

      // Check title alignment with slug (normalized slug match)
      const normalizedTitleSlug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (this.slug && normalizedTitleSlug && !this.slug.includes(normalizedTitleSlug) && !normalizedTitleSlug.includes(this.slug)) {
        // Strict title-slug cross-validation check
        return false;
      }

      return true;
    }

    /**
     * Extracts the problem slug from a full LeetCode URL.
     * @param {string} url
     * @returns {string|null}
     */
    static extractSlugFromUrl(url) {
      if (typeof url !== "string") return null;
      const match = url.match(/\/problems\/([a-z0-9-]+)/i);
      return match ? match[1].toLowerCase() : null;
    }
  }

  LeetCodeAutoSync.ProblemIdentity = ProblemIdentity;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
