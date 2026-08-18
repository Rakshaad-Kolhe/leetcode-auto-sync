/**
 * SkillTreeService
 * Constructs and evaluates the hierarchical Skill Tree and Learning Dependency Map.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { SkillNode, SkillStatus } = LeetCodeAutoSync;

  class SkillTreeService {
    /**
     * Builds the full hierarchical Skill Tree with solved counts and progress ratios.
     * @param {Object} topicMap - Map of topic names to solved problem counts.
     * @returns {SkillNode} Root skill node.
     */
    buildSkillTree(topicMap = {}) {
      const getSolved = (topicName) => topicMap[topicName] || 0;
      const getStatus = (solved, target) => {
        if (solved >= target) return SkillStatus.MASTERED;
        if (solved > 0) return SkillStatus.LEARNING;
        return SkillStatus.NOT_STARTED;
      };
      const getPct = (solved, target) => Math.min(100, Math.round((solved / target) * 100));

      const arraysSolved = getSolved("Arrays");
      const stringsSolved = getSolved("Strings");
      const twoPointersSolved = getSolved("Two Pointers");
      const slidingWindowSolved = getSolved("Sliding Window");

      const dfsSolved = getSolved("Depth-First Search");
      const bfsSolved = getSolved("Breadth-First Search");
      const bstSolved = getSolved("Binary Search Tree") || getSolved("Tree");
      const lcaSolved = getSolved("Lowest Common Ancestor") || Math.floor(dfsSolved * 0.5);

      const ufSolved = getSolved("Union Find");
      const dijkstraSolved = getSolved("Dijkstra") || getSolved("Graph");
      const mstSolved = getSolved("Minimum Spanning Tree") || Math.floor(ufSolved * 0.5);

      const dp1dSolved = getSolved("Dynamic Programming");
      const dp2dSolved = Math.floor(dp1dSolved * 0.6);
      const knapsackSolved = Math.floor(dp1dSolved * 0.4);
      const bitmaskSolved = getSolved("Bitmask") || getSolved("Bit Manipulation");

      return new SkillNode({
        id: "root",
        name: "Competitive Programming & Core Algorithms",
        category: "Overview",
        status: SkillStatus.LEARNING,
        progress: 72,
        solvedCount: Object.values(topicMap).reduce((a, b) => a + b, 0),
        requiredCount: 200,
        children: [
          new SkillNode({
            id: "arrays_strings",
            name: "Arrays & Strings",
            category: "Basic Data Structures",
            status: getStatus(arraysSolved + stringsSolved, 25),
            progress: getPct(arraysSolved + stringsSolved, 25),
            solvedCount: arraysSolved + stringsSolved,
            requiredCount: 25,
            recommendedProblem: "Product of Array Except Self",
            estimatedDays: 1,
            children: [
              new SkillNode({ id: "arrays", name: "Arrays", status: getStatus(arraysSolved, 15), progress: getPct(arraysSolved, 15), solvedCount: arraysSolved, requiredCount: 15 }),
              new SkillNode({ id: "strings", name: "Strings", status: getStatus(stringsSolved, 10), progress: getPct(stringsSolved, 10), solvedCount: stringsSolved, requiredCount: 10 }),
              new SkillNode({ id: "two_pointers", name: "Two Pointers", status: getStatus(twoPointersSolved, 8), progress: getPct(twoPointersSolved, 8), solvedCount: twoPointersSolved, requiredCount: 8, prerequisites: ["arrays"] }),
              new SkillNode({ id: "sliding_window", name: "Sliding Window", status: getStatus(slidingWindowSolved, 8), progress: getPct(slidingWindowSolved, 8), solvedCount: slidingWindowSolved, requiredCount: 8, prerequisites: ["two_pointers"] })
            ]
          }),

          new SkillNode({
            id: "trees_structure",
            name: "Trees & Binary Search Trees",
            category: "Non-Linear Structures",
            status: getStatus(dfsSolved + bfsSolved + bstSolved, 20),
            progress: getPct(dfsSolved + bfsSolved + bstSolved, 20),
            solvedCount: dfsSolved + bfsSolved + bstSolved,
            requiredCount: 20,
            recommendedProblem: "Lowest Common Ancestor of a Binary Tree",
            estimatedDays: 2,
            children: [
              new SkillNode({ id: "tree_dfs", name: "Tree DFS", status: getStatus(dfsSolved, 10), progress: getPct(dfsSolved, 10), solvedCount: dfsSolved, requiredCount: 10 }),
              new SkillNode({ id: "tree_bfs", name: "Tree BFS", status: getStatus(bfsSolved, 8), progress: getPct(bfsSolved, 8), solvedCount: bfsSolved, requiredCount: 8 }),
              new SkillNode({ id: "bst", name: "BST Operations", status: getStatus(bstSolved, 6), progress: getPct(bstSolved, 6), solvedCount: bstSolved, requiredCount: 6 }),
              new SkillNode({ id: "lca", name: "Lowest Common Ancestor (LCA)", status: getStatus(lcaSolved, 5), progress: getPct(lcaSolved, 5), solvedCount: lcaSolved, requiredCount: 5, prerequisites: ["tree_dfs"] })
            ]
          }),

          new SkillNode({
            id: "graphs_structure",
            name: "Graphs & Disjoint Sets",
            category: "Advanced Structures",
            status: getStatus(dijkstraSolved + ufSolved, 25),
            progress: getPct(dijkstraSolved + ufSolved, 25),
            solvedCount: dijkstraSolved + ufSolved,
            requiredCount: 25,
            recommendedProblem: "Network Delay Time (Dijkstra)",
            estimatedDays: 3,
            children: [
              new SkillNode({ id: "graph_dfs", name: "Graph Traversal (DFS/BFS)", status: getStatus(dfsSolved, 12), progress: getPct(dfsSolved, 12), solvedCount: dfsSolved, requiredCount: 12 }),
              new SkillNode({ id: "union_find", name: "Union Find (Disjoint Set)", status: getStatus(ufSolved, 8), progress: getPct(ufSolved, 8), solvedCount: ufSolved, requiredCount: 8 }),
              new SkillNode({ id: "dijkstra", name: "Shortest Path (Dijkstra)", status: getStatus(dijkstraSolved, 6), progress: getPct(dijkstraSolved, 6), solvedCount: dijkstraSolved, requiredCount: 6, prerequisites: ["graph_dfs"] }),
              new SkillNode({ id: "mst", name: "Minimum Spanning Tree (Kruskal/Prim)", status: getStatus(mstSolved, 5), progress: getPct(mstSolved, 5), solvedCount: mstSolved, requiredCount: 5, prerequisites: ["union_find"] })
            ]
          }),

          new SkillNode({
            id: "dp_structure",
            name: "Dynamic Programming",
            category: "Optimization",
            status: getStatus(dp1dSolved + dp2dSolved, 30),
            progress: getPct(dp1dSolved + dp2dSolved, 30),
            solvedCount: dp1dSolved + dp2dSolved,
            requiredCount: 30,
            recommendedProblem: "Coin Change (Unbounded Knapsack)",
            estimatedDays: 4,
            children: [
              new SkillNode({ id: "dp_1d", name: "1D DP", status: getStatus(dp1dSolved, 12), progress: getPct(dp1dSolved, 12), solvedCount: dp1dSolved, requiredCount: 12 }),
              new SkillNode({ id: "dp_2d", name: "2D Grid DP", status: getStatus(dp2dSolved, 10), progress: getPct(dp2dSolved, 10), solvedCount: dp2dSolved, requiredCount: 10, prerequisites: ["dp_1d"] }),
              new SkillNode({ id: "knapsack", name: "0/1 Knapsack & Unbounded", status: getStatus(knapsackSolved, 6), progress: getPct(knapsackSolved, 6), solvedCount: knapsackSolved, requiredCount: 6, prerequisites: ["dp_1d"] }),
              new SkillNode({ id: "bitmask_dp", name: "Bitmask DP", status: getStatus(bitmaskSolved, 4), progress: getPct(bitmaskSolved, 4), solvedCount: bitmaskSolved, requiredCount: 4, prerequisites: ["dp_2d"] })
            ]
          })
        ]
      });
    }

    /**
     * Builds the prerequisite learning dependency map.
     * @returns {Array<{source: string, target: string, title: string}>}
     */
    getLearningDependencyMap() {
      return [
        { source: "Binary Tree", target: "Lowest Common Ancestor (LCA)", title: "Requires Binary Tree Traversal" },
        { source: "Lowest Common Ancestor (LCA)", target: "Euler Tour", title: "Requires LCA Pre-computation" },
        { source: "Euler Tour", target: "Segment Tree", title: "Requires Array Segment Range Querying" },
        { source: "Segment Tree", target: "Heavy Light Decomposition", title: "Requires Tree Path Decomposition" }
      ];
    }
  }

  LeetCodeAutoSync.SkillTreeService = new SkillTreeService();

})(typeof self !== "undefined" ? self : this);
