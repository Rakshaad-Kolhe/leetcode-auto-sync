/**
 * TimelineComponent
 * Renders the Learning Journey Timeline with filter controls (Year/Month/Week/All).
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class TimelineComponent {
    /**
     * Render the Timeline inside container.
     * @param {HTMLElement} container
     * @param {Array} milestones
     * @param {Function} onFilterChange
     */
    render(container, milestones = [], onFilterChange = null) {
      if (!container) return;

      container.innerHTML = `
        <div class="timeline-wrapper">
          <div class="timeline-controls">
            <span class="timeline-title">Learning Journey Timeline</span>
            <div class="timeline-filters">
              <button class="filter-btn active" data-filter="all">All</button>
              <button class="filter-btn" data-filter="year">Year</button>
              <button class="filter-btn" data-filter="month">Month</button>
              <button class="filter-btn" data-filter="week">Week</button>
            </div>
          </div>

          <div class="timeline-list">
            ${milestones.map((m) => `
              <div class="timeline-item">
                <div class="timeline-marker">${m.icon || "📌"}</div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <span class="timeline-item-title">${m.title}</span>
                    <span class="timeline-item-date">${new Date(m.date).toLocaleDateString()}</span>
                  </div>
                  <p class="timeline-item-desc">${m.description}</p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      const filterBtns = container.querySelectorAll(".filter-btn");
      filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          filterBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const filter = btn.getAttribute("data-filter");
          if (typeof onFilterChange === "function") {
            onFilterChange(filter);
          }
        });
      });
    }
  }

  LeetCodeAutoSync.TimelineComponent = new TimelineComponent();

})(typeof self !== "undefined" ? self : this);
