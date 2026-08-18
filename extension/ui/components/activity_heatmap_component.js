globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.ActivityHeatmapComponent = {
  _selectedRangeDays: 30,

  render: function(viewModel, container) {
    if (!container) return;

    // Enforce valid period: 7, 14, or 30 days
    let selectedRange = this._selectedRangeDays || 30;
    if (selectedRange !== 7 && selectedRange !== 14 && selectedRange !== 30) {
      selectedRange = 30;
      this._selectedRangeDays = 30;
    }

    const store = globalThis.LeetCodeAutoSync.DeveloperDataStore || {};
    const stats = store.stats || (viewModel ? viewModel : {}) || {};

    const activeMap = stats.activeDateMap || (viewModel && viewModel.activeDateMap ? viewModel.activeDateMap : {}) || {};
    const rawTiles = (viewModel && Array.isArray(viewModel.heatmapTiles)) ? viewModel.heatmapTiles : (stats.activityHeatmap || []);

    const limitDays = selectedRange;
    const now = new Date();

    const heatmapTiles = [];
    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      let count = 0;
      if (activeMap[dateStr] !== undefined) {
        count = activeMap[dateStr];
      } else if (rawTiles.length >= limitDays) {
        const rawTile = rawTiles[rawTiles.length - 1 - i];
        count = rawTile && typeof rawTile.count === 'number' ? rawTile.count : 0;
      }

      let level = 0;
      if (count >= 6) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count === 1) level = 1;

      heatmapTiles.push({
        date: dateStr,
        count,
        solved: count > 0,
        level,
        isToday: i === 0
      });
    }

    // Active days count ratio = days in range with >= 1 solved problem
    let activeDaysCount = 0;
    heatmapTiles.forEach(t => { if (t && t.count > 0) activeDaysCount++; });
    const ratioStr = `${activeDaysCount}/${limitDays}`;

    // Format Dates for Footer
    const startDate = new Date();
    startDate.setDate(now.getDate() - (limitDays - 1));
    const formatDateShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formatDateFull = (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const startDateStr = formatDateShort(startDate);

    // Layout configuration for 7, 14, 30 day views
    let gridStyle = `grid-template-columns: repeat(15, 14px); grid-template-rows: repeat(2, 14px); gap: 3.5px;`;
    if (limitDays === 7) {
      gridStyle = `grid-template-columns: repeat(7, 14px); grid-template-rows: repeat(1, 14px); gap: 4px;`;
    } else if (limitDays === 14) {
      gridStyle = `grid-template-columns: repeat(7, 14px); grid-template-rows: repeat(2, 14px); gap: 4px;`;
    } else {
      gridStyle = `grid-template-columns: repeat(15, 14px); grid-template-rows: repeat(2, 14px); gap: 3.5px;`;
    }

    // Build Heatmap Cells HTML (No title attribute to prevent duplicate tooltips)
    const cellsHtml = heatmapTiles.map((tile, i) => {
      const levelClass = `level-${tile.level || 0}`;
      const todayClass = tile.isToday ? ' today' : '';
      const dateFormatted = formatDateFull(tile.date);
      const countFormatted = tile.count === 0 ? 'No problems solved' : `${tile.count} ${tile.count === 1 ? 'problem' : 'problems'} solved`;

      return `<div class="hmap-cell ${levelClass}${todayClass}" data-date-fmt="${dateFormatted}" data-count-fmt="${countFormatted}" data-index="${i}" role="gridcell" tabindex="0"></div>`;
    }).join('');

    container.innerHTML = `
      <div class="heatmap-card" role="region" aria-labelledby="heatmap-title">
        <div id="dash-hmap-tooltip" class="act-hmap-tooltip"></div>
        <div class="heatmap-header">
          <span id="heatmap-title" class="heatmap-title">${limitDays}-Day Activity</span>
          <div class="act-select-wrapper">
            <select id="dash-date-range-select" class="act-filter-select" aria-label="Select Date Range">
              <option value="7"${selectedRange === 7 ? ' selected' : ''}>Last 7 Days</option>
              <option value="14"${selectedRange === 14 ? ' selected' : ''}>Last 14 Days</option>
              <option value="30"${selectedRange === 30 ? ' selected' : ''}>Last 30 Days</option>
            </select>
            <svg class="select-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <span class="heatmap-ratio">${ratioStr}</span>
        </div>

        <div class="heatmap-grid" style="${gridStyle}">
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
    `;

    // Dropdown change handler
    const dateSelect = container.querySelector('#dash-date-range-select');
    if (dateSelect) {
      dateSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        this._selectedRangeDays = [7, 14, 30].includes(val) ? val : 30;
        this.render(viewModel, container);
      });
    }

    // Floating Interactive Tooltip for Dashboard Heatmap Cells
    const heatmapCard = container.querySelector('.heatmap-card');
    const hmapTooltipEl = container.querySelector('#dash-hmap-tooltip');
    if (heatmapCard && hmapTooltipEl) {
      heatmapCard.querySelectorAll('.hmap-cell').forEach(cell => {
        const showTooltip = () => {
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

        cell.addEventListener('mouseenter', showTooltip);
        cell.addEventListener('mousemove', showTooltip);
        cell.addEventListener('mouseleave', () => {
          hmapTooltipEl.classList.remove('visible');
        });
      });

      heatmapCard.addEventListener('mouseleave', () => {
        hmapTooltipEl.classList.remove('visible');
      });
    }
  }
};
