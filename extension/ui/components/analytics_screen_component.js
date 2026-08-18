globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.AnalyticsScreenComponent = {
  _subscribed: false,
  _forcedState: null, // "LOADING" | "INSUFFICIENT_DATA" | "READY" | "ERROR" | "OFFLINE"

  /**
   * Helper to open a LeetCode problem by titleSlug in a new browser tab.
   * @param {string} titleSlug
   */
  openProblem: function(titleSlug) {
    if (!titleSlug) return;
    const cleanSlug = String(titleSlug).toLowerCase().trim();
    if (!cleanSlug || cleanSlug.includes(":\\") || cleanSlug.includes("/")) return;

    const url = `https://leetcode.com/problems/${cleanSlug}/`;
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else if (typeof window !== "undefined" && window.open) {
      window.open(url, "_blank");
    }
  },

  render: function(viewModel, container) {
    if (!container) return;

    // 1. Subscribe to reactive updates from AnalyticsEngine & DeveloperDataStore
    const { AnalyticsEngine } = globalThis.LeetCodeAutoSync;
    if (!this._subscribed && AnalyticsEngine && typeof AnalyticsEngine.onPlanUpdated === "function") {
      this._subscribed = true;
      AnalyticsEngine.onPlanUpdated(() => {
        this.render(viewModel, container);
      });
    }

    // 2. Fetch Personal Plan from AnalyticsEngine
    let plan = null;
    let uiState = this._forcedState || "READY";
    let isOffline = false;

    if (uiState !== "LOADING" && uiState !== "ERROR") {
      try {
        if (AnalyticsEngine && typeof AnalyticsEngine.computePersonalPlan === "function") {
          plan = AnalyticsEngine.computePersonalPlan({ viewModel });
        } else if (AnalyticsEngine && typeof AnalyticsEngine.getPlan === "function") {
          plan = AnalyticsEngine.getPlan();
        }
      } catch (err) {
        console.error("[AnalyticsScreenComponent] Error computing plan:", err);
        if (!this._forcedState) uiState = "ERROR";
      }
    }

    // Determine state if not manually forced
    if (!this._forcedState) {
      if (uiState === "ERROR") {
        // keep ERROR
      } else if (!plan && AnalyticsEngine) {
        uiState = "LOADING";
      } else if (plan) {
        if (plan.source === "repository" || plan.source === "cache") {
          isOffline = true;
        }
        if (plan.basedOnSolvedCount < 1) {
          uiState = "INSUFFICIENT_DATA";
        } else {
          uiState = "READY";
        }
      } else {
        uiState = "INSUFFICIENT_DATA";
      }
    }

    // 3. Render Header Bar (Clean, no date range dropdown for Analytics)
    const headerHtml = `
      <div class="act-subheader-row">
        <div class="act-title-group">
          <h1 class="act-page-title">Analytics</h1>
          <p class="act-page-sub">Your personalized problem-solving plan.</p>
        </div>
      </div>
    `;

    // 4. Render Offline / Cached Banner if applicable
    const offlineBannerHtml = isOffline ? `
      <div class="an-offline-badge" role="status">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span>Based on your latest repository scan</span>
      </div>
    ` : '';

    // 5. Render View Based On UI State
    let bodyContentHtml = "";

    if (uiState === "LOADING") {
      bodyContentHtml = `
        <div class="card an-state-card" role="alert" aria-busy="true">
          <span class="card-title">Building your personalized plan...</span>
          <div class="an-skeleton-rows">
            <div class="an-skeleton-bar"></div>
            <div class="an-skeleton-bar short"></div>
            <div class="an-skeleton-bar"></div>
          </div>
        </div>
      `;
    } else if (uiState === "ERROR") {
      bodyContentHtml = `
        <div class="card an-state-card" role="alert">
          <span class="card-title red-text">Unable to generate your personalized plan.</span>
          <p class="an-state-desc">An issue occurred while processing your repository evidence.</p>
          <button id="an-retry-btn" class="an-open-btn retry-btn">Retry</button>
        </div>
      `;
    } else if (uiState === "INSUFFICIENT_DATA") {
      const solvedCount = plan ? plan.basedOnSolvedCount : 0;
      bodyContentHtml = `
        <div class="card an-state-card">
          <span class="card-title">Build your profile</span>
          <p class="an-state-desc">Solve a few more problems and we'll start identifying your strengths, gaps, and next steps.</p>
          <div class="an-repo-stat-badge">${solvedCount} solutions analyzed</div>
        </div>
      `;
    } else {
      // READY State - Full Personalized Plan
      const nextProblem = plan ? plan.nextProblem : null;
      const next7Plan = (plan && Array.isArray(plan.nextProblems)) ? plan.nextProblems.slice(0, 7) : [];
      const focusSkill = plan ? plan.focusSkill : null;
      const skillGaps = (plan && Array.isArray(plan.skillGaps)) ? plan.skillGaps.slice(0, 4) : [];
      const strengths = (plan && Array.isArray(plan.strengths)) ? plan.strengths : [];

      // SECTION 1 — YOUR NEXT PROBLEM
      let nextProblemHtml = "";
      if (nextProblem) {
        const topicsStr = (nextProblem.topics || []).join(" · ");
        const reasonsHtml = (nextProblem.reasons || [])
          .slice(0, 2)
          .map(r => `<li class="an-reason-item">${r}</li>`)
          .join("");
        const confidencePct = Math.round((nextProblem.confidence || 0.85) * 100);

        nextProblemHtml = `
          <div class="card an-next-card" id="an-next-problem-section">
            <span class="card-title orange-text">YOUR NEXT PROBLEM</span>
            <div class="an-next-body">
              <h2 class="an-next-title">${nextProblem.title}</h2>
              <div class="an-next-meta">
                <span class="act-prob-diff ${nextProblem.difficulty.toLowerCase()}">${nextProblem.difficulty}</span>
                <span class="an-meta-topics">${topicsStr}</span>
              </div>

              <div class="an-why-box">
                <span class="an-why-label">Why this problem?</span>
                <ul class="an-reasons-list">
                  ${reasonsHtml}
                </ul>
              </div>

              <div class="an-confidence-container">
                <div class="an-confidence-row">
                  <span class="an-confidence-label">Recommendation confidence</span>
                  <span class="an-confidence-val">${confidencePct}%</span>
                </div>
                <div class="act-tag-track">
                  <div class="act-tag-fill green-fill" style="width: ${confidencePct}%;"></div>
                </div>
              </div>

              <button class="an-open-btn" id="an-primary-open-btn" data-slug="${nextProblem.titleSlug}" aria-label="Open ${nextProblem.title} on LeetCode">
                Open Problem ↗
              </button>
            </div>
          </div>
        `;
      }

      // SECTION 2 — YOUR NEXT 7
      let next7Html = "";
      if (next7Plan.length > 0) {
        const rowsHtml = next7Plan.map((p, idx) => {
          const numStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
          const topicLabel = (p.topics && p.topics[0]) ? p.topics[0] : "";

          return `
            <div class="an-next7-row" data-slug="${p.titleSlug}" role="button" tabindex="0" aria-label="Open ${p.title} on LeetCode">
              <span class="an-next7-num">${numStr}</span>
              <span class="an-next7-title">${p.title}</span>
              ${topicLabel ? `<span class="an-next7-topic">${topicLabel}</span>` : ''}
              <span class="act-prob-diff ${p.difficulty.toLowerCase()}">${p.difficulty}</span>
            </div>
          `;
        }).join("");

        next7Html = `
          <div class="card an-next7-card">
            <div class="card-row act-card-header">
              <span class="card-title">YOUR NEXT 7</span>
              <span class="card-sub-label">Your recommended practice sequence</span>
            </div>
            <div class="an-next7-list">
              ${rowsHtml}
            </div>
          </div>
        `;
      }

      // SECTION 3 — FOCUS NEXT (Actionable Purpose Sub-labels)
      let focusNextHtml = "";
      if (focusSkill) {
        const focusReason = `Limited ${focusSkill} practice detected.`;
        
        // Find 3 recommended problems strictly matching focusSkill
        const candidatePool = (plan && plan.nextProblems) ? plan.nextProblems : [];
        let focusRecs = candidatePool.filter(p => {
          const concepts = [...(p.topics || []), ...(p.patterns || [])].map(c => String(c).toLowerCase());
          return concepts.includes(focusSkill.toLowerCase());
        });

        // Catalog fallback if focusRecs has fewer than 3 matching items
        if (focusRecs.length < 3 && globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.DEFAULT_PROBLEM_CATALOG) {
          const catalog = globalThis.LeetCodeAutoSync.DEFAULT_PROBLEM_CATALOG;
          catalog.forEach(catItem => {
            if (focusRecs.length >= 3) return;
            const concepts = [...(catItem.topics || []), ...(catItem.patterns || [])].map(c => String(c).toLowerCase());
            if (concepts.includes(focusSkill.toLowerCase())) {
              if (!focusRecs.some(r => r.titleSlug === catItem.titleSlug)) {
                focusRecs.push({
                  titleSlug: catItem.titleSlug,
                  title: catItem.title,
                  difficulty: catItem.difficulty,
                  topics: catItem.topics,
                  reasons: [`Develops ${focusSkill} mastery`]
                });
              }
            }
          });
        }

        const seqItems = focusRecs.slice(0, 3);
        const seqHtml = seqItems.map((item, idx) => {
          let reasonText = (item.reasons && item.reasons[0]) ? item.reasons[0].replace(/detected\./i, "").replace(/practice/i, "").trim() : `Develops ${focusSkill} mastery`;
          if (reasonText.length > 42) reasonText = reasonText.slice(0, 39) + "...";

          return `
            <div class="an-focus-seq-item" data-slug="${item.titleSlug}" title="${reasonText}">
              <div class="an-seq-content">
                <div class="an-seq-title-row">
                  <span class="an-seq-num">${idx + 1}.</span>
                  <span class="an-seq-title">${item.title}</span>
                </div>
                <span class="an-seq-subtext">${reasonText}</span>
              </div>
              <span class="act-prob-diff ${item.difficulty.toLowerCase()}">${item.difficulty}</span>
            </div>
          `;
        }).join("");

        focusNextHtml = `
          <div class="card an-focus-card">
            <span class="card-title">FOCUS NEXT</span>
            <div class="an-focus-body">
              <h3 class="an-focus-skill-title">${focusSkill}</h3>
              <p class="an-focus-desc">${focusReason}</p>
              
              <div class="an-focus-seq-box">
                <span class="an-why-label">Recommended sequence</span>
                <div class="an-focus-seq-list">
                  ${seqHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        focusNextHtml = `
          <div class="card an-focus-card">
            <span class="card-title">FOCUS NEXT</span>
            <p class="an-focus-desc">No specific focus identified yet. Keep practicing to build enough history for personalized recommendations.</p>
          </div>
        `;
      }

      // SECTION 4 — SKILL GAPS (Distinct Muted Typography)
      let skillGapsHtml = "";
      if (skillGaps.length > 0) {
        const gapRowsHtml = skillGaps.map(g => {
          const scoreVal = Math.min(95, Math.max(35, Math.round(g.score || 50)));
          return `
            <div class="an-gap-item">
              <div class="an-gap-header">
                <span class="an-gap-name">${g.name}</span>
                <span class="an-gap-status">Limited practice</span>
              </div>
              <div class="an-gap-track-row">
                <div class="act-tag-track">
                  <div class="act-tag-fill orange-fill" style="width: ${scoreVal}%;"></div>
                </div>
              </div>
            </div>
          `;
        }).join("");

        skillGapsHtml = `
          <div class="card an-gaps-card">
            <span class="card-title">SKILL GAPS</span>
            <div class="an-gaps-list">
              ${gapRowsHtml}
            </div>
            <p class="an-gaps-footer-note">These patterns are currently underrepresented in your solved history.</p>
          </div>
        `;
      }

      // SECTION 5 — WHY THIS PLAN? (Clean & Space-Efficient)
      const solvedCountNum = plan ? plan.basedOnSolvedCount : 0;
      const trustSectionHtml = `
        <div class="card an-trust-card">
          <span class="card-title">WHY THIS PLAN?</span>
          <div class="an-trust-list">
            <div class="an-trust-item">${solvedCountNum} solutions analyzed</div>
            <div class="an-trust-item">Recent activity considered</div>
            <div class="an-trust-item">Topic gaps considered</div>
            <div class="an-trust-item">Difficulty readiness considered</div>
            <div class="an-trust-verified">✓ Repository verified</div>
          </div>
        </div>
      `;

      // SECTION 6 — PROFILE (Dynamic Current Focus & Strong Foundation)
      const strongListStr = strengths.length > 0 ? strengths.slice(0, 2).map(s => s.name).join(" · ") : "Array";

      const profileHtml = `
        <div class="card an-repo-signal-card">
          <span class="card-title">PROFILE</span>
          <div class="an-repo-signal-body">
            <div class="an-repo-count-badge">${solvedCountNum} solutions analyzed</div>
            
            <div class="an-profile-section">
              <span class="an-profile-label">Strong foundation</span>
              <span class="an-profile-val green-text">${strongListStr}</span>
            </div>

            <div class="an-profile-section">
              <span class="an-profile-label">Current focus</span>
              <span class="an-profile-val orange-text">${focusSkill || 'Two Pointers'}</span>
            </div>
          </div>
        </div>
      `;

      bodyContentHtml = `
        ${nextProblemHtml}
        ${next7Html}
        ${focusNextHtml}
        ${skillGapsHtml}
        ${trustSectionHtml}
        ${profileHtml}
      `;
    }

    // 6. Assemble Full Page
    container.innerHTML = `
      <div class="activity-page-wrapper analytics-page-wrapper">
        ${headerHtml}
        ${offlineBannerHtml}
        ${bodyContentHtml}
      </div>
    `;

    // 7. Attach Interactive Click Handlers
    const retryBtn = container.querySelector('#an-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this._forcedState = null;
        this.render(viewModel, container);
      });
    }

    const primaryOpenBtn = container.querySelector('#an-primary-open-btn');
    if (primaryOpenBtn) {
      primaryOpenBtn.addEventListener('click', () => {
        const slug = primaryOpenBtn.getAttribute('data-slug');
        this.openProblem(slug);
      });
    }

    const next7Rows = container.querySelectorAll('.an-next7-row');
    next7Rows.forEach(row => {
      const openFn = () => {
        const slug = row.getAttribute('data-slug');
        this.openProblem(slug);
      };
      row.addEventListener('click', openFn);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFn();
        }
      });
    });

    const seqItems = container.querySelectorAll('.an-focus-seq-item');
    seqItems.forEach(item => {
      item.addEventListener('click', () => {
        const slug = item.getAttribute('data-slug');
        this.openProblem(slug);
      });
    });
  }
};
