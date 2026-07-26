/**
 * @fileoverview Immutable metadata snapshot object for LeetCode Auto Sync.
 * Ensures metadata fields (id, title, slug, difficulty, language, url, navVersion)
 * are atomically coupled, validated, and frozen upon creation.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};

  class MetadataSnapshot {
    /**
     * @param {Object} params
     * @param {number} params.id - Problem numeric ID.
     * @param {string} params.title - Problem display title.
     * @param {string} params.slug - Problem URL slug.
     * @param {"Easy"|"Medium"|"Hard"|null} [params.difficulty] - Problem difficulty.
     * @param {string|null} [params.language] - Programming language.
     * @param {string} params.url - Full page URL.
     * @param {number} params.navVersion - Navigation version token at creation.
     * @param {string} [params.snapshotId] - Unique SNAP-... identifier.
     * @param {string} [params.createdAt] - ISO timestamp.
     */
    constructor({ id, title, slug, difficulty = null, language = null, url, navVersion, snapshotId, createdAt }) {
      if (typeof id !== "number" || isNaN(id) || id <= 0) {
        throw new Error(`MetadataSnapshot: Invalid problem id "${id}"`);
      }
      if (typeof title !== "string" || !title.trim()) {
        throw new Error(`MetadataSnapshot: Invalid title "${title}"`);
      }
      if (typeof slug !== "string" || !slug.trim()) {
        throw new Error(`MetadataSnapshot: Invalid slug "${slug}"`);
      }
      if (!url || typeof url !== "string") {
        throw new Error(`MetadataSnapshot: Invalid url "${url}"`);
      }

      // Title-to-slug cross validation guard: ensure title matches slug!
      const expectedSlug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      if (expectedSlug && slug && expectedSlug !== slug) {
        throw new Error(`MetadataSnapshot integrity violation: title "${title}" (slug "${expectedSlug}") does not match URL slug "${slug}"`);
      }

      const generateFn = LeetCodeAutoSync.generateSnapshotId || (typeof globalThis !== 'undefined' && globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.generateSnapshotId);

      this.snapshotId = snapshotId || (typeof generateFn === "function" ? generateFn() : `SNAP-${Date.now()}`);
      this.id = id;
      this.title = title.trim();
      this.slug = slug.trim();
      this.difficulty = difficulty;
      this.language = language;
      this.url = url;
      this.navVersion = typeof navVersion === "number" ? navVersion : 0;
      this.createdAt = createdAt || new Date().toISOString();

      Object.freeze(this);
    }

    /**
     * Validates snapshot fields and cross-field title/slug alignment.
     * @returns {boolean}
     */
    validate() {
      if (typeof this.id !== "number" || this.id <= 0) return false;
      if (typeof this.title !== "string" || !this.title.trim()) return false;
      if (typeof this.slug !== "string" || !this.slug.trim()) return false;
      if (typeof this.url !== "string" || !this.url.startsWith("http")) return false;
      if (!this.snapshotId || typeof this.snapshotId !== "string") return false;

      const expectedSlug = this.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      if (expectedSlug && this.slug && expectedSlug !== this.slug) return false;

      return true;
    }
  }

  LeetCodeAutoSync.MetadataSnapshot = MetadataSnapshot;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
