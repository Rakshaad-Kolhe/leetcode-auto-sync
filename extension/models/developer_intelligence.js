/**
 * Domain data model for Developer Intelligence Score and breakdown metrics.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  /**
   * Represents score details for an individual category.
   */
  class CategoryScore {
    /**
     * @param {Object} options
     * @param {string} options.id - Category identifier (e.g., 'problemDiversity')
     * @param {string} options.name - Display name (e.g., 'Problem Diversity')
     * @param {number} options.score - Category score (0-100)
     * @param {number} options.weight - Weight ratio in overall calculation (0-1)
     * @param {Object} options.measures - Key quantitative input metrics
     * @param {string} options.formula - Human-readable explanation of formula
     * @param {string} options.reasoning - Why this score was computed
     * @param {string} options.suggestion - Specific actionable improvement advice
     */
    constructor(options = {}) {
      this.id = options.id || "";
      this.name = options.name || "";
      this.score = typeof options.score === "number" ? Math.max(0, Math.min(100, Math.round(options.score))) : 0;
      this.weight = typeof options.weight === "number" ? options.weight : 0;
      this.measures = options.measures || {};
      this.formula = options.formula || "";
      this.reasoning = options.reasoning || "";
      this.suggestion = options.suggestion || "";
    }

    toJSONObject() {
      return {
        id: this.id,
        name: this.name,
        score: this.score,
        weight: this.weight,
        measures: { ...this.measures },
        formula: this.formula,
        reasoning: this.reasoning,
        suggestion: this.suggestion
      };
    }

    static fromJSON(json) {
      if (!json) return new CategoryScore();
      return new CategoryScore(json);
    }
  }

  /**
   * Represents structured recommendation output.
   */
  class IntelligenceRecommendation {
    constructor(options = {}) {
      this.type = options.type || "topic"; // 'topic' | 'difficulty' | 'revision' | 'roadmap' | 'contest' | 'repository'
      this.title = options.title || "";
      this.subtitle = options.subtitle || "";
      this.reason = options.reason || "";
      this.targetValue = options.targetValue || "";
      this.estimatedTime = options.estimatedTime || "";
      this.problemCount = options.problemCount || 0;
      this.items = Array.isArray(options.items) ? options.items : [];
    }

    toJSONObject() {
      return {
        type: this.type,
        title: this.title,
        subtitle: this.subtitle,
        reason: this.reason,
        targetValue: this.targetValue,
        estimatedTime: this.estimatedTime,
        problemCount: this.problemCount,
        items: [...this.items]
      };
    }

    static fromJSON(json) {
      if (!json) return new IntelligenceRecommendation();
      return new IntelligenceRecommendation(json);
    }
  }

  /**
   * Represents historical trend comparative metrics.
   */
  class IntelligenceTrend {
    constructor(options = {}) {
      this.weekly = options.weekly || "+0%";
      this.monthly = options.monthly || "+0%";
      this.quarterly = options.quarterly || "+0%";
      this.yearly = options.yearly || "+0%";
      this.direction = options.direction || "STABLE"; // 'UP' | 'DOWN' | 'STABLE'
      this.arrow = options.arrow || "→"; // '↑' | '↓' | '→'
    }

    toJSONObject() {
      return {
        weekly: this.weekly,
        monthly: this.monthly,
        quarterly: this.quarterly,
        yearly: this.yearly,
        direction: this.direction,
        arrow: this.arrow
      };
    }

    static fromJSON(json) {
      if (!json) return new IntelligenceTrend();
      return new IntelligenceTrend(json);
    }
  }

  /**
   * Complete Developer Intelligence Report model.
   */
  class DeveloperIntelligence {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.version = options.version || "1.0.0";
      this.lastComputed = options.lastComputed || new Date().toISOString();
      this.overallScore = typeof options.overallScore === "number" ? Math.max(0, Math.min(100, Math.round(options.overallScore))) : 0;
      
      this.readinessLevel = options.readinessLevel || "Intermediate"; // 'Novice' | 'Intermediate' | 'Proficient' | 'Advanced' | 'Interview Ready'
      this.learningMomentum = options.learningMomentum || "Moderate"; // 'Low' | 'Moderate' | 'High' | 'Peak'
      this.repositoryHealth = options.repositoryHealth || "Healthy"; // 'Critical' | 'Needs Attention' | 'Healthy' | 'Optimal'
      this.growthTrend = options.growthTrend || "↗ Improving"; // '↗ Improving' | '↓ Declining' | '→ Stable'

      this.categoryScores = {};
      if (options.categoryScores) {
        Object.keys(options.categoryScores).forEach((catKey) => {
          this.categoryScores[catKey] = options.categoryScores[catKey] instanceof CategoryScore
            ? options.categoryScores[catKey]
            : CategoryScore.fromJSON(options.categoryScores[catKey]);
        });
      }

      this.strengths = Array.isArray(options.strengths) ? options.strengths : [];
      this.weaknesses = Array.isArray(options.weaknesses) ? options.weaknesses : [];

      this.recommendations = Array.isArray(options.recommendations)
        ? options.recommendations.map((r) => (r instanceof IntelligenceRecommendation ? r : IntelligenceRecommendation.fromJSON(r)))
        : [];

      this.roadmaps = Array.isArray(options.roadmaps) ? options.roadmaps : [];

      this.trends = options.trends
        ? (options.trends instanceof IntelligenceTrend ? options.trends : IntelligenceTrend.fromJSON(options.trends))
        : new IntelligenceTrend();
    }

    toJSONObject() {
      const categoryObj = {};
      Object.keys(this.categoryScores).forEach((key) => {
        categoryObj[key] = this.categoryScores[key].toJSONObject();
      });

      return {
        version: this.version,
        lastComputed: this.lastComputed,
        overallScore: this.overallScore,
        readinessLevel: this.readinessLevel,
        learningMomentum: this.learningMomentum,
        repositoryHealth: this.repositoryHealth,
        growthTrend: this.growthTrend,
        categoryScores: categoryObj,
        strengths: [...this.strengths],
        weaknesses: [...this.weaknesses],
        recommendations: this.recommendations.map((r) => r.toJSONObject()),
        roadmaps: [...this.roadmaps],
        trends: this.trends.toJSONObject()
      };
    }

    static fromJSON(json) {
      if (!json) return new DeveloperIntelligence();
      return new DeveloperIntelligence(json);
    }
  }

  LeetCodeAutoSync.CategoryScore = CategoryScore;
  LeetCodeAutoSync.IntelligenceRecommendation = IntelligenceRecommendation;
  LeetCodeAutoSync.IntelligenceTrend = IntelligenceTrend;
  LeetCodeAutoSync.DeveloperIntelligence = DeveloperIntelligence;

})(typeof self !== "undefined" ? self : this);
