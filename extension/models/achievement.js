/**
 * Domain model for Engineering Achievements and Badges.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class Achievement {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.id = options.id || "";
      this.title = options.title || "";
      this.description = options.description || "";
      this.icon = options.icon || "🏆";
      this.unlocked = typeof options.unlocked === "boolean" ? options.unlocked : false;
      this.unlockedAt = options.unlockedAt || null;
      this.progress = typeof options.progress === "number" ? Math.max(0, Math.min(100, Math.round(options.progress))) : 0;
      this.category = options.category || "General"; // 'Problem Solving' | 'Repository' | 'Contest' | 'Streak'
    }

    toJSONObject() {
      return {
        id: this.id,
        title: this.title,
        description: this.description,
        icon: this.icon,
        unlocked: this.unlocked,
        unlockedAt: this.unlockedAt,
        progress: this.progress,
        category: this.category
      };
    }

    static fromJSON(json) {
      if (!json) return new Achievement();
      return new Achievement(json);
    }
  }

  LeetCodeAutoSync.Achievement = Achievement;

})(typeof self !== "undefined" ? self : this);
