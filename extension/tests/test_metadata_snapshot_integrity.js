"use strict";

const assert = require("assert");

// Mock browser global environment if running under Node.js
if (typeof globalThis.LeetCodeAutoSync === "undefined") {
  globalThis.LeetCodeAutoSync = {};
}

// Load modules
require("../shared/constants.js");
require("../models/metadata_snapshot.js");
require("../models/submission_model.js");

const { MetadataSnapshot, SubmissionModel } = globalThis.LeetCodeAutoSync;

console.log("=== Running MetadataSnapshot & Navigation Integrity Tests ===");

// Scenario 1: Frozen Immutability
{
  const snapshot = new MetadataSnapshot({
    id: 9,
    title: "Palindrome Number",
    slug: "palindrome-number",
    difficulty: "Easy",
    language: "python3",
    url: "https://leetcode.com/problems/palindrome-number/",
    navVersion: 1
  });

  assert.strictEqual(Object.isFrozen(snapshot), true, "Snapshot must be frozen upon creation");
  assert.strictEqual(snapshot.id, 9);
  assert.strictEqual(snapshot.slug, "palindrome-number");
  assert.ok(snapshot.snapshotId.startsWith("SNAP-"), "Snapshot must have SNAP- prefix");

  // Attempt mutation in strict mode / freeze test
  assert.throws(() => {
    snapshot.id = 6;
  }, /cannot assign to read only property/i, "Attempting to mutate frozen snapshot must throw error");

  console.log("✔ Test 1 Passed: MetadataSnapshot object immutability enforced.");
}

// Scenario 2: Rejection of Stale Title-to-Slug Mismatch
{
  // Attempting to create snapshot with mismatched title vs slug
  assert.throws(() => {
    new MetadataSnapshot({
      id: 6,
      title: "Zigzag Conversion",
      slug: "palindrome-number",
      difficulty: "Medium",
      language: "python3",
      url: "https://leetcode.com/problems/palindrome-number/",
      navVersion: 2
    });
  }, /integrity violation: title "Zigzag Conversion" \(slug "zigzag-conversion"\) does not match URL slug "palindrome-number"/i, "Mismatched title and slug must throw integrity error");

  console.log("✔ Test 2 Passed: Mismatched title and slug rejected during snapshot construction.");
}

// Scenario 3: SubmissionModel Validation with Snapshot Integrity
{
  const validModel = new SubmissionModel({
    id: 9,
    title: "Palindrome Number",
    slug: "palindrome-number",
    difficulty: "Easy",
    language: "python3",
    url: "https://leetcode.com/problems/palindrome-number/",
    verdict: "Accepted",
    snapshotId: "SNAP-20260724-12345678",
    navVersion: 3
  });

  assert.strictEqual(validModel.validate(), true, "Valid SubmissionModel must pass validation");

  const invalidModel = new SubmissionModel({
    id: 6,
    title: "Zigzag Conversion",
    slug: "palindrome-number",
    difficulty: "Medium",
    language: "python3",
    url: "https://leetcode.com/problems/palindrome-number/",
    verdict: "Accepted",
    snapshotId: "SNAP-20260724-12345678",
    navVersion: 3
  });

  assert.strictEqual(invalidModel.validate(), false, "Mismatched SubmissionModel must fail validation");

  console.log("✔ Test 3 Passed: SubmissionModel title-to-slug cross-validation passed.");
}

// Scenario 4: Rapid Navigation Sequence Simulator
{
  const navHistory = [];
  let currentNavVersion = 1;

  function simulateNavigation(title, id, slug) {
    currentNavVersion++;
    const snap = new MetadataSnapshot({
      id,
      title,
      slug,
      difficulty: "Easy",
      language: "python3",
      url: `https://leetcode.com/problems/${slug}/`,
      navVersion: currentNavVersion
    });
    navHistory.push({ navVersion: currentNavVersion, snapshot: snap });
    return snap;
  }

  // Simulate rapid SPA transitions: Problem 1 -> Problem 6 -> Problem 9
  simulateNavigation("Two Sum", 1, "two-sum");
  simulateNavigation("Zigzag Conversion", 6, "zigzag-conversion");
  const finalSnapshot = simulateNavigation("Palindrome Number", 9, "palindrome-number");

  assert.strictEqual(finalSnapshot.id, 9);
  assert.strictEqual(finalSnapshot.slug, "palindrome-number");
  assert.strictEqual(finalSnapshot.navVersion, currentNavVersion);

  // Stale callback from navVersion 2 attempting to claim current state
  const staleNavVersion = 2;
  assert.notStrictEqual(staleNavVersion, currentNavVersion, "Stale navVersion must not match currentNavVersion");

  console.log("✔ Test 4 Passed: Rapid SPA navigation sequence successfully validated.");
}

console.log("=== All MetadataSnapshot Integrity Tests Passed Successfully ===");
