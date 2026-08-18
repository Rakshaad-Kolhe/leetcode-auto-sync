/**
 * RepositoryComponent
 * Repository status overview, branch info, synced problem counts, and action triggers.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class RepositoryComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      const store = LeetCodeAutoSync.DeveloperDataStore || {};
      const repo = store.repository || {};
      const profile = store.profile || {};

      const repoName = repo.repoName || (repo.repoPath ? repo.repoPath.split(/[/\\]/).pop() : "Leetcode-solutions");
      let owner = repo.owner || repo.githubUsername;
      if (!owner && profile.username) {
        owner = profile.username.replace(/_/g, "-");
      }
      owner = String(owner || "User").replace(/_/g, "-").trim();

      let repoUrl = repo.repoUrl;
      if (repoUrl) {
        repoUrl = repoUrl.replace(/github\.com\/([a-zA-Z0-9]+)_([a-zA-Z0-9_-]+)/i, "github.com/$1-$2");
      } else {
        repoUrl = `https://github.com/${owner}/${repoName}`;
      }
      const displayName = `${owner} / ${repoName}`;
      const branch = repo.branch || "main";

      const healthBadge = viewModel.repoHealthBadgeText || "Healthy";
      const synced = viewModel.repoSyncedCount || repo.syncedCount || (Array.isArray(repo.syncedProblems) ? repo.syncedProblems.length : 0);
      const missing = viewModel.repoMissingCount || repo.missingCount || 0;
      const readme = viewModel.repoReadmeText || (repo.hasReadme ? "OK" : "Missing");

      container.innerHTML = `
        <div class="repo-panel-card">
          <div class="repo-header-row">
            <div class="repo-meta-title">
              <span class="repo-icon">📂</span>
              <span class="repo-name">${displayName}</span>
              <span class="branch-pill">${branch}</span>
            </div>
            <span id="repo-health-badge" class="badge badge-easy">${healthBadge}</span>
          </div>

          <div class="repo-metrics-row">
            <div class="repo-metric-item">
              <span id="repo-synced-val" class="repo-metric-val">${synced}</span>
              <span class="repo-metric-lbl">Synced Problems</span>
            </div>
            <div class="repo-metric-item">
              <span id="repo-missing-val" class="repo-metric-val">${missing}</span>
              <span class="repo-metric-lbl">Missing Problems</span>
            </div>
            <div class="repo-metric-item">
              <span id="repo-readme-val" class="repo-metric-val">${readme}</span>
              <span class="repo-metric-lbl">README Status</span>
            </div>
          </div>

          <div class="repo-btn-row">
            <button id="quick-sync-btn" class="btn btn-primary">⚡ Quick Sync</button>
            <button id="run-repo-audit-btn" class="btn btn-secondary">1-Click Audit</button>
            <button id="open-github-btn" class="btn btn-secondary" onclick="window.open('${repoUrl}', '_blank')">↗ GitHub</button>
          </div>

          <div id="repo-audit-summary-box" class="audit-mini-box hidden"></div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.RepositoryComponent = RepositoryComponent;
})(typeof self !== "undefined" ? self : this);
