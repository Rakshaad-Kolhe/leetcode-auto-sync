globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.SolvedSummaryComponent = {
  render: function(viewModel, container) {
    if (!container) return;

    const store = globalThis.LeetCodeAutoSync.DeveloperDataStore;
    const stats = (store && store.stats) || {};

    const totalSolved = (viewModel && viewModel.snapTotalCount !== undefined) ? viewModel.snapTotalCount : (stats.totalSolved || 0);
    const easy   = (viewModel && viewModel.easyCount   !== undefined) ? viewModel.easyCount   : (stats.easy || 0);
    const medium = (viewModel && viewModel.mediumCount !== undefined) ? viewModel.mediumCount : (stats.medium || 0);
    const hard   = (viewModel && viewModel.hardCount   !== undefined) ? viewModel.hardCount   : (stats.hard || 0);

    container.innerHTML = `
      <div class="stats-card" role="region" aria-label="Problems solved summary">
        <div class="stat-col">
          <span class="stat-num white">${totalSolved}</span>
          <span class="stat-label">Solved</span>
        </div>
        <div class="stat-col">
          <span class="stat-num green">${easy}</span>
          <span class="stat-label">Easy</span>
        </div>
        <div class="stat-col">
          <span class="stat-num orange">${medium}</span>
          <span class="stat-label">Med</span>
        </div>
        <div class="stat-col">
          <span class="stat-num red">${hard}</span>
          <span class="stat-label">Hard</span>
        </div>
      </div>
    `;
  }
};
