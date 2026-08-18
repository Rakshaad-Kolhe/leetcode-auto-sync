/**
 * Phase 3 Real Data Platform Unit Test Suite.
 * Tests DeveloperDataStore, LeetCodeGraphQLService, RepositoryScannerService, SnapshotEngineService,
 * PatternService AST problem trace links, and evidence-first missing-data fallback states.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== Running Phase 3 Real Data Platform Test Suite ===");

function load(relPath) {
  const code = fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf8");
  vm.runInThisContext(code, { filename: relPath });
}

load("models/developer_intelligence.js");
load("models/skill_tree.js");
load("models/knowledge_graph.js");
load("models/achievement.js");
load("models/roadmap.js");
load("models/milestone.js");
load("models/projection.js");
load("domain/data_provenance.js");
load("domain/developer_data_store.js");
load("services/leetcode_graphql_service.js");
load("services/repository_scanner_service.js");
load("services/snapshot_engine_service.js");
load("models/developer_report.js");

load("intelligence/skill_tree_service.js");
load("intelligence/journey_service.js");
load("intelligence/pattern_service.js");
load("intelligence/interview_matrix_service.js");
load("intelligence/recommendation_service.js");
load("intelligence/achievement_service.js");
load("intelligence/projection_service.js");
load("intelligence/repository_audit_service.js");
load("intelligence/developer_intelligence_service.js");

const {
  DeveloperDataStore,
  LeetCodeGraphQLService,
  RepositoryScannerService,
  SnapshotEngineService,
  PatternService,
  RecommendationService,
  DeveloperIntelligenceService
} = globalThis.LeetCodeAutoSync;

let testFailures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testFailures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runPhase3Tests() {
  try {
    // 1. DeveloperDataStore Single Source of Truth
    console.log("\n--- Test 1: DeveloperDataStore Single Source of Truth ---");
    DeveloperDataStore.reset();
    assert(DeveloperDataStore.status.loaded === false, "DeveloperDataStore initializes with loaded=false");
    assert(DeveloperDataStore.stats.totalSolved === 0, "DeveloperDataStore initializes with 0 solved stats");

    let changeNotified = false;
    DeveloperDataStore.onDataStoreChanged(() => { changeNotified = true; });
    DeveloperDataStore.stats.totalSolved = 42;
    DeveloperDataStore.notifySubscribers();
    assert(changeNotified === true, "DeveloperDataStore notifies subscribers on data changes");

    // 2. LeetCodeGraphQLService Unauthenticated Handling
    console.log("\n--- Test 2: LeetCodeGraphQLService Unauthenticated Fallback ---");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ data: { userStatus: { isSignedIn: false } } })
    });

    const authed = await LeetCodeGraphQLService.syncRealUserProfile();
    assert(authed === false, "LeetCodeGraphQLService returns false when unauthenticated");
    assert(DeveloperDataStore.status.authenticated === false, "DeveloperDataStore sets authenticated=false");
    assert(DeveloperDataStore.contests.available === false, "DeveloperDataStore sets contests.available=false");

    // Restore fetch
    globalThis.fetch = originalFetch;

    // 2b. LeetCodeGraphQLService Dynamic Daily Challenge Fetching
    console.log("\n--- Test 2b: LeetCodeGraphQLService Dynamic Daily Challenge Fetching ---");
    globalThis.fetch = async (url, options) => {
      const body = options && options.body ? JSON.parse(options.body) : {};
      if (body.query && body.query.includes("getDailyChallenge")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              activeDailyCodingChallengeQuestion: {
                date: "2026-08-11",
                userStatus: "Finish",
                link: "/problems/two-sum/",
                question: {
                  questionId: "1",
                  questionFrontendId: "1",
                  title: "Two Sum",
                  titleSlug: "two-sum",
                  difficulty: "Easy",
                  acRate: 52.3412,
                  topicTags: [{ name: "Array", slug: "array" }, { name: "Hash Table", slug: "hash-table" }]
                }
              }
            }
          })
        };
      }
      return { ok: true, json: async () => ({ data: {} }) };
    };

    const dailyResult = await LeetCodeGraphQLService.fetchDailyChallenge();
    assert(dailyResult !== null, "fetchDailyChallenge returns a valid status object");
    assert(dailyResult.title === "1. Two Sum", `Daily challenge title updated dynamically to '${dailyResult.title}'`);
    assert(dailyResult.difficulty === "Easy", "Daily challenge difficulty updated to Easy");
    assert(dailyResult.acceptanceRate === "52.34%", `Daily challenge acceptance rate formatted correctly as '${dailyResult.acceptanceRate}'`);
    assert(dailyResult.url === "https://leetcode.com/problems/two-sum/", `Daily challenge URL formatted correctly as '${dailyResult.url}'`);
    assert(dailyResult.isSolved === true, "Daily challenge isSolved set to true");
    assert(DeveloperDataStore.stats.dailyChallengeStatus.title === "1. Two Sum", "DeveloperDataStore updated with live daily challenge");

    globalThis.fetch = originalFetch;

    // 3. RepositoryScannerService Update & Fallback
    console.log("\n--- Test 3: RepositoryScannerService Data Store Update ---");
    const scanPayload = {
      configured: true,
      repoPath: "Leetcode-solutions",
      syncedCount: 39,
      totalAccepted: 42,
      missingCount: 3,
      hasReadme: true,
      brokenLinksCount: 0,
      duplicateCount: 0,
      metadataCompleteness: 0.95,
      syncedProblems: [
        { id: 3014, title: "Minimum Number of Pushes to Type Word I", slug: "minimum-number-of-pushes-to-type-word-i", difficulty: "Easy", topics: ["Math", "Array"], folderPath: "Leetcode-solutions/Easy/3014-Minimum Number of Pushes to Type Word I" }
      ]
    };
    RepositoryScannerService.updateDataStore(scanPayload);
    assert(DeveloperDataStore.repository.syncedCount === 39, "RepositoryScannerService updates syncedCount");
    assert(DeveloperDataStore.repository.missingCount === 3, "RepositoryScannerService computes missingCount");
    assert(DeveloperDataStore.repository.syncedProblems[0].topics[0] === "Math", "RepositoryScannerService preserves problem topics");

    // 4. SnapshotEngineService Snapshot Immutability & Trend
    console.log("\n--- Test 4: SnapshotEngineService Snapshots & Trends ---");
    DeveloperDataStore.metrics.overallScore = 88;
    const snap = await SnapshotEngineService.captureSnapshot();
    assert(snap.overallScore === 88, "SnapshotEngineService captures overallScore");
    assert(DeveloperDataStore.snapshots.length > 0, "SnapshotEngineService stores snapshot in DeveloperDataStore");
    const trends = SnapshotEngineService.computeTrendDeltas();
    assert(trends.weeklyDelta !== undefined, "SnapshotEngineService computes weeklyDelta trend string");

    // 5. PatternService AST Pattern & Problem Trace Links
    console.log("\n--- Test 5: PatternService AST Pattern Trace Links ---");
    const cppCode = `
      int left = 0, right = nums.size() - 1;
      while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
      }
    `;
    const patterns = PatternService.detectPatterns(cppCode, "cpp");
    assert(patterns.some((p) => p.name === "Binary Search"), "PatternService detects Binary Search pattern");

    // 6. Evidence-First Recommendations
    console.log("\n--- Test 6: RecommendationService Evidence Generation ---");
    const recs = RecommendationService.generateExplainableRecommendations();
    assert(Array.isArray(recs) && recs.length > 0, "RecommendationService generates structured recommendations");
    assert(recs[0].reason !== undefined, "Recommendations expose explicit reasoning log");
    assert(recs[0].evidence !== undefined, "Recommendations expose empirical evidence");

    // 7. DeveloperIntelligenceService Missing Data Graceful State
    console.log("\n--- Test 7: DeveloperIntelligenceService Graceful Missing Data ---");
    DeveloperDataStore.reset();
    const emptyReport = DeveloperIntelligenceService.computeReport();
    assert(emptyReport.readinessLevel === "Not enough data", "Gracefully sets readiness to 'Not enough data' when zero solutions exist");
    assert(emptyReport.overallScore === 0, "Gracefully sets score to 0 when unconfigured");

  } catch (err) {
    console.error("Phase 3 test execution threw exception:", err);
    testFailures++;
  }

  if (testFailures > 0) {
    console.error(`❌ Completed Phase 3 tests with ${testFailures} errors.`);
    process.exit(1);
  } else {
    console.log("🚀 All Phase 3 Real Data Platform tests passed successfully!");
  }
}

runPhase3Tests();
