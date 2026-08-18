globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.TodayHeroComponent = {
  render: function(viewModel, container) {
    if (globalThis.LeetCodeAutoSync.SolvedSummaryComponent) {
      globalThis.LeetCodeAutoSync.SolvedSummaryComponent.render(viewModel, container);
    }
  }
};
