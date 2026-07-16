/**
 * @fileoverview Popup interaction script.
 * Displays extension status and active page context by querying the background worker.
 */

document.addEventListener("DOMContentLoaded", () => {
  const { Logger, MessageTypes } = globalThis.LeetCodeAutoSync;

  Logger.info("Popup opened");

  // DOM element selections
  const versionElement = document.getElementById("version");
  const pageTypeBadge = document.getElementById("page-type");
  const slugContainer = document.getElementById("slug-container");
  const problemSlugText = document.getElementById("problem-slug");
  const currentUrlText = document.getElementById("current-url");
  
  // Submission DOM element selections
  const submissionStateBadge = document.getElementById("submission-state");
  const verdictContainer = document.getElementById("verdict-container");
  const submissionVerdictBadge = document.getElementById("submission-verdict");

  // Fetch extension manifest version
  try {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `Version ${manifest.version}`;
  } catch (err) {
    Logger.error("Failed to read extension version:", err);
    versionElement.textContent = "Version unknown";
  }

  /**
   * Updates the popup UI components based on context data.
   * @param {Object|null} context - Context object containing pageType, slug, and url.
   */
  function updateUI(context) {
    if (!context) {
      pageTypeBadge.textContent = "UNKNOWN";
      pageTypeBadge.className = "badge badge-unknown";
      slugContainer.classList.add("hidden");
      currentUrlText.textContent = "Not on LeetCode";
      currentUrlText.title = "Not on LeetCode";
      return;
    }

    const { pageType, slug, url } = context;

    // Update the Page Type Badge
    pageTypeBadge.textContent = pageType;
    pageTypeBadge.className = `badge badge-${pageType.toLowerCase()}`;

    // Update problem slug display
    if (slug) {
      problemSlugText.textContent = slug;
      problemSlugText.title = slug;
      slugContainer.classList.remove("hidden");
    } else {
      slugContainer.classList.add("hidden");
    }

    // Update URL text field
    currentUrlText.textContent = url;
    currentUrlText.title = url;
  }

  /**
   * Updates the submission status cards and badges.
   * @param {Object} subState - Object containing status and verdict.
   */
  function updateSubmissionUI(subState) {
    if (!subState) {
      submissionStateBadge.textContent = "IDLE";
      submissionStateBadge.className = "badge state-idle";
      verdictContainer.classList.add("hidden");
      return;
    }

    const { status, verdict } = subState;

    // Render State Badge
    submissionStateBadge.textContent = status;
    submissionStateBadge.className = `badge state-${status.toLowerCase()}`;

    // Render Verdict Badge if finished
    if (status === "FINISHED" && verdict) {
      submissionVerdictBadge.textContent = verdict;
      const cleanVerdictClass = verdict.toLowerCase().replace(/\s+/g, "-");
      submissionVerdictBadge.className = `badge verdict-${cleanVerdictClass}`;
      verdictContainer.classList.remove("hidden");
    } else if (status === "RUNNING") {
      submissionVerdictBadge.textContent = "Judging...";
      submissionVerdictBadge.className = "badge verdict-judging";
      verdictContainer.classList.remove("hidden");
    } else {
      verdictContainer.classList.add("hidden");
    }
  }

  // Request the active page context from background cache
  chrome.runtime.sendMessage({ type: MessageTypes.GET_CURRENT_CONTEXT }, (response) => {
    if (chrome.runtime.lastError) {
      Logger.warn("Failed to retrieve context from background worker:", chrome.runtime.lastError.message);
      updateUI(null);
      return;
    }

    if (response && response.status === "success") {
      updateUI(response.context);
    } else {
      updateUI(null);
    }
  });

  // Request the active submission state from background cache
  chrome.runtime.sendMessage({ type: MessageTypes.GET_SUBMISSION_STATE }, (response) => {
    if (chrome.runtime.lastError) {
      Logger.warn("Failed to retrieve submission state from background worker:", chrome.runtime.lastError.message);
      updateSubmissionUI(null);
      return;
    }

    if (response && response.status === "success") {
      updateSubmissionUI(response.submissionState);
    } else {
      updateSubmissionUI(null);
    }
  });

  // Listen for live updates (e.g. while the popup is open)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MessageTypes.SUBMISSION_STARTED) {
      Logger.info("Popup: Received SUBMISSION_STARTED event");
      updateSubmissionUI({ status: "RUNNING", verdict: null });
    } else if (message.type === MessageTypes.SUBMISSION_FINISHED) {
      Logger.info("Popup: Received SUBMISSION_FINISHED event with verdict", message.verdict);
      updateSubmissionUI({ status: "FINISHED", verdict: message.verdict });
    } else if (message.type === MessageTypes.PAGE_CHANGED) {
      // If navigation occurs, reset popup view
      updateSubmissionUI({ status: "IDLE", verdict: null });
    }
  });
});
