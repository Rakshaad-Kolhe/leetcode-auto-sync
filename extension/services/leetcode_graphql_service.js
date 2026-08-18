/**
 * LeetCodeGraphQLService
 * Authenticated GraphQL Client fetching real profile, contest rating, submission calendar,
 * and recent accepted submissions from LeetCode.
 * Normalizes data via DataNormalizationService and validates invariants via MetricValidationService.
 * Computes authoritative streak and 30-day activity heatmap directly from submissionCalendar.
 * Updates DeveloperDataStore and DataProvenance metadata.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const {
    DeveloperDataStore,
    DataProvenance,
    DataNormalizationService,
    MetricValidationService,
    Logger
  } = LeetCodeAutoSync;

  const GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

  const USER_STATUS_QUERY = `
    query globalData {
      userStatus {
        username
        isSignedIn
        isPremium
        avatar
      }
    }
  `;

  const USER_PROFILE_QUERY = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
          reputation
          countryName
          starRating
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
          totalSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        badges {
          id
          displayName
          icon
          creationDate
        }
      }
    }
  `;

  const CONTEST_RANKING_QUERY = `
    query getUserContestRanking($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        trendDirection
        problemsSolved
        totalProblems
        finishTimeInSeconds
        rating
        ranking
        contest {
          title
          startTime
        }
      }
    }
  `;

  const CONTEST_RANKING_SLUG_QUERY = `
    query getUserContestRankingBySlug($username: String!) {
      userContestRanking(userSlug: $username) {
        attendedContestsCount
        rating
        globalRanking
        totalParticipants
        topPercentage
      }
      userContestRankingHistory(userSlug: $username) {
        attended
        trendDirection
        problemsSolved
        totalProblems
        finishTimeInSeconds
        rating
        ranking
        contest {
          title
          startTime
        }
      }
    }
  `;

  const CALENDAR_QUERY = `
    query getUserCalendarAndRecent($username: String!) {
      streakCounter {
        streakCount
        daysSkipped
        currentDayCompleted
      }
      matchedUser(username: $username) {
        userCalendar {
          streak
          totalActiveDays
          submissionCalendar
        }
        languageProblemCount {
          languageName
          problemsSolved
        }
      }
      recentAcSubmissionList(username: $username, limit: 100) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  const DAILY_CHALLENGE_QUERY = `
    query getDailyChallenge {
      activeDailyCodingChallengeQuestion {
        date
        userStatus
        link
        question {
          questionId
          questionFrontendId
          title
          titleSlug
          difficulty
          acRate
          topicTags {
            name
            slug
          }
        }
      }
    }
  `;

  const QUESTION_COMPANY_TAGS_QUERY = `
    query questionCompanyTags($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        companyTagStats
        companyTags {
          name
          slug
        }
      }
    }
  `;

  class LeetCodeGraphQLService {
    constructor() {
      this.endpoint = GRAPHQL_ENDPOINT;
      this.lastQueryTime = null;
      this.backoffDelayMs = 1000;
    }

    /**
     * Compute authoritative streak directly from raw submissionCalendar JSON or object.
     * Filter to days containing >= 1 accepted submission and count consecutive active days.
     * Cross-checks against API userCalendar.streak and logs discrepancy.
     * @param {string|Object} rawCalendar
     * @param {number} apiStreak
     * @returns {Object} { currentStreak, longestStreak, lastSolvedDate, activeDateMap }
     */
    computeStreakFromCalendar(rawCalendar, apiStreak = 0) {
      let calMap = {};
      if (typeof rawCalendar === "string") {
        try {
          calMap = JSON.parse(rawCalendar || "{}");
        } catch (e) {
          calMap = {};
        }
      } else if (typeof rawCalendar === "object" && rawCalendar !== null) {
        calMap = rawCalendar;
      }

      const timestampComparisonTable = [];
      const activeDateMap = {};
      Object.keys(calMap).forEach((tsStr) => {
        const count = calMap[tsStr];
        if (count > 0) {
          const ts = parseInt(tsStr, 10);
          if (!isNaN(ts)) {
            const d = new Date(ts * 1000);
            const utcDate = d.toISOString().split("T")[0];
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const leetcodeDate = utcDate;
            const chosenDate = utcDate;

            activeDateMap[chosenDate] = (activeDateMap[chosenDate] || 0) + count;

            if (timestampComparisonTable.length < 50) {
              timestampComparisonTable.push({
                timestamp: ts,
                utcDate,
                localDate,
                leetcodeDate,
                chosenDate,
                count
              });
            }
          }
        }
      });

      const activeDates = Object.keys(activeDateMap).sort();
      if (activeDates.length === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastSolvedDate: null,
          yesterdaySolved: 0,
          activeDateMap,
          timestampComparisonTable: []
        };
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date();
      yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

      const yesterdaySolved = activeDateMap[yesterdayStr] || 0;

      // Starting point: today if active, else yesterday if active, else 0 streak
      let currentCheckDate = null;
      if (activeDateMap[todayStr]) {
        currentCheckDate = new Date();
      } else if (activeDateMap[yesterdayStr]) {
        currentCheckDate = yesterdayDate;
      }

      let currentStreak = 0;
      if (currentCheckDate) {
        let cursor = new Date(currentCheckDate);
        while (true) {
          const ds = cursor.toISOString().split("T")[0];
          if (activeDateMap[ds]) {
            currentStreak++;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
          } else {
            break;
          }
        }
      }

      // Calculate longest streak across entire history
      let longestStreak = 0;
      let tempStreak = 0;
      let prevDate = null;
      activeDates.forEach((ds) => {
        const curr = new Date(ds);
        if (!prevDate) {
          tempStreak = 1;
        } else {
          const diffDays = Math.round((curr - prevDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        prevDate = curr;
      });

      const lastSolvedDate = activeDates[activeDates.length - 1];

      // Discrepancy cross-check logging
      if (apiStreak > 0 && apiStreak !== currentStreak) {
        if (Logger && Logger.warn) {
          Logger.warn(`LeetCodeGraphQLService: Discrepancy detected! API reported streak (${apiStreak}), calendar calculated streak (${currentStreak})`);
        }
      }

      return {
        calculatedCurrentStreak: currentStreak,
        longestCalculatedStreak: Math.max(longestStreak, currentStreak),
        lastSolvedDate,
        yesterdaySolved,
        activeDateMap,
        timestampComparisonTable
      };
    }

    /**
     * Generate 30-day activity heatmap array from submissionCalendar.
     * Each day contains { date, count, solved, level: 0-4 }.
     * @param {Object} activeDateMap
     * @returns {Array<Object>} 30-day heatmap records
     */
    generate30DayActivityHeatmap(activeDateMap = {}) {
      const heatmap = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const count = activeDateMap[dateStr] || 0;
        const solved = count > 0;

        let level = 0;
        if (count >= 7) level = 4;
        else if (count >= 4) level = 3;
        else if (count >= 2) level = 2;
        else if (count === 1) level = 1;

        heatmap.push({
          date: dateStr,
          count,
          solved,
          level
        });
      }

      return heatmap;
    }

    /**
     * Execute POST GraphQL query with 429 exponential backoff retry.
     * @param {string} query
     * @param {Object} variables
     * @param {number} attempt
     * @returns {Promise<Object>}
     */
    async executeQuery(query, variables = {}, attempt = 1) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ query, variables }),
          credentials: "include"
        });

        if (response.status === 429 && attempt <= 3) {
          const delay = this.backoffDelayMs * Math.pow(2, attempt - 1);
          if (Logger && Logger.warn) Logger.warn(`LeetCodeGraphQLService: Rate limited (429). Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          return this.executeQuery(query, variables, attempt + 1);
        }

        if (!response.ok) {
          throw new Error(`GraphQL HTTP ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this.lastQueryTime = new Date().toISOString();
        return data;
      } catch (err) {
        if (Logger && Logger.warn) Logger.warn("LeetCodeGraphQLService fetch error:", err.message);
        throw err;
      }
    }

    /**
     * Fetch complete real profile, contest rankings, and activity calendar.
     * Updates DeveloperDataStore & DataProvenance.
     * @returns {Promise<boolean>} Success flag
     */
    async syncRealUserProfile() {
      try {
        // 1. Fetch current signed-in user status
        const statusRes = await this.executeQuery(USER_STATUS_QUERY);
        const userStatus = statusRes && statusRes.data ? statusRes.data.userStatus : null;

        if (!userStatus || !userStatus.isSignedIn || !userStatus.username) {
          DeveloperDataStore.status.authenticated = false;
          DeveloperDataStore.status.loaded = true;
          DeveloperDataStore.contests.available = false;
          DeveloperDataStore.contests.displayStatus = "Waiting for authentication";
          DeveloperDataStore.setProvenance("profile", DataProvenance.failed("LeetCode GraphQL", "globalData", "Unauthenticated session"));
          DeveloperDataStore.notifySubscribers();
          return false;
        }

        DeveloperDataStore.rawGraphQL = DeveloperDataStore.rawGraphQL || {};
        DeveloperDataStore.rawGraphQL.globalData = statusRes;

        const username = userStatus.username;
        if (DeveloperDataStore.profile.username && DeveloperDataStore.profile.username !== username) {
          if (DeveloperDataStore.clearCuratedListsCache) {
            DeveloperDataStore.clearCuratedListsCache();
          }
        }
        DeveloperDataStore.status.authenticated = true;
        DeveloperDataStore.profile.username = username;
        DeveloperDataStore.profile.userAvatar = userStatus.avatar || null;
        DeveloperDataStore.setProvenance("profile", DataProvenance.passed("LeetCode GraphQL", "globalData", 100));

        // 2. Fetch User Profile & Solved Stats
        try {
          const profileRes = await this.executeQuery(USER_PROFILE_QUERY, { username });
          const matchedUser = profileRes && profileRes.data ? profileRes.data.matchedUser : null;

          if (matchedUser) {
            if (matchedUser.profile) {
              DeveloperDataStore.profile.realName = matchedUser.profile.realName || null;
              DeveloperDataStore.profile.countryName = matchedUser.profile.countryName || null;
              DeveloperDataStore.profile.ranking = matchedUser.profile.ranking || null;
              DeveloperDataStore.profile.reputation = matchedUser.profile.reputation || null;
              DeveloperDataStore.profile.starRating = matchedUser.profile.starRating || null;
            }
            DeveloperDataStore.profile.profileUrl = `https://leetcode.com/${username}/`;

            // Raw GraphQL Storage
            DeveloperDataStore.rawGraphQL = DeveloperDataStore.rawGraphQL || {};
            DeveloperDataStore.rawGraphQL.getUserProfile = profileRes;

            // Parse solved counts & calculate acceptance rate
            const acStats = matchedUser.submitStatsGlobal ? matchedUser.submitStatsGlobal.acSubmissionNum : [];
            const totalStats = matchedUser.submitStatsGlobal ? matchedUser.submitStatsGlobal.totalSubmissionNum : [];
            let totalSolved = 0, easy = 0, medium = 0, hard = 0;
            acStats.forEach((s) => {
              if (s.difficulty === "All") totalSolved = s.count || 0;
              else if (s.difficulty === "Easy") easy = s.count || 0;
              else if (s.difficulty === "Medium") medium = s.count || 0;
              else if (s.difficulty === "Hard") hard = s.count || 0;
            });

            const acAllObj = acStats.find((s) => s.difficulty === "All");
            const totalAllObj = totalStats.find((s) => s.difficulty === "All");
            const acSubmissions = acAllObj ? (acAllObj.submissions !== undefined ? acAllObj.submissions : acAllObj.count || 0) : totalSolved;
            const totalSubmissions = totalAllObj ? (totalAllObj.submissions !== undefined ? totalAllObj.submissions : totalAllObj.count || 0) : totalSolved;
            const acceptanceRate = totalSubmissions > 0 ? Math.round((acSubmissions / totalSubmissions) * 1000) / 10 : 0;

            DeveloperDataStore.stats.totalSolved = totalSolved;
            DeveloperDataStore.stats.easy = easy;
            DeveloperDataStore.stats.medium = medium;
            DeveloperDataStore.stats.hard = hard;
            DeveloperDataStore.stats.acSubmissions = acSubmissions;
            DeveloperDataStore.stats.totalSubmissions = totalSubmissions;
            DeveloperDataStore.stats.acceptanceRate = acceptanceRate;

            // Validate stats metrics
            if (MetricValidationService) MetricValidationService.validateStats(DeveloperDataStore.stats);
          }
        } catch (err) {
          DeveloperDataStore.setProvenance("stats", DataProvenance.failed("LeetCode GraphQL", "getUserProfile", err.message));
        }

        // 3. Fetch Contest Rankings & History
        try {
          let contestRes = await this.executeQuery(CONTEST_RANKING_QUERY, { username });
          let ranking = contestRes && contestRes.data ? contestRes.data.userContestRanking : null;
          let history = contestRes && contestRes.data && Array.isArray(contestRes.data.userContestRankingHistory) ? contestRes.data.userContestRankingHistory : [];

          // If username parameter returned null ranking & empty history, fallback to userSlug query
          if (!ranking && history.length === 0) {
            try {
              const slugRes = await this.executeQuery(CONTEST_RANKING_SLUG_QUERY, { username });
              if (slugRes && slugRes.data) {
                contestRes = slugRes;
                ranking = slugRes.data.userContestRanking || ranking;
                history = Array.isArray(slugRes.data.userContestRankingHistory) ? slugRes.data.userContestRankingHistory : history;
              }
            } catch (e) {}
          }

          DeveloperDataStore.rawGraphQL.getUserContestRanking = contestRes;

          let extractedRating = 0;
          let attendedCount = ranking ? (ranking.attendedContestsCount || 0) : 0;
          let globalRanking = ranking ? (ranking.globalRanking || 0) : 0;
          let topPercentage = ranking ? (ranking.topPercentage || 0) : 0;

          if (ranking && typeof ranking.rating === 'number' && ranking.rating > 0) {
            extractedRating = Math.round(ranking.rating);
          }

          // Priority override: Latest contest entry from contest history
          const validHistory = history.filter(h => h && typeof h.rating === 'number' && h.rating > 0);
          if (validHistory.length > 0) {
            const latestContest = validHistory[validHistory.length - 1];
            extractedRating = Math.round(latestContest.rating);
            if (!attendedCount) attendedCount = validHistory.length;
          }

          // Unrated default starting rating guard
          if (extractedRating === 1500 && attendedCount === 0) {
            extractedRating = 0;
          }

          if (extractedRating > 0) {
            DeveloperDataStore.contests.available = true;
            DeveloperDataStore.contests.attendedCount = attendedCount;
            DeveloperDataStore.contests.rating = extractedRating;
            DeveloperDataStore.contests.globalRanking = globalRanking;
            DeveloperDataStore.contests.topPercentage = DataNormalizationService ? DataNormalizationService.normalizePercentage(topPercentage) : topPercentage;
            DeveloperDataStore.contests.displayStatus = `🏆 ${extractedRating}`;
            DeveloperDataStore.contests.ratingHistory = history.filter((h) => h && h.attended).map((h) => ({
              contestTitle: h.contest ? h.contest.title : "Contest",
              rating: Math.round(h.rating || 0),
              ranking: h.ranking || 0,
              date: DataNormalizationService ? DataNormalizationService.normalizeDate(h.contest ? h.contest.startTime : null) : new Date().toISOString()
            }));

            if (MetricValidationService) MetricValidationService.validateContests(DeveloperDataStore.contests);
          } else {
            DeveloperDataStore.contests.available = false;
            DeveloperDataStore.contests.rating = 0;
            DeveloperDataStore.contests.displayStatus = "No contest history";
            DeveloperDataStore.setProvenance("contests", DataProvenance.passed("LeetCode GraphQL", "getUserContestRanking", 100));
          }
        } catch (err) {
          DeveloperDataStore.contests.available = false;
          DeveloperDataStore.contests.displayStatus = "Contest history unavailable";
          DeveloperDataStore.setProvenance("contests", DataProvenance.failed("LeetCode GraphQL", "getUserContestRanking", err.message));
        }

        // 4. Fetch Calendar & Calculate Authoritative Streak & 30-Day Activity Heatmap
        try {
          const calRes = await this.executeQuery(CALENDAR_QUERY, { username });
          DeveloperDataStore.rawGraphQL.userCalendar = calRes;
          DeveloperDataStore.rawGraphQL.recentAcSubmissionList = calRes && calRes.data ? calRes.data.recentAcSubmissionList || [] : [];
          
          // If repository scan has not hydrated yet, use GraphQL submissions as supplementary fallback
          if (!DeveloperDataStore.curatedLists || !DeveloperDataStore.curatedLists.hydrated || DeveloperDataStore.curatedLists.source !== "repository") {
            const allSolvedSlugs = await this.fetchAllUserSubmissions(username);
            DeveloperDataStore.updateCuratedLists(allSolvedSlugs, "graphql");
          }
          const streakCounter = calRes && calRes.data ? calRes.data.streakCounter : null;
          const calUser = calRes && calRes.data ? calRes.data.matchedUser : null;
          if (calUser && calUser.userCalendar) {
            const rawCal = calUser.userCalendar.submissionCalendar;
            const calendarStreak = typeof calUser.userCalendar.streak === "number" ? calUser.userCalendar.streak : 0;

            const streakResult = this.computeStreakFromCalendar(rawCal, calendarStreak);
            const reconstructedStreak = streakResult.calculatedCurrentStreak;
            const longestCalculatedStreak = streakResult.longestCalculatedStreak;

            const rawOfficialCount = streakCounter && typeof streakCounter.streakCount === "number" ? streakCounter.streakCount : null;
            const daysSkipped = streakCounter && typeof streakCounter.daysSkipped === "number" ? streakCounter.daysSkipped : 0;
            const currentDayCompleted = streakCounter && typeof streakCounter.currentDayCompleted === "boolean" ? streakCounter.currentDayCompleted : false;

            let officialStreak = rawOfficialCount;
            let isFallback = false;

            if (officialStreak === null || officialStreak === undefined) {
              officialStreak = calendarStreak !== null ? calendarStreak : reconstructedStreak;
              isFallback = true;
            }

            DeveloperDataStore.stats.officialStreak = officialStreak;
            DeveloperDataStore.stats.calendarStreak = calendarStreak;
            DeveloperDataStore.stats.reconstructedStreak = reconstructedStreak;
            DeveloperDataStore.stats.daysSkipped = daysSkipped;
            DeveloperDataStore.stats.currentDayCompleted = currentDayCompleted;

            if (globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.ExtensionIconService) {
              globalThis.LeetCodeAutoSync.ExtensionIconService.updateStreakIcon(officialStreak, currentDayCompleted);
            }
            DeveloperDataStore.stats.longestStreak = Math.max(longestCalculatedStreak, officialStreak);
            DeveloperDataStore.stats.longestCalculatedStreak = longestCalculatedStreak;
            DeveloperDataStore.stats.lastSolvedDate = streakResult.lastSolvedDate;
            DeveloperDataStore.stats.yesterdaySolved = streakResult.yesterdaySolved;
            DeveloperDataStore.stats.totalActiveDays = calUser.userCalendar.totalActiveDays || 0;
            DeveloperDataStore.stats.timestampComparisonTable = streakResult.timestampComparisonTable;

            const diff = officialStreak - reconstructedStreak;
            const status = isFallback
              ? "CALCULATED_FALLBACK"
              : (diff === 0 ? "MATCH" : "OFFICIAL_OVERRIDE");

            const differenceReason = isFallback
              ? "Official API streak missing. Displaying calculated submission calendar streak as fallback."
              : (daysSkipped > 0
                  ? `Official streak includes ${daysSkipped} skipped days (Time Travel Tickets / recovery).`
                  : (diff !== 0
                      ? "The official LeetCode streak differs from the reconstructed streak."
                      : "Official streak matches calculated submission calendar streak."));

            DeveloperDataStore.stats.streakTrace = {
              officialStreak: officialStreak,
              calendarStreak: calendarStreak,
              reconstructedStreak: reconstructedStreak,
              calculatedCurrentStreak: reconstructedStreak,
              daysSkipped: daysSkipped,
              currentDayCompleted: currentDayCompleted,
              longestCalculatedStreak: longestCalculatedStreak,
              difference: diff,
              status: status,
              differenceReason: differenceReason,
              verifiedAt: new Date().toISOString()
            };

            // Log Telemetry format as specified
            if (Logger && Logger.info) {
              const telemetryLines = [
                "================ STREAK TELEMETRY ================",
                `Official Streak: ${officialStreak}`,
                `Calendar Streak: ${calendarStreak}`,
                `Reconstructed Streak: ${reconstructedStreak}`,
                `Skipped Days: ${daysSkipped}`,
                `Current Day Completed: ${currentDayCompleted}`,
                `Displayed Streak: 🔥 ${officialStreak} ${officialStreak === 1 ? "Day" : "Days"}`,
                "=================================================="
              ];
              Logger.info(telemetryLines.join("\n"));
            }

            // Set metric provenances
            if (isFallback) {
              DeveloperDataStore.setProvenance("officialStreak", DataProvenance.passed("submissionCalendar", "Deterministic reconstruction (Fallback)", 100));
            } else {
              DeveloperDataStore.setProvenance("officialStreak", DataProvenance.passed("LeetCode GraphQL", "streakCounter.streakCount", 100));
            }
            DeveloperDataStore.setProvenance("calendarStreak", DataProvenance.passed("LeetCode GraphQL", "userCalendar.streak", 100));
            DeveloperDataStore.setProvenance("reconstructedStreak", DataProvenance.passed("submissionCalendar", "Deterministic reconstruction", 100));

            // Save activeDateMap and generate 30-Day Activity Heatmap
            DeveloperDataStore.stats.activeDateMap = streakResult.activeDateMap || {};
            DeveloperDataStore.stats.activityHeatmap = this.generate30DayActivityHeatmap(streakResult.activeDateMap);
            DeveloperDataStore.setProvenance("calendar", DataProvenance.passed("Submission Calendar", "userCalendar", 100));
          }
        } catch (err) {
          DeveloperDataStore.setProvenance("calendar", DataProvenance.failed("Submission Calendar", "userCalendar", err.message));
        }

        // Fetch Active Daily Challenge (Title, difficulty, topics, company tags, solved status)
        await this.fetchDailyChallenge();

        DeveloperDataStore.status.lastFetched = new Date().toISOString();
        DeveloperDataStore.status.loaded = true;
        DeveloperDataStore.notifySubscribers();
        return true;
      } catch (err) {
        // Even if authenticated profile fails, attempt fetching daily challenge
        await this.fetchDailyChallenge();
        DeveloperDataStore.status.authenticated = false;
        DeveloperDataStore.status.loaded = true;
        DeveloperDataStore.status.errors.push(err.message);
        DeveloperDataStore.notifySubscribers();
        return false;
      }
    }

    /**
     * Fetch active LeetCode daily coding challenge question, topic tags, company tags, and completion status.
     */
    async fetchDailyChallenge() {
      try {
        const res = await this.executeQuery(DAILY_CHALLENGE_QUERY);
        const activeQ = res && res.data ? res.data.activeDailyCodingChallengeQuestion : null;
        if (activeQ && activeQ.question) {
          const q = activeQ.question;
          const isSolved = activeQ.userStatus === "Finish";
          const frontendId = q.questionFrontendId || "";
          const title = frontendId ? `${frontendId}. ${q.title}` : q.title;
          const difficulty = q.difficulty || "Medium";
          const acRateNum = typeof q.acRate === "number" ? q.acRate : (parseFloat(q.acRate) || 0);
          const acceptanceRate = acRateNum > 0 ? `${acRateNum.toFixed(2)}%` : "—";
          const topics = Array.isArray(q.topicTags) && q.topicTags.length > 0 ? q.topicTags.map((t) => t.name) : [];
          const url = activeQ.link
            ? (activeQ.link.startsWith("http") ? activeQ.link : `https://leetcode.com${activeQ.link}`)
            : (q.titleSlug ? `https://leetcode.com/problems/${q.titleSlug}/` : "https://leetcode.com/problemset/all/");

          const companies = await this.fetchCompanyTagsForProblem(q.titleSlug, topics);

          const dailyStatus = {
            title,
            difficulty,
            acceptanceRate,
            url,
            isSolved,
            topics,
            companies,
            newInText: this.calculateDailyCountdown()
          };

          DeveloperDataStore.stats.dailyChallengeStatus = dailyStatus;
          if (typeof DeveloperDataStore.stats.currentDayCompleted !== "boolean" || isSolved) {
            DeveloperDataStore.stats.currentDayCompleted = isSolved;
          }
          return dailyStatus;
        }
      } catch (err) {
        if (Logger && Logger.warn) Logger.warn("LeetCodeGraphQLService: Failed to fetch active daily challenge:", err.message);
      }
      return null;
    }

    calculateDailyCountdown() {
      const now = new Date();
      const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `New in ${hours}h ${mins}m`;
    }

    async fetchCompanyTagsForProblem(slug, topics = []) {
      if (!slug) return [];
      try {
        const res = await this.executeQuery(QUESTION_COMPANY_TAGS_QUERY, { titleSlug: slug });
        const q = res && res.data ? res.data.question : null;
        if (q) {
          if (q.companyTagStats) {
            try {
              const statsObj = typeof q.companyTagStats === "string" ? JSON.parse(q.companyTagStats) : q.companyTagStats;
              const companyMap = new Map();
              Object.keys(statsObj).forEach((periodKey) => {
                const list = statsObj[periodKey];
                if (Array.isArray(list)) {
                  list.forEach((item) => {
                    if (item && item.name) {
                      const count = item.timesEncountered || item.count || 1;
                      companyMap.set(item.name, (companyMap.get(item.name) || 0) + count);
                    }
                  });
                }
              });

              if (companyMap.size > 0) {
                const sorted = Array.from(companyMap.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([name, count]) => `${name} (${count})`);
                return sorted;
              }
            } catch (e) {
              // Ignore parse error
            }
          }

          if (Array.isArray(q.companyTags) && q.companyTags.length > 0) {
            return q.companyTags.slice(0, 3).map((ct) => ct.name);
          }
        }
      } catch (err) {
        if (Logger && Logger.warn) Logger.warn(`LeetCodeGraphQLService: Error querying company tags for ${slug}:`, err.message);
      }

      // Tier 2: Query Authentic LeetCode Premium Dataset & Topic Resolver Service
      if (globalThis.LeetCodeAutoSync && globalThis.LeetCodeAutoSync.CompanyTagsDatasetService) {
        const companies = globalThis.LeetCodeAutoSync.CompanyTagsDatasetService.getCompaniesForProblem(slug, topics);
        if (companies && companies.length > 0) {
          return companies;
        }
      }

      return [];
    }

    /**
     * Fetch complete paginated list of accepted submissions for the authenticated user
     * @param {string} username
     * @returns {Promise<Array<string>>} Array of normalized titleSlugs
     */
    async fetchAllUserSubmissions(username) {
      const allSolvedSlugs = new Set();
      const normalize = LeetCodeAutoSync.normalizeTitleSlug || (s => s ? String(s).toLowerCase().trim() : null);

      // 1. Collect from recentAcSubmissionList
      if (DeveloperDataStore.rawGraphQL && Array.isArray(DeveloperDataStore.rawGraphQL.recentAcSubmissionList)) {
        DeveloperDataStore.rawGraphQL.recentAcSubmissionList.forEach((s) => {
          const norm = normalize(s && (s.titleSlug || s.slug));
          if (norm) allSolvedSlugs.add(norm);
        });
      }

      // 2. Fetch paginated accepted submissions list via GraphQL
      const SUBMISSION_LIST_QUERY = `
        query submissionList($offset: Int!, $limit: Int!) {
          submissionList(offset: $offset, limit: $limit) {
            hasNext
            submissions {
              id
              titleSlug
              statusDisplay
            }
          }
        }
      `;

      let offset = 0;
      const limit = 100;
      let hasNext = true;
      let pageCount = 0;
      const maxPages = 25;

      while (hasNext && pageCount < maxPages) {
        pageCount++;
        try {
          const res = await this.executeQuery(SUBMISSION_LIST_QUERY, { offset, limit });
          const subList = res && res.data ? res.data.submissionList : null;
          if (!subList || !Array.isArray(subList.submissions)) {
            break;
          }

          subList.submissions.forEach((sub) => {
            if (sub && (sub.statusDisplay === "Accepted" || sub.statusDisplay === "ACCEPTED") && sub.titleSlug) {
              const norm = normalize(sub.titleSlug);
              if (norm) allSolvedSlugs.add(norm);
            }
          });

          hasNext = subList.hasNext === true;
          offset += limit;
        } catch (err) {
          break;
        }
      }

      return Array.from(allSolvedSlugs);
    }
  }

  LeetCodeAutoSync.LeetCodeGraphQLService = new LeetCodeGraphQLService();

})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : this));
