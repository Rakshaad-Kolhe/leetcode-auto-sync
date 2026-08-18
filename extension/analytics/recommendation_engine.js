/**
 * RecommendationEngine
 * Personalized competitive programming recommendation engine for LeetCode Auto Sync.
 * Evaluates candidate problems using topic gaps, pattern gaps, difficulty readiness,
 * prerequisite fit, recency decay, and curated value.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { ProblemAnalyticsModel, ProblemRecommendation } = LeetCodeAutoSync;

  class RecommendationEngine {

    /**
     * Generates a ranked list of personalized problem recommendations.
     * @param {Object} params - Input data for recommendation evaluation.
     * @returns {Array<ProblemRecommendation>} Ranked and filtered problem recommendations.
     */
    generateRecommendations({
      solvedProblems = [],
      availableProblems = [],
      skillModel = null,
      curatedCatalogs = {},
      recentActivity = []
    } = {}) {

      // 1. Build authoritative solved slugs set
      const solvedSlugSet = new Set();
      
      const addSolvedSlug = (item) => {
        if (!item) return;
        let slug = typeof item === "string" ? item : (item.titleSlug || item.slug);
        if (slug) {
          slug = String(slug).toLowerCase().trim();
          // Reject raw filesystem paths from solved set
          if (slug.includes(":\\") || slug.includes("/") || slug.includes("\\") || slug.endsWith(".js") || slug.endsWith(".py") || slug.endsWith(".cpp")) {
            return;
          }
          solvedSlugSet.add(slug);
        }
      };

      (Array.isArray(solvedProblems) ? solvedProblems : []).forEach(addSolvedSlug);

      // Check global data store solvedSlugs if available
      if (LeetCodeAutoSync.DeveloperDataStore) {
        const store = LeetCodeAutoSync.DeveloperDataStore;
        if (store.curatedLists && store.curatedLists.solvedSlugs) {
          store.curatedLists.solvedSlugs.forEach(s => solvedSlugSet.add(String(s).toLowerCase().trim()));
        }
        if (store.solvedSlugs) {
          store.solvedSlugs.forEach(s => solvedSlugSet.add(String(s).toLowerCase().trim()));
        }
      }

      // Track recent topics to apply recency penalty
      const recentTopics = new Set();
      (Array.isArray(recentActivity) ? recentActivity : []).slice(0, 3).forEach(p => {
        const topics = p.topics || [];
        topics.forEach(t => recentTopics.add(t));
      });

      // Extract known skills and gaps from skillModel
      const knownSkills = new Set(
        skillModel && skillModel.strengths ? skillModel.strengths.map(s => s.name) : []
      );

      const skillGapMap = {};
      if (skillModel && skillModel.skillGaps) {
        skillModel.skillGaps.forEach(g => {
          skillGapMap[g.name] = g;
        });
      }

      const diffReadiness = (skillModel && skillModel.difficultyReadiness)
        ? skillModel.difficultyReadiness
        : { level: "Easy", mode: "intro_easy" };

      // 2. Filter, validate, and score candidate problems
      const scoredCandidates = [];
      const seenCandidateSlugs = new Set();

      (Array.isArray(availableProblems) ? availableProblems : []).forEach(rawCandidate => {
        const candidate = rawCandidate instanceof ProblemAnalyticsModel
          ? rawCandidate
          : ProblemAnalyticsModel.create(rawCandidate);

        const slug = candidate.titleSlug;

        // NOVELTY & IDENTITY GUARDRAILS:
        // A. Must have valid titleSlug
        if (!slug || slug.length === 0) return;

        // B. Reject raw filesystem paths
        if (slug.includes(":\\") || slug.includes("/") || slug.includes("\\")) return;

        // C. NOVELTY: Never recommend an already solved problem!
        if (solvedSlugSet.has(slug) || candidate.solved) return;

        // D. Deduplicate candidates
        if (seenCandidateSlugs.has(slug)) return;
        seenCandidateSlugs.add(slug);

        // 3. Compute Recommendation Score & Explanations
        let score = 0.0;
        const reasons = [];
        const candidateTopics = candidate.topics || [];
        const candidatePatterns = candidate.patterns || [];
        const allCandidateConcepts = new Set([...candidateTopics, ...candidatePatterns]);

        // A. TOPIC & PATTERN GAP FIT
        let gapScoreAdded = false;
        allCandidateConcepts.forEach(concept => {
          if (skillGapMap[concept]) {
            const gap = skillGapMap[concept];
            score += Math.min(45, gap.score || 35);
            reasons.push(gap.reason || `Limited ${concept} practice detected.`);
            gapScoreAdded = true;
          }
        });

        // B. PREREQUISITE & KNOWN SKILL REINFORCEMENT
        let strengthMatchCount = 0;
        allCandidateConcepts.forEach(concept => {
          if (knownSkills.has(concept)) {
            strengthMatchCount++;
          }
        });

        if (strengthMatchCount > 0) {
          score += 15;
          const firstKnown = Array.from(allCandidateConcepts).find(c => knownSkills.has(c));
          reasons.push(`Builds on your ${firstKnown || "foundation"} experience.`);
        }

        // C. DIFFICULTY FIT
        const candDiff = candidate.difficulty || "Medium";
        if (diffReadiness.level === "Easy") {
          if (candDiff === "Easy") {
            score += 25;
            reasons.push("Matches your current Easy-to-Medium difficulty progression.");
          } else if (candDiff === "Medium") {
            score += 20; // Gradual Medium introduction
            reasons.push("Introduces Medium difficulty gradually based on your performance.");
          } else {
            score += 5;
          }
        } else if (diffReadiness.level === "Medium") {
          if (candDiff === "Medium") {
            score += 30;
            reasons.push("Matches your current Medium difficulty readiness.");
          } else if (candDiff === "Easy") {
            score += 10;
          } else if (candDiff === "Hard") {
            score += 15;
          }
        } else if (diffReadiness.level === "Hard") {
          if (candDiff === "Hard") {
            score += 30;
            reasons.push("Challenges your proven Medium mastery with a Hard problem.");
          } else if (candDiff === "Medium") {
            score += 25;
          } else {
            score += 5;
          }
        }

        // D. CURATED LIST VALUE (Modest boost, does NOT dominate)
        let curatedBoost = 0;
        if (curatedCatalogs) {
          if (curatedCatalogs.BLIND_75 && curatedCatalogs.BLIND_75.has(slug)) {
            curatedBoost += 15;
            reasons.push("Part of Blind 75 and directly aligned with your current focus.");
          } else if (curatedCatalogs.NEETCODE_150 && curatedCatalogs.NEETCODE_150.has(slug)) {
            curatedBoost += 12;
            reasons.push("Part of NeetCode 150 study list.");
          } else if (curatedCatalogs.LEETCODE_75 && curatedCatalogs.LEETCODE_75.has(slug)) {
            curatedBoost += 10;
            reasons.push("Part of LeetCode 75 curated set.");
          }
        }
        score += curatedBoost;

        // E. RECENCY DECAY
        allCandidateConcepts.forEach(concept => {
          if (recentTopics.has(concept)) {
            score -= 8; // Penalty for repetitive topic in immediate succession
          }
        });

        // Ensure at least one explanation exists
        if (reasons.length === 0) {
          reasons.push(`Targeted practice for ${candDiff} problem solving.`);
        }

        // Deduplicate reasons
        const uniqueReasons = Array.from(new Set(reasons));

        scoredCandidates.push(ProblemRecommendation.create({
          frontendId: candidate.frontendId,
          titleSlug: candidate.titleSlug,
          title: candidate.title,
          difficulty: candDiff,
          topics: candidateTopics,
          patterns: candidatePatterns,
          score,
          confidence: 0.85,
          reasons: uniqueReasons,
          priority: 1
        }));
      });

      // Sort by recommendation score descending
      scoredCandidates.sort((a, b) => b.score - a.score);

      // Assign sequential priority ranks
      scoredCandidates.forEach((rec, idx) => {
        rec.priority = idx + 1;
      });

      return scoredCandidates;
    }

    /**
     * Selects the single highest-value next problem recommendation aligned with focusSkill.
     * @param {Array<ProblemRecommendation>} recommendations
     * @param {string|null} focusSkill - Primary focus concept (e.g. "Two Pointers", "Graph")
     * @returns {ProblemRecommendation|null} Top recommendation or null.
     */
    getNextProblem(recommendations = [], focusSkill = null) {
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        return null;
      }
      if (focusSkill) {
        const cleanFocus = String(focusSkill).toLowerCase();
        const focusMatch = recommendations.find(r => {
          const concepts = [...(r.topics || []), ...(r.patterns || [])].map(c => String(c).toLowerCase());
          return concepts.includes(cleanFocus);
        });
        if (focusMatch) return focusMatch;
      }
      return recommendations[0];
    }

    /**
     * Generates a 7-problem study plan aligned with focusSkill progression and topic diversity.
     * @param {Array<ProblemRecommendation>} recommendations
     * @param {number} count - Target count (default 7)
     * @param {string|null} focusSkill - Primary focus concept (e.g. "Two Pointers", "Graph")
     * @returns {Array<ProblemRecommendation>} Coherent study plan array.
     */
    generateStudyPlan(recommendations = [], count = 7, focusSkill = null) {
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        return [];
      }

      if (recommendations.length <= count) {
        return recommendations;
      }

      const plan = [];
      const selectedSlugs = new Set();
      const topicCountMap = {};

      // 1. Focus Skill Priority Pass (Select top 3-4 problems matching focusSkill)
      if (focusSkill) {
        const cleanFocus = String(focusSkill).toLowerCase();
        for (const rec of recommendations) {
          if (plan.length >= Math.min(4, count)) break;
          const concepts = [...(rec.topics || []), ...(rec.patterns || [])].map(c => String(c).toLowerCase());
          if (concepts.includes(cleanFocus) && !selectedSlugs.has(rec.titleSlug)) {
            plan.push(rec);
            selectedSlugs.add(rec.titleSlug);
            const mainTopic = rec.topics[0] || "General";
            topicCountMap[mainTopic] = (topicCountMap[mainTopic] || 0) + 1;
          }
        }
      }

      // 2. Diversity & Skill Gap Fill Pass
      for (const rec of recommendations) {
        if (plan.length >= count) break;
        if (selectedSlugs.has(rec.titleSlug)) continue;

        const mainTopic = rec.topics[0] || "General";
        const currentTopicCount = topicCountMap[mainTopic] || 0;

        if (currentTopicCount < 3 || plan.length >= count - 1) {
          plan.push(rec);
          selectedSlugs.add(rec.titleSlug);
          topicCountMap[mainTopic] = currentTopicCount + 1;
        }
      }

      // 3. Fallback fill if strict topic constraint left plan short of target
      if (plan.length < count) {
        for (const rec of recommendations) {
          if (plan.length >= count) break;
          if (!selectedSlugs.has(rec.titleSlug)) {
            plan.push(rec);
            selectedSlugs.add(rec.titleSlug);
          }
        }
      }

      // Re-assign priority numbers 1..count
      plan.forEach((rec, idx) => {
        rec.priority = idx + 1;
      });

      return plan;
    }
  }

  const recommendationEngine = new RecommendationEngine();

  LeetCodeAutoSync.RecommendationEngine = recommendationEngine;
  LeetCodeAutoSync.generateRecommendations = (p) => recommendationEngine.generateRecommendations(p);
  LeetCodeAutoSync.getNextProblem = (recs, focusSkill) => recommendationEngine.getNextProblem(recs, focusSkill);
  LeetCodeAutoSync.generateStudyPlan = (recs, count, focusSkill) => recommendationEngine.generateStudyPlan(recs, count, focusSkill);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      RecommendationEngine,
      recommendationEngine
    };
  }

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
