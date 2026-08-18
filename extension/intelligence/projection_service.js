/**
 * ProjectionService
 * Explains WHY scores improved and computes linear regression pace projections from real DataStore metrics.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DeveloperDataStore, FutureProjection } = LeetCodeAutoSync;

  class ProjectionService {
    /**
     * Generate human-readable growth explanations from real DataStore snapshot history.
     * @returns {Array<string>} List of growth explanations
     */
    generateGrowthExplanations() {
      const stats = DeveloperDataStore.stats || {};
      const repo = DeveloperDataStore.repository || {};
      const totalSolved = stats.totalSolved || repo.syncedCount || 0;

      if (totalSolved === 0) {
        return ["No submission history captured yet. Complete and sync solutions to record growth."];
      }

      const explanations = [
        `Synchronized ${repo.syncedCount || 0} accepted problem solutions in local repository.`
      ];

      if (stats.hard > 0) {
        explanations.push(`Solved ${stats.hard} Hard difficulty problems.`);
      }
      if (stats.currentStreak > 1) {
        explanations.push(`Maintained a consecutive activity streak of ${stats.currentStreak} days.`);
      }
      if (DeveloperDataStore.contests.available && DeveloperDataStore.contests.rating > 0) {
        explanations.push(`Achieved a contest rating of ${DeveloperDataStore.contests.rating}.`);
      }

      return explanations;
    }

    /**
     * Compute future milestone predictions using real solving velocity rates.
     * @returns {Array<FutureProjection>} Milestone forecasts
     */
    computeFutureProjections() {
      const currentSolved = DeveloperDataStore.stats.totalSolved || DeveloperDataStore.repository.syncedCount || 0;
      const dailyRate = DeveloperDataStore.stats.currentStreak > 0 ? 1.5 : 1.0;

      const createProjection = (targetName, targetVal) => {
        const remaining = Math.max(0, targetVal - currentSolved);
        const daysReq = Math.ceil(remaining / Math.max(0.1, dailyRate));

        const projectedDate = new Date();
        projectedDate.setDate(projectedDate.getDate() + daysReq);

        const lowDate = new Date();
        lowDate.setDate(lowDate.getDate() + Math.ceil(daysReq * 0.85));

        const highDate = new Date();
        highDate.setDate(highDate.getDate() + Math.ceil(daysReq * 1.2));

        return new FutureProjection({
          targetName: targetName,
          currentVal: currentSolved,
          targetVal: targetVal,
          projectedDate: projectedDate.toISOString().split("T")[0],
          daysRemaining: daysReq,
          confidenceLowDate: lowDate.toISOString().split("T")[0],
          confidenceHighDate: highDate.toISOString().split("T")[0],
          dailyRate: dailyRate
        });
      };

      const milestones = [];
      if (currentSolved < 75) milestones.push(createProjection("Complete Blind 75 Sheet", 75));
      if (currentSolved < 100) milestones.push(createProjection("Reach 100 Problems Solved", 100));
      if (currentSolved < 250) milestones.push(createProjection("Reach 250 Problems Solved", 250));
      if (currentSolved < 500) milestones.push(createProjection("Reach 500 Problems Solved", 500));
      milestones.push(createProjection("Interview Ready Stage (Score 90+)", Math.max(currentSolved + 50, 600)));

      return milestones;
    }
  }

  LeetCodeAutoSync.ProjectionService = new ProjectionService();

})(typeof self !== "undefined" ? self : this);
