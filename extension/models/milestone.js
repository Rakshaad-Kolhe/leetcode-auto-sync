/**
 * Domain model for learning journey milestones.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class Milestone {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.id = options.id || "";
      this.title = options.title || "";
      this.date = options.date || new Date().toISOString();
      this.type = options.type || "problem"; // 'problem' | 'difficulty' | 'streak' | 'contest' | 'repository' | 'roadmap'
      this.icon = options.icon || "📌";
      this.description = options.description || "";
    }

    toJSONObject() {
      return {
        id: this.id,
        title: this.title,
        date: this.date,
        type: this.type,
        icon: this.icon,
        description: this.description
      };
    }

    static fromJSON(json) {
      if (!json) return new Milestone();
      return new Milestone(json);
    }
  }

  LeetCodeAutoSync.Milestone = Milestone;

})(typeof self !== "undefined" ? self : this);
