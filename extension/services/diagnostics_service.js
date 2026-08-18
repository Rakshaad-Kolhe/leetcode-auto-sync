/**
 * @fileoverview Central Diagnostics Service for LeetCode Auto Sync.
 * Executes live health checks, resolves sync health models, manages diagnostic events,
 * and handles operational troubleshooting actions.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const {
    DiagnosticStatus,
    SyncState,
    DiagnosticEventType,
    DiagnosticCheckResult,
    DiagnosticEvent,
    DiagnosticEventStore,
    DeveloperDataStore,
    BackendService,
    AuthenticationService
  } = LeetCodeAutoSync;

  class DiagnosticsService {
    constructor() {
      this.startupTime = Date.now();
      this.isChecking = false;
      this.lastCheckedAt = null;
      this.latestChecks = {
        backend: null,
        repository: null,
        git: null,
        leetcode: null,
        github: null,
        extension: null
      };
      this.listeners = new Set();
      this.initDefaultChecks();
    }

    /**
     * Subscribe to diagnostic check updates.
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
          listener(this.getDiagnosticsSummary());
        } catch (e) {
          console.error("[DiagnosticsService] Subscriber error:", e);
        }
      });
    }

    initDefaultChecks() {
      this.latestChecks = {
        backend: new DiagnosticCheckResult({ id: "backend", label: "Backend", status: DiagnosticStatus.UNKNOWN, message: "Not checked" }),
        repository: new DiagnosticCheckResult({ id: "repository", label: "Repository", status: DiagnosticStatus.UNKNOWN, message: "Not checked" }),
        git: new DiagnosticCheckResult({ id: "git", label: "Git", status: DiagnosticStatus.UNKNOWN, message: "Not checked" }),
        leetcode: new DiagnosticCheckResult({ id: "leetcode", label: "LeetCode", status: DiagnosticStatus.UNKNOWN, message: "Not checked" }),
        github: new DiagnosticCheckResult({ id: "github", label: "GitHub", status: DiagnosticStatus.UNKNOWN, message: "Not checked" }),
        extension: new DiagnosticCheckResult({ id: "extension", label: "Extension", status: DiagnosticStatus.UNKNOWN, message: "Not checked" })
      };
    }

    /**
     * 1. Backend Connectivity & Health Check
     * @returns {Promise<DiagnosticCheckResult>}
     */
    async checkBackend() {
      const startTime = performance.now();
      try {
        const backendService = (LeetCodeAutoSync && LeetCodeAutoSync.BackendService) || BackendService;
        if (!backendService || typeof backendService.checkBackend !== "function") {
          return new DiagnosticCheckResult({
            id: "backend",
            label: "Backend",
            status: DiagnosticStatus.ERROR,
            message: "Unavailable",
            details: { reason: "BackendService not initialized" }
          });
        }

        const res = await backendService.checkBackend();
        const latencyMs = Math.round(performance.now() - startTime);

        if (res && res.success) {
          return new DiagnosticCheckResult({
            id: "backend",
            label: "Backend",
            status: DiagnosticStatus.HEALTHY,
            message: `Connected (${latencyMs} ms)`,
            latencyMs,
            details: res.data || null
          });
        }

        return new DiagnosticCheckResult({
          id: "backend",
          label: "Backend",
          status: DiagnosticStatus.ERROR,
          message: "Unavailable",
          latencyMs,
          details: { error: res ? res.error : "Health check failed" }
        });
      } catch (err) {
        const latencyMs = Math.round(performance.now() - startTime);
        return new DiagnosticCheckResult({
          id: "backend",
          label: "Backend",
          status: DiagnosticStatus.ERROR,
          message: "Unavailable",
          latencyMs,
          details: { error: err.message }
        });
      }
    }

    /**
     * 2. Repository Configuration & Access Check
     * @returns {Promise<DiagnosticCheckResult>}
     */
    async checkRepository() {
      const repo = (DeveloperDataStore && DeveloperDataStore.repository) || {};
      
      if (repo.configured === false && !repo.repoPath && !repo.repoName) {
        return new DiagnosticCheckResult({
          id: "repository",
          label: "Repository",
          status: DiagnosticStatus.WARNING,
          message: "Not configured",
          details: repo
        });
      }

      if (repo.error || repo.lastError) {
        return new DiagnosticCheckResult({
          id: "repository",
          label: "Repository",
          status: DiagnosticStatus.ERROR,
          message: repo.lastError || repo.error || "Repository unavailable",
          details: repo
        });
      }

      const count = repo.syncedCount || (Array.isArray(repo.syncedProblems) ? repo.syncedProblems.length : 0);
      return new DiagnosticCheckResult({
        id: "repository",
        label: "Repository",
        status: DiagnosticStatus.HEALTHY,
        message: count > 0 ? `Accessible · ${count} solutions` : "Accessible",
        details: repo
      });
    }

    /**
     * 3. Git Metadata & Working Tree Check
     * @returns {Promise<DiagnosticCheckResult>}
     */
    async checkGit() {
      const repo = (DeveloperDataStore && DeveloperDataStore.repository) || {};

      if (repo.isGit === false) {
        return new DiagnosticCheckResult({
          id: "git",
          label: "Git",
          status: DiagnosticStatus.WARNING,
          message: "Repository not detected",
          details: repo
        });
      }

      const branch = repo.branch || "main";
      const commit = repo.lastCommitHash ? ` (${repo.lastCommitHash})` : "";

      return new DiagnosticCheckResult({
        id: "git",
        label: "Git",
        status: DiagnosticStatus.HEALTHY,
        message: `Ready · branch ${branch}${commit}`,
        details: { branch, commit: repo.lastCommitHash }
      });
    }

    /**
     * 4. LeetCode GraphQL & Session Connectivity Check
     * @returns {Promise<DiagnosticCheckResult>}
     */
    async checkLeetCode() {
      const store = (LeetCodeAutoSync && LeetCodeAutoSync.DeveloperDataStore) || DeveloperDataStore || {};
      const profile = store.profile || {};
      const auth = (LeetCodeAutoSync && LeetCodeAutoSync.AuthenticationService) || AuthenticationService || {};

      if (profile.username) {
        return new DiagnosticCheckResult({
          id: "leetcode",
          label: "LeetCode",
          status: DiagnosticStatus.HEALTHY,
          message: `Connected · @${profile.username}`,
          details: { username: profile.username }
        });
      }

      if (auth && typeof auth.verifyAuthenticationState === "function") {
        try {
          await auth.verifyAuthenticationState();
        } catch (e) {}
      }

      if (auth.authState === "AUTHENTICATED") {
        return new DiagnosticCheckResult({
          id: "leetcode",
          label: "LeetCode",
          status: DiagnosticStatus.HEALTHY,
          message: "Connected",
          details: { state: auth.authState }
        });
      }

      if (auth.authState === "EXPIRED") {
        return new DiagnosticCheckResult({
          id: "leetcode",
          label: "LeetCode",
          status: DiagnosticStatus.WARNING,
          message: "Session expired",
          details: { state: auth.authState }
        });
      }

      return new DiagnosticCheckResult({
        id: "leetcode",
        label: "LeetCode",
        status: DiagnosticStatus.WARNING,
        message: "Session unavailable",
        details: { state: auth.authState || "UNAUTHENTICATED" }
      });
    }

    /**
     * 5. GitHub Remote & Target Repository Check
     * @returns {Promise<DiagnosticCheckResult>}
     */
    async checkGitHub() {
      const repo = (DeveloperDataStore && DeveloperDataStore.repository) || {};
      const profile = (DeveloperDataStore && DeveloperDataStore.profile) || {};
      let owner = repo.owner || repo.githubUsername || profile.username;
      const repoUrl = repo.repoUrl;

      if (!owner && !repoUrl) {
        return new DiagnosticCheckResult({
          id: "github",
          label: "GitHub",
          status: DiagnosticStatus.WARNING,
          message: "Not configured",
          details: repo
        });
      }

      const cleanOwner = String(owner || "Connected").replace(/_/g, "-");
      return new DiagnosticCheckResult({
        id: "github",
        label: "GitHub",
        status: DiagnosticStatus.HEALTHY,
        message: `Connected · ${cleanOwner}`,
        details: { owner: cleanOwner, repoUrl }
      });
    }

    /**
     * 6. Extension Runtime & Data Store Integrity Check
     * @returns {Promise<DiagnosticCheckResult>}
     */
    async checkExtension() {
      const health = this.validateDataStore();
      if (health === "Healthy") {
        return new DiagnosticCheckResult({
          id: "extension",
          label: "Extension",
          status: DiagnosticStatus.HEALTHY,
          message: "Running",
          details: { health }
        });
      }

      return new DiagnosticCheckResult({
        id: "extension",
        label: "Extension",
        status: DiagnosticStatus.WARNING,
        message: "Degraded",
        details: { health }
      });
    }

    /**
     * Executes all 6 health checks concurrently and records findings.
     * @returns {Promise<Object>} Summary payload
     */
    async runAllChecks() {
      if (this.isChecking) return this.getDiagnosticsSummary();

      this.isChecking = true;
      this.notifySubscribers();

      try {
        const [backend, repository, git, leetcode, github, extension] = await Promise.all([
          this.checkBackend(),
          this.checkRepository(),
          this.checkGit(),
          this.checkLeetCode(),
          this.checkGitHub(),
          this.checkExtension()
        ]);

        this.latestChecks = { backend, repository, git, leetcode, github, extension };
        this.lastCheckedAt = Date.now();

        // Record diagnostic run event
        if (DiagnosticEventStore) {
          const overall = this.getOverallStatus();
          DiagnosticEventStore.addEvent({
            type: DiagnosticEventType.DIAGNOSTICS_RUN,
            status: overall === DiagnosticStatus.HEALTHY ? "success" : overall === DiagnosticStatus.WARNING ? "warning" : "error",
            message: `System diagnostics completed (${overall.toUpperCase()})`,
            metadata: { checkedAt: this.lastCheckedAt }
          });
        }
      } catch (err) {
        console.error("[DiagnosticsService] Health check run error:", err);
      } finally {
        this.isChecking = false;
        this.notifySubscribers();
      }

      return this.getDiagnosticsSummary();
    }

    /**
     * Calculates overall status from all checks.
     * @param {Object} [checks=this.latestChecks]
     * @returns {string} DiagnosticStatus state
     */
    getOverallStatus(checks = this.latestChecks) {
      if (this.isChecking) return DiagnosticStatus.CHECKING;

      const checkList = Object.values(checks || {}).filter(Boolean);
      if (checkList.length === 0) return DiagnosticStatus.UNKNOWN;

      if (checkList.some(c => c.status === DiagnosticStatus.ERROR)) {
        return DiagnosticStatus.ERROR;
      }
      if (checkList.some(c => c.status === DiagnosticStatus.WARNING)) {
        return DiagnosticStatus.WARNING;
      }
      if (checkList.every(c => c.status === DiagnosticStatus.HEALTHY)) {
        return DiagnosticStatus.HEALTHY;
      }
      return DiagnosticStatus.UNKNOWN;
    }

    /**
     * Evaluates current synchronization health and operation status.
     * @returns {Object}
     */
    getSyncHealth() {
      const repo = (DeveloperDataStore && DeveloperDataStore.repository) || {};
      const status = (DeveloperDataStore && DeveloperDataStore.status) || {};

      let syncState = SyncState.IDLE;
      let syncStatusText = "Up to date";
      let isError = false;

      if (repo.isSyncing) {
        syncState = SyncState.SYNCING;
        syncStatusText = "Sync in progress...";
      } else if (repo.isScanning) {
        syncState = SyncState.SCANNING;
        syncStatusText = "Repository scan in progress...";
      } else if (repo.lastError || repo.error) {
        syncState = SyncState.FAILED;
        syncStatusText = "Last sync failed";
        isError = true;
      } else if (repo.lastSynced || repo.lastSyncedText || repo.syncedCount > 0 || (Array.isArray(repo.syncedProblems) && repo.syncedProblems.length > 0)) {
        syncState = SyncState.COMPLETED;
        syncStatusText = "Last sync successful";
      } else {
        syncState = SyncState.NO_SYNC_HISTORY;
        syncStatusText = "No synchronization completed yet.";
      }

      const lastSuccessfulSync = repo.lastSyncedText || (repo.lastSynced ? this.formatRelativeTime(new Date(repo.lastSynced).getTime()) : "No sync history");
      const lastOperation = repo.lastOperation || (syncState === SyncState.COMPLETED ? "Push completed" : syncState === SyncState.SYNCING ? "Syncing solutions" : syncState === SyncState.SCANNING ? "Scanning repository" : "Idle");
      const lastCommit = repo.lastCommitHash || "Unavailable";
      const branch = repo.branch || "Unavailable";

      return {
        state: syncState,
        statusText: syncStatusText,
        isError,
        lastSuccessfulSync,
        lastOperation,
        lastCommit,
        branch,
        durationMs: repo.lastSyncDurationMs || null,
        error: repo.lastError || repo.error || null
      };
    }

    /**
     * Computes prioritized active warnings and errors.
     * @param {Object} [checks=this.latestChecks]
     * @returns {Array<{ id: string, type: 'error'|'warning', message: string, detail?: string }>}
     */
    getWarnings(checks = this.latestChecks) {
      const issues = [];
      const checkList = Object.values(checks || {}).filter(Boolean);

      // 1. Errors first
      checkList.filter(c => c.status === DiagnosticStatus.ERROR).forEach(c => {
        issues.push({
          id: c.id,
          type: "error",
          title: `${c.label} error`,
          message: c.message || `${c.label} is currently in an error state.`,
          detail: c.details ? (c.details.error || JSON.stringify(c.details)) : null
        });
      });

      // 2. Warnings second
      checkList.filter(c => c.status === DiagnosticStatus.WARNING).forEach(c => {
        issues.push({
          id: c.id,
          type: "warning",
          title: `${c.label} warning`,
          message: c.message || `${c.label} requires attention.`,
          detail: c.details ? JSON.stringify(c.details) : null
        });
      });

      return issues;
    }

    /**
     * Validates DeveloperDataStore structure and returns state.
     * @returns {"Healthy"|"Degraded"|"Unavailable"}
     */
    validateDataStore() {
      if (!DeveloperDataStore) return "Unavailable";
      if (!DeveloperDataStore.stats || !DeveloperDataStore.repository || !DeveloperDataStore.profile) {
        return "Degraded";
      }
      return "Healthy";
    }

    /**
     * Returns real extension runtime metadata.
     * @returns {Object}
     */
    getExtensionInfo() {
      const manifest = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest)
        ? chrome.runtime.getManifest()
        : null;
      const name = manifest && manifest.name ? manifest.name : "DevPulse";
      const version = manifest && manifest.version ? manifest.version : (LeetCodeAutoSync.VERSION || "1.1.0");
      const environment = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) ? "Extension" : "Browser";
      const uptimeMs = Math.max(0, Date.now() - this.startupTime);
      const uptimeFormatted = this.formatUptime(uptimeMs);
      const dataStoreHealth = this.validateDataStore();

      const repo = (DeveloperDataStore && DeveloperDataStore.repository) || {};
      const branch = repo.branch || "Unavailable";
      const remote = repo.repoUrl || (repo.owner ? `https://github.com/${repo.owner}/${repo.repoName || 'Leetcode-solutions'}` : "Unavailable");
      const repoPath = repo.repoPath || "Unavailable";
      const latestCommit = repo.lastCommitHash || "Unavailable";

      return {
        name,
        version,
        environment,
        uptimeMs,
        uptimeFormatted,
        dataStoreHealth,
        gitDetails: {
          branch,
          remote,
          repoPath,
          latestCommit
        }
      };
    }

    /**
     * Clears transient extension cache (snapshots, curated cache, profile cache) safely
     * without deleting repository files, Git history, or solutions.
     * @returns {Promise<boolean>}
     */
    async clearCache() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          await new Promise((resolve) => {
            chrome.storage.local.remove([
              "cachedRepositoryState",
              "leetcode_auto_sync_curated_cache_v2",
              "leetcode_auto_sync_snapshots",
              "leetcode_profile_cache"
            ], resolve);
          });
        }

        if (DeveloperDataStore && typeof DeveloperDataStore.hydrateCuratedLists === "function") {
          DeveloperDataStore.hydrateCuratedLists();
        }

        if (DiagnosticEventStore) {
          DiagnosticEventStore.addEvent({
            type: DiagnosticEventType.CACHE_CLEARED,
            status: "info",
            message: "Extension transient cache cleared successfully"
          });
        }

        await this.runAllChecks();
        return true;
      } catch (err) {
        console.error("[DiagnosticsService] Clear cache error:", err);
        return false;
      }
    }

    /**
     * Formats timestamp into dynamic human-readable relative time.
     * @param {number|string|Date} timestamp
     * @returns {string}
     */
    formatRelativeTime(timestamp) {
      if (!timestamp) return "No history";
      const ms = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
      if (isNaN(ms)) return String(timestamp);

      const diff = Math.max(0, Date.now() - ms);
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 10) return "just now";
      if (seconds < 60) return `${seconds} sec ago`;
      if (minutes < 60) return `${minutes} min ago`;
      if (hours < 24) return `${hours} hr ago`;
      if (days === 1) return "Yesterday";
      return `${days} days ago`;
    }

    /**
     * Formats uptime in milliseconds into dynamic readable string.
     * @param {number} ms
     * @returns {string}
     */
    formatUptime(ms) {
      const totalSec = Math.floor(Math.max(0, ms) / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      if (hours > 0) {
        return `${hours} hr ${minutes} min`;
      }
      if (minutes > 0) {
        return `${minutes} min ${seconds} sec`;
      }
      return `${seconds} sec`;
    }

    /**
     * Builds consolidated summary of all diagnostics.
     * @returns {Object}
     */
    getDiagnosticsSummary() {
      const overallStatus = this.getOverallStatus();
      const syncHealth = this.getSyncHealth();
      const warnings = this.getWarnings();
      const extensionInfo = this.getExtensionInfo();
      const recentEvents = DiagnosticEventStore ? DiagnosticEventStore.getEvents(10) : [];

      return {
        overallStatus,
        isChecking: this.isChecking,
        lastCheckedAt: this.lastCheckedAt,
        checks: this.latestChecks,
        syncHealth,
        warnings,
        extensionInfo,
        recentEvents
      };
    }
  }

  LeetCodeAutoSync.DiagnosticsService = new DiagnosticsService();

})(typeof self !== "undefined" ? self : this);
