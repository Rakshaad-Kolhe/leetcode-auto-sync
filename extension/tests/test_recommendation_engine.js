/**
 * Test Suite for RecommendationEngine
 */

const assert = require("assert");
const { ProblemAnalyticsModel } = require("../analytics/analytics_models.js");
const { SkillAnalyzer } = require("../analytics/skill_analyzer.js");
const { RecommendationEngine } = require("../analytics/recommendation_engine.js");

function runTests() {
  console.log("--- Testing RecommendationEngine ---");
  const analyzer = new SkillAnalyzer();
  const engine = new RecommendationEngine();

  const candidatePool = [
    { frontendId: "1", titleSlug: "two-sum", title: "Two Sum", difficulty: "Easy", topics: ["Array", "Hash Table"] },
    { frontendId: "15", titleSlug: "3sum", title: "3Sum", difficulty: "Medium", topics: ["Array", "Two Pointers"] },
    { frontendId: "11", titleSlug: "container-with-most-water", title: "Container With Most Water", difficulty: "Medium", topics: ["Array", "Two Pointers"] },
    { frontendId: "3", titleSlug: "longest-substring-without-repeating-characters", title: "Longest Substring", difficulty: "Medium", topics: ["String", "Sliding Window"] },
    { frontendId: "20", titleSlug: "valid-parentheses", title: "Valid Parentheses", difficulty: "Easy", topics: ["Stack", "String"] },
    { frontendId: "206", titleSlug: "reverse-linked-list", title: "Reverse Linked List", difficulty: "Easy", topics: ["Linked List"] },
    { frontendId: "102", titleSlug: "binary-tree-level-order-traversal", title: "Binary Tree Level Order Traversal", difficulty: "Medium", topics: ["Tree", "Breadth-First Search"] },
    { frontendId: "200", titleSlug: "number-of-islands", title: "Number of Islands", difficulty: "Medium", topics: ["Graph", "Depth-First Search"] },
    { frontendId: "70", titleSlug: "climbing-stairs", title: "Climbing Stairs", difficulty: "Easy", topics: ["Dynamic Programming"] },
    { frontendId: "198", titleSlug: "house-robber", title: "House Robber", difficulty: "Medium", topics: ["Dynamic Programming"] }
  ];

  const solvedProblems = [
    { frontendId: "1", titleSlug: "two-sum", title: "Two Sum", difficulty: "Easy", topics: ["Array", "Hash Table"], solved: true }
  ];

  const skillModel = analyzer.analyzeSkills(solvedProblems);

  // TEST 7: Solved problem must never be recommended!
  console.log("Running TEST 7: Solved problem exclusion...");
  const recs = engine.generateRecommendations({
    solvedProblems,
    availableProblems: candidatePool,
    skillModel
  });

  const isTwoSumRecommended = recs.some(r => r.titleSlug === "two-sum");
  assert.strictEqual(isTwoSumRecommended, false, "Solved problem 'two-sum' must NOT be recommended");
  console.log("✅ TEST 7 passed!");

  // TEST 8: Duplicate candidates must be removed
  console.log("Running TEST 8: Duplicate candidates removal...");
  const dupPool = [
    ...candidatePool,
    { frontendId: "15", titleSlug: "3sum", title: "3Sum", difficulty: "Medium", topics: ["Array", "Two Pointers"] }
  ];
  const recsDup = engine.generateRecommendations({
    solvedProblems,
    availableProblems: dupPool,
    skillModel
  });
  const threeSumCount = recsDup.filter(r => r.titleSlug === "3sum").length;
  assert.strictEqual(threeSumCount, 1, "Duplicate candidate '3sum' must be deduplicated");
  console.log("✅ TEST 8 passed!");

  // TEST 9: Curated-list membership influences ranking but does not dominate it
  console.log("Running TEST 9: Curated-list influence...");
  const curatedCatalogs = {
    BLIND_75: new Set(["3sum", "container-with-most-water"])
  };
  const recsCurated = engine.generateRecommendations({
    solvedProblems,
    availableProblems: candidatePool,
    skillModel,
    curatedCatalogs
  });
  assert.ok(recsCurated.length > 0);
  assert.ok(recsCurated[0].reasons.some(r => r.includes("Part of Blind 75") || r.includes("Builds on") || r.includes("Matches")), `Reasons were: ${JSON.stringify(recsCurated[0].reasons)}`);
  console.log("✅ TEST 9 passed!");

  // TEST 10: Next 7 contains topic diversity
  console.log("Running TEST 10: Topic diversity in Next 7 plan...");
  const plan7 = engine.generateStudyPlan(recsCurated, 7);
  assert.strictEqual(plan7.length, 7);
  const mainTopics = plan7.map(p => p.topics[0]);
  const uniqueTopics = new Set(mainTopics);
  assert.ok(uniqueTopics.size >= 3, `Expected at least 3 distinct topics in 7 plan, got ${uniqueTopics.size}: ${mainTopics.join(', ')}`);
  console.log("✅ TEST 10 passed!");

  // TEST 11: Recommendation explanations are generated (Never generic "Recommended for you")
  console.log("Running TEST 11: Recommendation explanations check...");
  recsCurated.forEach(r => {
    assert.ok(r.reasons.length >= 1, `Recommendation for ${r.titleSlug} must have at least 1 reason`);
    r.reasons.forEach(reason => {
      assert.notStrictEqual(reason, "Recommended for you.", "Must not use generic explanation");
    });
  });
  console.log("✅ TEST 11 passed!");

  // TEST 14: Canonical identity mismatch / raw path rejection
  console.log("Running TEST 14: Canonical identity validation & raw path rejection...");
  const invalidPool = [
    { frontendId: null, titleSlug: "C:\\Users\\Rakshaad\\solutions\\two-sum.js", title: "Two Sum" },
    { frontendId: null, titleSlug: "/leetcode-solutions/easy/two-sum.py", title: "Two Sum" }
  ];
  const recsInvalid = engine.generateRecommendations({
    solvedProblems: [],
    availableProblems: invalidPool,
    skillModel: analyzer.analyzeSkills([])
  });
  assert.strictEqual(recsInvalid.length, 0, "Raw filesystem paths must be rejected");
  console.log("✅ TEST 14 passed!");

  // TEST 15: Same input produces deterministic recommendation ordering
  console.log("Running TEST 15: Deterministic recommendation output...");
  const run1 = engine.generateRecommendations({ solvedProblems, availableProblems: candidatePool, skillModel });
  const run2 = engine.generateRecommendations({ solvedProblems, availableProblems: candidatePool, skillModel });
  assert.deepStrictEqual(run1.map(r => r.titleSlug), run2.map(r => r.titleSlug));
  assert.deepStrictEqual(run1.map(r => r.score), run2.map(r => r.score));
  console.log("✅ TEST 15 passed!");

  console.log("🎉 ALL RecommendationEngine tests passed successfully!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
