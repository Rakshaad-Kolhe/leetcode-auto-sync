globalThis.LeetCodeAutoSync = globalThis.LeetCodeAutoSync || {};

globalThis.LeetCodeAutoSync.StatusFooterComponent = {
  render: function(viewModel, container) {
    if (globalThis.LeetCodeAutoSync.BottomNavigationComponent) {
      globalThis.LeetCodeAutoSync.BottomNavigationComponent.render(viewModel, container);
    }
  }
};
