/**
 * AnalyticsEngine
 * Master facade orchestrating personalized competitive programming intelligence,
 * skill analysis, difficulty progression, recommendation engine, and reactive data store updates.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const models = LeetCodeAutoSync.ProblemAnalyticsModel ? LeetCodeAutoSync : (typeof require === "function" ? require("./analytics_models.js") : {});
  const ProblemAnalyticsModel = models.ProblemAnalyticsModel || LeetCodeAutoSync.ProblemAnalyticsModel;
  const PersonalPlan = models.PersonalPlan || LeetCodeAutoSync.PersonalPlan;
  const SkillGap = models.SkillGap || LeetCodeAutoSync.SkillGap;

  // Built-in candidate problem catalog with rich topics and metadata for recommendation pool
  const DEFAULT_PROBLEM_CATALOG = [
    { frontendId: "1", titleSlug: "two-sum", title: "Two Sum", difficulty: "Easy", topics: ["Array", "Hash Table"] },
    { frontendId: "15", titleSlug: "3sum", title: "3Sum", difficulty: "Medium", topics: ["Array", "Two Pointers"] },
    { frontendId: "11", titleSlug: "container-with-most-water", title: "Container With Most Water", difficulty: "Medium", topics: ["Array", "Two Pointers"] },
    { frontendId: "3", titleSlug: "longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters", difficulty: "Medium", topics: ["String", "Sliding Window"] },
    { frontendId: "20", titleSlug: "valid-parentheses", title: "Valid Parentheses", difficulty: "Easy", topics: ["Stack", "String"] },
    { frontendId: "21", titleSlug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists", difficulty: "Easy", topics: ["Linked List"] },
    { frontendId: "206", titleSlug: "reverse-linked-list", title: "Reverse Linked List", difficulty: "Easy", topics: ["Linked List"] },
    { frontendId: "141", titleSlug: "linked-list-cycle", title: "Linked List Cycle", difficulty: "Easy", topics: ["Linked List", "Two Pointers"] },
    { frontendId: "33", titleSlug: "search-in-rotated-sorted-array", title: "Search in Rotated Sorted Array", difficulty: "Medium", topics: ["Array", "Binary Search"] },
    { frontendId: "74", titleSlug: "search-a-2d-matrix", title: "Search a 2D Matrix", difficulty: "Medium", topics: ["Array", "Binary Search"] },
    { frontendId: "226", titleSlug: "invert-binary-tree", title: "Invert Binary Tree", difficulty: "Easy", topics: ["Tree", "Depth-First Search"] },
    { frontendId: "104", titleSlug: "maximum-depth-of-binary-tree", title: "Maximum Depth of Binary Tree", difficulty: "Easy", topics: ["Tree", "Depth-First Search"] },
    { frontendId: "102", titleSlug: "binary-tree-level-order-traversal", title: "Binary Tree Level Order Traversal", difficulty: "Medium", topics: ["Tree", "Breadth-First Search"] },
    { frontendId: "200", titleSlug: "number-of-islands", title: "Number of Islands", difficulty: "Medium", topics: ["Graph", "Depth-First Search", "Breadth-First Search"] },
    { frontendId: "207", titleSlug: "course-schedule", title: "Course Schedule", difficulty: "Medium", topics: ["Graph", "Topological Sort"] },
    { frontendId: "70", titleSlug: "climbing-stairs", title: "Climbing Stairs", difficulty: "Easy", topics: ["Dynamic Programming"] },
    { frontendId: "198", titleSlug: "house-robber", title: "House Robber", difficulty: "Medium", topics: ["Dynamic Programming"] },
    { frontendId: "322", titleSlug: "coin-change", title: "Coin Change", difficulty: "Medium", topics: ["Dynamic Programming"] },
    { frontendId: "300", titleSlug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence", difficulty: "Medium", topics: ["Dynamic Programming"] },
    { frontendId: "53", titleSlug: "maximum-subarray", title: "Maximum Subarray", difficulty: "Medium", topics: ["Array", "Dynamic Programming"] },
    { frontendId: "56", titleSlug: "merge-intervals", title: "Merge Intervals", difficulty: "Medium", topics: ["Array", "Intervals"] },
    { frontendId: "57", titleSlug: "insert-interval", title: "Insert Interval", difficulty: "Medium", topics: ["Array", "Intervals"] },
    { frontendId: "238", titleSlug: "product-of-array-except-self", title: "Product of Array Except Self", difficulty: "Medium", topics: ["Array", "Prefix Sum"] },
    { frontendId: "739", titleSlug: "daily-temperatures", title: "Daily Temperatures", difficulty: "Medium", topics: ["Stack", "Monotonic Stack"] },
    { frontendId: "215", titleSlug: "kth-largest-element-in-an-array", title: "Kth Largest Element in an Array", difficulty: "Medium", topics: ["Array", "Heap (Priority Queue)"] },
    { frontendId: "46", titleSlug: "permutations", title: "Permutations", difficulty: "Medium", topics: ["Backtracking"] },
    { frontendId: "78", titleSlug: "subsets", title: "Subsets", difficulty: "Medium", topics: ["Backtracking"] },
    { frontendId: "124", titleSlug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum", difficulty: "Hard", topics: ["Tree", "Depth-First Search"] },
    { frontendId: "76", titleSlug: "minimum-window-substring", title: "Minimum Window Substring", difficulty: "Hard", topics: ["String", "Sliding Window"] },
    { frontendId: "295", titleSlug: "find-median-from-data-stream", title: "Find Median from Data Stream", difficulty: "Hard", topics: ["Heap (Priority Queue)"] }
  ];

  class AnalyticsEngine {
    constructor() {
      this.cachedPlan = null;
      this.listeners = new Set();
      this._initializedReactive = false;

      this._analyzer = LeetCodeAutoSync.SkillAnalyzer || new (require("./skill_analyzer.js").SkillAnalyzer)();
      this._recEngine = LeetCodeAutoSync.RecommendationEngine || new (require("./recommendation_engine.js").RecommendationEngine)();
    }

    /**
     * Initializes reactive observers to recompute Analytics when data store changes.
     */
    initializeReactive() {
      if (this._initializedReactive) return;
      this._initializedReactive = true;

      const store = LeetCodeAutoSync.DeveloperDataStore;
      if (store) {
        if (typeof store.onDataStoreChanged === "function") {
          store.onDataStoreChanged(() => this.recomputeAndNotify());
        }
        if (typeof store.onCuratedProgressUpdated === "function") {
          store.onCuratedProgressUpdated(() => this.recomputeAndNotify());
        }
      }
    }

    /**
     * Recomputes personal study plan and notifies registered listeners.
     */
    recomputeAndNotify() {
      const plan = this.computePersonalPlan();
      this.cachedPlan = plan;
      this.listeners.forEach(fn => {
        try { fn(plan); } catch (e) { console.error("AnalyticsEngine listener error:", e); }
      });
      return plan;
    }

    /**
     * Registers a listener callback fired when personal plan updates.
     * @param {Function} listener
     */
    onPlanUpdated(listener) {
      if (typeof listener === "function") {
        this.listeners.add(listener);
      }
    }

    /**
     * Computes personal study plan and recommendations from repository and metadata evidence.
     * @param {Object} options - Optional overrides for custom testing or manual calls.
     * @returns {PersonalPlan} PersonalPlan instance.
     */
    computePersonalPlan(options = {}) {
      this.initializeReactive();

      // 1. Gather Solved Problems from Repository / DataStore
      const solvedProblems = [];
      const solvedSlugs = new Set();

      const addSolvedItem = (item) => {
        if (!item) return;
        let slug = null;
        let frontendId = null;
        let title = null;
        let difficulty = null;
        let topics = [];

        if (typeof item === "string") {
          slug = item;
        } else if (typeof item === "object") {
          slug = item.titleSlug || item.slug || item.repositorySlug;
          frontendId = item.frontendId;
          title = item.title;
          difficulty = item.difficulty;
          topics = item.topics || [];
        }

        if (slug) {
          slug = String(slug).toLowerCase().trim();
          // Reject raw filesystem paths
          if (slug.includes(":\\") || slug.includes("/") || slug.includes("\\") || slug.endsWith(".js") || slug.endsWith(".py") || slug.endsWith(".cpp")) {
            return;
          }

          // Canonical identity resolution if available
          const resolver = LeetCodeAutoSync.CanonicalIdentityResolver;
          if (resolver && typeof resolver.normalizeProblemIdentity === "function") {
            const norm = resolver.normalizeProblemIdentity(slug);
            if (norm && norm.titleSlug) slug = norm.titleSlug;
          }

          if (!solvedSlugs.has(slug)) {
            solvedSlugs.add(slug);
            
            // Enrich topic metadata if missing
            if (topics.length === 0) {
              const catalogMatch = DEFAULT_PROBLEM_CATALOG.find(c => c.titleSlug === slug);
              if (catalogMatch) {
                frontendId = frontendId || catalogMatch.frontendId;
                title = title || catalogMatch.title;
                difficulty = difficulty || catalogMatch.difficulty;
                topics = catalogMatch.topics;
              }
            }

            solvedProblems.push(ProblemAnalyticsModel.create({
              frontendId,
              titleSlug: slug,
              title: title || slug,
              difficulty: difficulty || "Easy",
              topics: topics.length > 0 ? topics : ["Array"],
              solved: true,
              source: options.source || "repository"
            }));
          }
        }
      };

      // Extract from passed options or DeveloperDataStore
      if (options.solvedProblems && Array.isArray(options.solvedProblems)) {
        options.solvedProblems.forEach(addSolvedItem);
      }

      if (LeetCodeAutoSync.DeveloperDataStore) {
        const store = LeetCodeAutoSync.DeveloperDataStore;

        if (store.curatedLists && store.curatedLists.solvedSlugs) {
          store.curatedLists.solvedSlugs.forEach(addSolvedItem);
        }
        if (store.solvedSlugs) {
          store.solvedSlugs.forEach(addSolvedItem);
        }
        if (store.repository && Array.isArray(store.repository.syncedProblems)) {
          store.repository.syncedProblems.forEach(p => addSolvedItem(p.titleSlug || p.name));
        }
        if (store.rawGraphQL && Array.isArray(store.rawGraphQL.recentAcSubmissionList)) {
          store.rawGraphQL.recentAcSubmissionList.forEach(p => addSolvedItem(p.titleSlug || p.slug || p.title));
        }
        if (Array.isArray(store.submissions)) {
          store.submissions.forEach(p => {
            if (p.statusDisplay === 'Accepted' || p.status === 'Accepted' || p.solved) {
              addSolvedItem(p.titleSlug || p.slug || p.title);
            }
          });
        }
      }

      if (options.viewModel) {
        const vm = options.viewModel;
        if (Array.isArray(vm.recentSolvedProblems)) {
          vm.recentSolvedProblems.forEach(addSolvedItem);
        }
        if (Array.isArray(vm.acceptedSubmissions)) {
          vm.acceptedSubmissions.forEach(addSolvedItem);
        }
      }

      // 2. Gather Candidate Problems Pool
      const candidatePool = [];
      const candidateSlugs = new Set();

      const addCandidate = (item) => {
        if (!item) return;
        let slug = typeof item === "string" ? item : (item.titleSlug || item.slug);
        if (slug) {
          slug = String(slug).toLowerCase().trim();
          if (slug.includes(":\\") || slug.includes("/") || slug.includes("\\")) return;
          if (solvedSlugs.has(slug) || candidateSlugs.has(slug)) return;

          candidateSlugs.add(slug);

          let obj = typeof item === "object" ? item : {};
          const catalogMatch = DEFAULT_PROBLEM_CATALOG.find(c => c.titleSlug === slug);
          if (catalogMatch) {
            obj = { ...catalogMatch, ...obj };
          }

          candidatePool.push(ProblemAnalyticsModel.create({
            frontendId: obj.frontendId || null,
            titleSlug: slug,
            title: obj.title || slug,
            difficulty: obj.difficulty || "Medium",
            topics: obj.topics || ["Array"],
            patterns: obj.patterns || [],
            solved: false,
            source: "catalog"
          }));
        }
      };

      if (options.availableProblems && Array.isArray(options.availableProblems)) {
        options.availableProblems.forEach(addCandidate);
      }

      // Always populate with DEFAULT_PROBLEM_CATALOG candidates
      DEFAULT_PROBLEM_CATALOG.forEach(addCandidate);

      // Populate curated sets for recommendation scoring
      const curatedCatalogs = {
        BLIND_75: new Set(),
        NEETCODE_150: new Set(),
        LEETCODE_75: new Set()
      };

      const datasetService = LeetCodeAutoSync.CuratedListsDatasetService || (LeetCodeAutoSync.CuratedListsService ? LeetCodeAutoSync.CuratedListsService.datasetService : null);
      if (datasetService) {
        if (datasetService.BLIND_75) datasetService.BLIND_75.forEach(s => curatedCatalogs.BLIND_75.add(s));
        if (datasetService.NEETCODE_150) datasetService.NEETCODE_150.forEach(s => curatedCatalogs.NEETCODE_150.add(s));
        if (datasetService.LEETCODE_75) datasetService.LEETCODE_75.forEach(s => curatedCatalogs.LEETCODE_75.add(s));
      }

      // 3. Analyze Skills & Gaps
      const skillModel = this._analyzer.analyzeSkills(solvedProblems);

      // 4. Generate Recommendations & Study Plan
      const recommendations = this._recEngine.generateRecommendations({
        solvedProblems,
        availableProblems: candidatePool,
        skillModel,
        curatedCatalogs
      });

      const focusSkill = skillModel.skillGaps.length > 0 ? skillModel.skillGaps[0].name : (skillModel.strengths[0] ? skillModel.strengths[0].name : "Array");
      const nextProblem = this._recEngine.getNextProblem(recommendations, focusSkill);
      const nextProblems = this._recEngine.generateStudyPlan(recommendations, 7, focusSkill);

      // Determine Source Label (Seamless fallback when GraphQL is unavailable)
      let planSource = "repository";
      if (LeetCodeAutoSync.DeveloperDataStore && LeetCodeAutoSync.DeveloperDataStore.curatedLists) {
        const cSource = LeetCodeAutoSync.DeveloperDataStore.curatedLists.source;
        if (cSource === "graphql") planSource = "repository+graphql";
        else if (cSource === "cache") planSource = "cache";
      }

      let totalSolvedCount = solvedProblems.length;
      if (LeetCodeAutoSync.DeveloperDataStore) {
        const store = LeetCodeAutoSync.DeveloperDataStore;
        const statsCount = (store.stats && store.stats.totalSolved) || (store.repository && store.repository.syncedCount) || 0;
        if (statsCount > totalSolvedCount) {
          totalSolvedCount = statsCount;
        }
      }

      if (options.viewModel) {
        const vm = options.viewModel;
        let vmCount = 0;
        if (typeof vm.snapTotalCount === "string") {
          vmCount = parseInt(vm.snapTotalCount, 10) || 0;
        } else if (typeof vm.snapTotalCount === "number") {
          vmCount = vm.snapTotalCount;
        }
        const diffSum = (vm.easyCount || 0) + (vm.mediumCount || 0) + (vm.hardCount || 0);
        vmCount = Math.max(vmCount, diffSum);

        if (vmCount > totalSolvedCount) {
          totalSolvedCount = vmCount;
        }
      }

      const plan = PersonalPlan.create({
        generatedAt: new Date().toISOString(),
        basedOnSolvedCount: totalSolvedCount,
        focusSkill: skillModel.skillGaps.length > 0 ? skillModel.skillGaps[0].name : (skillModel.strengths[0] ? skillModel.strengths[0].name : "Array"),
        skillGaps: skillModel.skillGaps,
        strengths: skillModel.strengths,
        nextProblem,
        nextProblems,
        confidence: skillModel.overallConfidence,
        source: planSource
      });

      this.cachedPlan = plan;
      return plan;
    }

    /**
     * Gets the latest cached plan or computes a new one.
     * @returns {PersonalPlan}
     */
    getPlan() {
      if (!this.cachedPlan) {
        this.cachedPlan = this.computePersonalPlan();
      }
      return this.cachedPlan;
    }
  }

  const analyticsEngine = new AnalyticsEngine();

  LeetCodeAutoSync.AnalyticsEngine = analyticsEngine;
  LeetCodeAutoSync.computePersonalPlan = (opts) => analyticsEngine.computePersonalPlan(opts);
  LeetCodeAutoSync.getPersonalPlan = () => analyticsEngine.getPlan();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      AnalyticsEngine,
      analyticsEngine
    };
  }

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
