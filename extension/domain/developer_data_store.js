/**
 * DeveloperDataStore
 * Single Source of Truth for the Developer Intelligence OS.
 * Centralizes profile, repository scan, submissions, contests, roadmaps, activity,
 * detected AST patterns, category metrics, achievements, historical snapshots, and metric provenance.
 * UI components read ONLY from this store.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DataProvenance, Logger } = LeetCodeAutoSync;

  class DeveloperDataStore {
    constructor() {
      this.listeners = new Set();
      this.curatedProgressListeners = new Set();
      this.reset();
    }

    /**
     * Reset store data structures.
     */
    reset() {
      this.status = {
        loaded: false,
        authenticated: false,
        repoScanned: false,
        lastFetched: null,
        lastRepoScan: null,
        errors: []
      };

      this.solvedSlugs = new Set();

      this.curatedLists = {
        hydrated: false,
        status: "loading", // "loading" | "ready" | "error"
        source: null,      // "graphql" | "repository" | "cache" | null
        isLive: false,
        solvedSlugs: new Set(),
        lastSync: null,
        progress: [],
        error: null
      };

      this.profile = {
        username: null,
        realName: null,
        userAvatar: null,
        countryName: null,
        ranking: null,
        reputation: null,
        starRating: null,
        profileUrl: null
      };

      this.rawGraphQL = {
        globalData: null,
        getUserProfile: null,
        userCalendar: null,
        getUserContestRanking: null,
        recentAcSubmissionList: null
      };

      this.stats = {
        totalSolved: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        acSubmissions: 0,
        totalSubmissions: 0,
        acceptanceRate: 0,
        officialStreak: 0,
        calendarStreak: 0,
        reconstructedStreak: 0,
        daysSkipped: 0,
        currentDayCompleted: false,
        longestStreak: 0,
        longestCalculatedStreak: 0,
        yesterdaySolved: 0,
        totalActiveDays: 0,
        lastSolvedDate: null,
        streakTrace: null,
        timestampComparisonTable: [],
        dailyChallengeStatus: {
          title: null,
          difficulty: null,
          acceptanceRate: null,
          url: null,
          isSolved: false,
          topics: [],
          companies: []
        }
      };

      // Backward compatibility aliases for stats
      Object.defineProperty(this.stats, "currentStreak", {
        get: () => this.stats.officialStreak,
        set: (val) => { this.stats.officialStreak = val; },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this.stats, "apiStreak", {
        get: () => this.stats.calendarStreak,
        set: (val) => { this.stats.calendarStreak = val; },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(this.stats, "calculatedCurrentStreak", {
        get: () => this.stats.reconstructedStreak,
        set: (val) => { this.stats.reconstructedStreak = val; },
        enumerable: true,
        configurable: true
      });

      this.repository = {
        configured: true,
        repoPath: "Leetcode-solutions",
        repoUrl: null,
        repoName: "Leetcode-solutions",
        owner: null,
        githubUsername: null,
        branch: "main",
        lastCommitHash: null,
        lastSynced: null,
        lastSyncedText: null,
        syncedCount: 0,
        totalAccepted: 0,
        missingCount: 0,
        hasReadme: true,
        brokenLinksCount: 0,
        duplicateCount: 0,
        metadataCompleteness: 0,
        syncedProblems: [],
        missingProblems: [],
        brokenLinks: [],
        duplicates: []
      };

      this.submissions = [];

      this.contests = {
        available: false,
        attendedCount: 0,
        rating: 0,
        globalRanking: 0,
        topPercentage: 0,
        ratingHistory: [],
        recentContests: 0
      };

      this.roadmaps = [];

      this.patterns = {
        patternFrequency: {},
        detectedPatterns: [],
        lastAnalyzed: null
      };

      this.metrics = {
        overallScore: 0,
        readinessLevel: "Not enough data",
        growthTrend: "→ Stable",
        learningMomentum: "Low",
        repositoryHealth: "Not Configured",
        categoryScores: {},
        strengths: [],
        weaknesses: [],
        recommendations: []
      };

      this.achievements = [];
      this.snapshots = [];

      this.provenance = {
        profile: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "globalData", confidence: 100 }),
        stats: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "getUserProfile", confidence: 100 }),
        officialStreak: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "streakCounter.streakCount", confidence: 100 }),
        calendarStreak: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "userCalendar.streak", confidence: 100 }),
        reconstructedStreak: new DataProvenance({ source: "submissionCalendar", queryOrScanner: "Deterministic reconstruction", confidence: 100 }),
        currentStreak: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "streakCounter.streakCount", confidence: 100 }),
        calculatedCurrentStreak: new DataProvenance({ source: "submissionCalendar", queryOrScanner: "Deterministic reconstruction", confidence: 100 }),
        calendar: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "userCalendar", confidence: 100 }),
        contests: new DataProvenance({ source: "LeetCode GraphQL", queryOrScanner: "userContestRanking", confidence: 100 }),
        repository: new DataProvenance({ source: "Local Repository Scanner", queryOrScanner: "RepositoryScanner.scan_repository", confidence: 100 }),
        patterns: new DataProvenance({ source: "AST Pattern Analyzer", queryOrScanner: "PatternService.detectPatterns", confidence: 100 })
      };

      this.hydrateCuratedLists();
      this.hydrateFromStorage();
    }

    /**
     * Hydrate persistent state from chrome.storage.local.
     */
    hydrateFromStorage() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["developer_store_snapshot"], (res) => {
          if (res && res.developer_store_snapshot) {
            const snap = res.developer_store_snapshot;
            if (snap.profile && snap.profile.username) {
              Object.assign(this.profile, snap.profile);
              this.status.authenticated = true;
            }
            if (snap.stats && typeof snap.stats.totalSolved === "number") {
              Object.assign(this.stats, snap.stats);
            }
            if (snap.repository && snap.repository.syncedCount > 0) {
              Object.assign(this.repository, snap.repository);
            }
            this.notifySubscribers();
          }
        });
      }
    }

    /**
     * Save current state snapshot to chrome.storage.local.
     */
    saveToStorage() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const snapshot = {
          profile: this.profile,
          stats: {
            totalSolved: this.stats.totalSolved,
            easy: this.stats.easy,
            medium: this.stats.medium,
            hard: this.stats.hard,
            officialStreak: this.stats.officialStreak,
            calendarStreak: this.stats.calendarStreak
          },
          repository: {
            repoPath: this.repository.repoPath,
            repoUrl: this.repository.repoUrl,
            owner: this.repository.owner,
            branch: this.repository.branch,
            lastCommitHash: this.repository.lastCommitHash,
            lastSynced: this.repository.lastSynced,
            lastSyncedText: this.repository.lastSyncedText,
            syncedCount: this.repository.syncedCount
          }
        };
        chrome.storage.local.set({ developer_store_snapshot: snapshot });
      }
    }

    setProvenance(key, prov) {
      if (key && prov) {
        this.provenance[key] = prov;
      }
    }

    onDataStoreChanged(listener) {
      if (typeof listener === "function") {
        this.listeners.add(listener);
      }
      return () => this.listeners.delete(listener);
    }

    notifySubscribers() {
      this.saveToStorage();
      this.listeners.forEach((listener) => {
        try {
          listener(this);
        } catch (err) {
          if (Logger && Logger.error) {
            Logger.error("DeveloperDataStore subscriber listener threw exception:", err);
          }
        }
      });
    }

    /**
     * Subscribe to Curated Lists progress updates
     * @param {Function} listener
     * @returns {Function} Unsubscribe callback
     */
    onCuratedProgressUpdated(listener) {
      if (typeof listener === "function") {
        this.curatedProgressListeners.add(listener);
        try {
          listener(this.curatedLists);
        } catch (e) {}
      }
      return () => this.curatedProgressListeners.delete(listener);
    }

    /**
     * Notify subscribers of Curated Lists progress change
     */
    notifyCuratedProgressUpdated() {
      this.curatedProgressListeners.forEach((listener) => {
        try {
          listener(this.curatedLists);
        } catch (err) {
          if (Logger && Logger.error) Logger.error("DeveloperDataStore curated listener error:", err);
        }
      });
    }

    /**
     * Hydrate curated lists from persistent storage (< 50ms)
     */
    hydrateCuratedLists() {
      const normalize = LeetCodeAutoSync.normalizeTitleSlug || (s => s ? String(s).toLowerCase().trim() : null);
      try {
        let cachedStr = null;
        if (typeof localStorage !== "undefined") {
          cachedStr = localStorage.getItem("leetcode_auto_sync_curated_cache_v2");
        }
        if (cachedStr) {
          const cache = JSON.parse(cachedStr);
          if (cache && cache.version === 2 && Array.isArray(cache.solvedSlugs) && Array.isArray(cache.progress)) {
            const normalizedArr = cache.solvedSlugs.map(normalize).filter(Boolean);
            this.curatedLists.solvedSlugs = new Set(normalizedArr);
            this.solvedSlugs = new Set(normalizedArr);
            this.curatedLists.progress = cache.progress;
            this.curatedLists.lastSync = cache.lastSync || new Date().toISOString();
            this.curatedLists.source = "cache";
            this.curatedLists.status = "ready";
            this.curatedLists.isLive = false;
            this.curatedLists.hydrated = true;
            this.curatedLists.error = null;
            this.notifyCuratedProgressUpdated();
            return;
          }
        }
      } catch (e) {
        console.warn("[DeveloperDataStore] Curated cache hydration fallback to loading state");
      }

      // If cache missing or corrupt, remain in loading state (NO 0%!)
      this.curatedLists.hydrated = false;
      this.curatedLists.status = "loading";
      this.curatedLists.source = "loading";
      this.curatedLists.progress = [];
      this.curatedLists.error = null;
      this.notifyCuratedProgressUpdated();
    }

    /**
     * Single-execution sync pipeline for Curated Lists
     * Computes progress EXACTLY ONCE PER SYNC and updates canonical state
     * @param {Array<string>|Set<string>} slugs Extracted problem slugs
     * @param {string} source "graphql" | "repository" | "submission"
     */
    updateCuratedLists(slugs = [], source = "repository") {
      // If repository scanner has already hydrated progress, do NOT allow GraphQL to overwrite repository progress authority
      if (source === "graphql" && this.curatedLists.hydrated && this.curatedLists.source === "repository") {
        return;
      }

      const normalize = LeetCodeAutoSync.normalizeTitleSlug || (s => s ? String(s).toLowerCase().trim() : null);
      const inputArr = slugs instanceof Set ? Array.from(slugs) : (Array.isArray(slugs) ? slugs : []);
      
      if (source === "repository") {
        this.curatedLists.solvedSlugs = new Set();
      }

      inputArr.forEach((s) => {
        const norm = normalize(s);
        if (norm) {
          this.curatedLists.solvedSlugs.add(norm);
          this.solvedSlugs.add(norm);
        }
      });

      // Run computation exactly once per sync
      if (LeetCodeAutoSync.CuratedListsService) {
        const computedProgress = LeetCodeAutoSync.CuratedListsService.computeAllProgress(this);
        this.curatedLists.progress = computedProgress;
        this.curatedLists.lastSync = new Date().toISOString();
        this.curatedLists.source = source;
        this.curatedLists.status = "ready";
        this.curatedLists.isLive = true;
        this.curatedLists.hydrated = true;
        this.curatedLists.error = null;

        this.persistCuratedLists();
        this.notifyCuratedProgressUpdated();
      }
    }

    /**
     * Persist curated lists payload to storage
     */
    persistCuratedLists() {
      try {
        const payload = {
          version: 2,
          lastSync: this.curatedLists.lastSync,
          solvedSlugs: Array.from(this.curatedLists.solvedSlugs),
          progress: this.curatedLists.progress
        };
        const str = JSON.stringify(payload);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("leetcode_auto_sync_curated_cache_v2", str);
        }
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ leetcode_auto_sync_curated_cache_v2: payload });
        }
      } catch (e) {}
    }

    /**
     * Clear curated lists cache (on account switch or reset)
     */
    clearCuratedListsCache() {
      this.solvedSlugs = new Set();
      if (this.rawGraphQL) {
        this.rawGraphQL.recentAcSubmissionList = [];
      }
      this.submissions = [];
      if (this.repository) {
        this.repository.syncedProblems = [];
      }
      this.curatedLists = {
        hydrated: false,
        status: "loading",
        source: "loading",
        isLive: false,
        solvedSlugs: new Set(),
        lastSync: null,
        progress: [],
        error: null
      };
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("leetcode_auto_sync_curated_cache_v2");
        }
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(["leetcode_auto_sync_curated_cache_v2"]);
        }
      } catch (e) {}
      this.notifyCuratedProgressUpdated();
    }

    addSolvedSlugs(slugs = []) {
      this.updateCuratedLists(slugs, "graphql");
    }

    toJSONObject() {
      const provObj = {};
      Object.keys(this.provenance).forEach((k) => {
        provObj[k] = this.provenance[k].toJSONObject ? this.provenance[k].toJSONObject() : this.provenance[k];
      });

      return {
        status: { ...this.status },
        profile: { ...this.profile },
        stats: { ...this.stats },
        curatedLists: {
          hydrated: this.curatedLists.hydrated,
          isLive: this.curatedLists.isLive,
          source: this.curatedLists.source,
          lastSync: this.curatedLists.lastSync,
          progress: JSON.parse(JSON.stringify(this.curatedLists.progress))
        },
        rawGraphQL: this.rawGraphQL ? JSON.parse(JSON.stringify(this.rawGraphQL)) : null,
        repository: {
          ...this.repository,
          syncedProblems: [...this.repository.syncedProblems],
          missingProblems: [...this.repository.missingProblems],
          brokenLinks: [...this.repository.brokenLinks],
          duplicates: [...this.repository.duplicates]
        },
        submissions: [...this.submissions],
        contests: {
          ...this.contests,
          ratingHistory: [...this.contests.ratingHistory]
        },
        roadmaps: [...this.roadmaps],
        patterns: {
          ...this.patterns,
          patternFrequency: { ...this.patterns.patternFrequency },
          detectedPatterns: [...this.patterns.detectedPatterns]
        },
        metrics: { ...this.metrics },
        achievements: [...this.achievements],
        provenance: provObj
      };
    }
  }

  LeetCodeAutoSync.DeveloperDataStore = new DeveloperDataStore();

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
