globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.HeaderComponent = {
  render: function(viewModel, container) {
    if (!container) return;

    const name = (viewModel && (viewModel.displayName || viewModel.username)) ? (viewModel.displayName || viewModel.username) : 'Developer';
    const streakDays = (viewModel && typeof viewModel.officialStreak === 'number') ? viewModel.officialStreak : 0;
    
    const store = globalThis.LeetCodeAutoSync.DeveloperDataStore;
    const isAttended = (store && store.contests && store.contests.attendedCount > 0);
    let contestRatingText = 'N/A';

    const getValidRating = (val) => {
      if (typeof val === 'number' && val > 0) {
        if (val === 1500 && !isAttended) return null;
        return String(Math.round(val));
      }
      return null;
    };

    const vmRating = viewModel ? getValidRating(viewModel.contestRating) : null;
    const storeRating = store && store.contests ? getValidRating(store.contests.rating) : null;

    if (vmRating) {
      contestRatingText = vmRating;
    } else if (storeRating) {
      contestRatingText = storeRating;
    } else if (viewModel && viewModel.contestPillText) {
      const cleaned = String(viewModel.contestPillText).replace(/^🏆\s*/, '').trim();
      if (cleaned && /^\d+$/.test(cleaned) && (cleaned !== '1500' || isAttended)) {
        contestRatingText = cleaned;
      }
    }

    container.innerHTML = `
      <div class="header-card">

        <!-- Left: avatar circle + username side by side (clickable link) -->
        <div class="header-left">
          <a href="https://leetcode.com/u/${encodeURIComponent((viewModel && viewModel.username) || name)}/" target="_blank" rel="noopener noreferrer" class="user-profile-link" title="View LeetCode Profile (${name})">
            <div class="avatar-circle" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span class="user-name">${name}</span>
          </a>
        </div>

        <!-- Right: 🔥 32   🏆 1742 (or N/A)   ⚙ -->
        <div class="header-right">
          <span class="header-stat-inline" title="Official Streak: ${streakDays} days">
            <span class="stat-emoji">🔥</span>
            <span class="stat-val">${streakDays}</span>
          </span>
          <span class="header-stat-inline" title="Contest Rating: ${contestRatingText}">
            <span class="stat-emoji">🏆</span>
            <span class="stat-val">${contestRatingText}</span>
          </span>
          <button class="icon-btn" title="Settings" aria-label="Open Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    const settingsBtn = container.querySelector('.icon-btn[title="Settings"]');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
        } else {
          window.open('../dashboard/dashboard.html', '_blank');
        }
      });
    }
  }
};
