/**
 * CanonicalIdentityResolver Service
 * Canonical problem identity resolution layer for LeetCode Auto Sync.
 * Resolves repository folder and file names (e.g., 'Easy/0001-Two Sum', '0015-3Sum',
 * '0206-Reverse Linked List', '49-Group Anagrams', '001-Two-Sum')
 * to canonical problem titleSlugs via problem catalog lookup by frontend ID and title.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  // Catalog problem list covering Blind 75, NeetCode 150, LeetCode 75 and general problems
  const CANONICAL_CATALOG = [
    { frontendId: "1", slug: "two-sum", title: "Two Sum" },
    { frontendId: "2", slug: "add-two-numbers", title: "Add Two Numbers" },
    { frontendId: "3", slug: "longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters" },
    { frontendId: "4", slug: "median-of-two-sorted-arrays", title: "Median of Two Sorted Arrays" },
    { frontendId: "5", slug: "longest-palindromic-substring", title: "Longest Palindromic Substring" },
    { frontendId: "7", slug: "reverse-integer", title: "Reverse Integer" },
    { frontendId: "10", slug: "regular-expression-matching", title: "Regular Expression Matching" },
    { frontendId: "11", slug: "container-with-most-water", title: "Container With Most Water" },
    { frontendId: "15", slug: "3sum", title: "3Sum" },
    { frontendId: "17", slug: "letter-combinations-of-a-phone-number", title: "Letter Combinations of a Phone Number" },
    { frontendId: "19", slug: "remove-nth-node-from-end-of-list", title: "Remove Nth Node From End of List" },
    { frontendId: "20", slug: "valid-parentheses", title: "Valid Parentheses" },
    { frontendId: "21", slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists" },
    { frontendId: "22", slug: "generate-parentheses", title: "Generate Parentheses" },
    { frontendId: "23", slug: "merge-k-sorted-lists", title: "Merge k Sorted Lists" },
    { frontendId: "25", slug: "reverse-nodes-in-k-group", title: "Reverse Nodes in k-Group" },
    { frontendId: "33", slug: "search-in-rotated-sorted-array", title: "Search in Rotated Sorted Array" },
    { frontendId: "36", slug: "valid-sudoku", title: "Valid Sudoku" },
    { frontendId: "39", slug: "combination-sum", title: "Combination Sum" },
    { frontendId: "40", slug: "combination-sum-ii", title: "Combination Sum II" },
    { frontendId: "42", slug: "trapping-rain-water", title: "Trapping Rain Water" },
    { frontendId: "43", slug: "multiply-strings", title: "Multiply Strings" },
    { frontendId: "45", slug: "jump-game-ii", title: "Jump Game II" },
    { frontendId: "46", slug: "permutations", title: "Permutations" },
    { frontendId: "48", slug: "rotate-image", title: "Rotate Image" },
    { frontendId: "49", slug: "group-anagrams", title: "Group Anagrams" },
    { frontendId: "50", slug: "powx-n", title: "Pow(x, n)" },
    { frontendId: "51", slug: "n-queens", title: "N-Queens" },
    { frontendId: "52", slug: "n-queens-ii", title: "N-Queens II" },
    { frontendId: "53", slug: "maximum-subarray", title: "Maximum Subarray" },
    { frontendId: "54", slug: "spiral-matrix", title: "Spiral Matrix" },
    { frontendId: "55", slug: "jump-game", title: "Jump Game" },
    { frontendId: "56", slug: "merge-intervals", title: "Merge Intervals" },
    { frontendId: "57", slug: "insert-interval", title: "Insert Interval" },
    { frontendId: "62", slug: "unique-paths", title: "Unique Paths" },
    { frontendId: "70", slug: "climbing-stairs", title: "Climbing Stairs" },
    { frontendId: "72", slug: "edit-distance", title: "Edit Distance" },
    { frontendId: "73", slug: "set-matrix-zeroes", title: "Set Matrix Zeroes" },
    { frontendId: "74", slug: "search-a-2d-matrix", title: "Search a 2D Matrix" },
    { frontendId: "76", slug: "minimum-window-substring", title: "Minimum Window Substring" },
    { frontendId: "78", slug: "subsets", title: "Subsets" },
    { frontendId: "79", slug: "word-search", title: "Word Search" },
    { frontendId: "84", slug: "largest-rectangle-in-histogram", title: "Largest Rectangle in Histogram" },
    { frontendId: "90", slug: "subsets-ii", title: "Subsets II" },
    { frontendId: "91", slug: "decode-ways", title: "Decode Ways" },
    { frontendId: "97", slug: "interleaving-string", title: "Interleaving String" },
    { frontendId: "98", slug: "validate-binary-search-tree", title: "Validate Binary Search Tree" },
    { frontendId: "100", slug: "same-tree", title: "Same Tree" },
    { frontendId: "102", slug: "binary-tree-level-order-traversal", title: "Binary Tree Level Order Traversal" },
    { frontendId: "104", slug: "maximum-depth-of-binary-tree", title: "Maximum Depth of Binary Tree" },
    { frontendId: "105", slug: "construct-binary-tree-from-preorder-and-inorder-traversal", title: "Construct Binary Tree from Preorder and Inorder Traversal" },
    { frontendId: "110", slug: "balanced-binary-tree", title: "Balanced Binary Tree" },
    { frontendId: "115", slug: "distinct-subsequences", title: "Distinct Subsequences" },
    { frontendId: "121", slug: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock" },
    { frontendId: "124", slug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum" },
    { frontendId: "125", slug: "valid-palindrome", title: "Valid Palindrome" },
    { frontendId: "127", slug: "word-ladder", title: "Word Ladder" },
    { frontendId: "128", slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence" },
    { frontendId: "130", slug: "surrounded-regions", title: "Surrounded Regions" },
    { frontendId: "131", slug: "palindrome-partitioning", title: "Palindrome Partitioning" },
    { frontendId: "133", slug: "clone-graph", title: "Clone Graph" },
    { frontendId: "134", slug: "gas-station", title: "Gas Station" },
    { frontendId: "136", slug: "single-number", title: "Single Number" },
    { frontendId: "138", slug: "copy-list-with-random-pointer", title: "Copy List with Random Pointer" },
    { frontendId: "139", slug: "word-break", title: "Word Break" },
    { frontendId: "141", slug: "linked-list-cycle", title: "Linked List Cycle" },
    { frontendId: "143", slug: "reorder-list", title: "Reorder List" },
    { frontendId: "146", slug: "lru-cache", title: "LRU Cache" },
    { frontendId: "150", slug: "evaluate-reverse-polish-notation", title: "Evaluate Reverse Polish Notation" },
    { frontendId: "152", slug: "maximum-product-subarray", title: "Maximum Product Subarray" },
    { frontendId: "153", slug: "find-minimum-in-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array" },
    { frontendId: "155", slug: "min-stack", title: "Min Stack" },
    { frontendId: "167", slug: "two-sum-ii-input-array-is-sorted", title: "Two Sum II" },
    { frontendId: "190", slug: "reverse-bits", title: "Reverse Bits" },
    { frontendId: "191", slug: "number-of-1-bits", title: "Number of 1 Bits" },
    { frontendId: "198", slug: "house-robber", title: "House Robber" },
    { frontendId: "199", slug: "binary-tree-right-side-view", title: "Binary Tree Right Side View" },
    { frontendId: "200", slug: "number-of-islands", title: "Number of Islands" },
    { frontendId: "202", slug: "happy-number", title: "Happy Number" },
    { frontendId: "206", slug: "reverse-linked-list", title: "Reverse Linked List" },
    { frontendId: "207", slug: "course-schedule", title: "Course Schedule" },
    { frontendId: "208", slug: "implement-trie-prefix-tree", title: "Implement Trie (Prefix Tree)" },
    { frontendId: "210", slug: "course-schedule-ii", title: "Course Schedule II" },
    { frontendId: "211", slug: "design-add-and-search-words-data-structure", title: "Design Add and Search Words Data Structure" },
    { frontendId: "212", slug: "word-search-ii", title: "Word Search II" },
    { frontendId: "213", slug: "house-robber-ii", title: "House Robber II" },
    { frontendId: "215", slug: "kth-largest-element-in-an-array", title: "Kth Largest Element in an Array" },
    { frontendId: "217", slug: "contains-duplicate", title: "Contains Duplicate" },
    { frontendId: "226", slug: "invert-binary-tree", title: "Invert Binary Tree" },
    { frontendId: "230", slug: "kth-smallest-element-in-a-bst", title: "Kth Smallest Element in a BST" },
    { frontendId: "235", slug: "lowest-common-ancestor-of-a-binary-search-tree", title: "Lowest Common Ancestor of a BST" },
    { frontendId: "238", slug: "product-of-array-except-self", title: "Product of Array Except Self" },
    { frontendId: "239", slug: "sliding-window-maximum", title: "Sliding Window Maximum" },
    { frontendId: "242", slug: "valid-anagram", title: "Valid Anagram" },
    { frontendId: "252", slug: "meeting-rooms", title: "Meeting Rooms" },
    { frontendId: "253", slug: "meeting-rooms-ii", title: "Meeting Rooms II" },
    { frontendId: "261", slug: "graph-valid-tree", title: "Graph Valid Tree" },
    { frontendId: "268", slug: "missing-number", title: "Missing Number" },
    { frontendId: "269", slug: "alien-dictionary", title: "Alien Dictionary" },
    { frontendId: "271", slug: "encode-and-decode-strings", title: "Encode and Decode Strings" },
    { frontendId: "286", slug: "walls-and-gates", title: "Walls and Gates" },
    { frontendId: "287", slug: "find-the-duplicate-number", title: "Find the Duplicate Number" },
    { frontendId: "295", slug: "find-median-from-data-stream", title: "Find Median from Data Stream" },
    { frontendId: "297", slug: "serialize-and-deserialize-binary-tree", title: "Serialize and Deserialize Binary Tree" },
    { frontendId: "300", slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence" },
    { frontendId: "309", slug: "best-time-to-buy-and-sell-stock-with-cooldown", title: "Best Time to Buy and Sell Stock with Cooldown" },
    { frontendId: "312", slug: "burst-balloons", title: "Burst Balloons" },
    { frontendId: "322", slug: "coin-change", title: "Coin Change" },
    { frontendId: "323", slug: "number-of-connected-components-in-an-undirected-graph", title: "Number of Connected Components" },
    { frontendId: "329", slug: "longest-increasing-path-in-a-matrix", title: "Longest Increasing Path in a Matrix" },
    { frontendId: "332", slug: "reconstruct-itinerary", title: "Reconstruct Itinerary" },
    { frontendId: "338", slug: "counting-bits", title: "Counting Bits" },
    { frontendId: "347", slug: "top-k-frequent-elements", title: "Top K Frequent Elements" },
    { frontendId: "355", slug: "design-twitter", title: "Design Twitter" },
    { frontendId: "371", slug: "sum-of-two-integers", title: "Sum of Two Integers" },
    { frontendId: "416", slug: "partition-equal-subset-sum", title: "Partition Equal Subset Sum" },
    { frontendId: "417", slug: "pacific-atlantic-water-flow", title: "Pacific Atlantic Water Flow" },
    { frontendId: "424", slug: "longest-repeating-character-replacement", title: "Longest Repeating Character Replacement" },
    { frontendId: "435", slug: "non-overlapping-intervals", title: "Non-overlapping Intervals" },
    { frontendId: "494", slug: "target-sum", title: "Target Sum" },
    { frontendId: "518", slug: "coin-change-ii", title: "Coin Change II" },
    { frontendId: "543", slug: "diameter-of-binary-tree", title: "Diameter of Binary Tree" },
    { frontendId: "567", slug: "permutation-in-string", title: "Permutation in String" },
    { frontendId: "572", slug: "subtree-of-another-tree", title: "Subtree of Another Tree" },
    { frontendId: "621", slug: "task-scheduler", title: "Task Scheduler" },
    { frontendId: "647", slug: "palindromic-substrings", title: "Palindromic Substrings" },
    { frontendId: "678", slug: "valid-parenthesis-string", title: "Valid Parenthesis String" },
    { frontendId: "684", slug: "redundant-connection", title: "Redundant Connection" },
    { frontendId: "695", slug: "max-area-of-island", title: "Max Area of Island" },
    { frontendId: "703", slug: "kth-largest-element-in-a-stream", title: "Kth Largest Element in a Stream" },
    { frontendId: "704", slug: "binary-search", title: "Binary Search" },
    { frontendId: "739", slug: "daily-temperatures", title: "Daily Temperatures" },
    { frontendId: "743", slug: "network-delay-time", title: "Network Delay Time" },
    { frontendId: "746", slug: "min-cost-climbing-stairs", title: "Min Cost Climbing Stairs" },
    { frontendId: "763", slug: "partition-labels", title: "Partition Labels" },
    { frontendId: "778", slug: "swim-in-rising-water", title: "Swim in Rising Water" },
    { frontendId: "787", slug: "cheapest-flights-within-k-stops", title: "Cheapest Flights Within K Stops" },
    { frontendId: "846", slug: "hand-of-straights", title: "Hand of Straights" },
    { frontendId: "853", slug: "car-fleet", title: "Car Fleet" },
    { frontendId: "875", slug: "koko-eating-bananas", title: "Koko Eating Bananas" },
    { frontendId: "973", slug: "k-closest-points-to-origin", title: "K Closest Points to Origin" },
    { frontendId: "981", slug: "time-based-key-value-store", title: "Time Based Key-Value Store" },
    { frontendId: "994", slug: "rotting-oranges", title: "Rotting Oranges" },
    { frontendId: "1046", slug: "last-stone-weight", title: "Last Stone Weight" },
    { frontendId: "1143", slug: "longest-common-subsequence", title: "Longest Common Subsequence" },
    { frontendId: "1448", slug: "count-good-nodes-in-binary-tree", title: "Count Good Nodes in Binary Tree" },
    { frontendId: "1584", slug: "min-cost-to-connect-all-points", title: "Min Cost to Connect All Points" },
    { frontendId: "1851", slug: "minimum-interval-to-include-each-query", title: "Minimum Interval to Include Each Query" },
    { frontendId: "1899", slug: "merge-triplets-to-form-target-triplet", title: "Merge Triplets to Form Target Triplet" },
    { frontendId: "2013", slug: "detect-squares", title: "Detect Squares" },
    { frontendId: "3014", slug: "minimum-number-of-pushes-to-type-word-i", title: "Minimum Number of Pushes to Type Word I" }
  ];

  class CanonicalIdentityResolver {
    constructor() {
      this.byFrontendId = new Map();
      this.byTitleNorm = new Map();
      this.bySlugNorm = new Map();

      CANONICAL_CATALOG.forEach((item) => {
        if (item.frontendId) {
          this.byFrontendId.set(String(item.frontendId).trim(), item.slug);
        }
        if (item.title) {
          const normTitle = this.normalizeKey(item.title);
          this.byTitleNorm.set(normTitle, item.slug);
        }
        if (item.slug) {
          const normSlug = this.normalizeKey(item.slug);
          this.bySlugNorm.set(normSlug, item.slug);
        }
      });
    }

    /**
     * Remove non-alphanumeric characters for title key matching
     * @param {string} str
     * @returns {string}
     */
    normalizeKey(str = "") {
      return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    /**
     * Primary entry point: Resolve repository folder or file name to canonical titleSlug.
     * Handles formats:
     * - "Easy/0001-Two Sum" -> "two-sum"
     * - "0015-3Sum" -> "3sum"
     * - "0206-Reverse Linked List" -> "reverse-linked-list"
     * - "49-Group Anagrams" -> "group-anagrams"
     * - "001-Two-Sum" -> "two-sum"
     * - "problems/arrays/0001-Two Sum" -> "two-sum"
     * @param {string} inputPath Path, folder name, or file name
     * @returns {string|null} Canonical titleSlug or fallback normalized slug
     */
    resolveProblemIdentity(inputPath = "") {
      if (!inputPath) return null;
      let rawStr = String(inputPath).trim();

      // Extract last path segment (folder or file name)
      const parts = rawStr.split(/[/\\]+/).filter(Boolean);
      const leafName = parts.length > 0 ? parts[parts.length - 1] : rawStr;

      // Extract leading numeric ID (e.g., '0001', '0015', '0206', '49', '001')
      const match = leafName.match(/^(?:(\d+)\s*[-._\s]\s*)?(.+?)(?:\.[a-z0-9]+)?$/i);
      let parsedIdStr = null;
      let rawTitleStr = leafName;

      if (match) {
        if (match[1]) {
          parsedIdStr = String(parseInt(match[1], 10)); // Strips leading zeros ('0001' -> '1', '0015' -> '15')
        }
        if (match[2]) {
          rawTitleStr = match[2].trim();
        }
      }

      // Step 1: Lookup by frontend ID in canonical catalog
      if (parsedIdStr && this.byFrontendId.has(parsedIdStr)) {
        return this.byFrontendId.get(parsedIdStr);
      }

      // Step 2: Lookup by normalized title in canonical catalog
      const titleKey = this.normalizeKey(rawTitleStr);
      if (titleKey && this.byTitleNorm.has(titleKey)) {
        return this.byTitleNorm.get(titleKey);
      }

      // Step 3: Lookup by normalized slug in canonical catalog
      if (titleKey && this.bySlugNorm.has(titleKey)) {
        return this.bySlugNorm.get(titleKey);
      }

      // Step 4: Fallback to standard slug normalization
      const fallback = LeetCodeAutoSync.normalizeTitleSlug
        ? LeetCodeAutoSync.normalizeTitleSlug(rawTitleStr)
        : rawTitleStr.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-");

      return fallback;
    }

    /**
     * Create normalized canonical identity object from repository problem object or folder string
     * @param {Object|string} input Raw problem metadata or folder path
     * @returns {Object} { frontendId: string|null, titleSlug: string, normalizedTitle: string }
     */
    normalizeProblemIdentity(input) {
      if (!input) return { frontendId: null, titleSlug: "", normalizedTitle: "" };

      let frontendId = null;
      let rawTitle = "";
      let rawSlug = "";

      if (typeof input === "object" && input !== null) {
        if (input.frontendId || input.id || input.questionId) {
          const rawId = input.frontendId || input.id || input.questionId;
          const parsed = parseInt(rawId, 10);
          if (!isNaN(parsed) && parsed > 0) {
            frontendId = String(parsed);
          }
        }
        rawTitle = input.title || input.titleSlug || input.slug || "";
        rawSlug = input.titleSlug || input.slug || "";

        if (input.folderPath) {
          const resolvedSlug = this.resolveProblemIdentity(input.folderPath);
          if (resolvedSlug) rawSlug = resolvedSlug;
        }
      } else if (typeof input === "string") {
        const leaf = input.split(/[/\\]+/).pop() || input;
        const match = leaf.match(/^(?:(\d+)\s*[-._\s]\s*)?(.+?)(?:\.[a-z0-9]+)?$/i);
        if (match && match[1]) {
          frontendId = String(parseInt(match[1], 10));
        }
        rawTitle = match && match[2] ? match[2] : leaf;
        rawSlug = this.resolveProblemIdentity(input) || "";
      }

      const canonicalSlug = rawSlug
        ? (LeetCodeAutoSync.normalizeTitleSlug ? LeetCodeAutoSync.normalizeTitleSlug(rawSlug) : String(rawSlug).toLowerCase().trim())
        : (this.resolveProblemIdentity(rawTitle) || "");

      const normalizedTitle = String(rawTitle)
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        frontendId,
        titleSlug: canonicalSlug,
        normalizedTitle
      };
    }

    /**
     * Canonical Matcher: Matching priority:
     * 1. frontendId exact match (if present on both sides)
     * 2. titleSlug exact match
     * 3. normalizedTitle exact match
     * @param {Object} repoIdentity
     * @param {Object} curatedIdentity
     * @returns {Object} { isMatch: boolean, strategy: string|null }
     */
    matchesProblem(repoIdentity, curatedIdentity) {
      if (!repoIdentity || !curatedIdentity) {
        return { isMatch: false, strategy: null };
      }

      const repo = repoIdentity.frontendId ? repoIdentity : this.normalizeProblemIdentity(repoIdentity);
      const curated = curatedIdentity.frontendId ? curatedIdentity : this.normalizeProblemIdentity(curatedIdentity);

      // Priority 1: frontendId exact match
      if (repo.frontendId && curated.frontendId) {
        if (String(repo.frontendId).trim() === String(curated.frontendId).trim()) {
          return { isMatch: true, strategy: "frontendId" };
        } else {
          // Conflicting numeric IDs must NOT match
          return { isMatch: false, strategy: "id_mismatch" };
        }
      }

      // Priority 2: titleSlug exact match
      if (repo.titleSlug && curated.titleSlug) {
        const rSlug = String(repo.titleSlug).toLowerCase().trim();
        const cSlug = String(curated.titleSlug).toLowerCase().trim();
        if (rSlug === cSlug) {
          return { isMatch: true, strategy: "titleSlug" };
        }
      }

      // Priority 3: normalizedTitle exact match
      if (repo.normalizedTitle && curated.normalizedTitle) {
        const rTitle = String(repo.normalizedTitle).toLowerCase().trim();
        const cTitle = String(curated.normalizedTitle).toLowerCase().trim();
        if (rTitle === cTitle) {
          return { isMatch: true, strategy: "normalizedTitle" };
        }
      }

      return { isMatch: false, strategy: null };
    }
  }

  LeetCodeAutoSync.CanonicalIdentityResolver = new CanonicalIdentityResolver();
  LeetCodeAutoSync.resolveProblemIdentity = (pathStr) => LeetCodeAutoSync.CanonicalIdentityResolver.resolveProblemIdentity(pathStr);
  LeetCodeAutoSync.normalizeProblemIdentity = (input) => LeetCodeAutoSync.CanonicalIdentityResolver.normalizeProblemIdentity(input);
  LeetCodeAutoSync.matchesProblem = (repo, curated) => LeetCodeAutoSync.CanonicalIdentityResolver.matchesProblem(repo, curated);

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
