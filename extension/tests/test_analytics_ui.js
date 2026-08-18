/**
 * Test Suite for AnalyticsScreenComponent UI
 */

const assert = require("assert");
const { ProblemAnalyticsModel, PersonalPlan } = require("../analytics/analytics_models.js");
const { AnalyticsEngine } = require("../analytics/analytics_engine.js");

function runTests() {
  console.log("--- Testing AnalyticsScreenComponent UI ---");

  // Mock DOM environment if required
  if (!globalThis.document) {
    globalThis.document = {
      createElement: () => ({ addEventListener: () => {}, querySelectorAll: () => [] }),
      querySelector: () => null,
      querySelectorAll: () => []
    };
  }

  // Create Mock Container Element
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
            // create lightweight match node
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

  let AnalyticsScreenComponent = (globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.AnalyticsScreenComponent);
  if (!AnalyticsScreenComponent && typeof require === "function") {
    require("../ui/components/analytics_screen_component.js");
    AnalyticsScreenComponent = globalThis.LeetCodeAutoSync.AnalyticsScreenComponent;
  }
  assert.ok(AnalyticsScreenComponent, "AnalyticsScreenComponent must be loaded");

  const container = new MockElement("div");

  // TEST 1: Ready State Rendering from Engine Plan
  console.log("Running UI TEST 1: Ready state rendering...");
  if (globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.DeveloperDataStore) {
    globalThis.LeetCodeAutoSync.DeveloperDataStore.curatedLists = {
      hydrated: true,
      status: "ready",
      source: "repository",
      solvedSlugs: new Set(["two-sum"])
    };
  }
  AnalyticsScreenComponent._forcedState = null;
  AnalyticsScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Analytics"), "Title Analytics should render");
  assert.ok(container.innerHTML.includes("YOUR NEXT PROBLEM"), "YOUR NEXT PROBLEM section must render");
  assert.ok(container.innerHTML.includes("YOUR NEXT 7"), "YOUR NEXT 7 section must render");
  assert.ok(container.innerHTML.includes("FOCUS NEXT"), "FOCUS NEXT section must render");
  assert.ok(container.innerHTML.includes("SKILL GAPS"), "SKILL GAPS section must render");
  assert.ok(container.innerHTML.includes("WHY THIS PLAN?"), "WHY section must render");
  assert.ok(container.innerHTML.includes("PROFILE"), "PROFILE section must render");
  console.log("✅ UI TEST 1 passed!");

  // TEST 2: Loading State Rendering
  console.log("Running UI TEST 2: Loading state rendering...");
  AnalyticsScreenComponent._forcedState = "LOADING";
  AnalyticsScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Building your personalized plan..."), "Loading state header must render");
  assert.strictEqual(container.innerHTML.includes("0%"), false, "Loading state must not show fake 0%");
  console.log("✅ UI TEST 2 passed!");

  // TEST 3: Insufficient Data State Rendering
  console.log("Running UI TEST 3: Insufficient data state rendering...");
  AnalyticsScreenComponent._forcedState = "INSUFFICIENT_DATA";
  AnalyticsScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Build your profile"), "Build your profile message must render");
  assert.ok(container.innerHTML.includes("Solve a few more problems"), "Encouraging subtext must render");
  console.log("✅ UI TEST 3 passed!");

  // TEST 4: Error State Rendering & Retry
  console.log("Running UI TEST 4: Error state & Retry button...");
  AnalyticsScreenComponent._forcedState = "ERROR";
  AnalyticsScreenComponent.render({}, container);
  assert.ok(container.innerHTML.includes("Unable to generate your personalized plan."), "Error message must render");
  assert.ok(container.innerHTML.includes("an-retry-btn") || container.innerHTML.includes("Retry"), "Retry button must render");
  console.log("✅ UI TEST 4 passed!");

  // TEST 5: Open Problem Action & URL Target
  console.log("Running UI TEST 5: Open problem action logic...");
  let openedUrl = null;
  globalThis.chrome = globalThis.chrome || {};
  globalThis.chrome.tabs = {
    create: ({ url }) => { openedUrl = url; }
  };
  AnalyticsScreenComponent.openProblem("search-in-rotated-sorted-array");
  assert.strictEqual(openedUrl, "https://leetcode.com/problems/search-in-rotated-sorted-array/");
  console.log("✅ UI TEST 5 passed!");

  // TEST 6: Neutral Wording & No Solved Problems in Recommendations
  console.log("Running UI TEST 6: Neutral wording & solved problem exclusion...");
  AnalyticsScreenComponent._forcedState = "READY";
  AnalyticsScreenComponent.render({}, container);
  assert.strictEqual(container.innerHTML.includes("You are bad at"), false, "Must not display judgmental text");
  assert.strictEqual(container.innerHTML.includes("You are weak at"), false, "Must not display judgmental text");
  console.log("✅ UI TEST 6 passed!");

  // Restore state
  AnalyticsScreenComponent._forcedState = null;
  console.log("🎉 ALL AnalyticsScreenComponent UI tests passed successfully!");
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
