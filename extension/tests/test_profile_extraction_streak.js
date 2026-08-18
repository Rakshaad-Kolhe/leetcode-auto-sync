/**
 * Integration Test Suite for Profile Extraction, Calendar Streak Aggregator,
 * 30-Day Activity Heatmap Generation, and Official vs Reconstructed Streak Scenarios.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== Running Profile Extraction & Streak Audit Test Suite ===");

function load(relPath) {
  const code = fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf8");
  vm.runInThisContext(code, { filename: relPath });
}

load("shared/constants.js");
load("shared/logger.js");
load("models/metadata_snapshot.js");
load("models/submission_model.js");
load("models/accepted_submission.js");
load("models/developer_intelligence.js");
load("domain/data_provenance.js");
load("domain/developer_data_store.js");
load("services/data_normalization_service.js");
load("services/metric_validation_service.js");
load("services/leetcode_graphql_service.js");

load("models/developer_view_model.js");
load("services/developer_view_model_builder.js");

const { LeetCodeGraphQLService, DeveloperDataStore, DataProvenance, DeveloperViewModelBuilder } = globalThis.LeetCodeAutoSync;

let testFailures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testFailures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function buildMockCalendar(daysCount) {
  const cal = {};
  const now = new Date();
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const ts = Math.floor(d.getTime() / 1000);
    cal[ts] = 2;
  }
  return JSON.stringify(cal);
}

function runStreakTests() {
  try {
    // Scenario A: API = 18, Calendar = 18 -> Status MATCH
    console.log("\n--- Scenario A: API = 18, Calendar = 18 ---");
    const calA = buildMockCalendar(18);
    const resA = LeetCodeGraphQLService.computeStreakFromCalendar(calA, 18);
    assert(resA.calculatedCurrentStreak === 18, `Reconstructed streak is 18 (got ${resA.calculatedCurrentStreak})`);

    // Scenario B: API = 24, Calendar = 18 -> Official Override (Time Travel Ticket / Server Adjustment)
    console.log("\n--- Scenario B: API = 24, Calendar = 18 (Official Override) ---");
    const calB = buildMockCalendar(18);
    const resB = LeetCodeGraphQLService.computeStreakFromCalendar(calB, 24);
    const apiStreakB = 24;
    const calcStreakB = resB.calculatedCurrentStreak;
    const diffB = apiStreakB - calcStreakB;
    const statusB = diffB === 0 ? "MATCH" : "OFFICIAL_OVERRIDE";

    assert(apiStreakB === 24, "Displayed currentStreak is official LeetCode value 24");
    assert(calcStreakB === 18, "Calculated streak stored separately as 18");
    assert(diffB === 6, "Difference is 6 days");
    assert(statusB === "OFFICIAL_OVERRIDE", "Status is OFFICIAL_OVERRIDE");

    // Scenario C: API = 40, Calendar = 40 -> Status MATCH
    console.log("\n--- Scenario C: API = 40, Calendar = 40 ---");
    const calC = buildMockCalendar(40);
    const resC = LeetCodeGraphQLService.computeStreakFromCalendar(calC, 40);
    const diffC = 40 - resC.calculatedCurrentStreak;
    assert(resC.calculatedCurrentStreak === 40, "Calculated streak is 40");
    assert(diffC === 0, "No difference (0)");

    // Scenario D: API missing/null, Calendar = 21 -> Display Reconstructed Fallback
    console.log("\n--- Scenario D: API Missing, Calendar = 21 (Fallback) ---");
    const calD = buildMockCalendar(21);
    const resD = LeetCodeGraphQLService.computeStreakFromCalendar(calD, 0);
    const apiStreakD = null;
    const fallbackStreakD = apiStreakD || resD.calculatedCurrentStreak;
    const isFallbackD = apiStreakD === null;

    assert(fallbackStreakD === 21, "Displays reconstructed streak (21) as fallback");
    assert(isFallbackD === true, "Identified fallback mode");

    // Scenario E: streakCounter with Time Travel Ticket (daysSkipped > 0, official != calendar, currentDayCompleted = true)
    console.log("\n--- Scenario E: streakCounter with Time Travel Ticket (daysSkipped > 0, official != calendar, currentDayCompleted = true) ---");
    DeveloperDataStore.reset();
    DeveloperDataStore.stats.officialStreak = 25;
    DeveloperDataStore.stats.calendarStreak = 19;
    DeveloperDataStore.stats.reconstructedStreak = 19;
    DeveloperDataStore.stats.daysSkipped = 6;
    DeveloperDataStore.stats.currentDayCompleted = true;

    const vmE = DeveloperViewModelBuilder.buildViewModel(DeveloperDataStore);
    assert(vmE.streakPillText === "🔥 25 Days", `UI displays officialStreak (25 Days, got '${vmE.streakPillText}')`);
    assert(vmE.officialStreak === 25, "ViewModel preserves officialStreak = 25");
    assert(vmE.calendarStreak === 19, "ViewModel preserves calendarStreak = 19");
    assert(vmE.reconstructedStreak === 19, "ViewModel preserves reconstructedStreak = 19");
    assert(vmE.daysSkipped === 6, "ViewModel preserves daysSkipped = 6");
    assert(vmE.currentDayCompleted === true, "ViewModel preserves currentDayCompleted = true");

    // Scenario F: streakCounter without Skipped Days (daysSkipped = 0, official == calendar, currentDayCompleted = false)
    console.log("\n--- Scenario F: streakCounter without Skipped Days (daysSkipped = 0, official == calendar, currentDayCompleted = false) ---");
    DeveloperDataStore.reset();
    DeveloperDataStore.stats.officialStreak = 10;
    DeveloperDataStore.stats.calendarStreak = 10;
    DeveloperDataStore.stats.reconstructedStreak = 10;
    DeveloperDataStore.stats.daysSkipped = 0;
    DeveloperDataStore.stats.currentDayCompleted = false;

    const vmF = DeveloperViewModelBuilder.buildViewModel(DeveloperDataStore);
    assert(vmF.streakPillText === "🔥 10 Days", `UI displays officialStreak (10 Days, got '${vmF.streakPillText}')`);
    assert(vmF.officialStreak === 10, "ViewModel preserves officialStreak = 10");
    assert(vmF.calendarStreak === 10, "ViewModel preserves calendarStreak = 10");
    assert(vmF.reconstructedStreak === 10, "ViewModel preserves reconstructedStreak = 10");
    assert(vmF.daysSkipped === 0, "ViewModel preserves daysSkipped = 0");
    assert(vmF.currentDayCompleted === false, "ViewModel preserves currentDayCompleted = false");

    // 5. 30-Day Activity Heatmap Generation Test
    console.log("\n--- Test 5: 30-Day Activity Heatmap Generation ---");
    const heatmap = LeetCodeGraphQLService.generate30DayActivityHeatmap(resB.activeDateMap);
    assert(heatmap.length === 30, `Heatmap generates exactly 30 days (got ${heatmap.length})`);
    assert(heatmap[29].solved === true, "Today's heatmap tile has solved = true");

    // 6. Contest Status Refinement Test
    console.log("\n--- Test 6: Contest Non-Participant Display Status ---");
    DeveloperDataStore.contests.available = false;
    DeveloperDataStore.contests.displayStatus = "No contest history";
    assert(DeveloperDataStore.contests.displayStatus === "No contest history", "Non-participant displays explicit 'No contest history'");

  } catch (err) {
    console.error("Streak & Profile test execution threw exception:", err);
    testFailures++;
  }

  if (testFailures > 0) {
    console.error(`❌ Completed profile extraction tests with ${testFailures} errors.`);
    process.exit(1);
  } else {
    console.log("🚀 All Profile Extraction & Streak Audit tests passed successfully!");
  }
}

runStreakTests();
