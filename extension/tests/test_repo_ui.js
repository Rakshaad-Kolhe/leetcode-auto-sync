/**
 * Test Suite for RepoScreenComponent UI and Reactive Sync Pipeline
 */

const assert = require("assert");

function runTests() {
  console.log("--- Testing RepoScreenComponent UI & Sync Pipeline ---");

  // Mock DOM environment if required
  if (!globalThis.document) {
    globalThis.document = {
      createElement: () => ({ addEventListener: () => {}, querySelectorAll: () => [] }),
      querySelector: () => null,
      querySelectorAll: () => []
    };
  }

  // Create Mock Element Helper
  class MockElement {
    constructor(tagName = "div") {
      this.tagName = tagName;
      this.innerHTML = "";
      this.children = [];
      this.eventListeners = {};
      this.attributes = {};
    }

    setAttribute(key, val) { this.attributes[key] = val; }
    getAttribute(key) { return this.attributes[key] || null; }

    addEventListener(event, fn) {
      if (!this.eventListeners[event]) this.eventListeners[event] = [];
      this.eventListeners[event].push(fn);
    }

    dispatchEvent(event) {
      if (this.eventListeners[event]) {
        this.eventListeners[event].forEach(fn => fn({ target: this, preventDefault: () => {} }));
      }
    }

    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    }

    querySelectorAll(selector) {
      const results = [];
      const search = (node) => {
        if (!node || !node.innerHTML) return;
        
        if (selector.startsWith("#")) {
          const id = selector.slice(1);
          if (node.attributes && node.attributes.id === id) results.push(node);
          if (node.innerHTML.includes(`id="${id}"`)) {
            const match = new MockElement("div");
            match.setAttribute("id", id);
            results.push(match);
          }
        } else if (selector.startsWith(".")) {
          const cls = selector.slice(1);
          if (node.innerHTML.includes(`class="${cls}`) || node.innerHTML.includes(`class="` + cls)) {
            const match = new MockElement("div");
            match.setAttribute("class", cls);
            results.push(match);
          }
        }
      };
      search(this);
      return results;
    }
  }

  let RepoScreenComponent = (globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.RepoScreenComponent);
  if (!RepoScreenComponent && typeof require === "function") {
    require("../ui/components/repo_screen_component.js");
    RepoScreenComponent = globalThis.LeetCodeAutoSync.RepoScreenComponent;
  }
  assert.ok(RepoScreenComponent, "RepoScreenComponent must be loaded");

  const container = new MockElement("div");

  // TEST 1: Connected State Rendering
  console.log("Running REPO TEST 1: Connected state rendering...");
  RepoScreenComponent._forcedState = "CONNECTED";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Repo"), "Title Repo should render");
  assert.ok(container.innerHTML.includes("REPOSITORY"), "REPOSITORY section must render");
  assert.ok(container.innerHTML.includes("SYNC STATUS"), "SYNC STATUS section must render");
  assert.ok(container.innerHTML.includes("RECENTLY SYNCED"), "RECENTLY SYNCED section must render");
  assert.ok(container.innerHTML.includes("REPOSITORY SUMMARY"), "SUMMARY section must render");
  console.log("✅ REPO TEST 1 passed!");

  // TEST 2: Unavailable State
  console.log("Running REPO TEST 2: Unavailable state...");
  RepoScreenComponent._forcedState = "UNAVAILABLE";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Unavailable"), "Unavailable badge must render");
  console.log("✅ REPO TEST 2 passed!");

  // TEST 3: Syncing State
  console.log("Running REPO TEST 3: Syncing state step list...");
  RepoScreenComponent._forcedState = "SYNCING";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Syncing..."), "Syncing title must render");
  assert.ok(container.innerHTML.includes("Repository validation"), "Validation step must render");
  console.log("✅ REPO TEST 3 passed!");

  // TEST 4: Successful Sync State
  console.log("Running REPO TEST 4: Successful sync state...");
  globalThis.LeetCodeAutoSync.DeveloperDataStore = globalThis.LeetCodeAutoSync.DeveloperDataStore || {};
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository = { configured: true, repoPath: "Leetcode-solutions" };
  RepoScreenComponent._forcedState = null;
  RepoScreenComponent._lastSyncCompleted = true;
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Sync complete"), "Sync complete message must render");
  console.log("✅ REPO TEST 4 passed!");

  // TEST 5: Sync Error State & Diagnostics Action
  console.log("Running REPO TEST 5: Sync error state & diagnostics navigation...");
  RepoScreenComponent._forcedState = "ERROR";
  RepoScreenComponent._lastSyncCompleted = false;
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Sync failed"), "Sync failed title must render");
  assert.ok(container.innerHTML.includes("View Diagnostics"), "View Diagnostics button must render");
  console.log("✅ REPO TEST 5 passed!");

  // TEST 6: Empty Synced Problems (No fake hardcoded problems!)
  console.log("Running REPO TEST 6: Empty synced problems state...");
  globalThis.LeetCodeAutoSync.DeveloperDataStore = globalThis.LeetCodeAutoSync.DeveloperDataStore || {};
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository = {
    configured: true,
    repoPath: "Leetcode-solutions",
    repoUrl: "https://github.com/Rakshaad-Kolhe/Leetcode-solutions",
    syncedProblems: []
  };
  globalThis.LeetCodeAutoSync.DeveloperDataStore.stats = { totalSolved: 0 };
  RepoScreenComponent._forcedState = "CONNECTED";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("No solutions synced yet"), "Empty state must render when no synced problems");
  assert.ok(!container.innerHTML.includes("Stone Game III"), "Fake hardcoded problem Stone Game III must NOT render");
  assert.ok(!container.innerHTML.includes("Smallest Divisible Digit Product I"), "Fake hardcoded problem Smallest Divisible Digit Product I must NOT render");
  console.log("✅ REPO TEST 6 passed!");

  // TEST 6B: Real Synced Problems List
  console.log("Running REPO TEST 6B: Real synced problems rendering...");
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository.syncedProblems = [
    { frontendId: "1", title: "Two Sum", difficulty: "Easy", relativeTime: "Just now", titleSlug: "two-sum" },
    { frontendId: "11", title: "Container With Most Water", difficulty: "Medium", relativeTime: "Today", titleSlug: "container-with-most-water" }
  ];
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository.syncedCount = 2;
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Two Sum"), "Real problem Two Sum must render");
  assert.ok(container.innerHTML.includes("Container With Most Water"), "Real problem Container With Most Water must render");
  console.log("✅ REPO TEST 6B passed!");

  // TEST 7: Open Repository Action URL Target
  console.log("Running REPO TEST 7: Open Repository URL action...");
  let openedUrl = null;
  globalThis.chrome = globalThis.chrome || {};
  globalThis.chrome.tabs = {
    create: ({ url }) => { openedUrl = url; }
  };
  RepoScreenComponent.openUrl("https://github.com/Rakshaad-Kolhe/Leetcode-solutions");
  assert.strictEqual(openedUrl, "https://github.com/Rakshaad-Kolhe/Leetcode-solutions");
  console.log("✅ REPO TEST 7 passed!");

  // TEST 8: Not Configured Empty State
  console.log("Running REPO TEST 8: Not configured empty state...");
  RepoScreenComponent._forcedState = "NOT_CONFIGURED";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("REPOSITORY NOT CONFIGURED"), "Not configured title must render");
  assert.ok(container.innerHTML.includes("Configure Repository"), "Configure Repository button must render");
  console.log("✅ REPO TEST 8 passed!");

  // TEST 9: Partial Sync & Missing Count Invariants
  console.log("Running REPO TEST 9: Partial sync & missing count calculations...");
  globalThis.LeetCodeAutoSync.DeveloperDataStore.stats = { totalSolved: 50 };
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository = {
    configured: true,
    repoPath: "Leetcode-solutions",
    repoUrl: "https://github.com/Rakshaad-Kolhe/Leetcode-solutions",
    syncedCount: 15,
    syncedProblems: [
      { frontendId: "1", title: "Two Sum", difficulty: "Easy", titleSlug: "two-sum" }
    ]
  };
  RepoScreenComponent._forcedState = "CONNECTED";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("15 of 50 solutions synced"), "Summary must display accurate 15 of 50 synced");
  assert.ok(container.innerHTML.includes("35 solution(s) on LeetCode not yet synced"), "Summary must show 35 unsynced/missing problems");
  assert.ok(container.innerHTML.includes("Partial sync (15/50)"), "Sync status must indicate partial sync");
  assert.ok(!container.innerHTML.includes("All solutions synced ✓"), "Must NOT claim all solutions synced when 35 are missing");
  console.log("✅ REPO TEST 9 passed!");

  // TEST 10: Dynamic Solutions Repo URL & Owner Resolution
  console.log("Running REPO TEST 10: Dynamic Solutions Repo URL & Owner Resolution...");
  globalThis.LeetCodeAutoSync.DeveloperDataStore.profile = { username: "leetcode_user_123" };
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository = {
    configured: true,
    owner: "Rakshaad-Kolhe",
    repoName: "Leetcode-solutions",
    repoUrl: "https://github.com/Rakshaad-Kolhe/Leetcode-solutions",
    syncedCount: 15,
    lastCommitHash: "c3d4e5f",
    lastSyncedText: "Just now"
  };
  RepoScreenComponent._forcedState = "CONNECTED";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("github.com/Rakshaad-Kolhe/Leetcode-solutions"), "Must render actual GitHub repo URL");
  assert.ok(!container.innerHTML.includes("github.com/leetcode_user_123/Leetcode-solutions"), "Must NOT use wrong leetcode username in repo URL");
  assert.ok(container.innerHTML.includes("c3d4e5f"), "Must render real last commit hash");
  assert.ok(container.innerHTML.includes("Just now"), "Must render real last synced text");
  console.log("✅ REPO TEST 10 passed!");

  // TEST 11: LeetCode Username with Underscore Sanitization (e.g. Rakshaad_Kolhe -> Rakshaad-Kolhe)
  console.log("Running REPO TEST 11: Underscore to Hyphen GitHub Username Sanitization...");
  globalThis.LeetCodeAutoSync.DeveloperDataStore.profile = { username: "Rakshaad_Kolhe" };
  globalThis.LeetCodeAutoSync.DeveloperDataStore.repository = {
    configured: true,
    owner: null,
    githubUsername: null,
    repoName: "Leetcode-solutions",
    repoUrl: null,
    syncedCount: 5
  };
  RepoScreenComponent._forcedState = "CONNECTED";
  RepoScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("github.com/Rakshaad-Kolhe/Leetcode-solutions"), "Must sanitize Rakshaad_Kolhe to Rakshaad-Kolhe in GitHub repo URL");
  assert.ok(!container.innerHTML.includes("Rakshaad_Kolhe/Leetcode-solutions"), "Must NOT contain underscore in GitHub URL");

  // Verify openUrl sanitizes raw URLs with underscores in GitHub user part
  let sanitizedOpenedUrl = null;
  globalThis.chrome.tabs = {
    create: ({ url }) => { sanitizedOpenedUrl = url; }
  };
  RepoScreenComponent.openUrl("https://github.com/Rakshaad_Kolhe/Leetcode-solutions");
  assert.strictEqual(sanitizedOpenedUrl, "https://github.com/Rakshaad-Kolhe/Leetcode-solutions", "openUrl must sanitize underscore in username to hyphen");
  console.log("✅ REPO TEST 11 passed!");

  // Restore state
  RepoScreenComponent._forcedState = null;
  RepoScreenComponent._lastSyncCompleted = false;
  console.log("🎉 ALL RepoScreenComponent UI & Sync Pipeline tests passed successfully!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
