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

  // Metadata DOM element selections
  const metadataCard = document.getElementById("metadata-card");
  const problemTitleText = document.getElementById("problem-title-display");
  const problemIdText = document.getElementById("problem-id-display");
  const problemDifficultyBadge = document.getElementById("problem-difficulty-display");
  const problemLanguageText = document.getElementById("problem-language-display");
  const solutionSizeText = document.getElementById("solution-size-display");
  const extractionStatusBadge = document.getElementById("extraction-status-display");
  const problemUrlLink = document.getElementById("problem-url-display");

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

  /**
   * Updates the problem details card with extracted metadata and solution size.
   * @param {Object|null} submission - Extracted AcceptedSubmission model.
   */
  function updateMetadataUI(submission) {
    if (!submission || !submission.metadata) {
      metadataCard.classList.add("hidden");
      return;
    }

    const { metadata, code } = submission;
    const { id, title, difficulty, language, url } = metadata;

    problemTitleText.textContent = title;
    problemTitleText.title = title;

    problemIdText.textContent = `#${id}`;

    problemDifficultyBadge.textContent = difficulty;
    problemDifficultyBadge.className = `badge badge-${difficulty.toLowerCase()}`;

    problemLanguageText.textContent = language;

    // Display solution length and success status
    solutionSizeText.textContent = code ? `${code.length} characters` : "0 characters";
    extractionStatusBadge.textContent = "Success";
    extractionStatusBadge.className = "badge badge-easy"; // reusing green Easy badge for Success

    problemUrlLink.href = url;
    problemUrlLink.textContent = url;
    problemUrlLink.title = url;

    metadataCard.classList.remove("hidden");
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

  // Request the cached accepted problem details from background cache
  chrome.runtime.sendMessage({ type: MessageTypes.GET_ACCEPTED_SUBMISSION }, (response) => {
    if (chrome.runtime.lastError) {
      Logger.warn("Failed to retrieve accepted submission details from background worker:", chrome.runtime.lastError.message);
      updateMetadataUI(null);
      return;
    }

    if (response && response.status === "success") {
      updateMetadataUI(response.metadata);
    } else {
      updateMetadataUI(null);
    }
  });

  // Listen for live updates (e.g. while the popup is open)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MessageTypes.SUBMISSION_STARTED) {
      Logger.info("Popup: Received SUBMISSION_STARTED event");
      updateSubmissionUI({ status: "RUNNING", verdict: null });
      // When starting a new submission, clear the old metadata display
      updateMetadataUI(null);
    } else if (message.type === MessageTypes.SUBMISSION_FINISHED) {
      Logger.info("Popup: Received SUBMISSION_FINISHED event with verdict", message.verdict);
      updateSubmissionUI({ status: "FINISHED", verdict: message.verdict });
    } else if (message.type === MessageTypes.SUBMISSION_ACCEPTED) {
      Logger.info("Popup: Received SUBMISSION_ACCEPTED event with metadata", message.payload);
      updateMetadataUI(message.payload);
    } else if (message.type === MessageTypes.PAGE_CHANGED) {
      // If navigation occurs, reset popup view
      updateSubmissionUI({ status: "IDLE", verdict: null });
      updateMetadataUI(null);
    }
  });
});
