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
});
