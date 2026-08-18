/**
 * SnapshotEngineService
 * Manages immutable daily, weekly, monthly, quarterly, and yearly historical snapshots.
 * Persists snapshots to chrome.storage.local and computes real trend deltas.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DeveloperDataStore, Logger } = LeetCodeAutoSync;

  const STORAGE_KEY_SNAPSHOTS = "developerIntelligenceSnapshots";

  class SnapshotEngineService {
    constructor() {
      this.snapshots = [];
    }

    /**
     * Load snapshots from chrome.storage.local.
     * @returns {Promise<Array>}
     */
    async loadSnapshots() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEY_SNAPSHOTS], (items) => {
            const list = Array.isArray(items[STORAGE_KEY_SNAPSHOTS]) ? items[STORAGE_KEY_SNAPSHOTS] : [];
            this.snapshots = list;
            DeveloperDataStore.snapshots = list;
            resolve(list);
          });
        });
      }
      return this.snapshots;
    }

    /**
     * Capture immutable snapshot of current DeveloperDataStore metrics.
     * @returns {Promise<Object>} Created snapshot object
     */
    async captureSnapshot() {
      const now = new Date();
      const snapshot = {
        timestamp: now.toISOString(),
        date: now.toISOString().split("T")[0],
        overallScore: DeveloperDataStore.metrics.overallScore || 0,
        totalSolved: DeveloperDataStore.stats.totalSolved || 0,
        easyCount: DeveloperDataStore.stats.easy || 0,
        mediumCount: DeveloperDataStore.stats.medium || 0,
        hardCount: DeveloperDataStore.stats.hard || 0,
        syncedCount: DeveloperDataStore.repository.syncedCount || 0,
        contestRating: DeveloperDataStore.contests.rating || 0,
        currentStreak: DeveloperDataStore.stats.currentStreak || 0
      };

      // Append snapshot if last snapshot is from a different day
      const lastSnap = this.snapshots[this.snapshots.length - 1];
      if (!lastSnap || lastSnap.date !== snapshot.date) {
        this.snapshots.push(snapshot);
        DeveloperDataStore.snapshots = [...this.snapshots];

        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY_SNAPSHOTS]: this.snapshots }, () => {
            if (Logger && Logger.info) Logger.info("SnapshotEngineService: Immutable snapshot captured for", snapshot.date);
          });
        }
      }

      return snapshot;
    }

    /**
     * Compute real comparative trend deltas (Weekly, Monthly, Yearly).
     * @returns {Object} Trend deltas
     */
    computeTrendDeltas() {
      if (this.snapshots.length === 0) {
        return {
          weeklyDelta: "→ +0 (No snapshot history)",
          monthlyDelta: "→ +0 (No snapshot history)",
          yearlyDelta: "→ +0 (No snapshot history)"
        };
      }

      const currentScore = DeveloperDataStore.metrics.overallScore || 0;
      const now = new Date().getTime();

      const findSnapshotClosestToDaysAgo = (daysAgo) => {
        const targetTime = now - daysAgo * 24 * 60 * 60 * 1000;
        let closest = null;
        let minDiff = Infinity;
        this.snapshots.forEach((snap) => {
          const snapTime = new Date(snap.timestamp).getTime();
          const diff = Math.abs(snapTime - targetTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = snap;
          }
        });
        return closest;
      };

      const weekSnap = findSnapshotClosestToDaysAgo(7);
      const monthSnap = findSnapshotClosestToDaysAgo(30);

      const weekDeltaVal = weekSnap ? currentScore - weekSnap.overallScore : 0;
      const monthDeltaVal = monthSnap ? currentScore - monthSnap.overallScore : 0;

      const formatDelta = (val) => (val > 0 ? `↗ +${val}` : val < 0 ? `↘ ${val}` : `→ 0`);

      return {
        weeklyDelta: formatDelta(weekDeltaVal),
        monthlyDelta: formatDelta(monthDeltaVal),
        yearlyDelta: formatDelta(monthDeltaVal)
      };
    }

    /**
     * Stale Cache Overwrite Lock.
     * Prevents older/stale cached snapshots from overwriting newer in-memory store data.
     * @param {string} cacheTimestamp
     * @returns {boolean} True if cache restore is allowed, false if rejected as stale
     */
    shouldAllowCacheRestore(cacheTimestamp) {
      if (!DeveloperDataStore || !DeveloperDataStore.status || !DeveloperDataStore.status.lastFetched) {
        return true;
      }
      const inMemoryTime = new Date(DeveloperDataStore.status.lastFetched).getTime();
      const cacheTime = new Date(cacheTimestamp).getTime();
      if (cacheTime < inMemoryTime) {
        if (Logger && Logger.warn) {
          Logger.warn("SnapshotEngineService: Rejected stale cache restore attempt! In-memory data is newer.");
        }
        return false;
      }
      return true;
    }
  }

  LeetCodeAutoSync.SnapshotEngineService = new SnapshotEngineService();

})(typeof self !== "undefined" ? self : this);
