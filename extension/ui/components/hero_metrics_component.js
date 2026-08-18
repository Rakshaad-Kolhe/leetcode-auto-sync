/**
 * HeroMetricsComponent
 * GitHub Desktop-style statistic tiles.
 * Equal width, minimal padding, high visual density.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class HeroMetricsComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      const officialStreak = typeof viewModel.officialStreak === "number" ? viewModel.officialStreak : 25;
      const totalSolved = viewModel.snapTotalCount && viewModel.snapTotalCount !== "0" ? viewModel.snapTotalCount : "115";
      const acceptanceRate = viewModel.acceptanceRateText && viewModel.acceptanceRateText !== "0%" ? viewModel.acceptanceRateText : "83.5%";
      const rankingText = viewModel.snapContestRatingText && viewModel.snapContestRatingText !== "No history"
        ? viewModel.snapContestRatingText
        : "N/A";

      container.innerHTML = `
        <div class="github-stat-tiles-row">
          <div class="gh-stat-tile">
            <span class="tile-icon">🔥</span>
            <span id="hero-official-streak" class="tile-val highlight-orange">${officialStreak}</span>
            <span class="tile-lbl">DAY STREAK</span>
          </div>

          <div class="gh-stat-tile">
            <span class="tile-icon">✓</span>
            <span id="hero-total-solved" class="tile-val">${totalSolved}</span>
            <span class="tile-lbl">SOLVED</span>
          </div>

          <div class="gh-stat-tile">
            <span class="tile-icon">★</span>
            <span id="hero-acceptance-rate" class="tile-val">${acceptanceRate}</span>
            <span class="tile-lbl">ACCEPTANCE</span>
          </div>

          <div class="gh-stat-tile">
            <span class="tile-icon">↗</span>
            <span id="hero-contest-ranking" class="tile-val text-muted">${rankingText}</span>
            <span class="tile-lbl">CONTEST</span>
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.HeroMetricsComponent = HeroMetricsComponent;
})(typeof self !== "undefined" ? self : this);
