/**
 * Developer Intelligence OS — Full Workspace Script
 * Coordinates sidebar navigation, deep AST pattern analysis, interactive tree/graph rendering,
 * and diagnostic telemetry.
 */

document.addEventListener("DOMContentLoaded", () => {
  const {
    DeveloperDataStore,
    DeveloperIntelligenceService,
    SkillTreeComponent,
    KnowledgeGraphComponent,
    TimelineComponent,
    AchievementsComponent,
    ProjectionsComponent,
    SkillTreeService,
    JourneyService,
    PatternService,
    InterviewMatrixService,
    RepositoryAuditService
  } = globalThis.LeetCodeAutoSync;

  const navItems = document.querySelectorAll(".nav-item");
  const viewContents = document.querySelectorAll(".view-content");
  const refreshBtn = document.getElementById("refresh-dashboard-btn");

  // Navigation switching
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.getAttribute("data-view");
      navItems.forEach((n) => n.classList.remove("active"));
      viewContents.forEach((v) => v.classList.remove("active"));

      btn.classList.add("active");
      const targetContent = document.getElementById(targetView);
      if (targetContent) targetContent.classList.add("active");
    });
  });

  const versionTag = document.querySelector(".version-tag");
  if (versionTag && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
    versionTag.textContent = `Version ${chrome.runtime.getManifest().version} Real Data Platform`;
  }

  // Render Full Workspace Content
  async function renderWorkspace() {
    const report = await DeveloperIntelligenceService.getOrComputeIntelligence(false);

    // 1. Skill Tree
    const skillTreeContainer = document.getElementById("dash-skill-tree-container");
    if (skillTreeContainer && SkillTreeComponent && SkillTreeService) {
      const root = SkillTreeService.buildSkillTree({});
      SkillTreeComponent.render(skillTreeContainer, root);
    }

    // 2. AST Pattern Explorer
    const patternsContainer = document.getElementById("dash-patterns-container");
    if (patternsContainer && PatternService) {
      const patternData = PatternService.analyzeDataStorePatterns();
      const detected = patternData.detectedPatterns || [];

      patternsContainer.innerHTML = detected.map((p) => `
        <div class="pattern-card">
          <span class="pattern-title">${p.name}</span>
          <span class="pattern-count">${p.count} Solutions</span>
          <span style="font-size: 11px; color: #818cf8;">Confidence: ${p.confidence}%</span>
          <ul class="pattern-prob-list">
            ${(p.problems || []).slice(0, 4).map((prob) => `<li>#${prob.id} ${prob.title}</li>`).join("")}
          </ul>
        </div>
      `).join("");
    }

    // 3. Company Matrix
    const matrixContainer = document.getElementById("dash-matrix-container");
    if (matrixContainer && InterviewMatrixService) {
      const matrix = InterviewMatrixService.computeCompanyReadiness();
      matrixContainer.innerHTML = matrix.map((c) => `
        <div class="matrix-card">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 800;">${c.name}</span>
            <span style="color: #c084fc; font-weight: 800;">${c.readinessPct}% Ready</span>
          </div>
          <span style="font-size: 11px; color: #9ca3af;">${c.description}</span>
        </div>
      `).join("");
    }

    // 4. Knowledge Graph
    const graphContainer = document.getElementById("dash-graph-container");
    if (graphContainer && KnowledgeGraphComponent) {
      KnowledgeGraphComponent.render(graphContainer, {});
    }

    // 5. Journey Timeline
    const journeyContainer = document.getElementById("dash-journey-container");
    if (journeyContainer && TimelineComponent && JourneyService) {
      const milestones = JourneyService.buildTimeline({});
      TimelineComponent.render(journeyContainer, milestones, null);
    }

    // 6. Achievements
    const badgesContainer = document.getElementById("dash-badges-container");
    if (badgesContainer && AchievementsComponent) {
      AchievementsComponent.render(badgesContainer, report.achievements || []);
    }

    // 7. Audit
    const auditContainer = document.getElementById("dash-audit-container");
    if (auditContainer && RepositoryAuditService) {
      const audit = RepositoryAuditService.performAudit();
      auditContainer.innerHTML = `
        <div class="pattern-card">
          <h3>Repository Health Status: ${audit.healthy ? "HEALTHY" : "ISSUES DETECTED"}</h3>
          <p>Detected ${audit.issueCount} file audit items.</p>
          <ul>
            ${audit.issues.map((i) => `<li>${i.title} - ${i.description}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    // 8. Diagnostics
    const diagContainer = document.getElementById("dash-diagnostics-container");
    const { DiagnosticsScreenComponent } = globalThis.LeetCodeAutoSync || {};
    if (diagContainer && DiagnosticsScreenComponent) {
      DiagnosticsScreenComponent.render({}, diagContainer);
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => renderWorkspace());
  }

  // Support direct hash navigation, e.g. dashboard.html#diagnostics
  if (window.location.hash === "#diagnostics") {
    const diagTab = document.querySelector('.nav-item[data-view="view-diagnostics"]');
    if (diagTab) diagTab.click();
  }

  renderWorkspace();
});
