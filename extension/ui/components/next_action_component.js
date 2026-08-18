globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.NextActionComponent = {
  render: function(viewModel, container) {
    if (globalThis.LeetCodeAutoSync.ProblemsExplorerComponent) {
      globalThis.LeetCodeAutoSync.ProblemsExplorerComponent.render(viewModel, container);
    }
  }
};
