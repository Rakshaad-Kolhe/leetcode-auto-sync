globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.ActivityScreenComponent = {
  _selectedRangeDays: 30,
  _selectedChartMetric: 'problems',

  render: function(viewModel, container) {
    if (!container) return;

    // Enforce valid period: 7, 14, or 30 days
    let selectedRange = this._selectedRangeDays || 30;
    if (selectedRange !== 7 && selectedRange !== 14 && selectedRange !== 30) {
      selectedRange = 30;
      this._selectedRangeDays = 30;
    }

    const selectedMetric = this._selectedChartMetric || 'problems';

    const store = globalThis.LeetCodeAutoSync.DeveloperDataStore || {};
    const stats = store.stats || (viewModel ? viewModel : {}) || {};
    const repo = store.repository || {};

    // 1. Core Numbers
    const totalSolved = stats.totalSolved || repo.syncedCount || (viewModel && viewModel.snapTotalCount ? parseInt(viewModel.snapTotalCount, 10) : 0) || 0;
    const easyCount = stats.easy || (viewModel ? viewModel.easyCount : 0) || 0;
    const mediumCount = stats.medium || (viewModel ? viewModel.mediumCount : 0) || 0;
    const hardCount = stats.hard || (viewModel ? viewModel.hardCount : 0) || 0;

    const streakDays = (viewModel && typeof viewModel.officialStreak === 'number') 
      ? viewModel.officialStreak 
      : (stats.officialStreak || stats.currentStreak || 0);

    // 2. Heatmap & Active Days Data Filtered by Selected Range (7, 14, or 30 calendar days)
    const activeMap = stats.activeDateMap || {};
    const limitDays = selectedRange;
    const now = new Date();

    const heatmapTiles = [];
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = activeMap[dateStr] || 0;
      const solved = count > 0;

      let level = 0;
      if (count >= 6) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count === 1) level = 1;

      heatmapTiles.push({
        date: dateStr,
        count,
        solved,
        level,
        isToday: i === 0
      });
    }

    // Active days ratio = number of calendar days in selected period with >= 1 solved problem
    let activeDaysCount = 0;
    heatmapTiles.forEach(t => { if (t && t.count > 0) activeDaysCount++; });

    // Calculate Average Minutes per Day
    const estimatedPracticeMinsTotal = (easyCount * 12) + (mediumCount * 25) + (hardCount * 45);
    const avgMinDay = activeDaysCount > 0 ? (estimatedPracticeMinsTotal / activeDaysCount).toFixed(1) : "0.0";

    // Format Dates for Footer
    const startDate = new Date();
    startDate.setDate(now.getDate() - (limitDays - 1));
    const formatDateShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formatDateFull = (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const startDateStr = formatDateShort(startDate);

    // Header Title & Ratio for Heatmap
    const heatmapHeaderTitle = `${selectedRange}-Day Activity`;
    const heatmapHeaderRatio = `${activeDaysCount}/${selectedRange}`;

    // Layout configuration for 7, 14, 30 day views
    let gridStyle = `grid-template-columns: repeat(15, 14px); grid-template-rows: repeat(2, 14px); gap: 3.5px;`;
    if (limitDays === 7) {
      gridStyle = `grid-template-columns: repeat(7, 14px); grid-template-rows: repeat(1, 14px); gap: 4px;`;
    } else if (limitDays === 14) {
      gridStyle = `grid-template-columns: repeat(7, 14px); grid-template-rows: repeat(2, 14px); gap: 4px;`;
    } else {
      gridStyle = `grid-template-columns: repeat(15, 14px); grid-template-rows: repeat(2, 14px); gap: 3.5px;`;
    }

    // Build Heatmap Cells HTML (No title attribute to avoid duplicate native tooltips)
    const cellsHtml = heatmapTiles.map((tile, i) => {
      const levelClass = `level-${tile.level || 0}`;
      const todayClass = tile.isToday ? ' today' : '';
      const dateFormatted = formatDateFull(tile.date);
      const countFormatted = tile.count === 0 ? 'No problems solved' : `${tile.count} ${tile.count === 1 ? 'problem' : 'problems'} solved`;

      return `<div class="hmap-cell ${levelClass}${todayClass}" data-date-fmt="${dateFormatted}" data-count-fmt="${countFormatted}" data-index="${i}" role="gridcell" tabindex="0"></div>`;
    }).join('');

    // 3. Activity Over Time Bar Chart (Metric-aware for Problems, Submissions, Practice Time)
    const chartBars = heatmapTiles.length >= 1 ? heatmapTiles : Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      return { date: d.toISOString().split('T')[0], count: 0 };
    });

    const getMetricValue = (tile) => {
      const cnt = tile.count || 0;
      if (selectedMetric === 'submissions') return cnt > 0 ? Math.round(cnt * 1.5) : 0;
      if (selectedMetric === 'time') return cnt > 0 ? cnt * 25 : 0;
      return cnt; // default: problems
    };

    const metricValues = chartBars.map(getMetricValue);
    const maxDailyCount = Math.max(1, ...metricValues);
    const totalMetricSum = metricValues.reduce((a, b) => a + b, 0);

    let metricSummaryText = `Total: ${totalMetricSum} Solved`;
    let barColor = '#22C55E';
    if (selectedMetric === 'submissions') {
      metricSummaryText = `Total: ${totalMetricSum} Submissions`;
      barColor = '#3B82F6';
    } else if (selectedMetric === 'time') {
      metricSummaryText = `Total: ${(totalMetricSum / 60).toFixed(1)} hrs`;
      barColor = '#F59E0B';
    }

    const totalBars = chartBars.length;
    const svgWidth = 350;
    const chartHeight = 65;
    const paddingX = 4;
    const usableW = svgWidth - (paddingX * 2);

    const slotW = usableW / totalBars;
    const barGap = totalBars > 20 ? 1 : 2;
    const barWidth = Math.max(1.5, slotW - barGap);

    const barsSvgHtml = chartBars.map((b, idx) => {
      const val = getMetricValue(b);
      const h = val > 0 ? Math.max(4, Math.round((val / maxDailyCount) * (chartHeight - 10))) : 2;
      const x = (paddingX + idx * slotW).toFixed(2);
      const y = chartHeight - h;
      const color = val > 0 ? barColor : '#1c2028';
      const opacity = val > 0 ? 0.95 : 0.4;
      let unitLabel = selectedMetric === 'time' ? 'mins practice' : (selectedMetric === 'submissions' ? 'submissions' : 'problems solved');
      const dateFormatted = formatDateFull(b.date || '');
      const tooltip = `${dateFormatted}: ${val} ${unitLabel}`;

      return `<rect class="act-bar-rect" x="${x}" y="${y}" width="${barWidth.toFixed(2)}" height="${h}" rx="${barWidth >= 4 ? 2 : 0.5}" fill="${color}" opacity="${opacity}" data-tooltip="${tooltip}" data-date="${b.date || ''}" data-val="${val}"></rect>`;
    }).join('');

    // X-Axis Date Labels for Chart
    const labelStep = Math.max(1, Math.floor(totalBars / 4));
    const labelIndices = [0, labelStep, labelStep * 2, labelStep * 3, totalBars - 1].filter((val, idx, self) => self.indexOf(val) === idx && val < totalBars);
    const xLabelsHtml = labelIndices.map(idx => {
      const b = chartBars[idx];
      let labelText = '';
      if (b && b.date) {
        const d = new Date(b.date);
        labelText = formatDateShort(d);
      } else {
        labelText = idx === totalBars - 1 ? 'Today' : `Day ${idx + 1}`;
      }
      return `<span>${labelText}</span>`;
    }).join('');

    // 4. Problem Difficulty Donut Chart Calculation
    const MathTotal = Math.max(1, easyCount + mediumCount + hardCount);
    const easyPctVal = Math.round((easyCount / MathTotal) * 100);
    const medPctVal = Math.round((mediumCount / MathTotal) * 100);
    const hardPctVal = Math.round((hardCount / MathTotal) * 100);

    const circumference = 2 * Math.PI * 30; // radius 30 -> ~188.5
    const easyDash = (easyPctVal / 100) * circumference;
    const medDash = (medPctVal / 100) * circumference;
    const hardDash = (hardPctVal / 100) * circumference;

    const easyOffset = 0;
    const medOffset = -easyDash;
    const hardOffset = -(easyDash + medDash);

    // 5. Top Problem Tags Extraction
    const topicMap = {};
    const extractTopics = (items) => {
      if (!Array.isArray(items)) return;
      items.forEach(prob => {
        const topics = prob.topics || prob.topicTags || (prob.metadata && (prob.metadata.topics || prob.metadata.topicTags)) || [];
        if (Array.isArray(topics)) {
          topics.forEach(t => {
            const name = typeof t === 'string' ? t.trim() : (t.name ? t.name.trim() : '');
            if (name) topicMap[name] = (topicMap[name] || 0) + 1;
          });
        }
      });
    };

    if (store.repository && Array.isArray(store.repository.syncedProblems)) extractTopics(store.repository.syncedProblems);
    if (Array.isArray(store.submissions)) extractTopics(store.submissions);

    // Fallback topic map if empty
    if (Object.keys(topicMap).length === 0) {
      topicMap["Array"] = Math.ceil(totalSolved * 0.35) || 10;
      topicMap["String"] = Math.ceil(totalSolved * 0.25) || 8;
      topicMap["Dynamic Programming"] = Math.ceil(totalSolved * 0.20) || 6;
      topicMap["Tree"] = Math.ceil(totalSolved * 0.12) || 4;
      topicMap["Hash Table"] = Math.ceil(totalSolved * 0.08) || 3;
    }

    const sortedTopics = Object.keys(topicMap)
      .map(k => ({ name: k, count: topicMap[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxTopicCount = Math.max(1, ...sortedTopics.map(t => t.count));

    const topTagsHtml = sortedTopics.map(t => {
      const pct = Math.min(100, Math.round((t.count / maxTopicCount) * 100));
      return `
        <div class="act-tag-row">
          <div class="act-tag-info">
            <span class="act-tag-name">${t.name}</span>
            <span class="act-tag-count">${t.count}</span>
          </div>
          <div class="act-tag-track">
            <div class="act-tag-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    // 6. Recent Solved Problems List
    let recentProblems = [];
    if (store.repository && Array.isArray(store.repository.syncedProblems) && store.repository.syncedProblems.length > 0) {
      recentProblems = store.repository.syncedProblems.slice(0, 5);
    } else if (Array.isArray(store.submissions) && store.submissions.length > 0) {
      recentProblems = store.submissions.filter(s => s.status === 'ACCEPTED' || s.status === 'Accepted').slice(0, 5);
    } else if (store.rawGraphQL && Array.isArray(store.rawGraphQL.recentAcSubmissionList)) {
      recentProblems = store.rawGraphQL.recentAcSubmissionList.slice(0, 5);
    }

    // Default mock list if no local synced solutions yet
    if (recentProblems.length === 0) {
      recentProblems = [
        { title: "2996. Smallest Missing Integer Greater Than Sequential Prefix Sum", difficulty: "Easy", timeAgo: "Today", url: "https://leetcode.com/problems/smallest-missing-integer-greater-than-sequential-prefix-sum/" },
        { title: "1695. Maximum Erasure Value", difficulty: "Medium", timeAgo: "Yesterday", url: "https://leetcode.com/problems/maximum-erasure-value/" },
        { title: "152. Maximum Product Subarray", difficulty: "Medium", timeAgo: "2 days ago", url: "https://leetcode.com/problems/maximum-product-subarray/" },
        { title: "1. Two Sum", difficulty: "Easy", timeAgo: "3 days ago", url: "https://leetcode.com/problems/two-sum/" },
        { title: "15. 3Sum", difficulty: "Medium", timeAgo: "5 days ago", url: "https://leetcode.com/problems/3sum/" }
      ];
    }

    const recentListHtml = recentProblems.map(p => {
      const rawTitle = p.title || p.titleSlug || 'LeetCode Problem';
      const cleanTitle = rawTitle.replace(/^\d+\.\s*/, '');
      const probNumMatch = rawTitle.match(/^(\d+)\./);
      const displayTitle = probNumMatch ? `${probNumMatch[1]}. ${cleanTitle}` : rawTitle;
      const diff = p.difficulty || 'Medium';
      const diffClass = diff.toLowerCase();
      const url = p.url || `https://leetcode.com/problems/${p.titleSlug || p.slug || ''}/`;

      return `
        <div class="act-problem-row" data-url="${url}" role="button" tabindex="0">
          <span class="act-prob-icon">✓</span>
          <span class="act-prob-title">${displayTitle}</span>
          <span class="act-prob-diff ${diffClass}">${diff}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="activity-page-wrapper">

        <!-- Subheader Title & Filter Dropdown (7, 14, 30 Days) -->
        <div class="act-subheader-row">
          <div class="act-title-group">
            <h1 class="act-page-title">Activity</h1>
            <p class="act-page-sub">Track your coding consistency over time.</p>
          </div>
          <div class="act-select-wrapper">
            <select id="act-date-range-select" class="act-filter-select" aria-label="Select Date Range">
              <option value="7"${selectedRange === 7 ? ' selected' : ''}>Last 7 Days</option>
              <option value="14"${selectedRange === 14 ? ' selected' : ''}>Last 14 Days</option>
              <option value="30"${selectedRange === 30 ? ' selected' : ''}>Last 30 Days</option>
            </select>
            <svg class="select-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <!-- SECTION 1: Dynamic Activity Heatmap -->
        <div class="card act-heatmap-card">
          <div id="act-hmap-tooltip" class="act-hmap-tooltip"></div>
          <div class="heatmap-header">
            <span class="heatmap-title">${heatmapHeaderTitle}</span>
            <span class="heatmap-ratio">${heatmapHeaderRatio}</span>
          </div>
          <div class="heatmap-grid" style="${gridStyle}" role="grid" aria-label="Activity matrix">
            ${cellsHtml}
          </div>
          <div class="heatmap-footer">
            <span>${startDateStr}</span>
            <div class="act-legend">
              <span class="legend-text">Less</span>
              <span class="legend-box level-0"></span>
              <span class="legend-box level-1"></span>
              <span class="legend-box level-2"></span>
              <span class="legend-box level-3"></span>
              <span class="legend-box level-4"></span>
              <span class="legend-text">More</span>
            </div>
            <span>Today</span>
          </div>
        </div>

        <!-- SECTION 2: Activity Summary KPI Row -->
        <div class="stats-card act-summary-card">
          <div class="stat-col">
            <span class="stat-num white">${activeDaysCount}</span>
            <span class="stat-label">Active Days</span>
          </div>
          <div class="stat-col">
            <span class="stat-num orange">${streakDays}</span>
            <span class="stat-label">Current Streak</span>
          </div>
          <div class="stat-col">
            <span class="stat-num green">${avgMinDay}</span>
            <span class="stat-label">Avg. Min/Day</span>
          </div>
          <div class="stat-col">
            <span class="stat-num white">${totalSolved}</span>
            <span class="stat-label">Problems Solved</span>
          </div>
        </div>

        <!-- SECTION 3: Activity Over Time (Bar Chart) -->
        <div class="card act-chart-card">
          <div class="card-row act-card-header">
            <div class="chart-header-left">
              <span class="card-title">Activity Over Time</span>
              <span class="chart-summary-badge">${metricSummaryText}</span>
            </div>
            <div class="act-select-wrapper">
              <select id="act-chart-metric-select" class="act-chart-select" aria-label="Select Chart Metric">
                <option value="problems"${selectedMetric === 'problems' ? ' selected' : ''}>Problems Solved</option>
                <option value="submissions"${selectedMetric === 'submissions' ? ' selected' : ''}>Submissions</option>
                <option value="time"${selectedMetric === 'time' ? ' selected' : ''}>Practice Time</option>
              </select>
              <svg class="select-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="act-chart-container">
            <div id="act-chart-tooltip" class="act-chart-tooltip"></div>
            <svg class="act-chart-svg" viewBox="0 0 350 70" preserveAspectRatio="none">
              <!-- Grid lines -->
              <line x1="0" y1="15" x2="350" y2="15" stroke="#1f242d" stroke-width="1" stroke-dasharray="2 2" />
              <line x1="0" y1="40" x2="350" y2="40" stroke="#1f242d" stroke-width="1" stroke-dasharray="2 2" />
              <line x1="0" y1="65" x2="350" y2="65" stroke="#24272C" stroke-width="1" />
              ${barsSvgHtml}
            </svg>
            <div class="act-chart-labels">
              ${xLabelsHtml}
            </div>
          </div>
        </div>

        <!-- SECTION 4 & 5: Difficulty & Top Tags (Side by Side Grid) -->
        <div class="act-grid-two-col">

          <!-- Section 4: Difficulty Breakdown -->
          <div class="card act-sub-card">
            <span class="card-title">Problem Difficulty</span>
            <div class="act-diff-body">
              <div class="act-donut-box">
                <svg class="act-donut-svg" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#161920" stroke-width="8" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#22C55E" stroke-width="8"
                          stroke-dasharray="${easyDash} ${circumference - easyDash}" stroke-dashoffset="${easyOffset}" transform="rotate(-90 40 40)" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#F59E0B" stroke-width="8"
                          stroke-dasharray="${medDash} ${circumference - medDash}" stroke-dashoffset="${medOffset}" transform="rotate(-90 40 40)" />
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#EF4444" stroke-width="8"
                          stroke-dasharray="${hardDash} ${circumference - hardDash}" stroke-dashoffset="${hardOffset}" transform="rotate(-90 40 40)" />
                </svg>
                <div class="act-donut-center">
                  <span class="donut-num">${totalSolved}</span>
                  <span class="donut-sub">Solved</span>
                </div>
              </div>
              <div class="act-diff-legend">
                <div class="diff-leg-item">
                  <span class="diff-dot green"></span>
                  <span class="diff-name">Easy</span>
                  <span class="diff-val">${easyCount} (${easyPctVal}%)</span>
                </div>
                <div class="diff-leg-item">
                  <span class="diff-dot orange"></span>
                  <span class="diff-name">Medium</span>
                  <span class="diff-val">${mediumCount} (${medPctVal}%)</span>
                </div>
                <div class="diff-leg-item">
                  <span class="diff-dot red"></span>
                  <span class="diff-name">Hard</span>
                  <span class="diff-val">${hardCount} (${hardPctVal}%)</span>
                </div>
              </div>
            </div>
            <div class="act-diff-bar-track" title="Difficulty Ratio: ${easyPctVal}% Easy, ${medPctVal}% Medium, ${hardPctVal}% Hard">
              <div class="diff-bar-seg green" style="width: ${easyPctVal}%;"></div>
              <div class="diff-bar-seg orange" style="width: ${medPctVal}%;"></div>
              <div class="diff-bar-seg red" style="width: ${hardPctVal}%;"></div>
            </div>
          </div>

          <!-- Section 5: Top Problem Tags -->
          <div class="card act-sub-card">
            <span class="card-title">Top Problem Tags</span>
            <div class="act-tags-list">
              ${topTagsHtml}
            </div>
          </div>

        </div>

        <!-- SECTION 6: Recent Solved Problems -->
        <div class="card act-recent-card">
          <div class="card-row act-card-header">
            <span class="card-title">Recent Solved Problems</span>
            <a href="https://leetcode.com/progress/" target="_blank" rel="noopener noreferrer" class="act-view-all-link">View All →</a>
          </div>
          <div class="act-recent-list">
            ${recentListHtml}
          </div>
        </div>

      </div>
    `;

    // Period dropdown handler (Last 7 Days, Last 14 Days, Last 30 Days)
    const dateSelect = container.querySelector('#act-date-range-select');
    if (dateSelect) {
      dateSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        this._selectedRangeDays = [7, 14, 30].includes(val) ? val : 30;
        this.render(viewModel, container);
      });
    }

    const metricSelect = container.querySelector('#act-chart-metric-select');
    if (metricSelect) {
      metricSelect.addEventListener('change', (e) => {
        this._selectedChartMetric = e.target.value;
        this.render(viewModel, container);
      });
    }

    // Floating Interactive Tooltip for Heatmap Cells
    const heatmapCard = container.querySelector('.act-heatmap-card');
    const hmapTooltipEl = container.querySelector('#act-hmap-tooltip');
    if (heatmapCard && hmapTooltipEl) {
      heatmapCard.querySelectorAll('.hmap-cell').forEach(cell => {
        const showHmapTooltip = () => {
          const dateFmt = cell.getAttribute('data-date-fmt');
          const countFmt = cell.getAttribute('data-count-fmt');
          if (!dateFmt) return;

          hmapTooltipEl.innerHTML = `<div class="hmap-tt-date">${dateFmt}</div><div class="hmap-tt-count">${countFmt}</div>`;
          hmapTooltipEl.classList.add('visible');

          const cellRect = cell.getBoundingClientRect();
          const cardRect = heatmapCard.getBoundingClientRect();
          const leftPx = cellRect.left - cardRect.left + (cellRect.width / 2);
          const topPx = cellRect.top - cardRect.top - 6;

          const clampedLeft = Math.max(45, Math.min(cardRect.width - 45, leftPx));
          hmapTooltipEl.style.left = `${clampedLeft}px`;
          hmapTooltipEl.style.top = `${topPx}px`;
        };

        cell.addEventListener('mouseenter', showHmapTooltip);
        cell.addEventListener('mousemove', showHmapTooltip);
        cell.addEventListener('mouseleave', () => {
          hmapTooltipEl.classList.remove('visible');
        });
      });

      heatmapCard.addEventListener('mouseleave', () => {
        hmapTooltipEl.classList.remove('visible');
      });
    }

    // Floating Interactive Tooltip for Activity Over Time Chart
    const chartContainer = container.querySelector('.act-chart-container');
    const tooltipEl = container.querySelector('#act-chart-tooltip');
    if (chartContainer && tooltipEl) {
      const bars = chartContainer.querySelectorAll('.act-bar-rect');
      bars.forEach(bar => {
        const showTooltip = () => {
          const text = bar.getAttribute('data-tooltip');
          if (!text) return;
          tooltipEl.textContent = text;
          tooltipEl.classList.add('visible');

          const barRect = bar.getBoundingClientRect();
          const containerRect = chartContainer.getBoundingClientRect();
          const leftPx = barRect.left - containerRect.left + (barRect.width / 2);
          const clampedLeft = Math.max(30, Math.min(containerRect.width - 30, leftPx));
          tooltipEl.style.left = `${clampedLeft}px`;
        };

        bar.addEventListener('mouseenter', showTooltip);
        bar.addEventListener('mousemove', showTooltip);
        bar.addEventListener('mouseleave', () => {
          tooltipEl.classList.remove('visible');
        });
      });

      chartContainer.addEventListener('mouseleave', () => {
        tooltipEl.classList.remove('visible');
      });
    }

    // Click handler for recent problem rows
    container.querySelectorAll('.act-problem-row').forEach(row => {
      const open = () => {
        const url = row.getAttribute('data-url');
        if (!url) return;
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        } else {
          window.open(url, '_blank');
        }
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    });
  }
};
