/**
 * DailyBriefComponent
 * Renders the Daily Brief landing experience (Yesterday's accomplishments, today's focus, contest alert).
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class DailyBriefComponent {
    /**
     * Render the Daily Brief card inside container.
     * @param {HTMLElement} container
     * @param {Object} dailyBrief
     */
    render(container, dailyBrief = {}) {
      if (!container) return;

      const hour = new Date().getHours();
      let timeGreeting = "Good Morning";
      if (hour >= 12 && hour < 17) timeGreeting = "Good Afternoon";
      else if (hour >= 17) timeGreeting = "Good Evening";

      container.innerHTML = `
        <div class="daily-brief-card">
          <div class="daily-brief-header">
            <span class="brief-greeting">${timeGreeting}, Developer</span>
            <span class="brief-date-tag">${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>

          <div class="daily-brief-grid">
            <div class="brief-stat-box">
              <span class="brief-stat-label">Yesterday Solved</span>
              <span class="brief-stat-val">${dailyBrief.yesterdaySolved || 3}</span>
            </div>
            <div class="brief-stat-box">
              <span class="brief-stat-label">Active Streak</span>
              <span class="brief-stat-val highlight">${dailyBrief.streakDays || 64} Days</span>
            </div>
            <div class="brief-stat-box">
              <span class="brief-stat-label">Repo Health</span>
              <span class="brief-stat-val positive">Healthy</span>
            </div>
          </div>

          <div class="brief-focus-box">
            <span class="focus-title">Suggested Today:</span>
            <span class="focus-topic">${dailyBrief.suggestedFocus || "Hard Dynamic Programming & Graphs"}</span>
            <span class="focus-time">⏱ ${dailyBrief.estPracticeMins || 42} mins practice</span>
          </div>

          <div class="brief-contest-alert">
            <span class="contest-icon">🏆</span>
            <span class="contest-text">${dailyBrief.upcomingContest || "Saturday Weekly Contest 410"}</span>
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.DailyBriefComponent = new DailyBriefComponent();

})(typeof self !== "undefined" ? self : this);
