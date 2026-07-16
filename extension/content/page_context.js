/**
 * @fileoverview Page context detection helper.
 * Exposes methods to identify LeetCode domains, page types, problem slugs, etc.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { PageTypes } = LeetCodeAutoSync;

  /**
   * Checks if the given URL belongs to the LeetCode domain.
   * @param {string} urlStr - The URL to check.
   * @returns {boolean} True if the host is leetcode.com.
   */
  function isLeetCode(urlStr) {
    if (!urlStr) return false;
    try {
      const url = new URL(urlStr);
      return url.hostname === "leetcode.com" || url.hostname.endsWith(".leetcode.com");
    } catch (e) {
      return false;
    }
  }

  /**
   * Extracts the problem slug from a LeetCode URL if applicable.
   * Supports standard problem URLs and contest problem URLs.
   * @param {string} urlStr - The URL to extract from.
   * @returns {string|null} The problem slug, or null if not a problem page.
   */
  function getProblemSlug(urlStr) {
    if (!isLeetCode(urlStr)) return null;
    try {
      const url = new URL(urlStr);
      const path = url.pathname;
      const parts = path.split("/").filter(Boolean);

      // Standard problem: /problems/<slug>/...
      if (parts.length >= 2 && parts[0] === "problems") {
        return parts[1];
      }

      // Contest problem: /contest/<contest-name>/problems/<slug>/...
      if (parts.length >= 4 && parts[0] === "contest" && parts[2] === "problems") {
        return parts[3];
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Checks if the given URL is a problem page.
   * @param {string} urlStr - The URL to check.
   * @returns {boolean} True if it is a problem page.
   */
  function isProblemPage(urlStr) {
    return getProblemSlug(urlStr) !== null;
  }

  /**
   * Gets the current tab's URL.
   * @returns {string} The current window location href.
   */
  function getCurrentUrl() {
    return window.location.href;
  }

  /**
   * Identifies the page type based on the URL.
   * @param {string} urlStr - The URL to analyze.
   * @returns {string} The identified PageType.
   */
  function getPageType(urlStr) {
    if (!isLeetCode(urlStr)) {
      return PageTypes.UNKNOWN;
    }
    try {
      const url = new URL(urlStr);
      const path = url.pathname;

      if (path.startsWith("/contest")) {
        return PageTypes.CONTEST;
      }

      if (path.startsWith("/problems/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2 && parts[0] === "problems") {
          return PageTypes.PROBLEM;
        }
      }

      if (path.startsWith("/explore")) {
        return PageTypes.EXPLORE;
      }

      if (path.startsWith("/u/")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2 && parts[0] === "u") {
          return PageTypes.PROFILE;
        }
      }

      if (path === "/" || path === "" || path.startsWith("/dashboard")) {
        return PageTypes.HOME;
      }

      return PageTypes.UNKNOWN;
    } catch (e) {
      return PageTypes.UNKNOWN;
    }
  }

  LeetCodeAutoSync.PageContext = {
    isLeetCode,
    isProblemPage,
    getCurrentUrl,
    getProblemSlug,
    getPageType
  };

  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
