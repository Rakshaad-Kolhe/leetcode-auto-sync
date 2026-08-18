/**
 * KnowledgeGraphComponent
 * Renders the Interactive Problem Knowledge Graph modal and network visualizer.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class KnowledgeGraphComponent {
    /**
     * Render inline Knowledge Graph network container.
     */
    render(container, graphData = {}) {
      if (!container) return;

      const nodes = [
        { id: "p1", label: "Two Sum", type: "Problem" },
        { id: "p2", label: "3Sum", type: "Problem" },
        { id: "pat1", label: "Hash Table Lookup", type: "Pattern" },
        { id: "pat2", label: "Two Pointers", type: "Pattern" },
        { id: "alg1", label: "Array Search", type: "Algorithm" },
        { id: "ds1", label: "Hash Table", type: "Data Structure" },
        { id: "comp1", label: "Google ★★★★★", type: "Company" },
        { id: "comp2", label: "Meta ★★★★☆", type: "Company" }
      ];

      container.innerHTML = `
        <div class="knowledge-graph-wrapper">
          <div class="kg-header">
            <span class="kg-title">Interactive Relationship Network</span>
            <span class="kg-subtitle">Click any node to explore dependencies</span>
          </div>
          <div class="kg-nodes-grid">
            ${nodes.map((n) => `
              <div class="kg-node-pill type-${n.type.toLowerCase().replace(/\s+/g, '-')}" data-node-id="${n.id}">
                <span class="kg-node-type">${n.type}</span>
                <span class="kg-node-label">${n.label}</span>
              </div>
            `).join("")}
          </div>
          <div class="kg-detail-box">
            <span class="kg-detail-title">Selected Node: Two Sum</span>
            <span class="kg-detail-text">Connected to Hash Table (Data Structure), Hash Table Lookup (Pattern), and Meta (Target Company).</span>
          </div>
        </div>
      `;

      const pills = container.querySelectorAll(".kg-node-pill");
      const detailTitle = container.querySelector(".kg-detail-title");
      const detailText = container.querySelector(".kg-detail-text");

      pills.forEach((pill) => {
        pill.addEventListener("click", () => {
          pills.forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
          const label = pill.querySelector(".kg-node-label").textContent;
          const type = pill.querySelector(".kg-node-type").textContent;
          detailTitle.textContent = `Selected Node: ${label} (${type})`;
          detailText.textContent = `Connected to related algorithms, target company requirements, and revision candidates for ${label}.`;
        });
      });
    }

    /**
     * Open Interactive Full Knowledge Graph Modal for a specific problem.
     */
    openModal(report = {}) {
      const existingModal = document.getElementById("kg-modal-overlay");
      if (existingModal) existingModal.remove();

      const l1 = report.layer1 || {};
      const l2 = report.layer2 || {};
      const l3 = report.layer3 || [];
      const l6 = report.layer6 || {};
      const l7 = report.layer7 || {};

      const title = l1.title || "LeetCode Problem";
      const topics = l1.topics || [];
      const companies = l2.companies || [];
      const lists = l3.map((item) => item.name);
      const metrics = report.metrics || {};
      const rec = report.personalRecommendation || {};

      const modalHtml = `
        <div id="kg-modal-overlay" class="kg-modal-overlay">
          <div class="kg-modal-content">
            <div class="kg-modal-header">
              <div class="kg-modal-title-group">
                <span class="kg-modal-badge">🕸️ Problem Knowledge Graph</span>
                <h3 class="kg-modal-title">${title}</h3>
              </div>
              <button id="kg-modal-close" class="kg-modal-close" aria-label="Close modal">&times;</button>
            </div>

            <div class="kg-modal-body">
              <div class="kg-visualizer">
                <div class="kg-central-node">
                  <span class="node-icon">🎯</span>
                  <span class="node-title">${title}</span>
                  <span class="node-tag">${l1.difficulty || 'Medium'} • ${l1.acceptanceRate || '—'}</span>
                </div>

                <div class="kg-branches">
                  <div class="kg-branch-group">
                    <span class="branch-label">💡 Required Concepts</span>
                    <div class="branch-nodes">
                      ${topics.map(t => `<span class="kg-node concept">${t}</span>`).join('')}
                    </div>
                  </div>

                  <div class="kg-branch-group">
                    <span class="branch-label">🏢 Target Tech Companies</span>
                    <div class="branch-nodes">
                      ${companies.map(c => `<span class="kg-node company">${c.name} <span class="stars">${c.stars}</span></span>`).join('')}
                    </div>
                  </div>

                  <div class="kg-branch-group">
                    <span class="branch-label">📋 Curated Interview Track</span>
                    <div class="branch-nodes">
                      ${lists.map(l => `<span class="kg-node track">✓ ${l}</span>`).join('')}
                    </div>
                  </div>

                  <div class="kg-branch-group">
                    <span class="branch-label">🚀 Recommended Learning Path</span>
                    <div class="branch-nodes">
                      <span class="kg-node path">Prerequisite: ${metrics.prerequisite || 'Two Sum (#1)'}</span>
                      <span class="kg-node path highlight">Current: ${title}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="kg-insight-footer">
                <div class="kg-footer-item">
                  <span class="footer-label">Personal Status</span>
                  <span class="footer-val">${rec.title || 'In Progress'}</span>
                </div>
                <div class="kg-footer-item">
                  <span class="footer-label">Estimated Solve Time</span>
                  <span class="footer-val">${metrics.estSolveTime || '20 min'}</span>
                </div>
                <div class="kg-footer-item">
                  <span class="footer-label">AI Confidence Score</span>
                  <span class="footer-val green">${l4.confidencePct || '94'}% Match</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      const modalOverlay = document.getElementById("kg-modal-overlay");
      const closeBtn = document.getElementById("kg-modal-close");

      const closeModal = () => {
        if (modalOverlay) modalOverlay.remove();
      };

      if (closeBtn) closeBtn.addEventListener("click", closeModal);
      if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
          if (e.target === modalOverlay) closeModal();
        });
      }
    }
  }

  LeetCodeAutoSync.KnowledgeGraphComponent = new KnowledgeGraphComponent();

})(typeof self !== "undefined" ? self : this);
