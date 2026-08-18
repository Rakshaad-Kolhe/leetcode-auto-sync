/**
 * CuratedListsService
 * Enterprise-grade, deterministic progress calculation for curated problem sets.
 * Performs strict titleSlug matching, full pipeline instrumentation, mismatch reporting,
 * fail-loudly error handling, and diagnostic debug telemetry reporting.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class CuratedListsService {
    constructor() {
      this.registeredDatasets = new Map();
      this.cache = new Map();
      this.lastSyncTimestamp = null;
      this.diagnosticReport = null;

      this.initDefaultDatasets();
    }

    /**
     * Auto-register canonical versioned datasets (Blind 75, NeetCode 150, LeetCode 75)
     */
    initDefaultDatasets() {
      let blindJson = null;
      let neetJson = null;
      let lc75Json = null;

      try {
        if (typeof require !== "undefined") {
          blindJson = require("../data/curated_lists/blind75.json");
          neetJson = require("../data/curated_lists/neetcode150.json");
          lc75Json = require("../data/curated_lists/leetcode75.json");
        }
      } catch (err) {
        // Fallback if require is unavailable in browser context
      }

      if (blindJson && Array.isArray(blindJson.problems)) {
        this.registerDataset(blindJson);
      } else if (LeetCodeAutoSync.CuratedListsDatasetService && LeetCodeAutoSync.CuratedListsDatasetService.BLIND_75) {
        this.registerDataset({
          id: "blind75",
          name: "Blind 75",
          version: "1.0.0",
          totalProblems: 75,
          source: "https://techinterviewhandbook.org/grind75?hours=168&weeks=12",
          problems: Array.from(LeetCodeAutoSync.CuratedListsDatasetService.BLIND_75).map(slug => ({ slug: String(slug).toLowerCase().trim(), title: slug }))
        });
      }

      if (neetJson && Array.isArray(neetJson.problems)) {
        this.registerDataset(neetJson);
      } else if (LeetCodeAutoSync.CuratedListsDatasetService && LeetCodeAutoSync.CuratedListsDatasetService.NEETCODE_150) {
        this.registerDataset({
          id: "neetcode150",
          name: "NeetCode 150",
          version: "1.0.0",
          totalProblems: 150,
          source: "https://neetcode.io/practice",
          problems: Array.from(LeetCodeAutoSync.CuratedListsDatasetService.NEETCODE_150).map(slug => ({ slug: String(slug).toLowerCase().trim(), title: slug }))
        });
      }

      if (lc75Json && Array.isArray(lc75Json.problems)) {
        this.registerDataset(lc75Json);
      } else if (LeetCodeAutoSync.CuratedListsDatasetService && LeetCodeAutoSync.CuratedListsDatasetService.LEETCODE_75) {
        this.registerDataset({
          id: "leetcode75",
          name: "LeetCode 75",
          version: "1.0.0",
          totalProblems: 75,
          source: "https://leetcode.com/studyplan/leetcode-75/",
          problems: Array.from(LeetCodeAutoSync.CuratedListsDatasetService.LEETCODE_75).map(slug => ({ slug: String(slug).toLowerCase().trim(), title: slug }))
        });
      }
    }

    /**
     * Register a versioned JSON dataset
     * @param {Object} dataset Versioned dataset containing id, name, version, totalProblems, source, problems
     */
    registerDataset(dataset) {
      if (!dataset || !dataset.id || !Array.isArray(dataset.problems)) {
        console.error("[CuratedListsService] Invalid dataset payload rejected:", dataset);
        return false;
      }

      const normalize = LeetCodeAutoSync.normalizeTitleSlug || (s => s ? String(s).toLowerCase().trim() : null);
      const uniqueSlugs = new Set();
      const normalizedProblems = [];

      dataset.problems.forEach((prob) => {
        if (prob && (prob.slug || prob.titleSlug)) {
          const rawSlug = prob.slug || prob.titleSlug;
          const normalizedSlug = normalize(rawSlug);
          if (normalizedSlug && !uniqueSlugs.has(normalizedSlug)) {
            uniqueSlugs.add(normalizedSlug);
            normalizedProblems.push({
              slug: normalizedSlug,
              frontendId: prob.frontendId || prob.frontendQuestionId || "",
              title: prob.title || normalizedSlug,
              difficulty: prob.difficulty || "Medium"
            });
          }
        }
      });

      const expectedTotal = dataset.totalProblems || normalizedProblems.length;
      if (dataset.totalProblems && uniqueSlugs.size !== expectedTotal) {
        console.error(`[CuratedListsService] Diagnostic Mismatch: ${dataset.name} registered with ${uniqueSlugs.size} unique slugs but expected ${expectedTotal}`);
      }

      this.registeredDatasets.set(dataset.id, {
        id: dataset.id,
        name: dataset.name || dataset.id,
        version: dataset.version || "1.0.0",
        totalProblems: expectedTotal,
        source: dataset.source || "#",
        problems: normalizedProblems,
        uniqueSlugsCount: uniqueSlugs.size
      });

      console.log(`[CuratedListsService] Registered dataset: ${dataset.name} (v${dataset.version}, ${uniqueSlugs.size} unique slugs)`);
      this.invalidateCache();
      return true;
    }

    /**
     * Invalidate progress cache
     */
    invalidateCache() {
      this.cache.clear();
      this.lastSyncTimestamp = null;
      this.diagnosticReport = null;
    }

    /**
     * Get list of dataset names containing a specific problem slug or URL
     * @param {string} problemUrlOrSlug Problem URL or titleSlug
     * @returns {Array<string>} Names of curated datasets containing the problem
     */
    getContainingLists(problemUrlOrSlug) {
      if (!problemUrlOrSlug) return [];
      let slug = String(problemUrlOrSlug).trim().toLowerCase();
      if (slug.includes("/problems/")) {
        const parts = slug.split("/problems/")[1].split("/").filter(Boolean);
        slug = parts[0] || slug;
      }
      if (!slug) return [];

      if (this.registeredDatasets.size === 0) {
        this.initDefaultDatasets();
      }

      const containing = [];
      this.registeredDatasets.forEach((dataset) => {
        if (dataset && Array.isArray(dataset.problems)) {
          const hasProblem = dataset.problems.some((p) => {
            const pSlug = String(p.slug || p.titleSlug || "").trim().toLowerCase();
            return pSlug === slug;
          });
          if (hasProblem) {
            containing.push(dataset.name);
          }
        }
      });
      return containing;
    }

    /**
     * Extract normalized problem identities from store (prioritizing repository scan)
     * @param {Object} store DeveloperDataStore snapshot
     * @returns {Array<Object>} List of normalized problem identity objects
     */
    extractRepositorySolvedIdentities(store) {
      const identities = [];
      const seenKeys = new Set();
      const normalizeIdentity = LeetCodeAutoSync.normalizeProblemIdentity || (p => ({ frontendId: null, titleSlug: String(p).toLowerCase(), normalizedTitle: String(p).toLowerCase() }));

      const addIdentity = (item) => {
        if (!item) return;
        const norm = normalizeIdentity(item);
        const dedupeKey = norm.frontendId ? `id:${norm.frontendId}` : `slug:${norm.titleSlug}`;
        if (norm.titleSlug && !seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          identities.push(norm);
        }
      };

      // 1. Authoritative GitHub Repository Synced Problems (STRICT SOURCE OF TRUTH)
      if (store && store.repository && Array.isArray(store.repository.syncedProblems) && store.repository.syncedProblems.length > 0) {
        store.repository.syncedProblems.forEach(addIdentity);
        return identities;
      }

      // Fallback only if repository scan has not run yet
      if (store && store.curatedLists && store.curatedLists.solvedSlugs) {
        const cArr = store.curatedLists.solvedSlugs instanceof Set ? Array.from(store.curatedLists.solvedSlugs) : (Array.isArray(store.curatedLists.solvedSlugs) ? store.curatedLists.solvedSlugs : []);
        cArr.forEach(addIdentity);
      } else if (store && store.solvedSlugs) {
        const solvedArr = store.solvedSlugs instanceof Set ? Array.from(store.solvedSlugs) : (Array.isArray(store.solvedSlugs) ? store.solvedSlugs : []);
        solvedArr.forEach(addIdentity);
      }

      return identities;
    }

    /**
     * Compute progress model and diagnostic report for a single dataset
     * @param {Object} dataset Dataset object
     * @param {Array<Object>} repoIdentities List of normalized repository solved identities
     * @returns {Object} Validated progress model with diagnostics
     */
    computeDatasetProgress(dataset, repoIdentities = []) {
      if (!dataset || !dataset.problems) {
        return {
          id: dataset ? dataset.id : "unknown",
          name: dataset ? dataset.name : "Dataset unavailable",
          solved: 0,
          total: 0,
          percentage: 0,
          colorClass: "red",
          sourceUrl: "#",
          error: true,
          statusText: "Dataset unavailable",
          diagnostics: { matchedDetails: [], missingSlugs: [] }
        };
      }

      const normalizeIdentity = LeetCodeAutoSync.normalizeProblemIdentity || (p => p);
      const matchesProblem = LeetCodeAutoSync.matchesProblem || ((r, c) => ({ isMatch: r.titleSlug === c.titleSlug, strategy: "slug" }));

      let solvedCount = 0;
      const totalProblems = dataset.totalProblems || dataset.problems.length;
      const matchedDetails = [];
      const missingSlugs = [];

      dataset.problems.forEach((prob) => {
        const curatedNorm = normalizeIdentity(prob);
        let foundMatch = null;

        for (const repoIdent of repoIdentities) {
          const matchRes = matchesProblem(repoIdent, curatedNorm);
          if (matchRes.isMatch) {
            foundMatch = {
              repositoryId: repoIdent.frontendId,
              repositorySlug: repoIdent.titleSlug,
              curatedId: curatedNorm.frontendId,
              curatedSlug: curatedNorm.titleSlug,
              matchStrategy: matchRes.strategy
            };
            break;
          }
        }

        if (foundMatch) {
          solvedCount++;
          matchedDetails.push(foundMatch);
        } else {
          missingSlugs.push(curatedNorm.titleSlug);
        }
      });

      const rawPct = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
      const percentage = Math.floor(rawPct);

      let colorClass = "red";
      if (percentage >= 70) {
        colorClass = "green";
      } else if (percentage >= 40) {
        colorClass = "orange";
      }

      return {
        id: dataset.id,
        name: dataset.name,
        solved: solvedCount,
        total: totalProblems,
        percentage: percentage,
        colorClass: colorClass,
        sourceUrl: dataset.source,
        datasetVersion: dataset.version,
        lastUpdated: new Date().toISOString(),
        error: false,
        statusText: "PASS",
        diagnostics: {
          matchedDetails,
          missingSlugs,
          matchedCount: matchedDetails.length,
          missingCount: missingSlugs.length
        }
      };
    }

    /**
     * Compute progress for all registered datasets against store state
     * @param {Object} store DeveloperDataStore snapshot
     * @returns {Array<Object>} List of computed progress models
     */
    computeAllProgress(store) {
      if (this.registeredDatasets.size === 0) {
        this.initDefaultDatasets();
      }

      const repoIdentities = this.extractRepositorySolvedIdentities(store);
      const results = [];
      const telemetrySummary = {};

      console.group("[CURATED_PROGRESS]");
      console.log("Repository solved:", repoIdentities.length);

      const blindDataset = this.registeredDatasets.get("blind75");
      const neetDataset = this.registeredDatasets.get("neetcode150");
      const lc75Dataset = this.registeredDatasets.get("leetcode75");

      console.log("Blind 75 catalog:", blindDataset ? blindDataset.totalProblems : 75);
      console.log("NeetCode 150 catalog:", neetDataset ? neetDataset.totalProblems : 150);
      console.log("LeetCode 75 catalog:", lc75Dataset ? lc75Dataset.totalProblems : 75);

      this.registeredDatasets.forEach((dataset) => {
        const progress = this.computeDatasetProgress(dataset, repoIdentities);
        results.push(progress);
        this.cache.set(dataset.id, progress);
        telemetrySummary[dataset.name] = `${progress.solved} / ${progress.total}`;
        console.log(`${dataset.name} solved:`, progress.solved);
        console.log(`${dataset.name} matches:`, progress.diagnostics.matchedDetails);
      });

      console.groupEnd();

      this.lastSyncTimestamp = new Date().toISOString();
      return results;
    }
  }

  LeetCodeAutoSync.CuratedListsService = new CuratedListsService();

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
