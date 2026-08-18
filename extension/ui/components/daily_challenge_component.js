globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.DailyChallengeComponent = {
  _timerId: null,

  render: function(viewModel, container) {
    if (!container) return;

    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }

    // Dynamic UTC countdown calculation until 00:00:00 UTC daily reset with seconds
    const getCountdownText = () => {
      const now = new Date();
      const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      return `${hours}h ${mins}m ${secs}s`;
    };

    const store = globalThis.LeetCodeAutoSync.DeveloperDataStore;
    const vmDaily = (viewModel && viewModel.dailyChallenge) ? viewModel.dailyChallenge : null;
    const storeDaily = (store && store.stats && store.stats.dailyChallengeStatus) ? store.stats.dailyChallengeStatus : null;
    const rawDaily = vmDaily || storeDaily || {};

    const challengeTitle  = rawDaily.title || 'Daily Challenge';
    const difficulty      = rawDaily.difficulty || 'Medium';
    const acceptanceStr   = rawDaily.acceptanceRate || '—';
    const challengeUrl    = rawDaily.url || 'https://leetcode.com/problemset/all/';
    const topics          = Array.isArray(rawDaily.topics) && rawDaily.topics.length > 0 ? rawDaily.topics : ['Array'];
    const mainTopic       = topics[0] || 'Array';

    // Parse numerical acceptance %
    let acceptanceNum = 32;
    const matchedAcc = String(acceptanceStr).match(/(\d+(?:\.\d+)?)/);
    if (matchedAcc) {
      acceptanceNum = Math.round(parseFloat(matchedAcc[1]));
    }

    const diffClass = difficulty.toLowerCase();

    // Format problem topic tags
    const topicPillsHtml = (Array.isArray(topics) && topics.length > 0)
      ? topics.map(t => `<span class="dc-tag-pill">${t}</span>`).join('')
      : `<span class="dc-tag-pill">General</span>`;

    // Dynamic Personal progress calculation from real store data
    const stats = (store && store.stats) ? store.stats : {};
    const streakDays = (viewModel && typeof viewModel.officialStreak === 'number') 
      ? viewModel.officialStreak 
      : (stats.officialStreak || stats.currentStreak || 0);

    const repoTotal = (store && store.repository && Array.isArray(store.repository.syncedProblems)) ? store.repository.syncedProblems.length : 0;
    const totalSolved = stats.totalSolved || repoTotal || (stats.easy + stats.medium + stats.hard) || 0;
    
    // Scan local repository solved problems & submissions to count actual solved problems matching problem topics
    const mainTopicLower = mainTopic.toLowerCase();
    const allTopicLowers = topics.map(t => String(t).toLowerCase());
    const solvedProblemKeys = new Set();
    let solvedTopicCount = 0;

    const checkAndCountProblem = (prob) => {
      if (!prob) return;
      const key = prob.id || prob.slug || prob.titleSlug || prob.title;
      if (!key || solvedProblemKeys.has(key)) return;

      const rawTopics = prob.topics || prob.topicTags || (prob.metadata && (prob.metadata.topics || prob.metadata.topicTags)) || [];
      const topicsArr = Array.isArray(rawTopics) ? rawTopics.map(t => (typeof t === 'string' ? t : (t.name || '')).toLowerCase()) : [];

      // Check if problem topics or title slug matches the main topic or any topic tag
      const matchesTopic = topicsArr.some(t => allTopicLowers.some(dailyT => dailyT === t || t.includes(dailyT) || dailyT.includes(t))) ||
        (prob.slug && allTopicLowers.some(t => t.length > 3 && prob.slug.toLowerCase().includes(t)));

      if (matchesTopic) {
        solvedProblemKeys.add(key);
        solvedTopicCount++;
      }
    };

    // 1. Scan authoritative repository synced problems
    if (store && store.repository && Array.isArray(store.repository.syncedProblems)) {
      store.repository.syncedProblems.forEach(checkAndCountProblem);
    }

    // 2. Scan store submissions
    if (store && Array.isArray(store.submissions)) {
      store.submissions.forEach(sub => {
        const isAc = sub.status === 'ACCEPTED' || sub.status === 'Accepted' || (sub.metadata && sub.metadata.verdict === 'ACCEPTED');
        if (isAc) {
          checkAndCountProblem(sub);
        }
      });
    }

    // Empirical Personal match percentage based on real scanned repository topic count vs total solved
    const personalPct = totalSolved > 0 
      ? Math.min(100, Math.round((solvedTopicCount / totalSolved) * 100)) 
      : 0;

    // Dynamic Updated time string
    let updatedTimeStr = 'Just now';
    if (viewModel && viewModel.lastUpdatedText) {
      updatedTimeStr = viewModel.lastUpdatedText.replace(/^Updated\s+/i, '');
    } else if (store && store.status && store.status.lastFetched) {
      updatedTimeStr = new Date(store.status.lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      updatedTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    container.innerHTML = `
      <div class="dc-card-wrapper" role="region" aria-label="Daily Challenge Section">
        <!-- Top Navigation Header -->
        <div class="dc-top-bar">
          <div class="dc-header-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00e5a3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="dc-header-title">DAILY CHALLENGE</span>
          </div>
          <div class="dc-header-right">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="dc-timer-text">${getCountdownText()}</span>
          </div>
        </div>

        <!-- Compact Problem Title & Meta Row -->
        <div class="dc-problem-row">
          <div class="dc-problem-info">
            <h2 class="dc-problem-title">${challengeTitle}</h2>
            <div class="dc-meta-group">
              <span class="dc-diff-badge ${diffClass}">${difficulty}</span>
              <span class="dc-acceptance-text">${acceptanceStr} Acceptance</span>
            </div>
          </div>
        </div>

        <!-- Open Problem CTA Button -->
        <button id="btn-open-leetcode-cta" class="dc-cta-btn">
          <span class="dc-cta-title">Open Problem</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </button>
      </div>
    `;

    // Live countdown timer
    const timerEl = container.querySelector('.dc-timer-text');
    if (timerEl) {
      this._timerId = setInterval(() => {
        timerEl.textContent = getCountdownText();
      }, 1000);
    }

    // Open LeetCode CTA button click handler
    const btnOpen = container.querySelector('#btn-open-leetcode-cta');
    const openChallenge = () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: challengeUrl });
      } else {
        window.open(challengeUrl, '_blank');
      }
    };

    if (btnOpen) {
      btnOpen.addEventListener('click', (e) => {
        e.stopPropagation();
        openChallenge();
      });
    }

    // Settings icon click handler
    const btnSettings = container.querySelector('#dc-settings-btn');
    if (btnSettings) {
      btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
        } else {
          window.open('../dashboard/dashboard.html', '_blank');
        }
      });
    }

    // Bookmark toggle handler
    const btnBookmark = container.querySelector('.dc-bookmark-icon');
    if (btnBookmark) {
      btnBookmark.addEventListener('click', (e) => {
        e.stopPropagation();
        const isFilled = btnBookmark.getAttribute('fill') === '#8b949e';
        if (isFilled) {
          btnBookmark.setAttribute('fill', 'none');
        } else {
          btnBookmark.setAttribute('fill', '#8b949e');
        }
      });
    }
  }
};

