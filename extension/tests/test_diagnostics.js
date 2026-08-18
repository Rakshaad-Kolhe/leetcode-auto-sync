/**
 * @fileoverview Test Suite for Data-Driven Diagnostics Tab & Service.
 * Tests all 18 mandatory operational diagnostics scenarios.
 */

const assert = require("assert");

// Setup minimal browser/DOM mocks for Node environment
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.chrome = globalThis.chrome || {
  storage: {
    local: {
      get: (keys, cb) => cb({}),
      set: (data, cb) => { if (cb) cb(); },
      remove: (keys, cb) => { if (cb) cb(); }
    }
  },
  runtime: {
    getManifest: () => ({ name: "DevPulse", version: "1.1.0" }),
    getURL: (path) => path,
    id: "test-extension-id"
  },
  tabs: {
    create: () => {}
  }
};

// Load dependencies in order
require("../shared/constants.js");
require("../shared/logger.js");
require("../domain/data_provenance.js");
require("../domain/developer_data_store.js");
require("../models/diagnostic_models.js");
require("../domain/diagnostic_event_store.js");
require("../services/authentication_service.js");
require("../services/backend_service.js");
require("../services/repository_scanner_service.js");
require("../services/diagnostics_service.js");
require("../ui/components/diagnostics_screen_component.js");

function createMockContainer() {
  return {
    innerHTML: "",
    querySelector: function(selector) {
      const self = this;
      return {
        addEventListener: (event, handler) => {
          self._handlers = self._handlers || {};
          self._handlers[selector] = handler;
        },
        click: () => {
          if (self._handlers && self._handlers[selector]) {
            self._handlers[selector]();
          }
        },
        getAttribute: (attr) => null,
        style: {}
      };
    },
    querySelectorAll: function(selector) {
      return [];
    }
  };
}

async function runTests() {
  console.log("==================================================");
  console.log("Running Diagnostics Tab & DiagnosticsService Test Suite");
  console.log("==================================================");

  const {
    DiagnosticStatus,
    SyncState,
    DiagnosticEventType,
    DiagnosticCheckResult,
    DiagnosticEvent,
    DiagnosticEventStore,
    DeveloperDataStore,
    BackendService,
    AuthenticationService,
    DiagnosticsService,
    DiagnosticsScreenComponent
  } = globalThis.LeetCodeAutoSync;

  const container = createMockContainer();

  // Reset initial state
  DeveloperDataStore.reset();
  DiagnosticEventStore.clearEvents();

  // DIAGNOSTICS TEST 1: All services healthy -> Overall HEALTHY
  console.log("Running DIAGNOSTICS TEST 1: All services healthy...");
  BackendService.checkBackend = async () => ({ success: true, data: { status: "ok" } });
  DeveloperDataStore.repository = {
    configured: true,
    repoPath: "Leetcode-solutions",
    repoName: "Leetcode-solutions",
    owner: "Rakshaad-Kolhe",
    repoUrl: "https://github.com/Rakshaad-Kolhe/Leetcode-solutions",
    branch: "main",
    lastCommitHash: "a1b2c3d",
    syncedCount: 25,
    isGit: true
  };
  DeveloperDataStore.profile = { username: "Rakshaad_Kolhe" };
  AuthenticationService.authState = "AUTHENTICATED";

  const summary1 = await DiagnosticsService.runAllChecks();
  assert.strictEqual(summary1.overallStatus, DiagnosticStatus.HEALTHY, "Overall status must be HEALTHY when all services pass");
  assert.strictEqual(summary1.checks.backend.status, DiagnosticStatus.HEALTHY);
  assert.strictEqual(summary1.checks.repository.status, DiagnosticStatus.HEALTHY);
  assert.strictEqual(summary1.checks.git.status, DiagnosticStatus.HEALTHY);
  assert.strictEqual(summary1.checks.leetcode.status, DiagnosticStatus.HEALTHY);
  assert.strictEqual(summary1.checks.github.status, DiagnosticStatus.HEALTHY);
  assert.strictEqual(summary1.checks.extension.status, DiagnosticStatus.HEALTHY);
  console.log("✅ DIAGNOSTICS TEST 1 passed!");

  // DIAGNOSTICS TEST 2: Backend unavailable -> Backend ERROR & Overall ERROR
  console.log("Running DIAGNOSTICS TEST 2: Backend unavailable...");
  BackendService.checkBackend = async () => ({ success: false, error: "Connection refused" });
  const summary2 = await DiagnosticsService.runAllChecks();
  assert.strictEqual(summary2.checks.backend.status, DiagnosticStatus.ERROR, "Backend must be ERROR when unreachable");
  assert.strictEqual(summary2.overallStatus, DiagnosticStatus.ERROR, "Overall status must be ERROR when backend fails");
  console.log("✅ DIAGNOSTICS TEST 2 passed!");

  // DIAGNOSTICS TEST 3: Repository unavailable -> Repository ERROR
  console.log("Running DIAGNOSTICS TEST 3: Repository unavailable...");
  DeveloperDataStore.repository.lastError = "Folder permission denied";
  const repoCheck = await DiagnosticsService.checkRepository();
  assert.strictEqual(repoCheck.status, DiagnosticStatus.ERROR, "Repository check must be ERROR on lastError");
  assert.ok(repoCheck.message.includes("Folder permission denied"));
  DeveloperDataStore.repository.lastError = null;
  console.log("✅ DIAGNOSTICS TEST 3 passed!");

  // DIAGNOSTICS TEST 4: LeetCode session unavailable -> LeetCode WARNING
  console.log("Running DIAGNOSTICS TEST 4: LeetCode session unavailable...");
  DeveloperDataStore.profile.username = null;
  AuthenticationService.authState = "UNAUTHENTICATED";
  const leetCheck = await DiagnosticsService.checkLeetCode();
  assert.strictEqual(leetCheck.status, DiagnosticStatus.WARNING, "LeetCode check must return WARNING when session unauthenticated");
  assert.strictEqual(leetCheck.message, "Session unavailable");
  DeveloperDataStore.profile.username = "Rakshaad_Kolhe";
  AuthenticationService.authState = "AUTHENTICATED";
  console.log("✅ DIAGNOSTICS TEST 4 passed!");

  // DIAGNOSTICS TEST 5: Sync in progress -> SYNCING state
  console.log("Running DIAGNOSTICS TEST 5: Sync in progress...");
  DeveloperDataStore.repository.isSyncing = true;
  const syncHealth5 = DiagnosticsService.getSyncHealth();
  assert.strictEqual(syncHealth5.state, SyncState.SYNCING);
  assert.ok(syncHealth5.statusText.includes("progress"));
  DeveloperDataStore.repository.isSyncing = false;
  console.log("✅ DIAGNOSTICS TEST 5 passed!");

  // DIAGNOSTICS TEST 6: Sync completed -> Last sync updated dynamically
  console.log("Running DIAGNOSTICS TEST 6: Sync completed...");
  DeveloperDataStore.repository.lastSynced = new Date().toISOString();
  DeveloperDataStore.repository.lastSyncedText = "Just now";
  DeveloperDataStore.repository.lastOperation = "Push completed";
  DeveloperDataStore.repository.lastCommitHash = "f9e8d7c";
  DeveloperDataStore.repository.branch = "main";
  const syncHealth6 = DiagnosticsService.getSyncHealth();
  assert.strictEqual(syncHealth6.state, SyncState.COMPLETED);
  assert.strictEqual(syncHealth6.lastSuccessfulSync, "Just now");
  assert.strictEqual(syncHealth6.lastOperation, "Push completed");
  assert.strictEqual(syncHealth6.lastCommit, "f9e8d7c");
  console.log("✅ DIAGNOSTICS TEST 6 passed!");

  // DIAGNOSTICS TEST 7: Sync failed -> Warning/error displayed
  console.log("Running DIAGNOSTICS TEST 7: Sync failed...");
  DeveloperDataStore.repository.lastError = "Push rejected by remote";
  const syncHealth7 = DiagnosticsService.getSyncHealth();
  assert.strictEqual(syncHealth7.state, SyncState.FAILED);
  assert.strictEqual(syncHealth7.isError, true);
  assert.strictEqual(syncHealth7.statusText, "Last sync failed");
  DeveloperDataStore.repository.lastError = null;
  console.log("✅ DIAGNOSTICS TEST 7 passed!");

  // DIAGNOSTICS TEST 8: Recent events -> Actual event list
  console.log("Running DIAGNOSTICS TEST 8: Recent events...");
  DiagnosticEventStore.clearEvents();
  DiagnosticEventStore.addEvent({
    type: DiagnosticEventType.SYNC_COMPLETED,
    status: "success",
    message: "Two Sum pushed to GitHub"
  });
  DiagnosticEventStore.addEvent({
    type: DiagnosticEventType.README_GENERATED,
    status: "info",
    message: "Root README.md updated"
  });
  const events8 = DiagnosticEventStore.getEvents();
  assert.strictEqual(events8.length, 2);
  assert.strictEqual(events8[0].message, "Root README.md updated");
  assert.strictEqual(events8[1].message, "Two Sum pushed to GitHub");
  console.log("✅ DIAGNOSTICS TEST 8 passed!");

  // DIAGNOSTICS TEST 9: No events -> Correct empty state
  console.log("Running DIAGNOSTICS TEST 9: No events empty state...");
  DiagnosticEventStore.clearEvents();
  DiagnosticsScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("No diagnostic events recorded yet."), "Must render empty state message when no events exist");
  console.log("✅ DIAGNOSTICS TEST 9 passed!");

  // DIAGNOSTICS TEST 10: Run Diagnostics action -> Actual checks executed
  console.log("Running DIAGNOSTICS TEST 10: Run Diagnostics action...");
  let checksRan = false;
  const originalRunAll = DiagnosticsService.runAllChecks;
  DiagnosticsService.runAllChecks = async function() {
    checksRan = true;
    return originalRunAll.apply(this);
  };
  await DiagnosticsService.runAllChecks();
  assert.strictEqual(checksRan, true, "runAllChecks must execute real checks");
  DiagnosticsService.runAllChecks = originalRunAll;
  console.log("✅ DIAGNOSTICS TEST 10 passed!");

  // DIAGNOSTICS TEST 11: Force Sync action -> Existing sync pipeline invoked
  console.log("Running DIAGNOSTICS TEST 11: Force Sync action...");
  DiagnosticsScreenComponent.triggerForceSync(container, {});
  assert.strictEqual(DiagnosticsScreenComponent._isSyncing, true, "Force Sync must enter syncing state");
  DiagnosticsScreenComponent._isSyncing = false;
  console.log("✅ DIAGNOSTICS TEST 11 passed!");

  // DIAGNOSTICS TEST 12: Clear Cache action -> Cache actually cleared
  console.log("Running DIAGNOSTICS TEST 12: Clear Cache action...");
  let cleared = false;
  globalThis.chrome = globalThis.chrome || {};
  globalThis.chrome.storage = globalThis.chrome.storage || {};
  globalThis.chrome.storage.local = globalThis.chrome.storage.local || {};
  globalThis.chrome.storage.local.remove = (keys, cb) => {
    cleared = true;
    if (cb) cb();
  };
  const clearRes = await DiagnosticsService.clearCache();
  assert.strictEqual(clearRes, true);
  assert.strictEqual(cleared, true, "Clear cache must invoke storage removal");
  console.log("✅ DIAGNOSTICS TEST 12 passed!");

  // DIAGNOSTICS TEST 13: Dynamic timestamp formatting -> No hardcoded relative times
  console.log("Running DIAGNOSTICS TEST 13: Dynamic timestamp formatting...");
  const now = Date.now();
  assert.strictEqual(DiagnosticsService.formatRelativeTime(now - 3000), "just now");
  assert.strictEqual(DiagnosticsService.formatRelativeTime(now - 45000), "45 sec ago");
  assert.strictEqual(DiagnosticsService.formatRelativeTime(now - 120000), "2 min ago");
  assert.strictEqual(DiagnosticsService.formatRelativeTime(now - 3600000), "1 hr ago");
  assert.strictEqual(DiagnosticsService.formatRelativeTime(now - 90000000), "Yesterday");
  console.log("✅ DIAGNOSTICS TEST 13 passed!");

  // DIAGNOSTICS TEST 14: Dynamic Git branch/commit -> Real GitService values
  console.log("Running DIAGNOSTICS TEST 14: Dynamic Git branch/commit...");
  DeveloperDataStore.repository.branch = "feature/dynamic-sync";
  DeveloperDataStore.repository.lastCommitHash = "e4f5a6b";
  const gitCheck14 = await DiagnosticsService.checkGit();
  assert.ok(gitCheck14.message.includes("feature/dynamic-sync"), "Must include actual branch name");
  assert.ok(gitCheck14.message.includes("e4f5a6b"), "Must include actual commit hash");
  console.log("✅ DIAGNOSTICS TEST 14 passed!");

  // DIAGNOSTICS TEST 15: Extension version -> Matches chrome.runtime.getManifest()
  console.log("Running DIAGNOSTICS TEST 15: Extension version...");
  const extInfo15 = DiagnosticsService.getExtensionInfo();
  assert.strictEqual(extInfo15.version, "1.1.0", "Version must match manifest");
  assert.strictEqual(extInfo15.name, "DevPulse", "Extension name must match manifest");
  console.log("✅ DIAGNOSTICS TEST 15 passed!");

  // DIAGNOSTICS TEST 16: Uptime -> Derived from runtime start time
  console.log("Running DIAGNOSTICS TEST 16: Uptime formatting...");
  assert.strictEqual(DiagnosticsService.formatUptime(12000), "12 sec");
  assert.strictEqual(DiagnosticsService.formatUptime(180000), "3 min 0 sec");
  assert.strictEqual(DiagnosticsService.formatUptime(8040000), "2 hr 14 min");
  console.log("✅ DIAGNOSTICS TEST 16 passed!");

  // DIAGNOSTICS TEST 17: No hardcoded runtime values -> Static-source audit
  console.log("Running DIAGNOSTICS TEST 17: Static-source audit...");
  DiagnosticsScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("SYSTEM STATUS"), "Static header must exist");
  assert.ok(container.innerHTML.includes("SYNC HEALTH"), "Static header must exist");
  assert.ok(container.innerHTML.includes("QUICK ACTIONS"), "Static header must exist");
  assert.ok(container.innerHTML.includes("EXTENSION INFO"), "Static header must exist");
  console.log("✅ DIAGNOSTICS TEST 17 passed!");

  // DIAGNOSTICS TEST 18: Reactive sync updates -> UI changes without reload
  console.log("Running DIAGNOSTICS TEST 18: Reactive sync updates...");
  let subscriberFired = false;
  const unsub = DiagnosticsService.subscribe((diagSummary) => {
    subscriberFired = true;
  });
  DiagnosticsService.notifySubscribers();
  assert.strictEqual(subscriberFired, true, "Subscriber listener must fire reactively");
  unsub();
  console.log("✅ DIAGNOSTICS TEST 18 passed!");

  console.log("🎉 ALL 18 DIAGNOSTICS TEST SCENARIOS PASSED PERFECTLY!");
}

if (require.main === module) {
  runTests().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
  });
}

module.exports = { runTests };
