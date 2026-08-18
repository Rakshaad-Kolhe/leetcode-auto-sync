/**
 * Domain data model for the complete Developer Intelligence Report (Phase 2 Landing Experience).
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class DeveloperReport {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.version = options.version || "2.0.0";
      this.lastUpdated = options.lastUpdated || new Date().toISOString();
      this.overallScore = typeof options.overallScore === "number" ? Math.max(0, Math.min(100, Math.round(options.overallScore))) : 0;
      
      this.readinessLevel = options.readinessLevel || "Intermediate"; // 'Novice' | 'Intermediate' | 'Proficient' | 'Advanced' | 'Interview Ready'
      this.growthTrend = options.growthTrend || "↗ Improving";
      this.learningMomentum = options.learningMomentum || "High";
      this.repositoryHealth = options.repositoryHealth || "Healthy";

      this.dailyBrief = options.dailyBrief || {
        greeting: "Good Day",
        yesterdaySolved: 3,
        streakDays: 64,
        suggestedFocus: "Hard Dynamic Programming",
        estPracticeMins: 42,
        upcomingContest: "Saturday Weekly Contest 410"
      };

      this.developerDNA = options.developerDNA || {
        recursionVsIterative: "60% Iterative / 40% Recursive",
        dfsVsBfs: "DFS Preferred (68%)",
        topDataStructure: "Hash Table & Array",
        avgSolutionLength: "34 lines",
        optimizationFocus: "Time Complexity Optimized"
      };

      this.personalBests = options.personalBests || {
        longestStreak: 64,
        mostSolvedInOneDay: 8,
        fastestHardMs: 1420,
        largestContestGain: 145,
        mostProductiveMonth: "May 2026"
      };

      this.yesterdayVsToday = options.yesterdayVsToday || {
        solvedDelta: "+3",
        ratingDelta: "+12",
        repoSyncDelta: "+3 files",
        coverageDelta: "+2%"
      };

      this.categoryScores = options.categoryScores || {};
      this.strengths = Array.isArray(options.strengths) ? options.strengths : [];
      this.weaknesses = Array.isArray(options.weaknesses) ? options.weaknesses : [];
      this.recommendations = Array.isArray(options.recommendations) ? options.recommendations : [];
      this.companyReadiness = options.companyReadiness || {};
      this.projections = Array.isArray(options.projections) ? options.projections : [];
      this.achievements = Array.isArray(options.achievements) ? options.achievements : [];
      this.repoEvolution = options.repoEvolution || {};
    }

    toJSONObject() {
      return {
        version: this.version,
        lastUpdated: this.lastUpdated,
        overallScore: this.overallScore,
        readinessLevel: this.readinessLevel,
        growthTrend: this.growthTrend,
        learningMomentum: this.learningMomentum,
        repositoryHealth: this.repositoryHealth,
        dailyBrief: { ...this.dailyBrief },
        developerDNA: { ...this.developerDNA },
        personalBests: { ...this.personalBests },
        yesterdayVsToday: { ...this.yesterdayVsToday },
        categoryScores: { ...this.categoryScores },
        strengths: [...this.strengths],
        weaknesses: [...this.weaknesses],
        recommendations: [...this.recommendations],
        companyReadiness: { ...this.companyReadiness },
        projections: [...this.projections],
        achievements: [...this.achievements],
        repoEvolution: { ...this.repoEvolution }
      };
    }

    static fromJSON(json) {
      if (!json) return new DeveloperReport();
      return new DeveloperReport(json);
    }
  }

  LeetCodeAutoSync.DeveloperReport = DeveloperReport;

})(typeof self !== "undefined" ? self : this);
