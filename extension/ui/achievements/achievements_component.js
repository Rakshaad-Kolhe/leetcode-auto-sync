/**
 * AchievementsComponent
 * Renders Engineering Achievement Badges grid with progress bars.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class AchievementsComponent {
    /**
     * Render achievements inside container.
     * @param {HTMLElement} container
     * @param {Array} achievements
     */
    render(container, achievements = []) {
      if (!container) return;

      container.innerHTML = `
        <div class="achievements-wrapper">
          <div class="achievements-header">
            <span class="achievements-title">Engineering Accomplishments</span>
            <span class="achievements-count">${achievements.filter((a) => a.unlocked).length} / ${achievements.length} Unlocked</span>
          </div>

          <div class="achievements-grid">
            ${achievements.map((a) => `
              <div class="achievement-card ${a.unlocked ? "unlocked" : "locked"}">
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-details">
                  <span class="achievement-title">${a.title}</span>
                  <span class="achievement-desc">${a.description}</span>
                  <div class="category-progress-bg" style="margin-top: 4px;">
                    <div class="category-progress-fill" style="width: ${a.progress}%"></div>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.AchievementsComponent = new AchievementsComponent();

})(typeof self !== "undefined" ? self : this);
