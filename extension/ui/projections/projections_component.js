/**
 * ProjectionsComponent
 * Renders Growth Explanation lists and Future Milestone Predictions.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class ProjectionsComponent {
    /**
     * Render growth explanations & milestone forecasts inside container.
     * @param {HTMLElement} container
     * @param {Array} projections
     * @param {Array} growthExplanations
     */
    render(container, projections = [], growthExplanations = []) {
      if (!container) return;

      container.innerHTML = `
        <div class="projections-wrapper">
          <div class="growth-explanation-box">
            <h3 class="projection-section-title">Why Your Score Improved</h3>
            <ul class="growth-list">
              ${growthExplanations.map((exp) => `<li>✔ ${exp}</li>`).join("")}
            </ul>
          </div>

          <div class="milestones-forecast-box">
            <h3 class="projection-section-title">Milestone Targets & Predictions</h3>
            <div class="projections-list">
              ${projections.map((p) => `
                <div class="projection-card">
                  <div class="proj-header">
                    <span class="proj-name">${p.targetName}</span>
                    <span class="proj-date">${p.projectedDate}</span>
                  </div>
                  <div class="proj-body">
                    <span>Target: ${p.targetVal} problems (${p.daysRemaining} days remaining)</span>
                    <span class="proj-confidence">Range: ${p.confidenceLowDate} → ${p.confidenceHighDate}</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.ProjectionsComponent = new ProjectionsComponent();

})(typeof self !== "undefined" ? self : this);
