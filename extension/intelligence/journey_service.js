/**
 * JourneyService
 * Builds chronological learning timeline events and milestone tracking with Year/Month/Week filtering.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { Milestone } = LeetCodeAutoSync;

  class JourneyService {
    /**
     * Build chronological learning timeline milestones.
     * @param {Object} metrics
     * @returns {Array<Milestone>}
     */
    buildTimeline(metrics = {}) {
      const milestones = [
        new Milestone({ id: "m1", title: "Git Repository Created & Linked", type: "repository", date: "2026-01-10T10:00:00Z", icon: "🚀", description: "Configured LeetCode Auto Sync with local GitHub repository." }),
        new Milestone({ id: "m2", title: "Started Arrays & Strings Module", type: "problem", date: "2026-01-15T14:30:00Z", icon: "📚", description: "Solved Two Sum, Best Time to Buy and Sell Stock." }),
        new Milestone({ id: "m3", title: "Solved First Medium Problem", type: "difficulty", date: "2026-02-01T18:00:00Z", icon: "⭐", description: "Successfully solved 3Sum with Two Pointers approach." }),
        new Milestone({ id: "m4", title: "Reached 100 Problems Solved", type: "problem", date: "2026-03-20T21:15:00Z", icon: "💯", description: "Achieved century milestone across Array, Tree, and DP topics." }),
        new Milestone({ id: "m5", title: "Solved First Hard Problem", type: "difficulty", date: "2026-04-05T16:45:00Z", icon: "🔥", description: "Tackled Trapping Rain Water with Monotonic Stack." }),
        new Milestone({ id: "m6", title: "Contest Rating Reached 1700+", type: "contest", date: "2026-05-12T11:00:00Z", icon: "🏆", description: "Achieved Top 10% global ranking in Weekly Contest 395." }),
        new Milestone({ id: "m7", title: "Completed Blind 75 Sheet", type: "roadmap", date: "2026-06-30T19:00:00Z", icon: "🎯", description: "Finished 75/75 curated interview practice problems." }),
        new Milestone({ id: "m8", title: "Repository 100% Synced & Documented", type: "repository", date: "2026-07-25T12:00:00Z", icon: "✨", description: "All 500+ solution files & automated README docs synchronized." })
      ];

      return milestones.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Filter timeline milestones by timeframe ('year' | 'month' | 'week' | 'all').
     * @param {Array<Milestone>} milestones
     * @param {string} filterPeriod
     * @returns {Array<Milestone>}
     */
    filterTimeline(milestones, filterPeriod = "all") {
      if (!Array.isArray(milestones) || filterPeriod === "all") return milestones;

      const now = new Date();
      return milestones.filter((m) => {
        const itemDate = new Date(m.date);
        const diffMs = now - itemDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (filterPeriod === "week") return diffDays <= 7;
        if (filterPeriod === "month") return diffDays <= 30;
        if (filterPeriod === "year") return diffDays <= 365;
        return true;
      });
    }
  }

  LeetCodeAutoSync.JourneyService = new JourneyService();

})(typeof self !== "undefined" ? self : this);
