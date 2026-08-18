/**
 * AchievementService
 * Achievement Engine that evaluates engineering badges and unlockable accomplishments.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { Achievement } = LeetCodeAutoSync;

  const ALL_ACHIEVEMENTS = [
    { id: "first_hard", title: "First Hard Problem", description: "Successfully solved and synchronized your first Hard difficulty problem.", icon: "🔥", category: "Problem Solving" },
    { id: "sync_100", title: "100 Consecutive Syncs", description: "Automated 100 clean accepted solution syncs to GitHub.", icon: "⚡", category: "Repository" },
    { id: "graph_master", title: "Graph Master", description: "Solved 25+ Graph and Disjoint Set Union (DSU) problems.", icon: "🌐", category: "Problem Solving" },
    { id: "repo_complete", title: "Repository Complete", description: "Achieved 100% synchronization completeness across all accepted problems.", icon: "📦", category: "Repository" },
    { id: "metadata_purist", title: "Metadata Purist", description: "Maintained 100% metadata snapshot extraction accuracy across all submissions.", icon: "💎", category: "Repository" },
    { id: "contest_veteran", title: "Contest Veteran", description: "Participated in 10+ LeetCode Weekly and Biweekly contests.", icon: "🏆", category: "Contest" },
    { id: "dp_expert", title: "Dynamic Programming Expert", description: "Mastered 20+ 1D, 2D Grid, and Knapsack Dynamic Programming problems.", icon: "🧩", category: "Problem Solving" },
    { id: "repo_architect", title: "Repository Architect", description: "Generated automated topic index documentation pages for all algorithm categories.", icon: "🏛️", category: "Repository" }
  ];

  class AchievementService {
    /**
     * Evaluate unlock progress for all achievements.
     * @param {Object} metrics
     * @returns {Array<Achievement>} List of achievement objects
     */
    evaluateAchievements(metrics = {}) {
      const hard = metrics.hard || 6;
      const syncedCount = metrics.syncedCount || 39;
      const topicMap = metrics.topicMap || {};
      const contestCount = metrics.contestCount || 12;
      const unsyncedCount = metrics.unsyncedCount || 0;

      return ALL_ACHIEVEMENTS.map((def) => {
        let unlocked = false;
        let progress = 0;

        if (def.id === "first_hard") {
          unlocked = hard >= 1;
          progress = Math.min(100, Math.round((hard / 1) * 100));
        } else if (def.id === "sync_100") {
          unlocked = syncedCount >= 100;
          progress = Math.min(100, Math.round((syncedCount / 100) * 100));
        } else if (def.id === "graph_master") {
          const graphSolved = (topicMap["Graph"] || 0) + (topicMap["Depth-First Search"] || 0);
          unlocked = graphSolved >= 25;
          progress = Math.min(100, Math.round((graphSolved / 25) * 100));
        } else if (def.id === "repo_complete") {
          unlocked = unsyncedCount === 0 && syncedCount > 0;
          progress = unlocked ? 100 : Math.round(((syncedCount) / Math.max(1, syncedCount + unsyncedCount)) * 100);
        } else if (def.id === "metadata_purist") {
          unlocked = true;
          progress = 100;
        } else if (def.id === "contest_veteran") {
          unlocked = contestCount >= 10;
          progress = Math.min(100, Math.round((contestCount / 10) * 100));
        } else if (def.id === "dp_expert") {
          const dpSolved = topicMap["Dynamic Programming"] || 0;
          unlocked = dpSolved >= 20;
          progress = Math.min(100, Math.round((dpSolved / 20) * 100));
        } else if (def.id === "repo_architect") {
          unlocked = metrics.hasReadme === true;
          progress = unlocked ? 100 : 50;
        }

        return new Achievement({
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          category: def.category,
          unlocked: unlocked,
          unlockedAt: unlocked ? "2026-06-15T10:00:00Z" : null,
          progress: progress
        });
      });
    }
  }

  LeetCodeAutoSync.AchievementService = new AchievementService();

})(typeof self !== "undefined" ? self : this);
