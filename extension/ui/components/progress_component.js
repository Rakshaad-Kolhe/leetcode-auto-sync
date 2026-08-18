globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.ProgressComponent = {
  render: function(viewModel, container) {
    if (!container) return;

    // Check data store canonical curatedLists state
    const store = globalThis.LeetCodeAutoSync.DeveloperDataStore;
    const curatedListsState = (store && store.curatedLists)
      ? store.curatedLists
      : (viewModel && viewModel.curatedLists ? viewModel.curatedLists : null);

    const extIcon = `
      <svg class="progress-ext-icon" width="13" height="13" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>`;

    // Render helper for explicit states
    const renderComponentState = (state) => {
      const isHydrated = state && state.hydrated;
      const status = state ? state.status : (isHydrated ? "ready" : "loading");
      const items = (state && Array.isArray(state.progress)) ? state.progress : [];

      // STATE 1: Loading State (Unhydrated or Status Loading)
      if (!isHydrated || status === "loading") {
        container.innerHTML = `
          <div class="progress-card loading-state" role="region" aria-label="Loading curated progress">
            <div class="progress-header">
              <span class="card-title">Curated Lists</span>
              <span class="card-sub"><span class="pulse-dot"></span> Loading verified progress...</span>
            </div>
            <div class="progress-rows">
              <div class="skeleton-item"><div class="skeleton-line shimmer"></div><div class="skeleton-bar shimmer"></div></div>
              <div class="skeleton-item"><div class="skeleton-line shimmer"></div><div class="skeleton-bar shimmer"></div></div>
              <div class="skeleton-item"><div class="skeleton-line shimmer"></div><div class="skeleton-bar shimmer"></div></div>
            </div>
          </div>
        `;
        return;
      }

      // STATE 3: Error State
      if (status === "error" || (state && state.error)) {
        container.innerHTML = `
          <div class="progress-card error-state" role="region" aria-label="Error loading curated progress">
            <div class="progress-header">
              <span class="card-title">Curated Lists</span>
              <span class="card-sub red">Unable to compute</span>
            </div>
            <div class="progress-error-body">
              <p class="error-text">${state && state.error ? state.error : 'Failed to synchronize curated list progress.'}</p>
              <button class="retry-btn" id="retry-curated-btn">Retry Sync</button>
            </div>
          </div>
        `;

        const retryBtn = container.querySelector('#retry-curated-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            if (store && store.hydrateCuratedLists) {
              store.hydrateCuratedLists();
            }
          });
        }
        return;
      }

      const renderRow = (item) => {
        let colorClass = "green";
        const idLower = String(item.id || item.name || "").toLowerCase();
        if (idLower.includes("neetcode")) {
          colorClass = "orange";
        } else if (idLower.includes("leetcode") || idLower.includes("lc75")) {
          colorClass = "pink";
        }

        return `
          <div class="progress-item" data-url="${item.sourceUrl}" role="button" tabindex="0" aria-label="Open ${item.name} list">
            <div class="progress-item-top">
              <span class="progress-label">${item.name}</span>
              <div class="progress-meta">
                <span class="progress-pct ${colorClass}">${item.percentage}%</span>
                <span class="progress-count">${item.solved} / ${item.total}</span>
                ${extIcon}
              </div>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${colorClass}" style="width:${Math.min(100, Math.max(0, item.percentage))}%"></div>
            </div>
          </div>`;
      };

      container.innerHTML = `
        <div class="progress-card" role="region" aria-labelledby="progress-title">
          <div class="progress-header">
            <span id="progress-title" class="card-title">Curated Lists</span>
            <span class="card-sub">Verified</span>
          </div>
          <div class="progress-rows">
            ${items.length > 0 ? items.map(renderRow).join('') : '<div class="progress-empty">Dataset unavailable</div>'}
          </div>
        </div>
      `;

      container.querySelectorAll('.progress-item').forEach(item => {
        const open = () => {
          const url = item.getAttribute('data-url');
          if (!url || url === '#') return;
          if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url });
          } else {
            window.open(url, '_blank');
          }
        };
        item.addEventListener('click', open);
        item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
      });
    };

    // Render initial state
    renderComponentState(curatedListsState);

    // Observer subscription for reactive event updates
    if (store && store.onCuratedProgressUpdated) {
      if (container._unsubscribeCurated) {
        container._unsubscribeCurated();
      }
      container._unsubscribeCurated = store.onCuratedProgressUpdated((newState) => {
        renderComponentState(newState);
      });
    }
  }
};

