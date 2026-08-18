globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.HeatmapComponent = {
  render: function(viewModel, container) {
    if (globalThis.LeetCodeAutoSync.ActivityHeatmapComponent) {
      globalThis.LeetCodeAutoSync.ActivityHeatmapComponent.render(viewModel, container);
    }
  }
};
