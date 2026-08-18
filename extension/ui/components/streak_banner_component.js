globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

/**
 * StreakBannerComponent
 * Renders a full-width amber banner for milestone streaks (e.g. 7, 30, 50, 100-day).
 * Hidden when no milestone is reached.
 */
globalThis.LeetCodeAutoSync.StreakBannerComponent = {
  MILESTONES: [7, 14, 21, 30, 50, 60, 90, 100, 150, 200, 365],

  getBannerText: function(streak) {
    if (streak >= 365) return 'Legendary! ' + streak + ' day streak';
    if (streak >= 100) return 'Unstoppable! ' + streak + ' day streak';
    if (streak >= 60)  return 'On fire! ' + streak + ' day streak';
    if (streak >= 30)  return 'Incredible! ' + streak + ' day streak';
    if (streak >= 14)  return 'Amazing! ' + streak + ' day streak';
    if (streak >= 7)   return 'Great start! ' + streak + ' day streak';
    return null;
  },

  render: function(viewModel, container) {
    if (!container) return;

    const streak = (viewModel && typeof viewModel.officialStreak === 'number') ? viewModel.officialStreak : 0;
    const isMilestone = this.MILESTONES.includes(streak) || streak >= 30;
    const text = this.getBannerText(streak);

    if (!isMilestone || !text) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="streak-banner" role="status" aria-live="polite">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef9f27" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
          <path d="M4 22h16"></path>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path>
        </svg>
        <span class="streak-banner-text">${text}</span>
      </div>
    `;
  }
};
