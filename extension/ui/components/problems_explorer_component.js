globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.ProblemsExplorerComponent = {
  render: function(viewModel, container) {
    if (!container) return;

    container.innerHTML = `
      <div class="explorer-card">
        <div class="explorer-info">
          <span id="next-action-title" class="card-title">Problems Explorer</span>
          <span class="card-sub">Browse and filter all problems</span>
        </div>
        <button class="btn-browse" aria-label="Browse LeetCode Problems">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Browse</span>
        </button>
      </div>
    `;

    const openProblemset = () => {
      const url = 'https://leetcode.com/problemset/';
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
    };

    const browseBtn = container.querySelector('.btn-browse');
    const card      = container.querySelector('.explorer-card');

    if (browseBtn) browseBtn.addEventListener('click', e => { e.stopPropagation(); openProblemset(); });
    if (card)      card.addEventListener('click', openProblemset);
  }
};
