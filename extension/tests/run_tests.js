const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== Running LeetCode Auto Sync Extension Regression Tests ===");

// 1. Setup browser mocks in global scope
globalThis.window = globalThis;
globalThis.self = globalThis;

globalThis.window.addEventListener = (event, listener) => {};
globalThis.window.removeEventListener = (event, listener) => {};

globalThis.navigator = {
  userAgent: "Mozilla/5.0 NodeTestRunner"
};

globalThis.window.location = {
  href: "https://leetcode.com/problems/two-sum/submissions/"
};

// Mock Chrome extension messaging system
const sentMessages = [];
globalThis.chrome = {
  runtime: {
    sendMessage: (msg, cb) => {
      sentMessages.push(msg);
      if (cb) cb({ status: "success" });
    },
    getManifest: () => ({ version: "1.0.0" })
  }
};

// Mock DOM
let queryResults = {};
globalThis.document = {
  body: {},
  documentElement: {},
  createElement: (tag) => ({ textContent: "", remove: () => {} }),
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelectorAll: (selector) => {
    return queryResults[selector] || [];
  },
  querySelector: (selector) => {
    return (queryResults[selector] && queryResults[selector][0]) || null;
  }
};

// Mock MutationObserver
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

// Mock LeetCodeAutoSync logger
globalThis.LeetCodeAutoSync = {
  Logger: {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: (...args) => console.error("Logged Error:", ...args)
  }
};

// Helper function to execute local js scripts in this context
function loadScript(relativeFilePath) {
  const absolutePath = path.resolve(__dirname, "..", relativeFilePath);
  const code = fs.readFileSync(absolutePath, "utf8");
  vm.runInThisContext(code, { filename: relativeFilePath });
}

// 2. Load extension source files in dependency order
loadScript("shared/constants.js");
loadScript("shared/logger.js");
loadScript("submission/submission_state.js");
loadScript("content/page_context.js");
loadScript("models/submission_model.js");
loadScript("parser/metadata_parser.js");
loadScript("parser/solution_parser.js");
loadScript("services/metadata_service.js");

// Resolve symbols from global LeetCodeAutoSync object
const { SubmissionState, PageContext, MetadataService, SolutionParser, Verdicts } = globalThis.LeetCodeAutoSync;

let testFailures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testFailures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// === TEST SUITE ===

async function runAllTests() {
  try {
    // Test 1: PageContext Classification
    console.log("\n--- Test 1: PageContext URL Classification ---");
    const testUrls = [
      { url: "https://leetcode.com/problems/two-sum/description/", slug: "two-sum", isProblem: true },
      { url: "https://leetcode.com/problems/two-sum/submissions/", slug: "two-sum", isProblem: true },
      { url: "https://leetcode.com/contest/weekly-contest-290/problems/intersection-of-multiple-arrays/", slug: "intersection-of-multiple-arrays", isProblem: true },
      { url: "https://leetcode.com/explore/", slug: null, isProblem: false }
    ];

    testUrls.forEach(({ url, slug, isProblem }) => {
      assert(PageContext.isProblemPage(url) === isProblem, `IsProblemPage for ${url}`);
      assert(PageContext.getProblemSlug(url) === slug, `GetProblemSlug for ${url} should be ${slug}`);
    });

    // Test 2: SubmissionState transitions & event-driven payload
    console.log("\n--- Test 2: SubmissionState transitions ---");
    SubmissionState.reset();
    assert(SubmissionState.getState() === "IDLE", "Initial state should be IDLE");

    let lastTransitionEvent = null;
    const unsubscribe = SubmissionState.onStateChanged((toState, fromState, payload) => {
      lastTransitionEvent = { toState, fromState, payload };
    });

    // Start submission
    SubmissionState.startSubmission();
    assert(SubmissionState.getState() === "SUBMITTING", "State after startSubmission should be SUBMITTING");
    assert(lastTransitionEvent.toState === "SUBMITTING", "Notification triggered on transition to SUBMITTING");

    // Move to RUNNING
    SubmissionState.setRunning();
    assert(SubmissionState.getState() === "RUNNING", "State after setRunning should be RUNNING");

    // Finish with Accepted
    SubmissionState.finishSubmission(Verdicts.ACCEPTED);
    assert(SubmissionState.getState() === "FINISHED", "State after finishSubmission should be FINISHED");
    assert(SubmissionState.getVerdict() === Verdicts.ACCEPTED, "Verdict should be Accepted");
    assert(lastTransitionEvent.payload === Verdicts.ACCEPTED, "Verdict is propagated inside event payload");

    // Test 3: Unsubscribe Pattern Verification
    console.log("\n--- Test 3: Unsubscribe verification ---");
    unsubscribe();
    lastTransitionEvent = null;
    SubmissionState.reset();
    assert(lastTransitionEvent === null, "Listener should not fire after unsubscribe");

    // Test 4: Back-to-back start submission transition
    console.log("\n--- Test 4: Transition from FINISHED to SUBMITTING ---");
    SubmissionState.reset();
    SubmissionState.startSubmission();
    SubmissionState.setRunning();
    SubmissionState.finishSubmission(Verdicts.ACCEPTED);

    SubmissionState.startSubmission();
    assert(SubmissionState.getState() === "SUBMITTING", "State transitions from FINISHED back to SUBMITTING");

    // Test 5: MetadataService verdict routing
    console.log("\n--- Test 5: MetadataService event routing ---");
    let metadataAcceptedCalled = false;
    globalThis.LeetCodeAutoSync.SolutionService = {
      processAcceptedSubmission: () => {
        metadataAcceptedCalled = true;
      }
    };

    queryResults = {
      '[data-cy="question-title"]': [{ textContent: "1. Two Sum" }],
      '[data-difficulty]': [{ textContent: "Easy" }],
      '[data-cy="lang-select"]': [{ textContent: "Python3" }]
    };

    MetadataService.init();

    SubmissionState.reset();
    SubmissionState.startSubmission();
    SubmissionState.setRunning();
    SubmissionState.finishSubmission(Verdicts.WRONG_ANSWER);
    assert(metadataAcceptedCalled === false, "MetadataService ignores non-Accepted verdicts");

    SubmissionState.startSubmission();
    SubmissionState.setRunning();
    SubmissionState.finishSubmission(Verdicts.ACCEPTED);
    assert(metadataAcceptedCalled === true, "MetadataService fires on Accepted verdict");

    MetadataService.destroy();

    // Test 6: Solution Extraction Engine — Validation Logic
    console.log("\n--- Test 6: Solution Extraction Code Validation ---");
    const validCppCode = `#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1};\n    }\n};`;
    const invalidTruncatedCpp = `} else {\n    return false;\n}\nfor (int i = 0; i < n; i++) {\n`;

    const vResult1 = SolutionParser.validateCode(validCppCode, "cpp");
    assert(vResult1.valid === true, "Complete C++ code validates as true");

    const vResult2 = SolutionParser.validateCode(invalidTruncatedCpp, "cpp");
    assert(vResult2.valid === false, "Truncated middle snippet starting with '}' fails C++ validation");

    const validPyCode = `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        return [0, 1]\n`;
    const vResult3 = SolutionParser.validateCode(validPyCode, "python3");
    assert(vResult3.valid === true, "Complete Python solution validates as true");

    // Test 7: Multi-tier fallback and sorted DOM line extraction
    console.log("\n--- Test 7: Viewport DOM Line Sorting Extraction ---");
    const mockLines = [
      { textContent: "    }\n};", style: { top: "60px" }, compareDocumentPosition: () => 1 },
      { textContent: "#include <iostream>", style: { top: "0px" }, compareDocumentPosition: () => 1 },
      { textContent: "class Solution {", style: { top: "20px" }, compareDocumentPosition: () => 1 },
      { textContent: "public:", style: { top: "40px" }, compareDocumentPosition: () => 1 }
    ];

    queryResults = {
      '.monaco-editor': [{
        querySelectorAll: (sel) => (sel === '.view-line' ? mockLines : [])
      }],
      '.view-line': mockLines
    };

    const extractedDomCode = await SolutionParser.parse("cpp");
    assert(extractedDomCode.startsWith("#include <iostream>"), "Extracted DOM code correctly sorted top line first");
    assert(extractedDomCode.includes("class Solution {"), "Extracted DOM code contains class Solution header");

    // Test 8: Diagnostic Reporting
    console.log("\n--- Test 8: Diagnostic Telemetry Reporting ---");
    const diags = SolutionParser.getDiagnostics();
    assert(Array.isArray(diags) && diags.length > 0, "SolutionParser generates diagnostic array");
    const lastDiag = diags[diags.length - 1];
    assert(lastDiag.strategy === "DOM_SORTED", "Diagnostic correctly records selected strategy");
    assert(lastDiag.success === true, "Diagnostic records successful validation result");

  } catch (err) {
    console.error("Test execution threw exception:", err);
    testFailures++;
  }

  console.log("\n=== Test Executions Finished ===");
  if (testFailures > 0) {
    console.error(`❌ Completed with ${testFailures} errors.`);
    process.exit(1);
  } else {
    console.log("🚀 All tests passed successfully!");
    process.exit(0);
  }
}

runAllTests();
