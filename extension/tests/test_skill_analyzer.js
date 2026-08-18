/**
 * Test Suite for SkillAnalyzer
 */

const assert = require("assert");
const { ProblemAnalyticsModel } = require("../analytics/analytics_models.js");
const { SkillAnalyzer } = require("../analytics/skill_analyzer.js");

function runTests() {
  console.log("--- Testing SkillAnalyzer ---");
  const analyzer = new SkillAnalyzer();

  // TEST 1: Empty repository -> No false skill claims, no fake recommendations, graceful state
  console.log("Running TEST 1: Empty repository handling...");
  const emptyModel = analyzer.analyzeSkills([]);
  assert.strictEqual(emptyModel.totalSolvedCount, 0);
  assert.strictEqual(emptyModel.strengths.length, 0);
  assert.strictEqual(emptyModel.difficultyReadiness.level, "Easy");
  assert.ok(emptyModel.skillGaps.length >= 0);
  // Ensure no "You are weak at X" claims exist in gaps
  emptyModel.skillGaps.forEach(g => {
    assert.strictEqual(g.reason.includes("weak at"), false, "Must not claim user is weak without evidence");
  });
  console.log("✅ TEST 1 passed!");

  // TEST 2: One solved problem -> Correct skill exposure
  console.log("Running TEST 2: One solved problem exposure...");
  const oneProblem = [
    ProblemAnalyticsModel.create({
      frontendId: "1",
      titleSlug: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      topics: ["Array", "Hash Table"],
      solved: true
    })
  ];
  const modelOne = analyzer.analyzeSkills(oneProblem);
  assert.strictEqual(modelOne.totalSolvedCount, 1);
  assert.strictEqual(modelOne.byName["Array"].solvedCount, 1);
  assert.strictEqual(modelOne.byName["Hash Table"].solvedCount, 1);
  assert.strictEqual(modelOne.byName["Array"].classification, "UNDER-PRACTICED");
  console.log("✅ TEST 2 passed!");

  // TEST 3: Array-heavy user -> Array recognized as strength
  console.log("Running TEST 3: Array-heavy user recognition...");
  const arrayProblems = [
    { frontendId: "1", titleSlug: "two-sum", difficulty: "Easy", topics: ["Array"], solved: true },
    { frontendId: "26", titleSlug: "remove-duplicates-from-sorted-array", difficulty: "Easy", topics: ["Array"], solved: true },
    { frontendId: "27", titleSlug: "remove-element", difficulty: "Easy", topics: ["Array"], solved: true },
    { frontendId: "53", titleSlug: "maximum-subarray", difficulty: "Medium", topics: ["Array"], solved: true },
    { frontendId: "121", titleSlug: "best-time-to-buy-and-sell-stock", difficulty: "Easy", topics: ["Array"], solved: true }
  ];
  const modelArray = analyzer.analyzeSkills(arrayProblems);
  assert.strictEqual(modelArray.byName["Array"].solvedCount, 5);
  assert.strictEqual(modelArray.byName["Array"].classification, "KNOWN");
  assert.ok(modelArray.strengths.some(s => s.name === "Array"));
  console.log("✅ TEST 3 passed!");

  // TEST 4: No Graph problems -> "Limited Graph practice detected" rather than falsely claiming weak
  console.log("Running TEST 4: No Graph problems wording...");
  const modelNoGraph = analyzer.analyzeSkills(arrayProblems);
  const graphGap = modelNoGraph.skillGaps.find(g => g.name === "Graph" || g.name === "Graph Traversal");
  assert.ok(graphGap, "Graph gap should exist");
  assert.strictEqual(graphGap.reason.includes("weak at"), false);
  assert.ok(graphGap.reason.includes("Limited") || graphGap.reason.includes("practice"), `Reason was: ${graphGap.reason}`);
  console.log("✅ TEST 4 passed!");

  // TEST 5 & 6: Difficulty Readiness (Medium-heavy vs Easy-heavy)
  console.log("Running TEST 5 & 6: Difficulty readiness calculation...");
  const easyUser = [
    { frontendId: "1", titleSlug: "p1", difficulty: "Easy", topics: ["Array"], solved: true },
    { frontendId: "2", titleSlug: "p2", difficulty: "Easy", topics: ["Array"], solved: true },
    { frontendId: "3", titleSlug: "p3", difficulty: "Easy", topics: ["Array"], solved: true }
  ];
  const easyModel = analyzer.analyzeSkills(easyUser);
  assert.strictEqual(easyModel.difficultyReadiness.level, "Easy");
  assert.strictEqual(easyModel.difficultyReadiness.mode, "gradual_medium");

  const mediumUser = [
    { frontendId: "1", titleSlug: "p1", difficulty: "Easy", topics: ["Array"], solved: true },
    { frontendId: "15", titleSlug: "p15", difficulty: "Medium", topics: ["Array"], solved: true },
    { frontendId: "33", titleSlug: "p33", difficulty: "Medium", topics: ["Array"], solved: true },
    { frontendId: "49", titleSlug: "p49", difficulty: "Medium", topics: ["Array"], solved: true }
  ];
  const medModel = analyzer.analyzeSkills(mediumUser);
  assert.strictEqual(medModel.difficultyReadiness.level, "Medium");
  assert.strictEqual(medModel.difficultyReadiness.mode, "default_medium");
  console.log("✅ TEST 5 & 6 passed!");

  console.log("🎉 ALL SkillAnalyzer tests passed successfully!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
