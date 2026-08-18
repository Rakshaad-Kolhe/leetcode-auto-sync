/**
 * TimelineComponent
 * Compact vertical activity timeline displaying recent accepted problems, Git commits, and sync logs.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class TimelineComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      const rawGraphQL = viewModel.rawGraphQL || {};
      const recentAc = rawGraphQL.recentAcSubmissionList || [];

      let timelineHTML = "";
      if (recentAc.length > 0) {
        recentAc.slice(0, 5).forEach((ac) => {
          const title = ac.title || "Accepted Solution";
          const timestamp = ac.timestamp ? new Date(ac.timestamp * 1000).toLocaleDateString() : "Recently";
          timelineHTML += `
            <div class="timeline-item">
              <div class="timeline-dot green"></div>
              <div class="timeline-content">
                <span class="timeline-title">${title}</span>
                <span class="timeline-meta">Solved & Synced to GitHub • ${timestamp}</span>
              </div>
            </div>
          `;
        });
      } else {
        timelineHTML = `
          <div class="timeline-item">
            <div class="timeline-dot orange"></div>
            <div class="timeline-content">
              <span class="timeline-title">Repository Engine Ready</span>
              <span class="timeline-meta">Automatic Git sync operational</span>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot gray"></div>
            <div class="timeline-content">
              <span class="timeline-title">No recent repository activity</span>
              <span class="timeline-meta">Solve a problem on LeetCode to trigger auto-sync</span>
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="timeline-card">
          <div class="timeline-header">
            <span class="card-title">Repository Activity Timeline</span>
            <span class="card-tag">Live</span>
          </div>
          <div class="timeline-list">
            ${timelineHTML}
          </div>
        </div>
      `;
    }
  }

  LeetCodeAutoSync.TimelineComponent = TimelineComponent;
})(typeof self !== "undefined" ? self : this);
