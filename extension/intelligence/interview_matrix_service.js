/**
 * InterviewMatrixService
 * Computes real company interview readiness scores (Google, Meta, Amazon, Microsoft, Apple, Netflix, Uber, Airbnb, Adobe, Bloomberg)
 * based on actual topic coverage, hard problem ratio, and contest rating from DeveloperDataStore.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DeveloperDataStore } = LeetCodeAutoSync;

  const COMPANY_BENCHMARKS = [
    { name: "Google", hardWeight: 0.35, topicWeight: 0.45, ratingWeight: 0.20, minHard: 15, reqTopics: ["Graph", "Dynamic Programming", "Tree"] },
    { name: "Meta", hardWeight: 0.25, topicWeight: 0.55, ratingWeight: 0.20, minHard: 10, reqTopics: ["Arrays", "Binary Search", "Two Pointer", "Tree"] },
    { name: "Amazon", hardWeight: 0.20, topicWeight: 0.60, ratingWeight: 0.20, minHard: 8, reqTopics: ["Tree", "BFS Traversal", "Priority Queue / Heap", "Hash Table"] },
    { name: "Microsoft", hardWeight: 0.15, topicWeight: 0.65, ratingWeight: 0.20, minHard: 6, reqTopics: ["Arrays", "Strings", "Tree", "LinkedList"] },
    { name: "Apple", hardWeight: 0.25, topicWeight: 0.55, ratingWeight: 0.20, minHard: 10, reqTopics: ["Arrays", "DFS Traversal", "Binary Search"] },
    { name: "Netflix", hardWeight: 0.35, topicWeight: 0.45, ratingWeight: 0.20, minHard: 12, reqTopics: ["System Design", "Graph", "Concurrency"] },
    { name: "Uber", hardWeight: 0.30, topicWeight: 0.50, ratingWeight: 0.20, minHard: 12, reqTopics: ["Graph", "Shortest Path (Dijkstra)", "Trie (Prefix Tree)"] },
    { name: "Airbnb", hardWeight: 0.30, topicWeight: 0.50, ratingWeight: 0.20, minHard: 10, reqTopics: ["Backtracking", "DFS Traversal", "BFS Traversal"] },
    { name: "Adobe", hardWeight: 0.20, topicWeight: 0.60, ratingWeight: 0.20, minHard: 6, reqTopics: ["Arrays", "Strings", "Tree"] },
    { name: "Bloomberg", hardWeight: 0.25, topicWeight: 0.55, ratingWeight: 0.20, minHard: 8, reqTopics: ["Two Pointer", "Stack", "Priority Queue / Heap"] }
  ];

  class InterviewMatrixService {
    /**
     * Compute company readiness matrix from real DataStore metrics.
     * @returns {Array<Object>} Company readiness list
     */
    computeCompanyReadiness() {
      const stats = DeveloperDataStore.stats || {};
      const patterns = (DeveloperDataStore.patterns && DeveloperDataStore.patterns.patternFrequency) ? DeveloperDataStore.patterns.patternFrequency : {};
      const rating = (DeveloperDataStore.contests && DeveloperDataStore.contests.rating) ? DeveloperDataStore.contests.rating : 0;

      const hardCount = stats.hard || 0;
      const totalSolved = stats.totalSolved || DeveloperDataStore.repository.syncedCount || 0;

      if (totalSolved < 5) {
        return COMPANY_BENCHMARKS.map((comp) => ({
          name: comp.name,
          readinessPct: 0,
          status: "Not enough data",
          description: `Requires 5+ solved problems to calculate ${comp.name} readiness.`
        }));
      }

      return COMPANY_BENCHMARKS.map((comp) => {
        const hardRatio = Math.min(1.0, hardCount / Math.max(1, comp.minHard));
        const hardScore = hardRatio * 100;

        let topicsMatched = 0;
        comp.reqTopics.forEach((t) => {
          if ((patterns[t] || 0) > 0) topicsMatched++;
        });
        const topicScore = (topicsMatched / Math.max(1, comp.reqTopics.length)) * 100;

        const ratingScore = Math.min(100, Math.max(30, (rating / 1800) * 100));

        const overall = Math.round(
          hardScore * comp.hardWeight +
          topicScore * comp.topicWeight +
          ratingScore * comp.ratingWeight
        );

        return {
          name: comp.name,
          readinessPct: Math.min(99, overall),
          status: overall >= 85 ? "Interview Ready" : overall >= 65 ? "Proficient" : "Needs Practice",
          description: `Target Hard count: ${hardCount}/${comp.minHard}. Topic Coverage: ${topicsMatched}/${comp.reqTopics.length} required patterns.`
        };
      });
    }
  }

  LeetCodeAutoSync.InterviewMatrixService = new InterviewMatrixService();

})(typeof self !== "undefined" ? self : this);
