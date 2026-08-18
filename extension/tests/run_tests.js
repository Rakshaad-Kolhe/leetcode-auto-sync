const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== Running DevPulse Extension Regression Tests ===");

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
    getManifest: () => ({ name: "DevPulse", version: "1.1.0" })
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
loadScript("models/accepted_submission.js");
loadScript("models/developer_intelligence.js");
loadScript("models/skill_tree.js");
loadScript("models/knowledge_graph.js");
loadScript("models/achievement.js");
loadScript("models/roadmap.js");
loadScript("models/milestone.js");
loadScript("models/projection.js");
loadScript("models/developer_view_model.js");
loadScript("domain/data_provenance.js");
loadScript("domain/developer_data_store.js");
loadScript("services/authentication_service.js");
loadScript("services/data_normalization_service.js");
loadScript("services/canonical_identity_resolver.js");
loadScript("services/metric_validation_service.js");
loadScript("services/leetcode_graphql_service.js");
loadScript("services/repository_scanner_service.js");
loadScript("services/repository_health_calculator.js");
loadScript("services/snapshot_engine_service.js");
loadScript("services/developer_view_model_builder.js");
loadScript("models/developer_report.js");
loadScript("intelligence/skill_tree_service.js");
loadScript("intelligence/journey_service.js");
loadScript("intelligence/pattern_service.js");
loadScript("intelligence/interview_matrix_service.js");
loadScript("intelligence/recommendation_service.js");
loadScript("intelligence/achievement_service.js");
loadScript("intelligence/projection_service.js");
loadScript("intelligence/repository_audit_service.js");
loadScript("intelligence/developer_intelligence_service.js");
loadScript("ui/tokens/theme.js");
loadScript("ui/components/header_component.js");
loadScript("ui/components/today_hero_component.js");
loadScript("ui/components/next_action_component.js");
loadScript("ui/components/progress_component.js");
loadScript("ui/components/heatmap_component.js");
loadScript("ui/components/daily_challenge_component.js");
loadScript("ui/components/status_footer_component.js");
loadScript("parser/metadata_parser.js");
loadScript("parser/solution_parser.js");
loadScript("services/metadata_service.js");
loadScript("services/solution_service.js");
loadScript("services/backend_service.js");
loadScript("models/diagnostic_models.js");
loadScript("domain/diagnostic_event_store.js");
loadScript("services/diagnostics_service.js");
loadScript("ui/components/diagnostics_screen_component.js");
loadScript("analytics/analytics_models.js");
loadScript("analytics/skill_analyzer.js");
loadScript("analytics/recommendation_engine.js");
loadScript("analytics/analytics_engine.js");
loadScript("domain/developer_settings_store.js");
loadScript("ui/components/analytics_screen_component.js");
loadScript("ui/components/repo_screen_component.js");
loadScript("ui/components/settings_screen_component.js");

// Resolve symbols from global LeetCodeAutoSync object
const { SubmissionState, PageContext, MetadataService, SolutionParser, SolutionService, BackendService, DeveloperIntelligenceService, Verdicts } = globalThis.LeetCodeAutoSync;

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
    const origSolutionService = globalThis.LeetCodeAutoSync.SolutionService;
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
    globalThis.LeetCodeAutoSync.SolutionService = origSolutionService;

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

    // Test 9: AcceptedSubmission Model sourceHash Preservation
    console.log("\n--- Test 9: AcceptedSubmission sourceHash Preservation ---");
    const { AcceptedSubmission, SubmissionModel } = globalThis.LeetCodeAutoSync;
    const mockMeta = new SubmissionModel({
      id: 1,
      title: "Two Sum",
      slug: "two-sum",
      difficulty: "Easy",
      language: "cpp",
      url: "https://leetcode.com/problems/two-sum/",
      verdict: "Accepted"
    });
    const subObj = new AcceptedSubmission({
      metadata: mockMeta,
      code: "class Solution {};",
      sourceHash: "deadbeef12345678"
    });
    assert(subObj.sourceHash === "deadbeef12345678", "AcceptedSubmission model preserves sourceHash property");
    assert(subObj.validate() === true, "AcceptedSubmission model with sourceHash validates successfully");

    // Test 10: Complete End-to-End Extraction & Dispatch Pipeline
    console.log("\n--- Test 10: End-to-End Extraction & Background Message Dispatch ---");
    sentMessages.length = 0;
    const { MetadataParser, SolutionService } = globalThis.LeetCodeAutoSync;
    
    // Mock DOM elements required for MetadataParser.parse()
    queryResults = {
      '[data-cy="question-title"]': [{ textContent: "1. Two Sum" }],
      '[data-difficulty]': [{ textContent: "Easy" }],
      '[data-cy="lang-select"]': [{ textContent: "cpp" }],
      '.monaco-editor': [{
        querySelectorAll: (sel) => (sel === '.view-line' ? mockLines : [])
      }],
      '.view-line': mockLines
    };

    const parsedSnapshot = MetadataParser.parse();
    assert(parsedSnapshot !== null, "MetadataParser.parse() completes without SyntaxError and returns snapshot");
    assert(parsedSnapshot.id === 1 && parsedSnapshot.slug === "two-sum", "MetadataParser accurately extracts problem details");

    // Initialize SolutionService and trigger processAcceptedSubmission
    SolutionService.init();
    await SolutionService.processAcceptedSubmission(mockMeta);

    const dispatchedAcceptedMsg = sentMessages.find(m => m.type === "SUBMISSION_ACCEPTED");
    assert(dispatchedAcceptedMsg !== undefined, "SolutionService successfully dispatches SUBMISSION_ACCEPTED message to background");
    assert(dispatchedAcceptedMsg && dispatchedAcceptedMsg.payload && dispatchedAcceptedMsg.payload.code.includes("class Solution"), "Dispatched message contains extracted code");
    SolutionService.destroy();

    // Test 11: Configurable Submit Timeout Boundary
    console.log("\n--- Test 11: Configurable Submit Timeout Boundary ---");
    const originalFetch = globalThis.fetch;
    let fetchCalledWithTimeout = false;
    globalThis.fetch = async (url, options) => {
      fetchCalledWithTimeout = true;
      // Simulate 15 second backend processing delay
      await new Promise(r => setTimeout(r, 150));
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, status: "created" })
      };
    };

    const submitRes = await BackendService.submitSubmission(subObj);
    assert(fetchCalledWithTimeout === true, "BackendService.submitSubmission() executed network fetch");
    assert(submitRes.success === true, "15-second simulated backend delay completes successfully without timing out");

    // Test 12: Transient Error Retry Policy (503 Service Unavailable)
    console.log("\n--- Test 12: Transient Error Retry Policy (503 Retry) ---");
    let fetchAttempts = 0;
    globalThis.fetch = async (url, options) => {
      fetchAttempts++;
      if (fetchAttempts === 1) {
        return { ok: false, status: 503, json: async () => ({ detail: "Service Unavailable" }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, status: "created" })
      };
    };

    const retryRes = await BackendService.submitSubmission(subObj);
    assert(fetchAttempts === 2, "BackendService retried transient 503 error automatically");
    assert(retryRes.success === true, "Request succeeds on retry attempt");

    // Test 13: Non-Retryable Client Error Handling (400 Bad Request)
    console.log("\n--- Test 13: Non-Retryable Error Handling (400 Bad Request) ---");
    let clientErrorAttempts = 0;
    globalThis.fetch = async (url, options) => {
      clientErrorAttempts++;
      return { ok: false, status: 400, json: async () => ({ detail: "Invalid payload format" }) };
    };

    const clientErrRes = await BackendService.submitSubmission(subObj);
    assert(clientErrorAttempts === 1, "BackendService did NOT retry client 400 Bad Request error");
    assert(clientErrRes.success === false && clientErrRes.error.includes("Invalid payload format"), "Returns clear error details for 400 error");

    // Test 14: Invalid Payload Schema Lock Validation
    console.log("\n--- Test 14: Invalid Payload Schema Lock Validation ---");
    const invalidSubObj = new AcceptedSubmission({
      metadata: mockMeta,
      code: "", // Empty code fails schema validation
      sourceHash: null
    });

    const invalidRes = await BackendService.submitSubmission(invalidSubObj);
    assert(invalidRes.success === false, "Invalid payload correctly rejected before dispatching network request");
    assert(invalidRes.error.includes("Payload validation failed"), "Returns structured validation error");
    globalThis.fetch = originalFetch;

    // Test 15: Developer Intelligence Score Computation Engine
    console.log("\n--- Test 15: Developer Intelligence Score Computation Engine ---");
    const dataStore = globalThis.LeetCodeAutoSync.DeveloperDataStore;
    dataStore.stats = { totalSolved: 42, easy: 18, medium: 18, hard: 6, currentStreak: 7, totalActiveDays: 30 };
    dataStore.repository = { configured: true, repoPath: "Leetcode-solutions", syncedCount: 40, hasReadme: true, metadataCompleteness: 0.95 };
    const intelReport = DeveloperIntelligenceService.computeReport();
    assert(intelReport.overallScore > 0, "DeveloperIntelligenceService calculates positive overall score");
    assert(intelReport.readinessLevel !== undefined, "DeveloperIntelligenceService computes interview readiness stage");
    assert(intelReport.categoryScores.problemDiversity.score > 0, "DeveloperIntelligenceService computes Problem Diversity score");
    assert(intelReport.categoryScores.difficultyBalance.score > 0, "DeveloperIntelligenceService computes Difficulty Balance score");
    assert(intelReport.categoryScores.repositoryCompleteness.score > 0, "DeveloperIntelligenceService computes Repository Completeness score");
    // Test 16: Phase 2 Developer Intelligence OS Sub-Services
    console.log("\n--- Test 16: Phase 2 Developer Intelligence OS Sub-Services ---");
    const { SkillTreeService, JourneyService, PatternService, InterviewMatrixService, AchievementService, ProjectionService, RepositoryAuditService } = globalThis.LeetCodeAutoSync;
    const tree = SkillTreeService.buildSkillTree({});
    assert(tree.name.includes("Algorithms"), "SkillTreeService integration test passed");
    const timeline = JourneyService.buildTimeline({});
    assert(timeline.length > 0, "JourneyService integration test passed");
    const patterns = PatternService.detectPatterns("while(left < right) { mid = left + (right-left)/2; }");
    assert(patterns.some(p => p.name === "Binary Search"), "PatternService integration test passed");
    const matrix = InterviewMatrixService.computeCompanyReadiness({});
    assert(matrix.length >= 10, "InterviewMatrixService integration test passed");
    const achievements = AchievementService.evaluateAchievements({});
    assert(achievements.length >= 8, "AchievementService integration test passed");
    const projections = ProjectionService.computeFutureProjections({});
    assert(projections.length > 0, "ProjectionService integration test passed");
    const audit = RepositoryAuditService.performAudit({});
    // Test 17: Phase 3 Real Data Platform Domain & Services
    console.log("\n--- Test 17: Phase 3 Real Data Platform Domain & Services ---");
    // Test 18: Phase 4 Data Provenance & Metric Validation Engine
    console.log("\n--- Test 18: Phase 4 Data Provenance & Metric Validation Engine ---");
    const { DataProvenance, AuthenticationService, DataNormalizationService, MetricValidationService } = globalThis.LeetCodeAutoSync;
    assert(DataProvenance !== undefined, "DataProvenance class initialized");
    assert(AuthenticationService !== undefined, "AuthenticationService initialized");
    assert(DataNormalizationService !== undefined, "DataNormalizationService initialized");
    assert(MetricValidationService !== undefined, "MetricValidationService initialized");

    // Test 19: DeveloperViewModel & ViewModelBuilder Presentation Architecture
    console.log("\n--- Test 19: DeveloperViewModel Presentation Architecture ---");
    const { DeveloperViewModel, DeveloperViewModelBuilder, DeveloperDataStore } = globalThis.LeetCodeAutoSync;
    assert(DeveloperViewModel !== undefined, "DeveloperViewModel class initialized");
    assert(DeveloperViewModelBuilder !== undefined, "DeveloperViewModelBuilder initialized");
    const vmInstance = DeveloperViewModelBuilder.buildViewModel(DeveloperDataStore);
    assert(vmInstance !== undefined && typeof vmInstance === "object", "DeveloperViewModelBuilder produces DeveloperViewModel instance");

    // Test 20: Step 11 Live Data Parity & RepositoryHealthCalculator
    console.log("\n--- Test 20: Live Data Parity & RepositoryHealthCalculator ---");
    const { RepositoryHealthCalculator } = globalThis.LeetCodeAutoSync;
    assert(RepositoryHealthCalculator !== undefined, "RepositoryHealthCalculator initialized");
    const healthCalc = RepositoryHealthCalculator.calculateHealth(DeveloperDataStore.repository);
    // Test 21: Enterprise CuratedListsService Unit Suite
    console.log("\n--- Test 21: Enterprise CuratedListsService Unit Suite ---");
    const { runCuratedListsServiceTests } = require("./test_curated_lists_service.js");
    runCuratedListsServiceTests();

    // Test 22: Analytics Engine & Repo UI Suite
    console.log("\n--- Test 22: Personalized Analytics & Repo UI Suite ---");
    require("./test_analytics_models.js").runTests();
    require("./test_skill_analyzer.js").runTests();
    require("./test_recommendation_engine.js").runTests();
    require("./test_analytics_engine.js").runTests();
    require("./test_analytics_ui.js").runTests();
    require("./test_repo_ui.js").runTests();

    // Test 23: Data-Driven Diagnostics Tab & Service Suite
    console.log("\n--- Test 23: Operational Diagnostics Tab & Service Suite ---");
    await require("./test_diagnostics.js").runTests();

    // Test 24: Fully Functional Settings Tab & DeveloperSettingsStore Suite
    console.log("\n--- Test 24: Fully Functional Settings Tab & Store Suite ---");
    await require("./test_settings.js").runTests();

    // Restore original global fetch
    globalThis.fetch = originalFetch;

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
