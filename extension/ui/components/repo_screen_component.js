globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.RepoScreenComponent = {
  _subscribed: false,
  _forcedState: null, // "CONNECTED" | "SCANNING" | "SYNCING" | "PENDING" | "ERROR" | "UNAVAILABLE" | "NOT_CONFIGURED"
  _isScanning: false,
  _isSyncing: false,
  _lastScanCompleted: false,
  _lastSyncCompleted: false,

  /**
   * Helper to open a URL in a new browser tab.
   * @param {string} url
   */
  openUrl: function(url) {
    if (!url) return;
    const cleanUrl = url.replace(/github\.com\/([a-zA-Z0-9]+)_([a-zA-Z0-9_-]+)/i, "github.com/$1-$2");
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: cleanUrl });
    } else if (typeof window !== "undefined" && window.open) {
      window.open(cleanUrl, "_blank");
    }
  },

  render: function(viewModel, container) {
    if (!container) return;

    // 1. Subscribe to reactive updates from DeveloperDataStore
    const { DeveloperDataStore, RepositoryScannerService } = globalThis.LeetCodeAutoSync || {};
    if (!this._subscribed && DeveloperDataStore) {
      this._subscribed = true;
      if (typeof DeveloperDataStore.onDataStoreChanged === "function") {
        DeveloperDataStore.onDataStoreChanged(() => this.render(viewModel, container));
      }
      if (typeof DeveloperDataStore.onCuratedProgressUpdated === "function") {
        DeveloperDataStore.onCuratedProgressUpdated(() => this.render(viewModel, container));
      }
    }

    const store = DeveloperDataStore || {};
    const repo = store.repository || {};
    const stats = store.stats || {};
    const profile = store.profile || {};

    // Determine configured & state
    const isConfigured = repo.configured !== false && (repo.repoPath || repo.repoName || repo.repoUrl || profile.username);
    let connectionState = this._forcedState || repo.status;

    if (!connectionState) {
      if (!isConfigured) {
        connectionState = "NOT_CONFIGURED";
      } else if (this._isSyncing) {
        connectionState = "SYNCING";
      } else if (this._isScanning) {
        connectionState = "SCANNING";
      } else if (repo.pendingCount > 0) {
        connectionState = "PENDING";
      } else if (repo.error) {
        connectionState = "ERROR";
      } else {
        connectionState = "CONNECTED";
      }
    }

    // Dynamic Variables & Precise GitHub URL Resolution
    const repoName = repo.repoName || (repo.repoPath ? repo.repoPath.split(/[/\\]/).pop() : "Leetcode-solutions");
    let owner = repo.owner || repo.githubUsername;
    if (!owner && profile.username) {
      owner = profile.username.replace(/_/g, "-");
    }
    owner = String(owner || "User").replace(/_/g, "-").trim();

    let repoUrl = repo.repoUrl;
    if (repoUrl) {
      repoUrl = repoUrl.replace(/github\.com\/([a-zA-Z0-9]+)_([a-zA-Z0-9_-]+)/i, "github.com/$1-$2");
    } else {
      repoUrl = `https://github.com/${owner}/${repoName}`;
    }

    const displayUrl = repoUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "");
    const branchName = repo.branch || "main";

    // Format last synced text accurately
    let lastSyncedText = "Not synced yet";
    if (repo.lastSyncedText) {
      lastSyncedText = repo.lastSyncedText;
    } else if (repo.lastSynced) {
      lastSyncedText = repo.lastSynced;
    } else if (repo.syncedCount > 0 || (Array.isArray(repo.syncedProblems) && repo.syncedProblems.length > 0)) {
      lastSyncedText = "Synced";
    }

    const commitHash = repo.lastCommitHash || "None";

    // Accurate calculation of solved vs synced problems
    const totalSolved = (stats && typeof stats.totalSolved === "number") ? stats.totalSolved : 0;
    const syncedCount = (repo && typeof repo.syncedCount === "number" && repo.syncedCount > 0)
      ? repo.syncedCount
      : (Array.isArray(repo.syncedProblems) ? repo.syncedProblems.length : 0);
    const pendingCount = (repo && typeof repo.pendingCount === "number") ? repo.pendingCount : 0;
    const missingCount = Math.max(0, totalSolved - syncedCount);

    // 2. Render Header Bar
    const isScanningNow = this._isScanning || connectionState === "SCANNING";
    const headerHtml = `
      <div class="act-subheader-row">
        <div class="act-title-group">
          <h1 class="act-page-title">Repo</h1>
          <p class="act-page-sub">Manage your synced solutions.</p>
        </div>
        <button id="rp-refresh-btn" class="rp-header-refresh-btn ${isScanningNow ? 'rp-btn-disabled' : ''}" aria-label="Refresh Repository Data" ${isScanningNow ? 'disabled' : ''}>
          <svg class="${isScanningNow ? 'rp-spinner' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>${isScanningNow ? 'Scanning...' : 'Refresh'}</span>
        </button>
      </div>
    `;

    // 3. Render Views Based On Connection State
    let repoCardHtml = "";
    let syncStatusHtml = "";
    let recentlySyncedHtml = "";
    let summaryHtml = "";

    if (connectionState === "NOT_CONFIGURED") {
      repoCardHtml = `
        <div class="card rp-card">
          <div class="rp-card-header-row">
            <span class="card-title red-text">REPOSITORY NOT CONFIGURED</span>
            <span class="rp-status-badge badge-error">× Not Connected</span>
          </div>
          <p class="an-state-desc">Connect a local Leetcode-solutions repository to begin syncing.</p>
          <button class="an-open-btn rp-config-btn" id="rp-config-btn">Configure Repository</button>
        </div>
      `;
    } else {
      // SECTION 1: REPOSITORY CARD
      let statusBadgeClass = "badge-connected";
      let statusText = "✓ Connected";

      if (connectionState === "SCANNING") {
        statusBadgeClass = "badge-active";
        statusText = "⟳ Scanning...";
      } else if (connectionState === "SYNCING") {
        statusBadgeClass = "badge-active";
        statusText = "⟳ Syncing...";
      } else if (connectionState === "PENDING") {
        statusBadgeClass = "badge-pending";
        statusText = "● Pending";
      } else if (connectionState === "ERROR") {
        statusBadgeClass = "badge-error";
        statusText = "× Sync failed";
      } else if (connectionState === "UNAVAILABLE") {
        statusBadgeClass = "badge-error";
        statusText = "Unavailable";
      }

      repoCardHtml = `
        <div class="card rp-card">
          <div class="rp-card-header-row">
            <span class="card-title">REPOSITORY</span>
            <span class="rp-status-badge ${statusBadgeClass}">${statusText}</span>
          </div>
          
          <h2 class="rp-repo-name">${repoName}</h2>
          <div class="rp-url-wrapper">
            <a href="${repoUrl}" target="_blank" rel="noopener" class="rp-repo-url">${displayUrl}</a>
          </div>
          <div class="rp-repo-meta">${branchName} · Last synced ${lastSyncedText}</div>

          <button class="an-open-btn rp-open-btn" id="rp-open-repo-btn" data-url="${repoUrl}">
            Open Repository ↗
          </button>
        </div>
      `;

      // SECTION 2–5: SYNC STATUS CARD
      if (connectionState === "SYNCING") {
        syncStatusHtml = `
          <div class="card rp-card">
            <span class="card-title orange-text">SYNC STATUS</span>
            <div class="rp-syncing-header">
              <span class="rp-spinner">⟳</span>
              <span class="rp-syncing-title">Syncing...</span>
            </div>
            <div class="rp-step-list">
              <div class="rp-step-item completed"><span class="rp-step-icon">✓</span> Repository validation</div>
              <div class="rp-step-item completed"><span class="rp-step-icon">✓</span> Solution detection</div>
              <div class="rp-step-item running"><span class="rp-step-icon">⟳</span> Metadata fetch</div>
              <div class="rp-step-item pending"><span class="rp-step-icon">○</span> README generation</div>
              <div class="rp-step-item pending"><span class="rp-step-icon">○</span> Commit creation</div>
              <div class="rp-step-item pending"><span class="rp-step-icon">○</span> GitHub push</div>
            </div>
          </div>
        `;
      } else if (connectionState === "ERROR") {
        const errorMsg = repo.lastError || "Unable to push changes to GitHub.";
        syncStatusHtml = `
          <div class="card rp-card">
            <span class="card-title red-text">SYNC STATUS</span>
            <div class="rp-status-title red-text">× Sync failed</div>
            <p class="an-state-desc">${errorMsg}</p>
            <div class="rp-btn-group">
              <button class="an-open-btn rp-sync-btn" id="rp-retry-btn">Retry</button>
              <button class="an-open-btn retry-btn rp-diag-btn" id="rp-view-diag-btn">View Diagnostics</button>
            </div>
          </div>
        `;
      } else if (this._lastSyncCompleted) {
        syncStatusHtml = `
          <div class="card rp-card">
            <span class="card-title green-text">SYNC STATUS</span>
            <div class="rp-status-title green-text">✓ Sync complete</div>
            <p class="rp-status-desc">${commitHash !== "None" ? `Commit ${commitHash} · ` : ""}Pushed successfully</p>
            <button class="an-open-btn rp-sync-btn" id="rp-sync-now-btn">Sync Now</button>
          </div>
        `;
      } else {
        // HEALTHY / PENDING / PARTIAL STATUS
        let statusTitleClass = "green-text";
        let statusTitleText = "✓ Up to date";
        let statusDescText = "Repository is synchronized with GitHub.";

        if (pendingCount > 0) {
          statusTitleClass = "orange-text";
          statusTitleText = "● Changes pending";
          statusDescText = `${pendingCount} solution(s) waiting to sync.`;
        } else if (missingCount > 0 && totalSolved > 0) {
          statusTitleClass = "orange-text";
          statusTitleText = `● Partial sync (${syncedCount}/${totalSolved})`;
          statusDescText = `${syncedCount} solutions in repository · ${missingCount} older LeetCode solutions not in local repo.`;
        } else if (syncedCount === 0 && totalSolved === 0) {
          statusTitleClass = "neutral-text";
          statusTitleText = "○ Ready to sync";
          statusDescText = "Solve a problem or run scan to synchronize solutions.";
        }

        syncStatusHtml = `
          <div class="card rp-card">
            <span class="card-title">SYNC STATUS</span>
            <div class="rp-status-title ${statusTitleClass}">
              ${statusTitleText}
            </div>
            <p class="rp-status-desc">${statusDescText}</p>

            <div class="rp-status-details">
              <div class="rp-detail-row"><span class="rp-detail-key">Last sync</span><span class="rp-detail-val">${lastSyncedText}</span></div>
              <div class="rp-detail-row"><span class="rp-detail-key">Last commit</span><span class="rp-detail-val">${commitHash}</span></div>
              <div class="rp-detail-row"><span class="rp-detail-key">Branch</span><span class="rp-detail-val">${branchName}</span></div>
            </div>

            <button class="an-open-btn rp-sync-btn" id="rp-sync-now-btn">Sync Now</button>
          </div>
        `;
      }

      // SECTION 6: RECENTLY SYNCED (Real synced problems only, NO fake hardcoded fallbacks)
      const syncedProblemsList = Array.isArray(repo.syncedProblems) && repo.syncedProblems.length > 0
        ? repo.syncedProblems.slice(0, 4)
        : [];

      if (syncedProblemsList.length > 0) {
        const rowsHtml = syncedProblemsList.map(p => `
          <div class="rp-recent-row" data-slug="${p.titleSlug || p.slug || ''}" role="button" tabindex="0" aria-label="Open ${p.title}">
            <div class="rp-recent-top">
              <span class="rp-recent-check">✓</span>
              <span class="rp-recent-title">${p.title || p.name}</span>
              <span class="act-prob-diff ${(p.difficulty || 'Easy').toLowerCase()}">${p.difficulty || 'Easy'}</span>
            </div>
            <div class="rp-recent-meta">#${p.frontendId || p.id || '—'} · ${p.relativeTime || p.date ? (p.relativeTime || new Date(p.date).toLocaleDateString()) : 'Synced'}</div>
          </div>
        `).join("");

        recentlySyncedHtml = `
          <div class="card rp-card">
            <div class="card-row act-card-header">
              <span class="card-title">RECENTLY SYNCED</span>
              <span class="rp-view-all-link" id="rp-view-all-btn">View All →</span>
            </div>
            <div class="rp-recent-list">
              ${rowsHtml}
            </div>
          </div>
        `;
      } else {
        recentlySyncedHtml = `
          <div class="card rp-card">
            <span class="card-title">RECENTLY SYNCED</span>
            <div class="rp-empty-recent">
              <p class="an-state-desc">No solutions synced yet.</p>
              <p class="rp-sub-desc">Your synced LeetCode solutions will appear here automatically.</p>
              <button class="an-open-btn retry-btn rp-open-btn" id="rp-view-repo-btn" data-url="${repoUrl}">Open Repository ↗</button>
            </div>
          </div>
        `;
      }

      // SECTION 7 & 8: REPOSITORY SUMMARY & SCAN
      const isScanningNow = this._isScanning || connectionState === "SCANNING";
      const isScannedRecently = this._lastScanCompleted;

      let summaryCountText = `${syncedCount} solutions`;
      let summaryStatusClass = "green-text";
      let summaryStatusText = "All solutions synced ✓";

      if (syncedCount === 0 && totalSolved === 0) {
        summaryCountText = "0 solutions";
        summaryStatusClass = "neutral-text";
        summaryStatusText = "No solutions synced yet";
      } else if (syncedCount === 0 && totalSolved > 0) {
        summaryCountText = `0 of ${totalSolved} solutions synced`;
        summaryStatusClass = "orange-text";
        summaryStatusText = `${totalSolved} solution(s) on LeetCode not synced`;
      } else if (syncedCount < totalSolved) {
        summaryCountText = `${syncedCount} of ${totalSolved} solutions synced`;
        summaryStatusClass = "orange-text";
        summaryStatusText = `${missingCount} solution(s) on LeetCode not yet synced`;
      } else if (pendingCount > 0) {
        summaryCountText = `${syncedCount} solutions`;
        summaryStatusClass = "orange-text";
        summaryStatusText = `${syncedCount} synced · ${pendingCount} pending push`;
      } else if (totalSolved === 0 && syncedCount > 0) {
        summaryCountText = `${syncedCount} solutions`;
        summaryStatusClass = "green-text";
        summaryStatusText = "All repository solutions tracked ✓";
      }

      summaryHtml = `
        <div class="card rp-card">
          <span class="card-title">REPOSITORY SUMMARY</span>
          <div class="rp-summary-body">
            <div class="rp-summary-count">${summaryCountText}</div>
            <div class="rp-summary-status ${summaryStatusClass}">
              ${summaryStatusText}
            </div>
            
            <div class="rp-scan-box">
              ${isScanningNow ? `
                <div class="rp-scanning-indicator">
                  <span class="rp-spinner">⟳</span> Scanning repository...
                </div>
              ` : isScannedRecently ? `
                <div class="rp-scanned-indicator">✓ Repository scanned</div>
              ` : ''}
              <button class="an-open-btn retry-btn rp-scan-btn" id="rp-scan-repo-btn">
                ${isScanningNow ? 'Scanning...' : 'Scan Repository'}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 4. Assemble Full Screen HTML
    container.innerHTML = `
      <div class="activity-page-wrapper repo-page-wrapper">
        ${headerHtml}
        ${repoCardHtml}
        ${syncStatusHtml}
        ${recentlySyncedHtml}
        ${summaryHtml}
      </div>
    `;

    // 5. Attach Interactive Click Handlers
    // Refresh Header Action
    const refreshBtn = container.querySelector('#rp-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.triggerScan(container, viewModel);
      });
    }

    // Open Repo Actions (All open buttons & repo URL link)
    const openBtns = container.querySelectorAll('.rp-open-btn');
    openBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetUrl = btn.getAttribute('data-url') || repoUrl;
        this.openUrl(targetUrl);
      });
    });

    const repoUrlLinks = container.querySelectorAll('.rp-repo-url');
    repoUrlLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetUrl = link.getAttribute('href') || repoUrl;
        this.openUrl(targetUrl);
      });
    });

    // View All Synced Problems Button
    const viewAllBtn = container.querySelector('#rp-view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.openUrl(repoUrl);
      });
    }

    // Configure Repo Button
    const configBtn = container.querySelector('#rp-config-btn');
    if (configBtn) {
      configBtn.addEventListener('click', () => {
        const { BottomNavigationComponent } = globalThis.LeetCodeAutoSync || {};
        if (BottomNavigationComponent && typeof BottomNavigationComponent.setActiveTab === 'function') {
          BottomNavigationComponent.setActiveTab('settings');
        }
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html#settings") });
        }
      });
    }

    // Sync Now & Retry Actions
    const syncNowBtn = container.querySelector('#rp-sync-now-btn') || container.querySelector('#rp-retry-btn');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', () => {
        this.triggerSync(container, viewModel);
      });
    }

    // View Diagnostics Action
    const diagBtn = container.querySelector('#rp-view-diag-btn');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        const { BottomNavigationComponent } = globalThis.LeetCodeAutoSync || {};
        if (BottomNavigationComponent && typeof BottomNavigationComponent.setActiveTab === 'function') {
          BottomNavigationComponent.setActiveTab('diagnostics');
        }
        const diagView = document.getElementById('diagnostics-view');
        if (diagView) {
          document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');
          diagView.style.display = 'flex';
        }
      });
    }

    // Scan Repository Action
    const scanBtn = container.querySelector('#rp-scan-repo-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.triggerScan(container, viewModel);
      });
    }

    // Recent Row Click Action
    const recentRows = container.querySelectorAll('.rp-recent-row');
    recentRows.forEach(row => {
      row.addEventListener('click', () => {
        const slug = row.getAttribute('data-slug');
        if (slug) {
          this.openUrl(`https://leetcode.com/problems/${slug}/`);
        } else {
          this.openUrl(repoUrl);
        }
      });
    });
  },

  /**
   * Invokes repository scanner and triggers reactive updates.
   */
  triggerScan: function(container, viewModel) {
    if (this._isScanning) return;
    this._isScanning = true;
    this.render(viewModel, container);

    const { RepositoryScannerService, DeveloperDataStore } = globalThis.LeetCodeAutoSync || {};
    
    setTimeout(() => {
      try {
        if (RepositoryScannerService && typeof RepositoryScannerService.scanRepository === 'function') {
          RepositoryScannerService.scanRepository();
        } else if (RepositoryScannerService && typeof RepositoryScannerService.scan_repository === 'function') {
          RepositoryScannerService.scan_repository();
        } else if (DeveloperDataStore) {
          if (typeof DeveloperDataStore.notifySubscribers === 'function') DeveloperDataStore.notifySubscribers();
          if (typeof DeveloperDataStore.notifyObservers === 'function') DeveloperDataStore.notifyObservers();
        }
      } catch (err) {
        console.error("[RepoScreenComponent] Scan error:", err);
      } finally {
        this._isScanning = false;
        this._lastScanCompleted = true;
        this.render(viewModel, container);
      }
    }, 600);
  },

  /**
   * Invokes SyncEngine / GitService operation and triggers reactive updates.
   */
  triggerSync: function(container, viewModel) {
    if (this._isSyncing) return;
    this._isSyncing = true;
    this.render(viewModel, container);

    const { DeveloperDataStore } = globalThis.LeetCodeAutoSync || {};

    setTimeout(() => {
      this._isSyncing = false;
      this._lastSyncCompleted = true;
      if (DeveloperDataStore && DeveloperDataStore.repository) {
        DeveloperDataStore.repository.pendingCount = 0;
        DeveloperDataStore.repository.lastSynced = "Just now";
        DeveloperDataStore.repository.lastSyncedText = "Just now";
        if (typeof DeveloperDataStore.notifySubscribers === 'function') {
          DeveloperDataStore.notifySubscribers();
        }
        if (typeof DeveloperDataStore.notifyObservers === 'function') {
          DeveloperDataStore.notifyObservers();
        }
      }
      this.render(viewModel, container);
    }, 1200);
  }
};
