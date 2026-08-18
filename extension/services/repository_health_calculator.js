/**
 * RepositoryHealthCalculator
 * Deterministic Repository Health Evaluation Engine.
 * Resolves contradictions between configured, scanned, and audit issue states.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class RepositoryHealthCalculator {
    /**
     * Compute deterministic health status string and UI badge class.
     * @param {Object} repo Repository state object from DeveloperDataStore
     * @returns {Object} { healthStatus: string, badgeClass: string, isHealthy: boolean }
     */
    static calculateHealth(repo = {}) {
      if (!repo.configured) {
        return {
          healthStatus: "Not Configured",
          badgeClass: "snap-val highlight",
          isHealthy: false
        };
      }

      const missingCount = repo.missingCount || 0;
      const brokenLinksCount = repo.brokenLinksCount || (repo.brokenLinks ? repo.brokenLinks.length : 0);
      const duplicateCount = repo.duplicateCount || (repo.duplicates ? repo.duplicates.length : 0);
      const metadataQuality = typeof repo.metadataCompleteness === "number" ? repo.metadataCompleteness : 1.0;

      // 1. Attention Required: Missing Root README or Severe Metadata Issues (< 70%)
      if (!repo.hasReadme || metadataQuality < 0.70) {
        return {
          healthStatus: "Attention Required",
          badgeClass: "snap-val highlight",
          isHealthy: false
        };
      }

      // 2. Warning: Unsynced Solutions (> 0), Duplicate Folders (> 0), or Broken Internal Links (> 0)
      if (missingCount > 0 || duplicateCount > 0 || brokenLinksCount > 0) {
        return {
          healthStatus: "Warning",
          badgeClass: "snap-val highlight",
          isHealthy: false
        };
      }

      // 3. Healthy: 100% Configured, Synced, No Duplicates, No Broken Links
      return {
        healthStatus: "Healthy",
        badgeClass: "snap-val positive",
        isHealthy: true
      };
    }
  }

  LeetCodeAutoSync.RepositoryHealthCalculator = RepositoryHealthCalculator;

})(typeof self !== "undefined" ? self : this);
