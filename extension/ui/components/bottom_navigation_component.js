globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.BottomNavigationComponent = {
  _currentActiveTabId: 'dashboard',

  setActiveTab: function(tabId) {
    if (tabId) this._currentActiveTabId = tabId;
  },

  render: function(viewModel, container) {
    if (!container) return;

    const currentTab = this._currentActiveTabId || 'dashboard';

    const tabs = [
      {
        id: 'dashboard', label: 'Dashboard', active: currentTab === 'dashboard',
        icon: `<rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
               <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
               <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
               <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>`
      },
      {
        id: 'activity', label: 'Activity', active: currentTab === 'activity',
        icon: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>`
      },
      {
        id: 'analytics', label: 'Analytics', active: currentTab === 'analytics',
        icon: `<line x1="18" y1="20" x2="18" y2="10"></line>
               <line x1="12" y1="20" x2="12" y2="4"></line>
               <line x1="6" y1="20" x2="6" y2="14"></line>`
      },
      {
        id: 'repo', label: 'Repo', active: currentTab === 'repo',
        icon: `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>`
      },
      {
        id: 'diagnostics', label: 'Diagnostics', active: currentTab === 'diagnostics',
        icon: `<rect x="3" y="3" width="18" height="18" rx="2.5"></rect>
               <polyline points="7 9 10 12 7 15"></polyline>
               <line x1="12" y1="15" x2="16" y2="15"></line>`
      },
      {
        id: 'settings', label: 'Settings', active: currentTab === 'settings',
        icon: `<circle cx="12" cy="12" r="3"></circle>
               <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>`
      }
    ];

    const tabHTML = tabs.map(t => `
      <button class="nav-item${t.active ? ' active' : ''}" data-tab="${t.id}" aria-label="${t.label} tab">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          ${t.icon}
        </svg>
        <span>${t.label}</span>
        ${t.active ? '<div class="nav-indicator" aria-hidden="true"></div>' : ''}
      </button>
    `).join('');

    container.innerHTML = `<nav class="bottom-nav" aria-label="Main Navigation">${tabHTML}</nav>`;

    const navItems = container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        if (tab) {
          this._currentActiveTabId = tab;
        }

        navItems.forEach(i => {
          i.classList.remove('active');
          const ind = i.querySelector('.nav-indicator');
          if (ind) ind.remove();
        });

        item.classList.add('active');
        const indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        item.appendChild(indicator);
      });
    });
  }
};
