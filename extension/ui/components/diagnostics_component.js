/**
 * DiagnosticsComponent
 * Comprehensive system health monitoring, API rate limit status, and debug telemetry launcher.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class DiagnosticsComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      const { DiagnosticsService, DiagnosticsScreenComponent, DeveloperDataStore } = LeetCodeAutoSync;
      if (DiagnosticsScreenComponent) {
        DiagnosticsScreenComponent.render(viewModel, container);
        return;
      }

      const summary = DiagnosticsService ? DiagnosticsService.getDiagnosticsSummary() : null;
      const backendCheck = summary && summary.checks ? summary.checks.backend : null;
      const backendStatusText = backendCheck ? (backendCheck.status === "healthy" ? `Online (${backendCheck.latencyMs ? `${backendCheck.latencyMs} ms` : "200 OK"})` : "Offline") : "Checking...";
      const backendBadgeClass = backendCheck && backendCheck.status === "healthy" ? "badge-easy" : "badge-hard";

      const leetCheck = summary && summary.checks ? summary.checks.leetcode : null;
      const authStatus = (leetCheck && leetCheck.message) || viewModel.authStatusBadgeText || (DeveloperDataStore && DeveloperDataStore.profile && DeveloperDataStore.profile.username ? `Signed in as @${DeveloperDataStore.profile.username}` : "Not signed in");

      const snapshotsCount = viewModel.snapshotCountText || `${(DeveloperDataStore && DeveloperDataStore.submissions && DeveloperDataStore.submissions.length) || 0} Submissions`;

      container.innerHTML = `
        <div class="diagnostics-card">
          <div class="diag-header">
            <span class="card-title">System Diagnostics & API Status</span>
            <span class="card-tag ${summary && summary.overallStatus === "healthy" ? "badge-easy" : "badge-medium"}">${summary ? summary.overallStatus.toUpperCase() : "OPERATIONAL"}</span>
          </div>

          <div class="diag-list">
            <div class="diag-row">
              <span class="diag-label">FastAPI Backend Server</span>
              <span id="setting-backend-conn" class="badge ${backendBadgeClass}">${backendStatusText}</span>
            </div>

            <div class="diag-row">
              <span class="diag-label">LeetCode Session</span>
              <span id="setting-auth-status" class="badge badge-easy">${authStatus}</span>
            </div>

            <div class="diag-row">
              <span class="diag-label">DataStore Snapshot Engine</span>
              <span id="setting-snapshots-count" class="slug-pill">${snapshotsCount}</span>
            </div>
          </div>

          <div class="diag-actions-col">
            <button id="open-diagnostics-tab-btn" class="btn btn-secondary full-width">Open Full Workspace Diagnostics Page →</button>
          </div>
        </div>
      `;

      const openBtn = container.querySelector("#open-diagnostics-tab-btn");
      if (openBtn) {
        openBtn.addEventListener("click", () => {
          if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html#diagnostics") });
          } else {
            window.open("../dashboard/dashboard.html#diagnostics", "_blank");
          }
        });
      }
    }
  }

  LeetCodeAutoSync.DiagnosticsComponent = DiagnosticsComponent;
})(typeof self !== "undefined" ? self : this);
