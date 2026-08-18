/**
 * AIInsightsComponent (Daily Brief)
 * Cursor AI / Warp terminal-style daily brief panel. Height capped under 110px.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class AIInsightsComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      container.innerHTML = `
        <div class="cursor-brief-panel">
          <div class="brief-hdr">
            <span class="brief-prompt-symbol">></span>
            <span class="brief-hdr-title">TODAY'S BRIEF</span>
          </div>

          <div class="brief-body-content">
            <div class="brief-row">
              <span class="symbol-green">✓</span> <span>Streak maintained</span>
              <span class="sep">•</span>
              <span class="symbol-green">✓</span> <span>Repository synchronized</span>
              <span class="sep">•</span>
              <span class="symbol-green">↑</span> <span>Acceptance +1.2%</span>
            </div>

            <div class="brief-row sub">
              <span class="symbol-yellow">↓</span> <span>Weakest: <strong class="text-accent">Graphs</strong></span>
              <span class="sep">•</span>
              <span>Target: <strong>Solve 2 Graph Mediums</strong></span>
              <span class="sep">•</span>
              <span class="text-muted">ETA 18m</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.AIInsightsComponent = AIInsightsComponent;
})(typeof self !== "undefined" ? self : this);
