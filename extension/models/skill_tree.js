/**
 * Domain model for hierarchical skill tree nodes and learning dependencies.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  /**
   * Status enumeration for skill nodes.
   * @readonly
   * @enum {string}
   */
  const SkillStatus = {
    MASTERED: "Mastered",
    LEARNING: "Learning",
    NOT_STARTED: "Not Started"
  };

  class SkillNode {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.id = options.id || "";
      this.name = options.name || "";
      this.category = options.category || "Algorithms";
      this.status = options.status || SkillStatus.NOT_STARTED;
      this.progress = typeof options.progress === "number" ? Math.max(0, Math.min(100, Math.round(options.progress))) : 0;
      this.solvedCount = options.solvedCount || 0;
      this.requiredCount = options.requiredCount || 10;
      this.recommendedProblem = options.recommendedProblem || "";
      this.estimatedDays = options.estimatedDays || 3;
      this.prerequisites = Array.isArray(options.prerequisites) ? options.prerequisites : [];
      this.children = Array.isArray(options.children)
        ? options.children.map((c) => (c instanceof SkillNode ? c : new SkillNode(c)))
        : [];
    }

    toJSONObject() {
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        status: this.status,
        progress: this.progress,
        solvedCount: this.solvedCount,
        requiredCount: this.requiredCount,
        recommendedProblem: this.recommendedProblem,
        estimatedDays: this.estimatedDays,
        prerequisites: [...this.prerequisites],
        children: this.children.map((c) => c.toJSONObject())
      };
    }

    static fromJSON(json) {
      if (!json) return new SkillNode();
      return new SkillNode(json);
    }
  }

  LeetCodeAutoSync.SkillStatus = SkillStatus;
  LeetCodeAutoSync.SkillNode = SkillNode;

})(typeof self !== "undefined" ? self : this);
