/**
 * PatternService
 * Multi-Language Static Code Analysis Engine.
 * Analyzes solution source code across C++, Python, Java, JavaScript, TypeScript, Go, Rust
 * to detect 20+ algorithmic patterns independent of LeetCode tags.
 * Links every detected pattern directly to the exact problem ID, title, file path, and timestamps.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DeveloperDataStore } = LeetCodeAutoSync;

  const PATTERN_RULES = [
    { name: "Sliding Window", regex: /(right\s*-\s*left|window|maxLength\s*=\s*Math\.max|while\s*\(\s*right|while\s*\(\s*j\s*<\s*n\))/i, weight: 1.0 },
    { name: "Two Pointer", regex: /(left\s*<\s*right|low\s*<\s*high|i\s*<\s*j|ptr1|ptr2)/i, weight: 1.0 },
    { name: "Binary Search", regex: /(mid\s*=\s*|low\s*\+\s*\(high|left\s*\+\s*\(right|while\s*\(\s*left\s*<=\s*right\))/i, weight: 1.2 },
    { name: "DFS Traversal", regex: /(def\s+dfs|function\s+dfs|void\s+dfs|dfs\s*\(|self\.dfs)/i, weight: 1.2 },
    { name: "BFS Traversal", regex: /(queue|deque|popleft|shift\(\)|poll\(\)|while\s*\(\s*!q\.empty\(\)\))/i, weight: 1.2 },
    { name: "Backtracking", regex: /(backtrack|path\.append|path\.pop|vector<vector<int>>\s+res)/i, weight: 1.3 },
    { name: "Union Find (Disjoint Set)", regex: /(find\s*\(|union\s*\(|parent\[|findSet|disjoint)/i, weight: 1.5 },
    { name: "Segment Tree", regex: /(segment\s*tree|buildTree|updateTree|queryRange|tree\[2\s*\*\s*node\])/i, weight: 1.8 },
    { name: "Fenwick Tree (BIT)", regex: /(fenwick|BIT|tree\[i\s*&\s*-i\]|add\s*\(idx)/i, weight: 1.8 },
    { name: "Trie (Prefix Tree)", regex: /(trie|TrieNode|insert\s*\(|search\s*\(|startsWith)/i, weight: 1.5 },
    { name: "Priority Queue / Heap", regex: /(PriorityQueue|heapq|heappush|heappop|maxHeap|minHeap)/i, weight: 1.2 },
    { name: "Memoization (Top-Down DP)", regex: /(@cache|@lru_cache|memo\[|dp_table|memoization)/i, weight: 1.3 },
    { name: "Bottom-Up DP", regex: /(dp\[i\]\[j\]|dp\[i\]\s*=\s*|vector<int>\s+dp\(|dp\s*=\s*\[0\]\s*\*)/i, weight: 1.3 },
    { name: "Bit Manipulation", regex: /(\^\s*=|&\s*=|<<|>>|__builtin_popcount|n\s*&\s*\(n\s*-\s*1\))/i, weight: 1.2 },
    { name: "Prefix Sum", regex: /(prefix|prefixSum|sum_so_far|acc\s*\+)/i, weight: 1.0 },
    { name: "Monotonic Stack", regex: /(stack|stk\.pop|st\s*&&\s*st\.top\(\)\s*<|while\s*\(\s*st\.length\s*&&\s*st\[st\.length\s*-\s*1\])/i, weight: 1.4 },
    { name: "Monotonic Queue", regex: /(deque|dq\.pop_back|dq\.pop_front|while\s*\(\s*!dq\.empty\(\)\s*&&\s*dq\.back\(\))/i, weight: 1.5 },
    { name: "Topological Sort", regex: /(indegree|in_degree|topologicalSort|topoSort|Kahn)/i, weight: 1.5 },
    { name: "Shortest Path (Dijkstra)", regex: /(dijkstra|dist\[|priority_queue|heapq|shortestPath)/i, weight: 1.6 },
    { name: "Greedy", regex: /(sort\s*\(|comparator|lambda\s+x:|greedy)/i, weight: 1.0 }
  ];

  class PatternService {
    /**
     * Analyze source code to detect matching algorithmic patterns.
     * @param {string} codeContent
     * @param {string} language
     * @returns {Array<{name: string, confidence: number, weight: number}>}
     */
    detectPatterns(codeContent = "", language = "cpp") {
      if (!codeContent) return [];

      const matches = [];
      PATTERN_RULES.forEach((rule) => {
        if (rule.regex.test(codeContent)) {
          const matchCount = (codeContent.match(new RegExp(rule.regex.source, "gi")) || []).length;
          const confidence = Math.min(100, Math.round(70 + matchCount * 10));
          matches.push({
            name: rule.name,
            confidence: confidence,
            weight: rule.weight
          });
        }
      });

      return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Run pattern discovery on all solution files in DeveloperDataStore.
     * @returns {Object} Deterministic pattern analysis map with problem trace links
     */
    analyzeDataStorePatterns() {
      const submissions = (DeveloperDataStore && DeveloperDataStore.submissions) ? DeveloperDataStore.submissions : [];
      const syncedProblems = (DeveloperDataStore && DeveloperDataStore.repository && DeveloperDataStore.repository.syncedProblems) ? DeveloperDataStore.repository.syncedProblems : [];

      const patternMap = {}; // { patternName: { count: number, problems: Array<{id, title, slug, filePath}> } }

      // 1. Analyze submissions in DataStore
      submissions.forEach((sub) => {
        const code = sub.code || "";
        const meta = sub.metadata || {};
        const detected = this.detectPatterns(code, meta.language || "cpp");

        detected.forEach((p) => {
          if (!patternMap[p.name]) {
            patternMap[p.name] = { name: p.name, count: 0, confidence: p.confidence, problems: [] };
          }
          patternMap[p.name].count++;
          if (meta.id && !patternMap[p.name].problems.some((prob) => prob.id === meta.id)) {
            patternMap[p.name].problems.push({
              id: meta.id,
              title: meta.title || `Problem ${meta.id}`,
              slug: meta.slug || "",
              filePath: `Leetcode-solutions/${meta.difficulty || 'Medium'}/${meta.id}-${meta.slug}/README.md`
            });
          }
        });
      });

      // 2. Analyze synced repository files
      syncedProblems.forEach((prob) => {
        if (prob.codeFiles && Array.isArray(prob.codeFiles)) {
          prob.codeFiles.forEach((file) => {
            const detected = this.detectPatterns(file.content || "", file.language || "cpp");
            detected.forEach((p) => {
              if (!patternMap[p.name]) {
                patternMap[p.name] = { name: p.name, count: 0, confidence: p.confidence, problems: [] };
              }
              patternMap[p.name].count++;
              if (prob.id && !patternMap[p.name].problems.some((pr) => pr.id === prob.id)) {
                patternMap[p.name].problems.push({
                  id: prob.id,
                  title: prob.title,
                  slug: prob.slug,
                  filePath: prob.folderPath || `Leetcode-solutions/${prob.difficulty}/${prob.id}-${prob.slug}`
                });
              }
            });
          });
        }
      });

      const patternFrequency = {};
      const detectedPatterns = [];

      Object.keys(patternMap).forEach((name) => {
        const item = patternMap[name];
        patternFrequency[name] = item.count;
        detectedPatterns.push(item);
      });

      if (DeveloperDataStore && DeveloperDataStore.patterns) {
        DeveloperDataStore.patterns.patternFrequency = patternFrequency;
        DeveloperDataStore.patterns.detectedPatterns = detectedPatterns;
        DeveloperDataStore.patterns.lastAnalyzed = new Date().toISOString();
      }

      return {
        patternFrequency,
        detectedPatterns
      };
    }
  }

  LeetCodeAutoSync.PatternService = new PatternService();

})(typeof self !== "undefined" ? self : this);
