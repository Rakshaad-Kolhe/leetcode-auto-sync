/**
 * @fileoverview SettingsScreenComponent
 * Fully functional, data-driven Settings screen component for LeetCode Auto Sync.
 * Implements compact, calm grouped sections matching the popup design system.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class SettingsScreenComponent {
    constructor() {
      this._subscribed = false;
      this._activeModal = null; // null | 'reset' | 'clear-cache'
      this._isScanning = false;
      this._toastMessage = null;
      this._toastTimer = null;
    }

    /**
     * Shows a brief non-intrusive toast feedback message.
     * @param {string} msg
     */
    showToast(msg) {
      this._toastMessage = msg;
      if (this._toastTimer) clearTimeout(this._toastTimer);
      const toastEl = document.querySelector(".st-toast");
      if (toastEl) {
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        this._toastTimer = setTimeout(() => {
          toastEl.classList.remove("show");
          this._toastMessage = null;
        }, 2200);
      }
    }

    /**
     * Primary render method for the Settings tab.
     * @param {Object} viewModel
     * @param {HTMLElement} container
     */
    render(viewModel = {}, container = null) {
      if (!container) return;

      const {
        DeveloperSettingsStore,
        DeveloperDataStore,
        RepositoryScannerService,
        DiagnosticsService
      } = globalThis.LeetCodeAutoSync || {};

      // Subscribe to settings changes once
      if (!this._subscribed && DeveloperSettingsStore) {
        this._subscribed = true;
        if (typeof DeveloperSettingsStore.subscribe === "function") {
          DeveloperSettingsStore.subscribe(() => this.render(viewModel, container));
        }
        if (DeveloperDataStore && typeof DeveloperDataStore.onDataStoreChanged === "function") {
          DeveloperDataStore.onDataStoreChanged(() => this.render(viewModel, container));
        }
      }

      const settings = DeveloperSettingsStore ? DeveloperSettingsStore.getSettings() : {
        account: {},
        synchronization: {},
        notifications: {},
        preferences: {}
      };

      const account = settings.account || {};
      const sync = settings.synchronization || {};
      const notifs = settings.notifications || {};
      const prefs = settings.preferences || {};

      // Format Uptime dynamically
      const uptimeMs = DeveloperSettingsStore ? Date.now() - DeveloperSettingsStore.startupTime : 0;
      const uptimeText = DiagnosticsService ? DiagnosticsService.formatUptime(uptimeMs) : "0 sec";

      // Extension Manifest Version
      const version = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest)
        ? chrome.runtime.getManifest().version
        : "1.0.0";

      // 1. HEADER
      const headerHtml = `
        <div class="act-subheader-row dg-header-row st-header-row">
          <div class="act-title-group">
            <h1 class="act-page-title">Settings</h1>
            <p class="act-page-sub">Manage your preferences and configuration.</p>
          </div>
          <button id="st-reset-defaults-btn" class="rp-header-refresh-btn" aria-label="Reset all preferences to defaults">
            <span>Reset to Defaults</span>
          </button>
        </div>
      `;

      // 2. ACCOUNT SECTION
      const ghUsername = account.githubUsername || "Not Connected";
      const ghStatusClass = account.githubUsername ? "badge-connected" : "badge-pending";
      const ghStatusText = account.githubUsername ? "Connected" : "Not Connected";

      const repoName = account.repository || "Not Configured";
      const repoStatusClass = account.repository ? "badge-connected" : "badge-pending";
      const repoStatusText = account.repository ? "Connected" : "Not Configured";

      const branchName = account.branch || "main";

      const accountHtml = `
        <div class="card rp-card dg-card st-card">
          <div class="rp-card-header-row">
            <span class="rp-card-title">ACCOUNT</span>
          </div>
          <div class="st-rows-list">
            <div class="st-row st-clickable-row" id="st-account-gh-row" role="button" tabindex="0" aria-label="Open GitHub Account ${ghUsername}">
              <div class="st-row-left">
                <span class="st-label">GitHub Account</span>
                <span class="st-val">${ghUsername}</span>
              </div>
              <div class="st-row-right">
                <span class="rp-status-badge ${ghStatusClass}">${ghStatusText}</span>
                <span class="st-chevron">›</span>
              </div>
            </div>

            <div class="st-row st-clickable-row" id="st-account-repo-row" role="button" tabindex="0" aria-label="Open Repository ${repoName}">
              <div class="st-row-left">
                <span class="st-label">Repository</span>
                <span class="st-val">${repoName}</span>
              </div>
              <div class="st-row-right">
                <span class="rp-status-badge ${repoStatusClass}">${repoStatusText}</span>
                <span class="st-chevron">›</span>
              </div>
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Branch</span>
                <span class="st-val">${branchName}</span>
              </div>
              <div class="st-row-right">
                <span class="rp-status-badge badge-connected">Current</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // 3. SYNCHRONIZATION SECTION
      const intervals = [1, 5, 10, 15, 30, 60];
      const intervalOptionsHtml = intervals.map((m) => {
        const selected = (sync.syncIntervalMinutes === m) ? "selected" : "";
        return `<option value="${m}" ${selected}>${m} min</option>`;
      }).join("");

      const syncHtml = `
        <div class="card rp-card dg-card st-card">
          <div class="rp-card-header-row">
            <span class="rp-card-title">SYNCHRONIZATION</span>
          </div>
          <div class="st-rows-list">
            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Auto Sync Accepted Submissions</span>
                <span class="st-desc">Automatically sync when a solution is accepted.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Auto Sync Accepted Submissions">
                <input type="checkbox" id="st-toggle-autosync" ${sync.autoSyncAcceptedSubmissions ? "checked" : ""} aria-checked="${Boolean(sync.autoSyncAcceptedSubmissions)}">
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Sync README Updates</span>
                <span class="st-desc">Automatically update root and topic README files.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Sync README Updates">
                <input type="checkbox" id="st-toggle-readme" ${sync.syncReadmeUpdates ? "checked" : ""} aria-checked="${Boolean(sync.syncReadmeUpdates)}">
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Sync Curated List Progress</span>
                <span class="st-desc">Update curated-list progress from repository scans.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Sync Curated List Progress">
                <input type="checkbox" id="st-toggle-curated" ${sync.syncCuratedListProgress ? "checked" : ""} aria-checked="${Boolean(sync.syncCuratedListProgress)}">
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Sync Interval</span>
                <span class="st-desc">How often to check for accepted submissions.</span>
              </div>
              <select class="st-select" id="st-select-interval" aria-label="Select sync interval">
                ${intervalOptionsHtml}
              </select>
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Auto Sync Time Window</span>
                <span class="st-desc">Only run automatic synchronization during this period.</span>
              </div>
              <div class="st-time-range-group">
                <input type="time" class="st-time-input" id="st-time-start" value="${sync.autoSyncStartTime || "06:00"}" aria-label="Sync window start time">
                <span class="st-time-sep">to</span>
                <input type="time" class="st-time-input" id="st-time-end" value="${sync.autoSyncEndTime || "23:00"}" aria-label="Sync window end time">
              </div>
            </div>
          </div>
        </div>
      `;

      // 4. NOTIFICATIONS SECTION
      const notifsHtml = `
        <div class="card rp-card dg-card st-card">
          <div class="rp-card-header-row">
            <span class="rp-card-title">NOTIFICATIONS</span>
          </div>
          <div class="st-rows-list">
            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Sync Notifications</span>
                <span class="st-desc">Notify when synchronization completes or fails.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Sync Notifications">
                <input type="checkbox" id="st-toggle-notif-sync" ${notifs.syncNotifications ? "checked" : ""} aria-checked="${Boolean(notifs.syncNotifications)}">
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Daily Summary</span>
                <span class="st-desc">Receive a daily progress and streak summary.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Daily Summary Notifications">
                <input type="checkbox" id="st-toggle-notif-daily" ${notifs.dailySummary ? "checked" : ""} aria-checked="${Boolean(notifs.dailySummary)}">
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Streak Reminders</span>
                <span class="st-desc">Remind me to maintain my streak before daily UTC reset.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Streak Reminders">
                <input type="checkbox" id="st-toggle-notif-streak" ${notifs.streakReminders ? "checked" : ""} aria-checked="${Boolean(notifs.streakReminders)}">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      `;

      // 5. PREFERENCES SECTION
      const themeSelectHtml = `
        <select class="st-select" id="st-select-theme" aria-label="Select theme appearance">
          <option value="system" ${prefs.theme === "system" ? "selected" : ""}>System</option>
          <option value="dark" ${prefs.theme === "dark" ? "selected" : ""}>Dark</option>
          <option value="light" ${prefs.theme === "light" ? "selected" : ""}>Light</option>
        </select>
      `;

      const timeFormatSelectHtml = `
        <select class="st-select" id="st-select-timeformat" aria-label="Select time format">
          <option value="12h" ${prefs.timeFormat === "12h" ? "selected" : ""}>12-hour</option>
          <option value="24h" ${prefs.timeFormat === "24h" ? "selected" : ""}>24-hour</option>
        </select>
      `;

      const prefsHtml = `
        <div class="card rp-card dg-card st-card">
          <div class="rp-card-header-row">
            <span class="rp-card-title">PREFERENCES</span>
          </div>
          <div class="st-rows-list">
            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Theme</span>
                <span class="st-desc">Match LeetCode Dark or System appearance.</span>
              </div>
              ${themeSelectHtml}
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Language</span>
                <span class="st-desc">Extension display language.</span>
              </div>
              <span class="st-val">English</span>
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Time Format</span>
                <span class="st-desc">Format for timestamps and activity dates.</span>
              </div>
              ${timeFormatSelectHtml}
            </div>

            <div class="st-row st-toggle-row">
              <div class="st-row-left">
                <span class="st-label">Expand Long Text</span>
                <span class="st-desc">Expand long descriptions and logs by default.</span>
              </div>
              <label class="toggle-switch" aria-label="Toggle Expand Long Text">
                <input type="checkbox" id="st-toggle-expand-text" ${prefs.expandLongText ? "checked" : ""} aria-checked="${Boolean(prefs.expandLongText)}">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      `;

      // 6. DATA & ADVANCED SECTION
      const dataHtml = `
        <div class="card rp-card dg-card st-card">
          <div class="rp-card-header-row">
            <span class="rp-card-title">DATA & ADVANCED</span>
          </div>
          <div class="st-rows-list">
            <div class="st-row st-clickable-row" id="st-action-clear-cache" role="button" tabindex="0" aria-label="Clear local extension cache">
              <div class="st-row-left">
                <span class="st-label">Clear Local Cache</span>
                <span class="st-desc">Clear locally stored extension cache and temporary data.</span>
              </div>
              <div class="st-row-right">
                <span class="st-action-text st-text-danger">Clear Cache ›</span>
              </div>
            </div>

            <div class="st-row st-clickable-row" id="st-action-rescan-repo" role="button" tabindex="0" aria-label="Re-scan repository and rebuild index">
              <div class="st-row-left">
                <span class="st-label">Re-scan Repository</span>
                <span class="st-desc">Re-scan repository and rebuild local solution index.</span>
              </div>
              <div class="st-row-right">
                <span class="st-action-text">${this._isScanning ? "Scanning..." : "Scan Now ›"}</span>
              </div>
            </div>

            <div class="st-row st-clickable-row" id="st-action-export-data" role="button" tabindex="0" aria-label="Export data snapshot as JSON">
              <div class="st-row-left">
                <span class="st-label">Export Data</span>
                <span class="st-desc">Export analytics, sync history, and progress as JSON.</span>
              </div>
              <div class="st-row-right">
                <span class="st-action-text">Export JSON ›</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // 7. ABOUT SECTION
      const repoUrl = account.repoUrl || (account.githubUsername ? `https://github.com/${account.githubUsername}/${account.repository || "Leetcode-solutions"}` : "https://github.com");
      const aboutHtml = `
        <div class="card rp-card dg-card st-card">
          <div class="rp-card-header-row">
            <span class="rp-card-title">ABOUT</span>
          </div>
          <div class="st-rows-list">
            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Product</span>
                <span class="st-desc">Developer Intelligence for Competitive Programming</span>
              </div>
              <span class="st-val">DevPulse</span>
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Version</span>
              </div>
              <span class="st-val">v${version}</span>
            </div>

            <div class="st-row">
              <div class="st-row-left">
                <span class="st-label">Uptime</span>
              </div>
              <span class="st-val">${uptimeText}</span>
            </div>

            <div class="st-row st-clickable-row" id="st-action-open-github" role="button" tabindex="0" aria-label="View source repository on GitHub">
              <div class="st-row-left">
                <span class="st-label">Open Source</span>
                <span class="st-desc">View repository on GitHub.</span>
              </div>
              <div class="st-row-right">
                <span class="st-action-text">View on GitHub ↗</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // 8. MODAL CONFIRMATION DIALOG (if active)
      let modalHtml = "";
      if (this._activeModal === "reset") {
        modalHtml = `
          <div class="st-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="st-modal-title">
            <div class="st-modal-card">
              <h3 id="st-modal-title" class="st-modal-title">Reset to Defaults?</h3>
              <p class="st-modal-msg">This will reset all application preferences and sync controls to their default values. Your repository files and Git history will NOT be deleted.</p>
              <div class="st-modal-actions">
                <button id="st-modal-cancel-btn" class="rp-btn rp-btn-secondary">Cancel</button>
                <button id="st-modal-confirm-reset-btn" class="rp-btn rp-btn-danger">Reset Defaults</button>
              </div>
            </div>
          </div>
        `;
      } else if (this._activeModal === "clear-cache") {
        modalHtml = `
          <div class="st-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="st-modal-title">
            <div class="st-modal-card">
              <h3 id="st-modal-title" class="st-modal-title">Clear Local Cache?</h3>
              <p class="st-modal-msg">This will remove locally cached extension data and transient queries. Solved solution files and repository data will remain safe.</p>
              <div class="st-modal-actions">
                <button id="st-modal-cancel-btn" class="rp-btn rp-btn-secondary">Cancel</button>
                <button id="st-modal-confirm-clear-btn" class="rp-btn rp-btn-danger">Clear Cache</button>
              </div>
            </div>
          </div>
        `;
      }

      // Assemble Full Settings Screen
      container.innerHTML = `
        <div class="activity-page-wrapper st-page-wrapper">
          ${headerHtml}
          ${accountHtml}
          ${syncHtml}
          ${notifsHtml}
          ${prefsHtml}
          ${dataHtml}
          ${aboutHtml}
          <div class="st-toast" aria-live="polite"></div>
          ${modalHtml}
        </div>
      `;

      // Attach Interactive Event Listeners
      this.attachEventListeners(container, viewModel);
    }

    /**
     * Binds all inputs, toggles, dropdowns, and modals to DeveloperSettingsStore.
     */
    attachEventListeners(container, viewModel) {
      const {
        DeveloperSettingsStore,
        RepositoryScannerService,
        DiagnosticsService,
        DeveloperDataStore
      } = globalThis.LeetCodeAutoSync || {};

      if (!DeveloperSettingsStore) return;

      // 1. Reset Defaults Button
      const resetBtn = container.querySelector("#st-reset-defaults-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          this._activeModal = "reset";
          this.render(viewModel, container);
        });
      }

      // 2. Account Links
      const ghRow = container.querySelector("#st-account-gh-row");
      if (ghRow) {
        ghRow.addEventListener("click", () => {
          const settings = DeveloperSettingsStore.getSettings();
          const user = settings.account.githubUsername;
          const url = user ? `https://github.com/${user}` : "https://github.com";
          this.openUrl(url);
        });
      }

      const repoRow = container.querySelector("#st-account-repo-row");
      if (repoRow) {
        repoRow.addEventListener("click", () => {
          const settings = DeveloperSettingsStore.getSettings();
          const url = settings.account.repoUrl || "https://github.com";
          this.openUrl(url);
        });
      }

      // 3. Synchronization Toggles
      const toggleAutosync = container.querySelector("#st-toggle-autosync");
      if (toggleAutosync) {
        toggleAutosync.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("synchronization.autoSyncAcceptedSubmissions", e.target.checked);
          this.showToast(e.target.checked ? "Auto sync enabled." : "Auto sync disabled.");
        });
      }

      const toggleReadme = container.querySelector("#st-toggle-readme");
      if (toggleReadme) {
        toggleReadme.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("synchronization.syncReadmeUpdates", e.target.checked);
          this.showToast(e.target.checked ? "README sync enabled." : "README sync disabled.");
        });
      }

      const toggleCurated = container.querySelector("#st-toggle-curated");
      if (toggleCurated) {
        toggleCurated.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("synchronization.syncCuratedListProgress", e.target.checked);
          this.showToast(e.target.checked ? "Curated progress sync enabled." : "Curated progress sync disabled.");
        });
      }

      const selectInterval = container.querySelector("#st-select-interval");
      if (selectInterval) {
        selectInterval.addEventListener("change", (e) => {
          const val = parseInt(e.target.value, 10);
          DeveloperSettingsStore.setSetting("synchronization.syncIntervalMinutes", val);
          this.showToast(`Sync interval updated to ${val} min.`);
        });
      }

      const timeStart = container.querySelector("#st-time-start");
      if (timeStart) {
        timeStart.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("synchronization.autoSyncStartTime", e.target.value);
        });
      }

      const timeEnd = container.querySelector("#st-time-end");
      if (timeEnd) {
        timeEnd.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("synchronization.autoSyncEndTime", e.target.value);
        });
      }

      // 4. Notifications Toggles
      const toggleNotifSync = container.querySelector("#st-toggle-notif-sync");
      if (toggleNotifSync) {
        toggleNotifSync.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("notifications.syncNotifications", e.target.checked);
        });
      }

      const toggleNotifDaily = container.querySelector("#st-toggle-notif-daily");
      if (toggleNotifDaily) {
        toggleNotifDaily.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("notifications.dailySummary", e.target.checked);
        });
      }

      const toggleNotifStreak = container.querySelector("#st-toggle-notif-streak");
      if (toggleNotifStreak) {
        toggleNotifStreak.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("notifications.streakReminders", e.target.checked);
        });
      }

      // 5. Preferences Selects & Toggles
      const selectTheme = container.querySelector("#st-select-theme");
      if (selectTheme) {
        selectTheme.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("preferences.theme", e.target.value);
          this.showToast(`Theme updated to ${e.target.value}.`);
        });
      }

      const selectTimeFormat = container.querySelector("#st-select-timeformat");
      if (selectTimeFormat) {
        selectTimeFormat.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("preferences.timeFormat", e.target.value);
          this.showToast(`Time format updated to ${e.target.value}.`);
        });
      }

      const toggleExpandText = container.querySelector("#st-toggle-expand-text");
      if (toggleExpandText) {
        toggleExpandText.addEventListener("change", (e) => {
          DeveloperSettingsStore.setSetting("preferences.expandLongText", e.target.checked);
        });
      }

      // 6. Data & Advanced Actions
      const clearCacheRow = container.querySelector("#st-action-clear-cache");
      if (clearCacheRow) {
        clearCacheRow.addEventListener("click", () => {
          this._activeModal = "clear-cache";
          this.render(viewModel, container);
        });
      }

      const rescanRepoRow = container.querySelector("#st-action-rescan-repo");
      if (rescanRepoRow) {
        rescanRepoRow.addEventListener("click", async () => {
          if (this._isScanning) return;
          this._isScanning = true;
          this.render(viewModel, container);

          try {
            if (RepositoryScannerService && typeof RepositoryScannerService.scanRepository === "function") {
              await RepositoryScannerService.scanRepository();
            }
            if (DeveloperDataStore && typeof DeveloperDataStore.notifySubscribers === "function") {
              DeveloperDataStore.notifySubscribers();
            }
            this.showToast("Repository scan completed.");
          } catch (e) {
            this.showToast("Repository scan failed.");
          } finally {
            this._isScanning = false;
            this.render(viewModel, container);
          }
        });
      }

      const exportDataRow = container.querySelector("#st-action-export-data");
      if (exportDataRow) {
        exportDataRow.addEventListener("click", () => {
          DeveloperSettingsStore.exportData();
          this.showToast("Data exported successfully.");
        });
      }

      // 7. About Open Source Row
      const openGithubRow = container.querySelector("#st-action-open-github");
      if (openGithubRow) {
        openGithubRow.addEventListener("click", () => {
          const settings = DeveloperSettingsStore.getSettings();
          const account = settings.account || {};
          const url = account.repoUrl || (account.githubUsername ? `https://github.com/${account.githubUsername}/${account.repository || "Leetcode-solutions"}` : "https://github.com");
          this.openUrl(url);
        });
      }

      // 8. Modal Handlers
      const cancelModalBtn = container.querySelector("#st-modal-cancel-btn");
      if (cancelModalBtn) {
        cancelModalBtn.addEventListener("click", () => {
          this._activeModal = null;
          this.render(viewModel, container);
        });
      }

      const confirmResetBtn = container.querySelector("#st-modal-confirm-reset-btn");
      if (confirmResetBtn) {
        confirmResetBtn.addEventListener("click", async () => {
          await DeveloperSettingsStore.resetToDefaults();
          this._activeModal = null;
          this.showToast("Settings restored to defaults.");
          this.render(viewModel, container);
        });
      }

      const confirmClearBtn = container.querySelector("#st-modal-confirm-clear-btn");
      if (confirmClearBtn) {
        confirmClearBtn.addEventListener("click", async () => {
          if (DiagnosticsService && typeof DiagnosticsService.clearCache === "function") {
            await DiagnosticsService.clearCache();
          }
          this._activeModal = null;
          this.showToast("Cache cleared successfully.");
          this.render(viewModel, container);
        });
      }
    }

    /**
     * Helper to open URLs in new tab.
     */
    openUrl(url) {
      if (!url) return;
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
      } else if (typeof window !== "undefined" && window.open) {
        window.open(url, "_blank");
      }
    }
  }

  LeetCodeAutoSync.SettingsScreenComponent = new SettingsScreenComponent();

})(typeof self !== "undefined" ? self : this);
