/**
 * SkillAnalyzer
 * Intelligence layer component analyzing user problem-solving metrics,
 * topic exposure, pattern breadth, difficulty readiness, and skill gaps.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { ProblemAnalyticsModel, SkillScore, SkillGap } = LeetCodeAutoSync;

  // Recognized topics & AST/algorithm patterns
  const RECOGNIZED_CONCEPTS = [
    "Array", "Hash Table", "String", "Two Pointers", "Sliding Window",
    "Binary Search", "Stack", "Monotonic Stack", "Linked List", "Tree",
    "Tree Traversal", "Depth-First Search", "Breadth-First Search",
    "Graph", "Graph Traversal", "Backtracking", "Greedy",
    "Dynamic Programming", "Heap (Priority Queue)", "Union Find",
    "Topological Sort", "Prefix Sum", "Intervals", "Math", "Bit Manipulation"
  ];

  // Concept Progression & Prerequisite Map
  const PREREQUISITE_MAP = {
    "Two Pointers": ["Array", "String", "Hash Table"],
    "Sliding Window": ["Array", "String", "Two Pointers", "Hash Table"],
    "Binary Search": ["Array", "Sorting", "Math"],
    "Tree Traversal": ["Tree", "Linked List", "Stack"],
    "Depth-First Search": ["Tree", "Tree Traversal", "Stack"],
    "Breadth-First Search": ["Tree", "Tree Traversal", "Queue"],
    "Graph Traversal": ["Depth-First Search", "Breadth-First Search", "Tree"],
    "Backtracking": ["Depth-First Search", "Recursion", "Tree"],
    "Dynamic Programming": ["Array", "Recursion", "Math"],
    "Monotonic Stack": ["Stack", "Array"],
    "Heap (Priority Queue)": ["Array", "Tree"],
    "Topological Sort": ["Graph", "Breadth-First Search", "Depth-First Search"],
    "Union Find": ["Graph", "Array", "Tree"],
    "Prefix Sum": ["Array", "Hash Table"]
  };

  class SkillAnalyzer {

    /**
     * Main analysis entry point: Analyzes solved problems to construct a comprehensive SkillModel.
     * @param {Array<Object>} problems - Collection of solved problem models or raw problem objects.
     * @returns {Object} SkillModel object containing strengths, skillMap, difficultyReadiness, and gap analysis.
     */
    analyzeSkills(problems = []) {
      const normalizedProblems = (Array.isArray(problems) ? problems : [])
        .map(p => (p instanceof ProblemAnalyticsModel ? p : ProblemAnalyticsModel.create(p)))
        .filter(p => p.solved);

      const totalSolvedCount = normalizedProblems.length;

      // Calculate recency threshold (last 30 days or recent items)
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      // Group solved problems by topic/pattern concept
      const conceptDataMap = {};
      RECOGNIZED_CONCEPTS.forEach(concept => {
        conceptDataMap[concept] = {
          name: concept,
          solvedCount: 0,
          recentSolvedCount: 0,
          difficulties: []
        };
      });

      normalizedProblems.forEach(p => {
        const concepts = new Set([...p.topics, ...p.patterns]);

        // Normalize topic aliases
        if (concepts.has("Binary Tree") || concepts.has("Binary Search Tree")) concepts.add("Tree");
        if (concepts.has("DFS")) concepts.add("Depth-First Search");
        if (concepts.has("BFS")) concepts.add("Breadth-First Search");
        if (concepts.has("Heap")) concepts.add("Heap (Priority Queue)");
        if (concepts.has("Disjoint Set")) concepts.add("Union Find");

        const isRecent = p.solvedAt ? (now - new Date(p.solvedAt).getTime() <= thirtyDaysMs) : true;

        concepts.forEach(c => {
          if (!conceptDataMap[c]) {
            conceptDataMap[c] = { name: c, solvedCount: 0, recentSolvedCount: 0, difficulties: [] };
          }
          conceptDataMap[c].solvedCount += 1;
          if (isRecent) conceptDataMap[c].recentSolvedCount += 1;
          if (p.difficulty) conceptDataMap[c].difficulties.push(p.difficulty);
        });
      });

      // Calculate SkillScores for all concepts
      const skillScores = [];
      const byName = {};

      Object.keys(conceptDataMap).forEach(concept => {
        const item = conceptDataMap[concept];
        const count = item.solvedCount;
        const recentCount = item.recentSolvedCount;

        // Difficulty weighted score (Easy = 1.0, Medium = 2.0, Hard = 3.0)
        let diffSum = 0;
        item.difficulties.forEach(d => {
          if (d === "Easy") diffSum += 1.0;
          else if (d === "Medium") diffSum += 2.0;
          else if (d === "Hard") diffSum += 3.0;
        });
        const difficultyScore = count > 0 ? diffSum / count : 0.0;

        // Coverage score (scaled relative to 5 solved problems for standard topics)
        const coverageScore = Math.min(1.0, count / 5.0);

        // Recency score
        const recencyScore = count > 0 ? (recentCount / Math.max(1, count)) * 0.6 + 0.4 : 0.0;

        // Composite strength score (0.0 to 100.0)
        const strengthScore = count > 0
          ? Math.min(100, (count * 12.0) + (recentCount * 8.0) + (difficultyScore * 10.0) + (coverageScore * 20.0))
          : 0.0;

        // Confidence score based on sample size
        let confidence = 0.0;
        if (count >= 4) confidence = 0.95;
        else if (count === 3) confidence = 0.80;
        else if (count === 2) confidence = 0.60;
        else if (count === 1) confidence = 0.35;

        // Classification determination: KNOWN, DEVELOPING, UNDER-PRACTICED, UNKNOWN
        let classification = "UNKNOWN";
        if (count >= 4 && confidence >= 0.7) {
          classification = "KNOWN";
        } else if (count >= 2) {
          classification = "DEVELOPING";
        } else if (count === 1 || (count >= 2 && recentCount === 0)) {
          classification = "UNDER-PRACTICED";
        } else {
          classification = "UNKNOWN";
        }

        const scoreObj = SkillScore.create({
          name: concept,
          solvedCount: count,
          recentSolvedCount: recentCount,
          difficultyScore,
          coverageScore,
          recencyScore,
          strengthScore,
          confidence,
          classification
        });

        skillScores.push(scoreObj);
        byName[concept] = scoreObj;
      });

      // Analyze difficulty readiness score
      const difficultyReadiness = this.analyzeDifficultyReadiness(normalizedProblems);

      // Known strengths
      const strengths = skillScores
        .filter(s => s.classification === "KNOWN" || s.solvedCount >= 3)
        .sort((a, b) => b.strengthScore - a.strengthScore);

      const skillModel = {
        totalSolvedCount,
        strengths,
        allScores: skillScores,
        byName,
        difficultyReadiness,
        overallConfidence: totalSolvedCount >= 5 ? 0.9 : (totalSolvedCount > 0 ? 0.7 : 0.4)
      };

      // Identify skill gaps based on evidence and reachability
      skillModel.skillGaps = this.identifySkillGaps(skillModel);

      return skillModel;
    }

    /**
     * Calculates difficulty readiness score for adaptive difficulty progression.
     * @param {Array<ProblemAnalyticsModel>} solvedProblems
     * @returns {Object} Difficulty readiness summary
     */
    analyzeDifficultyReadiness(solvedProblems = []) {
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;

      solvedProblems.forEach(p => {
        if (p.difficulty === "Easy") easyCount++;
        else if (p.difficulty === "Medium") mediumCount++;
        else if (p.difficulty === "Hard") hardCount++;
      });

      const total = solvedProblems.length;
      const easyRatio = total > 0 ? easyCount / total : 0;
      const mediumRatio = total > 0 ? mediumCount / total : 0;
      const hardRatio = total > 0 ? hardCount / total : 0;

      let level = "Easy";
      let score = 1.0;
      let mode = "intro_easy";

      if (total === 0) {
        const storeStats = (LeetCodeAutoSync.DeveloperDataStore && LeetCodeAutoSync.DeveloperDataStore.stats) || {};
        easyCount = storeStats.easy || 0;
        mediumCount = storeStats.medium || 0;
        hardCount = storeStats.hard || 0;
        const storeTotal = storeStats.totalSolved || (easyCount + mediumCount + hardCount);

        if (storeTotal > 0) {
          const easyRatio = easyCount / storeTotal;
          const mediumRatio = mediumCount / storeTotal;
          const hardRatio = hardCount / storeTotal;

          if (mediumCount >= 3 || mediumRatio >= 0.35) {
            level = "Medium";
            score = 2.0;
            mode = "default_medium";
          } else if (mediumCount >= 8 && hardCount >= 2 && hardRatio >= 0.15) {
            level = "Hard";
            score = 3.0;
            mode = "challenge_hard";
          } else if (mediumCount < 3 && easyRatio >= 0.5) {
            level = "Easy";
            score = 1.2;
            mode = "gradual_medium";
          }

          return {
            level,
            score,
            mode,
            easyCount,
            mediumCount,
            hardCount,
            totalSolved: storeTotal,
            easyRatio: Number(easyRatio.toFixed(2)),
            mediumRatio: Number(mediumRatio.toFixed(2)),
            hardRatio: Number(hardRatio.toFixed(2))
          };
        }

        level = "Easy";
        score = 1.0;
        mode = "intro_easy";
      } else if (mediumCount < 3 && easyRatio >= 0.5) {
        level = "Easy";
        score = 1.2;
        mode = "gradual_medium"; // Introduce Mediums gradually
      } else if (mediumCount >= 3 || mediumRatio >= 0.35) {
        level = "Medium";
        score = 2.0;
        mode = "default_medium"; // Medium is default recommendation level
      } else if (mediumCount >= 8 && hardCount >= 2 && hardRatio >= 0.15) {
        level = "Hard";
        score = 3.0;
        mode = "challenge_hard"; // Hard problems appropriate
      }

      return {
        level,
        score,
        mode,
        easyCount,
        mediumCount,
        hardCount,
        totalSolved: total,
        easyRatio: Number(easyRatio.toFixed(2)),
        mediumRatio: Number(mediumRatio.toFixed(2)),
        hardRatio: Number(hardRatio.toFixed(2))
      };
    }

    /**
     * Identifies actionable skill gaps prioritized by reachability from current known skills.
     * @param {Object} skillModel
     * @returns {Array<SkillGap>} Prioritized skill gaps
     */
    identifySkillGaps(skillModel) {
      if (!skillModel || !skillModel.byName) return [];

      const knownConcepts = new Set(
        (skillModel.strengths || []).map(s => s.name)
      );

      const candidateGaps = [];

      Object.keys(skillModel.byName).forEach(conceptName => {
        const skill = skillModel.byName[conceptName];

        // Gaps consider UNDER-PRACTICED, DEVELOPING, or UNKNOWN concepts
        if (skill.classification === "KNOWN") return;

        // Reachability calculation based on known prerequisite concepts
        const prereqs = PREREQUISITE_MAP[conceptName] || [];
        let reachabilityBonus = 0;
        let matchedPrereqs = [];

        prereqs.forEach(p => {
          if (knownConcepts.has(p) || (skillModel.byName[p] && skillModel.byName[p].solvedCount >= 2)) {
            reachabilityBonus += 25;
            matchedPrereqs.push(p);
          }
        });

        // Base gap score: higher for reachable concepts with limited practice
        let gapScore = 30 + reachabilityBonus;

        // Give boost if user has 1 solved (UNDER-PRACTICED) vs 0 solved (UNKNOWN)
        if (skill.classification === "UNDER-PRACTICED") {
          gapScore += 15;
        } else if (skill.classification === "DEVELOPING") {
          gapScore += 10;
        }

        // Formulate accurate, non-judgmental human-readable reason
        let reason = "Limited practice detected.";
        if (matchedPrereqs.length > 0) {
          reason = `Builds on your strong ${matchedPrereqs[0]} foundation. Limited ${conceptName} practice detected.`;
        } else if (skill.solvedCount === 1) {
          reason = `Limited ${conceptName} practice detected (1 problem solved).`;
        } else if (skill.solvedCount === 0) {
          reason = `Limited ${conceptName} practice detected.`;
        } else if (skill.recentSolvedCount === 0) {
          reason = `Under-practiced concept with no recent activity.`;
        }

        candidateGaps.push(SkillGap.create({
          name: conceptName,
          score: gapScore,
          reason,
          solvedCount: skill.solvedCount,
          recommendedNext: false
        }));
      });

      // Sort candidate gaps by score descending
      candidateGaps.sort((a, b) => b.score - a.score);

      // Mark top gap as recommendedNext
      if (candidateGaps.length > 0) {
        candidateGaps[0].recommendedNext = true;
      }

      return candidateGaps;
    }
  }

  const skillAnalyzer = new SkillAnalyzer();

  LeetCodeAutoSync.SkillAnalyzer = skillAnalyzer;
  LeetCodeAutoSync.analyzeSkills = (problems) => skillAnalyzer.analyzeSkills(problems);
  LeetCodeAutoSync.identifySkillGaps = (model) => skillAnalyzer.identifySkillGaps(model);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      SkillAnalyzer,
      skillAnalyzer
    };
  }

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
