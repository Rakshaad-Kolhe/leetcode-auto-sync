/**
 * @fileoverview Popup companion interaction script for Developer Intelligence OS V5.
 * FINAL V5 Redesign.
 */

document.addEventListener("DOMContentLoaded", () => {
  const {
    Logger,
    DeveloperDataStore,
    DeveloperViewModelBuilder,
    DeveloperIntelligenceService
  } = globalThis.LeetCodeAutoSync;

  if (Logger && Logger.info) {
    Logger.info("Popup companion FINAL V5 initialized");
  }

  // --- Render Companion Experience from DeveloperViewModel ---
  function renderCompanionUI() {
    if (!DeveloperDataStore || !DeveloperViewModelBuilder) return;
    const viewModel = DeveloperViewModelBuilder.buildViewModel(DeveloperDataStore);

    const {
      ExtensionIconService,
      StreakBannerComponent,
      HeaderComponent,
      TodayHeroComponent,
      NextActionComponent,
      ProgressComponent,
      HeatmapComponent,
      DailyChallengeComponent,
      ActivityScreenComponent,
      AnalyticsScreenComponent,
      RepoScreenComponent,
      DiagnosticsScreenComponent,
      SettingsScreenComponent,
      StatusFooterComponent
    } = globalThis.LeetCodeAutoSync || {};

    if (ExtensionIconService && typeof viewModel.officialStreak === "number") {
      ExtensionIconService.updateStreakIcon(viewModel.officialStreak, viewModel.currentDayCompleted);
    }

    if (StreakBannerComponent) StreakBannerComponent.render(viewModel, document.getElementById("streak-banner-container"));
    if (HeaderComponent) HeaderComponent.render(viewModel, document.getElementById("header-container"));
    if (TodayHeroComponent) TodayHeroComponent.render(viewModel, document.getElementById("today-hero-container"));
    if (NextActionComponent) NextActionComponent.render(viewModel, document.getElementById("next-action-container"));
    if (ProgressComponent) ProgressComponent.render(viewModel, document.getElementById("progress-container"));
    if (HeatmapComponent) HeatmapComponent.render(viewModel, document.getElementById("heatmap-container"));
    if (DailyChallengeComponent) DailyChallengeComponent.render(viewModel, document.getElementById("daily-challenge-container"));
    if (ActivityScreenComponent) ActivityScreenComponent.render(viewModel, document.getElementById("activity-screen-container"));
    if (AnalyticsScreenComponent) AnalyticsScreenComponent.render(viewModel, document.getElementById("analytics-screen-container"));
    if (RepoScreenComponent) RepoScreenComponent.render(viewModel, document.getElementById("repo-screen-container"));
    if (DiagnosticsScreenComponent) DiagnosticsScreenComponent.render(viewModel, document.getElementById("diagnostics-screen-container"));
    if (SettingsScreenComponent) SettingsScreenComponent.render(viewModel, document.getElementById("settings-screen-container"));
    if (StatusFooterComponent) StatusFooterComponent.render(viewModel, document.getElementById("status-footer-container"));
  }

  // --- Action & Tab View Handlers ---
  document.addEventListener("click", (e) => {
    // Navigation tab switching
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      const tab = navItem.getAttribute('data-tab');
      const dashView = document.getElementById('dashboard-view');
      const actView = document.getElementById('activity-view');
      const analyticsView = document.getElementById('analytics-view');
      const repoView = document.getElementById('repo-view');
      const diagView = document.getElementById('diagnostics-view');
      const settingsView = document.getElementById('settings-view');

      const { BottomNavigationComponent } = globalThis.LeetCodeAutoSync || {};
      if (BottomNavigationComponent && typeof BottomNavigationComponent.setActiveTab === 'function') {
        BottomNavigationComponent.setActiveTab(tab);
      }

      if (tab === 'activity') {
        if (dashView) dashView.style.display = 'none';
        if (actView) actView.style.display = 'flex';
        if (analyticsView) analyticsView.style.display = 'none';
        if (repoView) repoView.style.display = 'none';
        if (diagView) diagView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'none';
      } else if (tab === 'analytics') {
        if (dashView) dashView.style.display = 'none';
        if (actView) actView.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'flex';
        if (repoView) repoView.style.display = 'none';
        if (diagView) diagView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'none';
      } else if (tab === 'repo') {
        if (dashView) dashView.style.display = 'none';
        if (actView) actView.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'none';
        if (repoView) repoView.style.display = 'flex';
        if (diagView) diagView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'none';
      } else if (tab === 'diagnostics') {
        if (dashView) dashView.style.display = 'none';
        if (actView) actView.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'none';
        if (repoView) repoView.style.display = 'none';
        if (diagView) diagView.style.display = 'flex';
        if (settingsView) settingsView.style.display = 'none';
      } else if (tab === 'settings') {
        if (dashView) dashView.style.display = 'none';
        if (actView) actView.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'none';
        if (repoView) repoView.style.display = 'none';
        if (diagView) diagView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'flex';
      } else if (tab === 'dashboard') {
        if (dashView) dashView.style.display = 'flex';
        if (actView) actView.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'none';
        if (repoView) repoView.style.display = 'none';
        if (diagView) diagView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'none';
      }
    }

    // Check if settings button clicked
    const settingsBtn = e.target.closest('.icon-btn'); // Using icon-btn for settings now
    if (settingsBtn && settingsBtn.title === 'Settings') {
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
      } else {
        window.open("../dashboard/dashboard.html", "_blank");
      }
    }
  });

  // Subscribe to DataStore & Curated Progress changes
  if (DeveloperDataStore) {
    if (typeof DeveloperDataStore.onDataStoreChanged === "function") {
      DeveloperDataStore.onDataStoreChanged(() => renderCompanionUI());
    }
    if (typeof DeveloperDataStore.onCuratedProgressUpdated === "function") {
      DeveloperDataStore.onCuratedProgressUpdated(() => renderCompanionUI());
    }
  }

  // Render initial cached UI immediately (< 50ms)
  renderCompanionUI();

  // Trigger GraphQL live profile & contest sync
  const { LeetCodeGraphQLService } = globalThis.LeetCodeAutoSync || {};
  if (LeetCodeGraphQLService && typeof LeetCodeGraphQLService.syncRealUserProfile === "function") {
    LeetCodeGraphQLService.syncRealUserProfile().then(() => {
      renderCompanionUI();
    }).catch(() => {});
  }

  // Trigger background repository scan to fetch & render fresh verified progress
  if (DeveloperIntelligenceService && typeof DeveloperIntelligenceService.getOrComputeIntelligence === "function") {
    DeveloperIntelligenceService.getOrComputeIntelligence({}, true).then(() => {
      renderCompanionUI();
    });
  }
});
