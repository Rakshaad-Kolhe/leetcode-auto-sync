/**
 * Unit regression tests for DeveloperIntelligence domain model and DeveloperIntelligenceService.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("--- Running Developer Intelligence Service Regression Tests ---");

// Load model and service scripts
const modelCode = fs.readFileSync(path.resolve(__dirname, "../models/developer_intelligence.js"), "utf8");
const serviceCode = fs.readFileSync(path.resolve(__dirname, "../services/developer_intelligence_service.js"), "utf8");

vm.runInThisContext(modelCode, { filename: "models/developer_intelligence.js" });
vm.runInThisContext(serviceCode, { filename: "services/developer_intelligence_service.js" });

const { CategoryScore, IntelligenceRecommendation, IntelligenceTrend, DeveloperIntelligence, DeveloperIntelligenceService } = globalThis.LeetCodeAutoSync;

let testFailures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testFailures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runIntelligenceTests() {
  try {
    // Test 1: CategoryScore Instantiation & JSON Serialization
    console.log("\n--- Test 1: CategoryScore Model & Serialization ---");
    const cat = new CategoryScore({
      id: "problemDiversity",
      name: "Problem Diversity",
      score: 84,
      weight: 0.20,
      measures: { uniqueTopics: 16, topTopic: "Arrays" },
      formula: "Formula string",
      reasoning: "Reasoning string",
      suggestion: "Suggestion string"
    });

    assert(cat.score === 84, "CategoryScore preserves numeric score");
    assert(cat.weight === 0.20, "CategoryScore preserves weight");
    const catJson = cat.toJSONObject();
    assert(catJson.id === "problemDiversity" && catJson.score === 84, "CategoryScore converts to JSON object correctly");

    // Test 2: DeveloperIntelligence Report Model Construction
    console.log("\n--- Test 2: DeveloperIntelligence Report Model ---");
    const report = new DeveloperIntelligence({
      overallScore: 91,
      readinessLevel: "Advanced",
      categoryScores: { problemDiversity: cat }
    });

    assert(report.overallScore === 91, "DeveloperIntelligence report preserves overall score");
    assert(report.readinessLevel === "Advanced", "DeveloperIntelligence report preserves readiness level");
    assert(report.categoryScores.problemDiversity.score === 84, "DeveloperIntelligence report contains category scores");

    // Test 3: DeveloperIntelligenceService Metric Collection
    console.log("\n--- Test 3: DeveloperIntelligenceService Metric Collection ---");
    const metrics = DeveloperIntelligenceService.collectMetrics({
      submissions: [
        { id: 1, title: "Two Sum", difficulty: "Easy", topics: ["Arrays", "Hash Table"] },
        { id: 2, title: "Add Two Numbers", difficulty: "Medium", topics: ["Linked List", "Math"] },
        { id: 3, title: "Median of Two Sorted Arrays", difficulty: "Hard", topics: ["Arrays", "Binary Search"] }
      ],
      stats: { totalSolved: 3, easy: 1, medium: 1, hard: 1, currentStreak: 14 }
    });

    assert(metrics.totalSolved === 3, "Collects total solved metrics accurately");
    assert(metrics.easy === 1 && metrics.medium === 1 && metrics.hard === 1, "Collects difficulty distribution accurately");
    assert(metrics.uniqueTopicsCount >= 4, "Extracts unique topics count");

    // Test 4: DeveloperIntelligenceService Deterministic Score Calculation
    console.log("\n--- Test 4: DeveloperIntelligenceService Score Computation ---");
    const computedReport = DeveloperIntelligenceService.computeScores(metrics);
    assert(typeof computedReport.overallScore === "number", "Computes overall score as a number");
    assert(computedReport.overallScore >= 0 && computedReport.overallScore <= 100, "Overall score within 0-100 bounds");
    assert(computedReport.categoryScores.problemDiversity !== undefined, "Includes problemDiversity category score");
    assert(computedReport.categoryScores.difficultyBalance !== undefined, "Includes difficultyBalance category score");
    assert(computedReport.categoryScores.consistency !== undefined, "Includes consistency category score");
    assert(computedReport.categoryScores.repositoryCompleteness !== undefined, "Includes repositoryCompleteness category score");
    assert(computedReport.categoryScores.contestParticipation !== undefined, "Includes contestParticipation category score");
    assert(computedReport.categoryScores.learningProgression !== undefined, "Includes learningProgression category score");
    assert(computedReport.categoryScores.roadmapCompletion !== undefined, "Includes roadmapCompletion category score");

    // Test 5: Recommendations Engine Output
    console.log("\n--- Test 5: Recommendation Engine Output ---");
    assert(Array.isArray(computedReport.recommendations) && computedReport.recommendations.length > 0, "Generates structured recommendations");
    const topicRec = computedReport.recommendations.find((r) => r.type === "topic");
    assert(topicRec !== undefined, "Generates next topic recommendation");
    assert(topicRec.reason.length > 0, "Topic recommendation includes explicit reason");

    // Test 6: Insights Engine Output
    console.log("\n--- Test 6: Insights Engine Strengths & Weaknesses ---");
    assert(Array.isArray(computedReport.strengths) && computedReport.strengths.length > 0, "Generates strengths array");
    assert(Array.isArray(computedReport.weaknesses) && computedReport.weaknesses.length > 0, "Generates weaknesses array");

  } catch (err) {
    console.error("Developer Intelligence test execution threw exception:", err);
    testFailures++;
  }

  if (testFailures > 0) {
    console.error(`❌ Completed Developer Intelligence tests with ${testFailures} errors.`);
    process.exit(1);
  } else {
    console.log("🚀 Developer Intelligence tests passed successfully!");
  }
}

runIntelligenceTests();
