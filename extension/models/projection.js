/**
 * Domain model for future pace projections and milestone prediction targets.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class FutureProjection {
    /**
     * @param {Object} options
     */
    constructor(options = {}) {
      this.targetName = options.targetName || "";
      this.currentVal = options.currentVal || 0;
      this.targetVal = options.targetVal || 1000;
      this.projectedDate = options.projectedDate || "";
      this.daysRemaining = options.daysRemaining || 0;
      this.confidenceLowDate = options.confidenceLowDate || "";
      this.confidenceHighDate = options.confidenceHighDate || "";
      this.dailyRate = typeof options.dailyRate === "number" ? options.dailyRate : 1.5;
    }

    toJSONObject() {
      return {
        targetName: this.targetName,
        currentVal: this.currentVal,
        targetVal: this.targetVal,
        projectedDate: this.projectedDate,
        daysRemaining: this.daysRemaining,
        confidenceLowDate: this.confidenceLowDate,
        confidenceHighDate: this.confidenceHighDate,
        dailyRate: this.dailyRate
      };
    }

    static fromJSON(json) {
      if (!json) return new FutureProjection();
      return new FutureProjection(json);
    }
  }

  LeetCodeAutoSync.FutureProjection = FutureProjection;

})(typeof self !== "undefined" ? self : this);
