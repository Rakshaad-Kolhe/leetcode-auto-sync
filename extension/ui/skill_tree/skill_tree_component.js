/**
 * SkillTreeComponent
 * Renders the Interactive Expandable Skill Tree.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class SkillTreeComponent {
    /**
     * Render the Skill Tree inside container.
     * @param {HTMLElement} container
     * @param {SkillNode} rootNode
     */
    render(container, rootNode) {
      if (!container || !rootNode) return;
      container.innerHTML = "";

      const treeContainer = document.createElement("div");
      treeContainer.className = "skill-tree-wrapper";

      const renderNode = (node, depth = 0) => {
        const nodeEl = document.createElement("div");
        nodeEl.className = `skill-tree-node depth-${depth}`;

        const isMastered = node.status === "Mastered";
        const isLearning = node.status === "Learning";

        const badgeClass = isMastered ? "badge-easy" : isLearning ? "badge-medium" : "badge-unknown";

        nodeEl.innerHTML = `
          <div class="skill-node-header">
            <button class="toggle-node-btn">${node.children && node.children.length > 0 ? "▼" : "•"}</button>
            <span class="skill-node-name">${node.name}</span>
            <span class="badge ${badgeClass} skill-status-badge">${node.status}</span>
            <span class="skill-node-pct">${node.progress}%</span>
          </div>
          <div class="skill-node-body">
            <div class="category-progress-bg">
              <div class="category-progress-fill" style="width: ${node.progress}%"></div>
            </div>
            <div class="skill-node-meta">
              <span>Solved: ${node.solvedCount}/${node.requiredCount}</span>
              ${node.recommendedProblem ? `<span class="skill-rec-prob">Next: ${node.recommendedProblem}</span>` : ""}
            </div>
          </div>
        `;

        if (node.children && node.children.length > 0) {
          const childrenContainer = document.createElement("div");
          childrenContainer.className = "skill-node-children";
          node.children.forEach((child) => {
            childrenContainer.appendChild(renderNode(child, depth + 1));
          });

          const toggleBtn = nodeEl.querySelector(".toggle-node-btn");
          toggleBtn.addEventListener("click", () => {
            const isHidden = childrenContainer.style.display === "none";
            childrenContainer.style.display = isHidden ? "block" : "none";
            toggleBtn.textContent = isHidden ? "▼" : "▶";
          });

          nodeEl.appendChild(childrenContainer);
        }

        return nodeEl;
      };

      treeContainer.appendChild(renderNode(rootNode));
      container.appendChild(treeContainer);
    }
  }

  LeetCodeAutoSync.SkillTreeComponent = new SkillTreeComponent();

})(typeof self !== "undefined" ? self : this);
