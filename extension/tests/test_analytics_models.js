/**
 * Test Suite for AnalyticsModels
 */

const assert = require("assert");
const {
  ProblemAnalyticsModel,
  SkillScore,
  SkillGap,
  ProblemRecommendation,
  PersonalPlan
} = require("../analytics/analytics_models.js");

function runTests() {
  console.log("--- Testing AnalyticsModels ---");

  // 1. ProblemAnalyticsModel creation
  const prob = ProblemAnalyticsModel.create({
    frontendId: 1,
    titleSlug: "Two-Sum",
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["Array", "Hash Table"],
    solved: true,
    source: "repository"
  });

  assert.strictEqual(prob.frontendId, "1");
  assert.strictEqual(prob.titleSlug, "two-sum");
  assert.strictEqual(prob.difficulty, "Easy");
  assert.strictEqual(prob.solved, true);
  assert.deepStrictEqual(prob.topics, ["Array", "Hash Table"]);

  // 2. SkillScore classification & metrics
  const score = SkillScore.create({
    name: "Array",
    solvedCount: 5,
    recentSolvedCount: 2,
    difficultyScore: 1.8,
    classification: "KNOWN"
  });

  assert.strictEqual(score.name, "Array");
  assert.strictEqual(score.solvedCount, 5);
  assert.strictEqual(score.classification, "KNOWN");

  // 3. SkillGap creation
  const gap = SkillGap.create({
    name: "Two Pointers",
    score: 45.0,
    reason: "Builds on your strong Array foundation. Limited Two Pointers practice detected.",
    solvedCount: 0,
    recommendedNext: true
  });

  assert.strictEqual(gap.name, "Two Pointers");
  assert.strictEqual(gap.recommendedNext, true);
  assert.ok(gap.reason.includes("Limited Two Pointers practice detected"));

  // 4. ProblemRecommendation
  const rec = ProblemRecommendation.create({
    frontendId: "15",
    titleSlug: "3sum",
    title: "3Sum",
    difficulty: "Medium",
    score: 85.5,
    reasons: ["Builds on Array", "Matches Medium readiness"]
  });

  assert.strictEqual(rec.titleSlug, "3sum");
  assert.strictEqual(rec.difficulty, "Medium");
  assert.strictEqual(rec.score, 85.5);
  assert.strictEqual(rec.reasons.length, 2);

  // 5. PersonalPlan
  const plan = PersonalPlan.create({
    basedOnSolvedCount: 12,
    focusSkill: "Two Pointers",
    skillGaps: [gap],
    strengths: [score],
    nextProblem: rec,
    nextProblems: [rec],
    source: "repository"
  });

  assert.strictEqual(plan.basedOnSolvedCount, 12);
  assert.strictEqual(plan.focusSkill, "Two Pointers");
  assert.strictEqual(plan.skillGaps.length, 1);
  assert.strictEqual(plan.nextProblem.titleSlug, "3sum");
  assert.strictEqual(plan.source, "repository");

  console.log("✅ ALL AnalyticsModels tests passed successfully!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
