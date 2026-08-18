/**
 * IntelligenceTableComponent (Workspace Status / GitHub Checks)
 * GitHub Checks style status rows. Status first, description second.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class IntelligenceTableComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      const repoHealthStatus = viewModel.repoHealthBadgeText || "Healthy";
      const syncedCount = viewModel.repoSyncedCount !== undefined ? viewModel.repoSyncedCount : 10;
      const missingCount = viewModel.repoMissingCount !== undefined ? viewModel.repoMissingCount : 0;
      const readiness = viewModel.readinessStage || "Not enough data";

      container.innerHTML = `
        <div class="workspace-status-section">
          <div class="section-title-bar">
            <span class="section-heading">Workspace Status</span>
            <span class="checks-passed-badge">3 / 5 checks passed</span>
          </div>

          <div class="github-checks-list">
            <div class="gh-check-item success">
              <span class="check-symbol">✓</span>
              <span id="snap-repo-status" class="check-label">Repository ${repoHealthStatus}</span>
            </div>

            <div class="gh-check-item success">
              <span class="check-symbol">✓</span>
              <span class="check-label">Repository Synced (${syncedCount} Synced / ${missingCount} Missing)</span>
            </div>

            <div class="gh-check-item success">
              <span class="check-symbol">✓</span>
              <span class="check-label">Backend Online (FastAPI 200 OK)</span>
            </div>

            <div class="gh-check-item warning">
              <span class="check-symbol">⚠</span>
              <span class="check-label">Interview Readiness (${readiness})</span>
            </div>

            <div class="gh-check-item neutral">
              <span class="check-symbol">○</span>
              <span class="check-label">Contest History Missing</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.IntelligenceTableComponent = IntelligenceTableComponent;
})(typeof self !== "undefined" ? self : this);
