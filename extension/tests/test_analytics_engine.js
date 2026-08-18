/**
 * Test Suite for AnalyticsEngine
 */

const assert = require("assert");
const { ProblemAnalyticsModel } = require("../analytics/analytics_models.js");
const { AnalyticsEngine } = require("../analytics/analytics_engine.js");

function runTests() {
  console.log("--- Testing AnalyticsEngine ---");
  const engine = new AnalyticsEngine();

  // TEST 12: Repository update changes recommendation output
  console.log("Running TEST 12: Repository update changes recommendation output...");
  const planInitial = engine.computePersonalPlan({
    solvedProblems: [
      { frontendId: "1", titleSlug: "two-sum", title: "Two Sum", difficulty: "Easy", topics: ["Array", "Hash Table"], solved: true }
    ]
  });

  const nextSlug1 = planInitial.nextProblem ? planInitial.nextProblem.titleSlug : null;

  // Add 5 more solved problems (including the previous nextProblem)
  const planUpdated = engine.computePersonalPlan({
    solvedProblems: [
      { frontendId: "1", titleSlug: "two-sum", title: "Two Sum", difficulty: "Easy", topics: ["Array", "Hash Table"], solved: true },
      { frontendId: "15", titleSlug: "3sum", title: "3Sum", difficulty: "Medium", topics: ["Array", "Two Pointers"], solved: true },
      { frontendId: "11", titleSlug: "container-with-most-water", title: "Container With Most Water", difficulty: "Medium", topics: ["Array", "Two Pointers"], solved: true },
      { frontendId: "26", titleSlug: "remove-duplicates-from-sorted-array", title: "Remove Duplicates", difficulty: "Easy", topics: ["Array"], solved: true },
      { frontendId: "27", titleSlug: "remove-element", title: "Remove Element", difficulty: "Easy", topics: ["Array"], solved: true }
    ]
  });

  assert.notStrictEqual(planInitial.basedOnSolvedCount, planUpdated.basedOnSolvedCount);
  assert.ok(planUpdated.basedOnSolvedCount > planInitial.basedOnSolvedCount);

  // The solved problems must NEVER be recommended
  const solvedSet = new Set(["two-sum", "3sum", "container-with-most-water", "remove-duplicates-from-sorted-array", "remove-element"]);
  planUpdated.nextProblems.forEach(p => {
    assert.strictEqual(solvedSet.has(p.titleSlug), false, `Solved problem '${p.titleSlug}' must not be recommended`);
  });
  console.log("✅ TEST 12 passed!");

  // TEST 13: GraphQL unavailable -> Analytics still works from repository/cache
  console.log("Running TEST 13: GraphQL failure fallback handling...");
  // Simulate GraphQL error in DataStore / offline fallback
  const originalStore = globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.DeveloperDataStore;
  globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};
  globalThis.LeetCodeAutoSync.DeveloperDataStore = {
    curatedLists: {
      status: "error",
      source: "repository",
      solvedSlugs: new Set(["two-sum", "3sum"])
    },
    solvedSlugs: new Set(["two-sum", "3sum"]),
    onDataStoreChanged: () => {},
    onCuratedProgressUpdated: () => {}
  };

  const offlinePlan = engine.computePersonalPlan();
  assert.ok(offlinePlan);
  assert.strictEqual(offlinePlan.basedOnSolvedCount >= 2, true);
  assert.ok(offlinePlan.nextProblem !== null);
  assert.ok(offlinePlan.nextProblems.length > 0);
  assert.strictEqual(offlinePlan.source, "repository");

  if (originalStore) {
    globalThis.LeetCodeAutoSync.DeveloperDataStore = originalStore;
  }
  console.log("✅ TEST 13 passed!");

  console.log("🎉 ALL AnalyticsEngine tests passed successfully!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
