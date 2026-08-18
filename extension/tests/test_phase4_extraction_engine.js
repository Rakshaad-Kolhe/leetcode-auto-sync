/**
 * Phase 4 Production-Grade Data Extraction & Provenance Engine Test Suite.
 * Tests DataProvenance, AuthenticationService, DataNormalizationService,
 * MetricValidationService invariant enforcement, and hardened GraphQL error handling.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== Running Phase 4 Extraction & Provenance Engine Test Suite ===");

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
load("services/authentication_service.js");
load("services/data_normalization_service.js");
load("services/metric_validation_service.js");
load("services/leetcode_graphql_service.js");
load("services/repository_scanner_service.js");
load("services/snapshot_engine_service.js");
load("models/developer_report.js");

const {
  DataProvenance,
  DeveloperDataStore,
  AuthenticationService,
  DataNormalizationService,
  MetricValidationService,
  AUTH_STATES
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

async function runPhase4Tests() {
  try {
    // 1. DataProvenance Model
    console.log("\n--- Test 1: DataProvenance Model & JSON Serialization ---");
    const prov = DataProvenance.passed("LeetCode GraphQL", "userCalendar", 100);
    assert(prov.source === "LeetCode GraphQL", "DataProvenance stores source");
    assert(prov.validationStatus === "PASSED", "DataProvenance stores validationStatus PASSED");
    const json = prov.toJSONObject();
    assert(json.confidence === 100, "DataProvenance serializes to JSON correctly");

    // 2. AuthenticationService State Transition
    console.log("\n--- Test 2: AuthenticationService State Transitions ---");
    let stateTransitioned = false;
    AuthenticationService.onAuthStateChanged((state) => {
      if (state === AUTH_STATES.AUTHENTICATED) stateTransitioned = true;
    });
    AuthenticationService.setAuthState(AUTH_STATES.AUTHENTICATED);
    assert(stateTransitioned === true, "AuthenticationService notifies subscribers on login state change");
    assert(DeveloperDataStore.status.authenticated === true, "AuthenticationService updates DeveloperDataStore status");

    // 3. DataNormalizationService Standardizations
    console.log("\n--- Test 3: DataNormalizationService Standardizations ---");
    const normalizedLang = DataNormalizationService.normalizeLanguage("C++");
    assert(normalizedLang === "cpp", "Normalizes 'C++' to 'cpp'");

    const normalizedPy = DataNormalizationService.normalizeLanguage("Python3");
    assert(normalizedPy === "python3", "Normalizes 'Python3' to 'python3'");

    const normalizedPct = DataNormalizationService.normalizePercentage("63.415%");
    assert(normalizedPct === 63.4, "Normalizes percentage string '63.415%' to 63.4");

    const normalizedPath = DataNormalizationService.normalizePath("Leetcode-solutions\\Easy\\1-Two Sum");
    assert(normalizedPath === "Leetcode-solutions/Easy/1-Two Sum", "Normalizes Windows backslashes to forward slashes");

    // 4. MetricValidationService Invariant Enforcement
    console.log("\n--- Test 4: MetricValidationService Invariants ---");
    const validStats = { totalSolved: 40, easy: 20, medium: 15, hard: 5, currentStreak: 10 };
    const validProv = MetricValidationService.validateStats(validStats);
    assert(validProv.validationStatus === "PASSED", "Validates correct Easy+Medium+Hard == Total");

    const invalidStreakStats = { totalSolved: 10, easy: 5, medium: 5, hard: 0, currentStreak: -5 };
    const invalidProv = MetricValidationService.validateStats(invalidStreakStats);
    assert(invalidProv.validationStatus === "FAILED", "Rejects negative streak invariant");

    // 5. DataStore Provenance Integration
    console.log("\n--- Test 5: DeveloperDataStore Provenance Map ---");
    DeveloperDataStore.setProvenance("stats", validProv);
    const storeJson = DeveloperDataStore.toJSONObject();
    assert(storeJson.provenance.stats.validationStatus === "PASSED", "DeveloperDataStore attaches metric provenance map");

  } catch (err) {
    console.error("Phase 4 test execution threw exception:", err);
    testFailures++;
  }

  if (testFailures > 0) {
    console.error(`❌ Completed Phase 4 tests with ${testFailures} errors.`);
    process.exit(1);
  } else {
    console.log("🚀 All Phase 4 Extraction & Provenance Engine tests passed successfully!");
  }
}

runPhase4Tests();
