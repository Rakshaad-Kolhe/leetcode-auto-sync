/**
 * @fileoverview DeveloperSettingsStore
 * Canonical Single Source of Truth for all extension preferences, synchronization controls,
 * notifications, and account bindings.
 * Manages reactive subscriptions and chrome.storage.local persistence.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { Logger } = LeetCodeAutoSync;

  const STORAGE_KEY = "developer_settings";

  const DEFAULT_SETTINGS = {
    account: {
      githubUsername: null,
      repository: null,
      branch: null
    },
    synchronization: {
      autoSyncAcceptedSubmissions: true,
      syncReadmeUpdates: true,
      syncCuratedListProgress: true,
      syncIntervalMinutes: 5,
      autoSyncStartTime: "06:00",
      autoSyncEndTime: "23:00"
    },
    notifications: {
      syncNotifications: true,
      dailySummary: true,
      streakReminders: false
    },
    preferences: {
      theme: "system",
      language: "en",
      timeFormat: "12h",
      expandLongText: false
    }
  };

  const VALID_INTERVALS = [1, 5, 10, 15, 30, 60];
  const VALID_THEMES = ["system", "dark", "light"];
  const VALID_TIME_FORMATS = ["12h", "24h"];
  const VALID_LANGUAGES = ["en"];

  class DeveloperSettingsStore {
    constructor() {
      this.startupTime = Date.now();
      this.listeners = new Set();
      this._settings = this.getDefaultSettings();
      this.isLoaded = false;
      this.hydrateFromStorage();
    }

    /**
     * Returns a fresh copy of the default settings tree.
     * @returns {Object}
     */
    getDefaultSettings() {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    /**
     * Validates and sanitizes settings against strict schema rules.
     * @param {Object} raw
     * @returns {Object} Clean settings
     */
    validateSettings(raw = {}) {
      const clean = this.getDefaultSettings();

      if (raw && typeof raw === "object") {
        // Synchronization
        if (raw.synchronization && typeof raw.synchronization === "object") {
          if (typeof raw.synchronization.autoSyncAcceptedSubmissions === "boolean") {
            clean.synchronization.autoSyncAcceptedSubmissions = raw.synchronization.autoSyncAcceptedSubmissions;
          }
          if (typeof raw.synchronization.syncReadmeUpdates === "boolean") {
            clean.synchronization.syncReadmeUpdates = raw.synchronization.syncReadmeUpdates;
          }
          if (typeof raw.synchronization.syncCuratedListProgress === "boolean") {
            clean.synchronization.syncCuratedListProgress = raw.synchronization.syncCuratedListProgress;
          }
          if (typeof raw.synchronization.syncIntervalMinutes === "number" && VALID_INTERVALS.includes(raw.synchronization.syncIntervalMinutes)) {
            clean.synchronization.syncIntervalMinutes = raw.synchronization.syncIntervalMinutes;
          }
          if (typeof raw.synchronization.autoSyncStartTime === "string" && /^\d{2}:\d{2}$/.test(raw.synchronization.autoSyncStartTime)) {
            clean.synchronization.autoSyncStartTime = raw.synchronization.autoSyncStartTime;
          }
          if (typeof raw.synchronization.autoSyncEndTime === "string" && /^\d{2}:\d{2}$/.test(raw.synchronization.autoSyncEndTime)) {
            clean.synchronization.autoSyncEndTime = raw.synchronization.autoSyncEndTime;
          }
        }

        // Notifications
        if (raw.notifications && typeof raw.notifications === "object") {
          if (typeof raw.notifications.syncNotifications === "boolean") {
            clean.notifications.syncNotifications = raw.notifications.syncNotifications;
          }
          if (typeof raw.notifications.dailySummary === "boolean") {
            clean.notifications.dailySummary = raw.notifications.dailySummary;
          }
          if (typeof raw.notifications.streakReminders === "boolean") {
            clean.notifications.streakReminders = raw.notifications.streakReminders;
          }
        }

        // Preferences
        if (raw.preferences && typeof raw.preferences === "object") {
          if (typeof raw.preferences.theme === "string" && VALID_THEMES.includes(raw.preferences.theme)) {
            clean.preferences.theme = raw.preferences.theme;
          }
          if (typeof raw.preferences.language === "string" && VALID_LANGUAGES.includes(raw.preferences.language)) {
            clean.preferences.language = raw.preferences.language;
          }
          if (typeof raw.preferences.timeFormat === "string" && VALID_TIME_FORMATS.includes(raw.preferences.timeFormat)) {
            clean.preferences.timeFormat = raw.preferences.timeFormat;
          }
          if (typeof raw.preferences.expandLongText === "boolean") {
            clean.preferences.expandLongText = raw.preferences.expandLongText;
          }
        }
      }

      return clean;
    }

    /**
     * Hydrates settings from chrome.storage.local.
     * @returns {Promise<Object>}
     */
    hydrateFromStorage() {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (res) => {
            if (res && res[STORAGE_KEY]) {
              this._settings = this.validateSettings(res[STORAGE_KEY]);
            } else {
              this._settings = this.getDefaultSettings();
            }
            this.isLoaded = true;
            this.applyTheme();
            this.notifySubscribers();
            resolve(this._settings);
          });
        } else {
          this._settings = this.getDefaultSettings();
          this.isLoaded = true;
          this.applyTheme();
          this.notifySubscribers();
          resolve(this._settings);
        }
      });
    }

    /**
     * Persists in-memory settings to chrome.storage.local.
     * @returns {Promise<boolean>}
     */
    saveToStorage() {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY]: this._settings }, () => {
            resolve(true);
          });
        } else {
          resolve(true);
        }
      });
    }

    /**
     * Returns canonical settings tree merged with live DeveloperDataStore account state.
     * @returns {Object}
     */
    getSettings() {
      const store = LeetCodeAutoSync.DeveloperDataStore || {};
      const repo = store.repository || {};
      const profile = store.profile || {};

      let owner = repo.owner || repo.githubUsername;
      if (!owner && profile.username) {
        owner = profile.username.replace(/_/g, "-");
      }
      if (owner) {
        owner = String(owner).replace(/_/g, "-").trim();
      }

      const repoName = repo.repoName || (repo.repoPath ? repo.repoPath.split(/[/\\]/).pop() : null);
      const branch = repo.branch || "main";

      return {
        ...this._settings,
        account: {
          githubUsername: owner || null,
          repository: repoName || null,
          branch: branch || "main",
          repoUrl: repo.repoUrl || (owner && repoName ? `https://github.com/${owner}/${repoName}` : null),
          isConnected: Boolean(repo.configured && repo.repoPath)
        }
      };
    }

    /**
     * Safely reads a setting by dot-notated path.
     * @param {string} path E.g. "synchronization.autoSyncAcceptedSubmissions"
     * @param {*} [defaultValue]
     * @returns {*}
     */
    getSetting(path, defaultValue = null) {
      if (!path) return defaultValue;
      const parts = path.split(".");
      let curr = this.getSettings();
      for (const part of parts) {
        if (curr === null || curr === undefined || typeof curr !== "object") {
          return defaultValue;
        }
        curr = curr[part];
      }
      return curr !== undefined ? curr : defaultValue;
    }

    /**
     * Updates a setting by dot-notated path, persists to storage, and notifies subscribers.
     * @param {string} path
     * @param {*} value
     * @returns {Promise<boolean>}
     */
    async setSetting(path, value) {
      if (!path) return false;
      const parts = path.split(".");
      if (parts.length === 0) return false;

      let target = this._settings;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!target[key] || typeof target[key] !== "object") {
          target[key] = {};
        }
        target = target[key];
      }

      const finalKey = parts[parts.length - 1];
      target[finalKey] = value;

      // Re-validate entire settings tree to ensure invariants
      this._settings = this.validateSettings(this._settings);

      // Side-effect: theme application
      if (path === "preferences.theme") {
        this.applyTheme();
      }

      await this.saveToStorage();
      this.notifySubscribers();
      return true;
    }

    /**
     * Resets application preferences and sync toggles to defaults without touching git/repo data.
     * @returns {Promise<boolean>}
     */
    async resetToDefaults() {
      this._settings = this.getDefaultSettings();
      this.applyTheme();
      await this.saveToStorage();
      this.notifySubscribers();
      return true;
    }

    /**
     * Applies active theme to document.documentElement.
     */
    applyTheme() {
      const theme = this.getSetting("preferences.theme", "system");
      if (typeof document !== "undefined" && document.documentElement && typeof document.documentElement.setAttribute === "function") {
        document.documentElement.setAttribute("data-theme", theme);
        if (document.documentElement.classList) {
          if (theme === "dark") {
            document.documentElement.classList.add("dark-theme");
            document.documentElement.classList.remove("light-theme");
          } else if (theme === "light") {
            document.documentElement.classList.add("light-theme");
            document.documentElement.classList.remove("dark-theme");
          } else {
            document.documentElement.classList.remove("dark-theme");
            document.documentElement.classList.remove("light-theme");
          }
        }
      }
    }

    /**
     * Formats timestamp according to preferred timeFormat (12h vs 24h).
     * @param {number|Date|string} time
     * @param {Object} [options]
     * @returns {string}
     */
    formatTime(time, options = {}) {
      if (!time) return "—";
      const date = time instanceof Date ? time : new Date(time);
      if (isNaN(date.getTime())) return "—";

      const timeFormat = this.getSetting("preferences.timeFormat", "12h");
      const is24h = timeFormat === "24h";

      const timeOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: !is24h,
        ...options
      };

      try {
        return date.toLocaleTimeString("en-US", timeOptions);
      } catch (e) {
        return date.toTimeString().split(" ")[0];
      }
    }

    /**
     * Checks if current time is within the configured auto-sync time window.
     * @returns {boolean}
     */
    isWithinSyncWindow() {
      const start = this.getSetting("synchronization.autoSyncStartTime", "06:00");
      const end = this.getSetting("synchronization.autoSyncEndTime", "23:00");

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        // Normal daytime window e.g. 06:00 to 23:00
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Midnight spanning window e.g. 23:00 to 06:00
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    }

    /**
     * Compiles and triggers browser download of complete JSON data export.
     * @returns {Object} The exported bundle
     */
    exportData() {
      const store = LeetCodeAutoSync.DeveloperDataStore || {};
      const diagStore = LeetCodeAutoSync.DiagnosticEventStore || {};

      const exportBundle = {
        app: "DevPulse",
        version: (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest)
          ? chrome.runtime.getManifest().version
          : "1.1.0",
        exportedAt: new Date().toISOString(),
        settings: this._settings,
        profile: store.profile || {},
        stats: store.stats || {},
        repository: store.repository || {},
        submissions: store.submissions || [],
        curatedLists: store.curatedLists || {},
        diagnosticEvents: diagStore.getEvents ? diagStore.getEvents() : []
      };

      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `devpulse-export-${dateStr}.json`;
      const jsonStr = JSON.stringify(exportBundle, null, 2);

      if (typeof document !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function" && document.body && typeof document.body.appendChild === "function") {
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        if (typeof a.click === "function") a.click();
        if (typeof document.body.removeChild === "function") document.body.removeChild(a);
        if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
      }

      return exportBundle;
    }

    /**
     * Subscribe to settings changes.
     * @param {Function} listener
     * @returns {Function} Unsubscribe callback
     */
    subscribe(listener) {
      if (typeof listener === "function") {
        this.listeners.add(listener);
      }
      return () => this.listeners.delete(listener);
    }

    notifySubscribers() {
      this.listeners.forEach((listener) => {
        try {
          listener(this.getSettings());
        } catch (e) {
          console.error("[DeveloperSettingsStore] Subscriber callback error:", e);
        }
      });
    }
  }

  LeetCodeAutoSync.DeveloperSettingsStore = new DeveloperSettingsStore();

})(typeof self !== "undefined" ? self : this);
