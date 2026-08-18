/**
 * AnalyticsModels
 * Data models for the Personalized Competitive Programming Analytics Engine.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  /**
   * ProblemAnalyticsModel
   * Normalized representation of a problem for analytics and recommendation evaluation.
   */
  class ProblemAnalyticsModel {
    constructor(data = {}) {
      this.frontendId = data.frontendId != null ? String(data.frontendId).trim() : null;
      this.titleSlug = data.titleSlug ? String(data.titleSlug).toLowerCase().trim() : "";
      this.title = data.title ? String(data.title).trim() : this.titleSlug;
      this.difficulty = ["Easy", "Medium", "Hard"].includes(data.difficulty) ? data.difficulty : null;
      this.topics = Array.isArray(data.topics) ? data.topics.map(t => String(t).trim()).filter(Boolean) : [];
      this.patterns = Array.isArray(data.patterns) ? data.patterns.map(p => String(p).trim()).filter(Boolean) : [];
      this.solved = Boolean(data.solved);
      this.solvedAt = data.solvedAt ? String(data.solvedAt) : null;
      this.curatedLists = Array.isArray(data.curatedLists) ? data.curatedLists.map(l => String(l).trim()).filter(Boolean) : [];
      this.source = data.source ? String(data.source) : "unknown";
    }

    static create(data) {
      return new ProblemAnalyticsModel(data);
    }
  }

  /**
   * SkillScore
   * Metrics evaluating a user's mastery level in a specific topic or pattern.
   */
  class SkillScore {
    constructor(data = {}) {
      this.name = data.name ? String(data.name).trim() : "";
      this.solvedCount = typeof data.solvedCount === "number" ? Math.max(0, data.solvedCount) : 0;
      this.recentSolvedCount = typeof data.recentSolvedCount === "number" ? Math.max(0, data.recentSolvedCount) : 0;
      this.difficultyScore = typeof data.difficultyScore === "number" ? Number(data.difficultyScore.toFixed(2)) : 0.0;
      this.coverageScore = typeof data.coverageScore === "number" ? Number(data.coverageScore.toFixed(2)) : 0.0;
      this.recencyScore = typeof data.recencyScore === "number" ? Number(data.recencyScore.toFixed(2)) : 0.0;
      this.strengthScore = typeof data.strengthScore === "number" ? Number(data.strengthScore.toFixed(2)) : 0.0;
      this.confidence = typeof data.confidence === "number" ? Number(data.confidence.toFixed(2)) : 0.0;
      
      // Classification: KNOWN, DEVELOPING, UNDER-PRACTICED, UNKNOWN
      const validClassifications = ["KNOWN", "DEVELOPING", "UNDER-PRACTICED", "UNKNOWN"];
      this.classification = validClassifications.includes(data.classification) ? data.classification : "UNKNOWN";
    }

    static create(data) {
      return new SkillScore(data);
    }
  }

  /**
   * SkillGap
   * Identified skill area requiring focused practice or introduction.
   */
  class SkillGap {
    constructor(data = {}) {
      this.name = data.name ? String(data.name).trim() : "";
      this.score = typeof data.score === "number" ? Number(data.score.toFixed(2)) : 0.0;
      this.reason = data.reason ? String(data.reason).trim() : "Limited practice detected.";
      this.solvedCount = typeof data.solvedCount === "number" ? Math.max(0, data.solvedCount) : 0;
      this.recommendedNext = Boolean(data.recommendedNext);
    }

    static create(data) {
      return new SkillGap(data);
    }
  }

  /**
   * ProblemRecommendation
   * Scored problem candidate with rationale for user study plan.
   */
  class ProblemRecommendation {
    constructor(data = {}) {
      this.frontendId = data.frontendId != null ? String(data.frontendId).trim() : null;
      this.titleSlug = data.titleSlug ? String(data.titleSlug).toLowerCase().trim() : "";
      this.title = data.title ? String(data.title).trim() : this.titleSlug;
      this.difficulty = data.difficulty ? String(data.difficulty) : "Medium";
      this.topics = Array.isArray(data.topics) ? data.topics.map(t => String(t).trim()).filter(Boolean) : [];
      this.patterns = Array.isArray(data.patterns) ? data.patterns.map(p => String(p).trim()).filter(Boolean) : [];
      this.score = typeof data.score === "number" ? Number(data.score.toFixed(2)) : 0.0;
      this.confidence = typeof data.confidence === "number" ? Number(data.confidence.toFixed(2)) : 0.85;
      this.reasons = Array.isArray(data.reasons) ? data.reasons.map(r => String(r).trim()).filter(Boolean) : [];
      this.priority = typeof data.priority === "number" ? Math.max(1, data.priority) : 1;
    }

    static create(data) {
      return new ProblemRecommendation(data);
    }
  }

  /**
   * PersonalPlan
   * Complete study plan and skill profile generated for the user.
   */
  class PersonalPlan {
    constructor(data = {}) {
      this.generatedAt = data.generatedAt ? String(data.generatedAt) : new Date().toISOString();
      this.basedOnSolvedCount = typeof data.basedOnSolvedCount === "number" ? Math.max(0, data.basedOnSolvedCount) : 0;
      this.focusSkill = data.focusSkill ? String(data.focusSkill).trim() : null;
      this.skillGaps = Array.isArray(data.skillGaps) ? data.skillGaps.map(g => SkillGap.create(g)) : [];
      this.strengths = Array.isArray(data.strengths) ? data.strengths.map(s => SkillScore.create(s)) : [];
      this.nextProblem = data.nextProblem ? ProblemRecommendation.create(data.nextProblem) : null;
      this.nextProblems = Array.isArray(data.nextProblems) ? data.nextProblems.map(p => ProblemRecommendation.create(p)) : [];
      this.confidence = typeof data.confidence === "number" ? Number(data.confidence.toFixed(2)) : 0.85;
      
      const validSources = ["repository", "repository+graphql", "cache"];
      this.source = validSources.includes(data.source) ? data.source : "repository";
    }

    static create(data) {
      return new PersonalPlan(data);
    }
  }

  // Export to namespace
  LeetCodeAutoSync.ProblemAnalyticsModel = ProblemAnalyticsModel;
  LeetCodeAutoSync.SkillScore = SkillScore;
  LeetCodeAutoSync.SkillGap = SkillGap;
  LeetCodeAutoSync.ProblemRecommendation = ProblemRecommendation;
  LeetCodeAutoSync.PersonalPlan = PersonalPlan;

  // Node.js module export support
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ProblemAnalyticsModel,
      SkillScore,
      SkillGap,
      ProblemRecommendation,
      PersonalPlan
    };
  }

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
