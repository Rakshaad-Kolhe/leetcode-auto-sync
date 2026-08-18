/**
 * Unit regression tests for Phase 2 Developer Intelligence OS services and models.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== Running Developer Intelligence OS Phase 2 Test Suite ===");

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
  SkillTreeService,
  JourneyService,
  PatternService,
  InterviewMatrixService,
  RecommendationService,
  AchievementService,
  ProjectionService,
  RepositoryAuditService,
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

async function runOSTests() {
  try {
    // 1. SkillTreeService
    console.log("\n--- Test 1: SkillTreeService Hierarchy & Dependencies ---");
    const skillRoot = SkillTreeService.buildSkillTree({ Arrays: 15, Graph: 10, "Dynamic Programming": 8 });
    assert(skillRoot.name.includes("Algorithms"), "SkillTreeService builds root node");
    assert(skillRoot.children.length >= 4, "SkillTreeService builds top algorithm categories");
    const deps = SkillTreeService.getLearningDependencyMap();
    assert(Array.isArray(deps) && deps.length > 0, "SkillTreeService returns prerequisite dependency map");

    // 2. JourneyService
    console.log("\n--- Test 2: JourneyService Timeline & Filtering ---");
    const timeline = JourneyService.buildTimeline({});
    assert(Array.isArray(timeline) && timeline.length >= 5, "JourneyService builds chronological milestone timeline");
    const monthFiltered = JourneyService.filterTimeline(timeline, "month");
    assert(Array.isArray(monthFiltered), "JourneyService supports timeframe filtering");

    // 3. PatternService
    console.log("\n--- Test 3: PatternService Pattern Discovery ---");
    const codeSnippet = `
      int left = 0, right = nums.size() - 1;
      while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
      }
    `;
    const patterns = PatternService.detectPatterns(codeSnippet, "cpp");
    assert(patterns.some((p) => p.name === "Binary Search"), "PatternService detects Binary Search pattern in code");

    // 4. InterviewMatrixService
    console.log("\n--- Test 4: InterviewMatrixService Company Readiness ---");
    const matrix = InterviewMatrixService.computeCompanyReadiness({ totalSolved: 100, hard: 20, rating: 1800 });
    assert(Array.isArray(matrix) && matrix.length >= 10, "InterviewMatrixService computes readiness for 10 target companies");
    const google = matrix.find((c) => c.name === "Google");
    assert(google !== undefined && google.readinessPct > 0, "Includes Google readiness score");

    // 5. RecommendationService
    console.log("\n--- Test 5: RecommendationService Explainable Evidence ---");
    const recs = RecommendationService.generateExplainableRecommendations({ totalSolved: 40, hard: 2 }, {});
    assert(Array.isArray(recs) && recs.length > 0, "RecommendationService generates explainable recommendations");
    assert(recs[0].evidence !== undefined, "Recommendations include empirical evidence");

    // 6. AchievementService
    console.log("\n--- Test 6: AchievementService Badges Engine ---");
    const achievements = AchievementService.evaluateAchievements({ hard: 5, syncedCount: 50, contestCount: 12 });
    assert(Array.isArray(achievements) && achievements.length >= 8, "AchievementService evaluates 8+ engineering badges");
    const firstHard = achievements.find((a) => a.id === "first_hard");
    assert(firstHard.unlocked === true, "Unlocks First Hard badge when hard >= 1");

    // 7. ProjectionService
    console.log("\n--- Test 7: ProjectionService Growth Explanations & Forecasts ---");
    const growthExp = ProjectionService.generateGrowthExplanations({ hard: 5 });
    assert(Array.isArray(growthExp) && growthExp.length > 0, "ProjectionService generates human-readable growth explanations");
    const proj = ProjectionService.computeFutureProjections({ totalSolved: 500, dailyRate: 2 });
    assert(Array.isArray(proj) && proj.length > 0, "ProjectionService computes milestone predictions");

    // 8. RepositoryAuditService
    console.log("\n--- Test 8: RepositoryAuditService Evolution & Audit ---");
    const evolution = RepositoryAuditService.getEvolutionTimeline({});
    assert(Array.isArray(evolution) && evolution.length > 0, "RepositoryAuditService builds repository evolution timeline");
    const audit = RepositoryAuditService.performAudit({ hasReadme: false, unsyncedCount: 3 });
    assert(audit.healthy === false, "Detects repository issues");
    assert(audit.suggestedFixes.length > 0, "Provides automated fix suggestions");

    // 9. Master DeveloperIntelligenceService OS Report
    console.log("\n--- Test 9: Master DeveloperIntelligenceService OS Report ---");
    const masterReport = await DeveloperIntelligenceService.getOrComputeIntelligence({}, true);
    assert(masterReport.overallScore > 0, "DeveloperIntelligenceService computes master overall score");
    assert(masterReport.dailyBrief !== undefined, "Master report includes Daily Brief");
    assert(masterReport.developerDNA !== undefined, "Master report includes Developer DNA");
    assert(masterReport.personalBests !== undefined, "Master report includes Personal Bests");

  } catch (err) {
    console.error("OS test execution threw exception:", err);
    testFailures++;
  }

  if (testFailures > 0) {
    console.error(`❌ Completed OS tests with ${testFailures} errors.`);
    process.exit(1);
  } else {
    console.log("🚀 All Developer Intelligence OS Phase 2 tests passed successfully!");
  }
}

runOSTests();
