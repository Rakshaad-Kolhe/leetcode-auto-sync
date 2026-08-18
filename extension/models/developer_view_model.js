/**
 * DeveloperViewModel
 * Immutable Presentation View Model for Developer Intelligence OS Popup UI.
 * Pure UI data container holding all formatted presentation strings, badges, heatmap tiles,
 * avatar URLs, greeting titles, and diagnostic traces.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class DeveloperViewModel {
    constructor({
      userGreeting = "Good Day,",
      displayName = "Developer",
      userAvatar = "../icons/icon-48.png",
      officialStreak = 0,
      calendarStreak = 0,
      reconstructedStreak = 0,
      daysSkipped = 0,
      currentDayCompleted = false,
      streakPillText = "🔥 0 Days",
      contestRating = 0,
      contestPillText = "No contest history",
      lastUpdatedText = "Just now",
      snapYesterdayCount = "0",
      snapTotalCount = "0",
      snapRepoStatusText = "Not Configured",
      snapRepoStatusClass = "snap-val highlight",
      snapContestRatingText = "No history",
      acceptanceRateText = "0%",
      focusTopicText = "Practice Daily Challenge",
      focusTimeText = "⏱ 30 mins practice",
      easyCount = 0,
      mediumCount = 0,
      hardCount = 0,
      easyPercent = "0%",
      mediumPercent = "0%",
      hardPercent = "0%",
      heatmapTiles = [],
      dailyChallenge = null,
      companyPills = [],
      curatedProgress = null,
      overallScore = 0,
      readinessStage = "Not enough data",
      momentumText = "Low",
      growthTrendText = "→ Stable",
      strengths = [],
      weaknesses = [],
      topRecommendation = null,
      repoSyncedCount = 0,
      repoMissingCount = 0,
      repoReadmeText = "Missing",
      repoHealthBadgeText = "Not Configured",
      repoHealthBadgeClass = "badge badge-unknown",
      authStatusBadgeText = "Checking...",
      authStatusBadgeClass = "badge badge-unknown",
      snapshotCountText = "0 Snapshots",
      debugStreakTrace = null,
      liveParityCheck = null,
      rawGraphQL = null
    } = {}) {
      this.userGreeting = userGreeting;
      this.displayName = displayName;
      this.userAvatar = userAvatar;
      this.officialStreak = officialStreak;
      this.calendarStreak = calendarStreak;
      this.reconstructedStreak = reconstructedStreak;
      this.daysSkipped = daysSkipped;
      this.currentDayCompleted = currentDayCompleted;
      this.streakPillText = streakPillText;
      this.contestRating = contestRating;
      this.contestPillText = contestPillText;
      this.lastUpdatedText = lastUpdatedText;
      this.snapYesterdayCount = snapYesterdayCount;
      this.snapTotalCount = snapTotalCount;
      this.snapRepoStatusText = snapRepoStatusText;
      this.snapRepoStatusClass = snapRepoStatusClass;
      this.snapContestRatingText = snapContestRatingText;
      this.acceptanceRateText = acceptanceRateText;
      this.liveParityCheck = liveParityCheck;
      this.rawGraphQL = rawGraphQL;
      this.focusTopicText = focusTopicText;
      this.focusTimeText = focusTimeText;
      this.easyCount = easyCount;
      this.mediumCount = mediumCount;
      this.hardCount = hardCount;
      this.easyPercent = easyPercent;
      this.mediumPercent = mediumPercent;
      this.hardPercent = hardPercent;
      this.heatmapTiles = heatmapTiles;
      this.dailyChallenge = dailyChallenge;
      this.companyPills = companyPills;
      this.curatedProgress = curatedProgress;
      this.overallScore = overallScore;
      this.readinessStage = readinessStage;
      this.momentumText = momentumText;
      this.growthTrendText = growthTrendText;
      this.strengths = strengths;
      this.weaknesses = weaknesses;
      this.topRecommendation = topRecommendation;
      this.repoSyncedCount = repoSyncedCount;
      this.repoMissingCount = repoMissingCount;
      this.repoReadmeText = repoReadmeText;
      this.repoHealthBadgeText = repoHealthBadgeText;
      this.repoHealthBadgeClass = repoHealthBadgeClass;
      this.authStatusBadgeText = authStatusBadgeText;
      this.authStatusBadgeClass = authStatusBadgeClass;
      this.snapshotCountText = snapshotCountText;
      this.debugStreakTrace = debugStreakTrace;

      Object.freeze(this);
    }
  }

  LeetCodeAutoSync.DeveloperViewModel = DeveloperViewModel;

})(typeof self !== "undefined" ? self : this);
