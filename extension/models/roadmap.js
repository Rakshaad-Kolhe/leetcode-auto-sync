/**
 * Domain model for standard and custom learning plans.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class RoadmapPlan {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.id = options.id || "";
      this.name = options.name || "";
      this.description = options.description || "";
      this.total = options.total || 0;
      this.completed = options.completed || 0;
      this.remaining = options.remaining || 0;
      this.percentage = typeof options.percentage === "number" ? Math.max(0, Math.min(100, Math.round(options.percentage))) : 0;
      this.estCompletionDays = options.estCompletionDays || 0;
      this.targetTopics = Array.isArray(options.targetTopics) ? options.targetTopics : [];
    }

    toJSONObject() {
      return {
        id: this.id,
        name: this.name,
        description: this.description,
        total: this.total,
        completed: this.completed,
        remaining: this.remaining,
        percentage: this.percentage,
        estCompletionDays: this.estCompletionDays,
        targetTopics: [...this.targetTopics]
      };
    }

    static fromJSON(json) {
      if (!json) return new RoadmapPlan();
      return new RoadmapPlan(json);
    }
  }

  LeetCodeAutoSync.RoadmapPlan = RoadmapPlan;

})(typeof self !== "undefined" ? self : this);
