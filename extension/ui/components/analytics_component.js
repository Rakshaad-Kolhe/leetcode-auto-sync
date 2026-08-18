/**
 * AnalyticsComponent
 * Clean, compact difficulty breakdown, language usage, and category distribution.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class AnalyticsComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;
      if (globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.AnalyticsScreenComponent) {
        globalThis.LeetCodeAutoSync.AnalyticsScreenComponent.render(viewModel, container);
      }
    }
  }

  LeetCodeAutoSync.AnalyticsComponent = AnalyticsComponent;
})(typeof self !== "undefined" ? self : this);
