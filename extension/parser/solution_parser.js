/**
 * @fileoverview DOM and Monaco editor parser to extract solution source code.
 * Implements a hybrid strategy (main-world memory model access + DOM fallback).
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  /**
   * Centralized DOM selectors for Monaco Editor.
   * @const {Object<string, string[]>}
   */
  const SELECTORS = {
    MONACO_CONTAINER: ['.monaco-editor', '.editor'],
    VIEW_LINE: ['.view-line', '.line-content']
  };

  /**
   * Attempts to inject a script to retrieve the Monaco model value from the main page world.
   * Highly accurate: bypasses virtualization and preserves all spaces, newlines, and tabs.
   * @returns {Promise<string|null>} Resolves with full code or null if failed.
   */
  function extractCodeViaInjection() {
    return new Promise((resolve) => {
      // Create a unique random event name to prevent cross-talk
      const eventName = `LEETCODE_CODE_EXTRACT_` + Math.random().toString(36).substring(2, 9).toUpperCase();

      const handler = (event) => {
        window.removeEventListener(eventName, handler);
        resolve(event.detail);
      };

      window.addEventListener(eventName, handler);

      // Create inline script tag
      const script = document.createElement("script");
      script.textContent = `
        try {
          if (window.monaco && window.monaco.editor) {
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
              const code = models[0].getValue();
              window.dispatchEvent(new CustomEvent('${eventName}', { detail: code }));
            } else {
              window.dispatchEvent(new CustomEvent('${eventName}', { detail: null }));
            }
          } else {
            window.dispatchEvent(new CustomEvent('${eventName}', { detail: null }));
          }
        } catch (err) {
          window.dispatchEvent(new CustomEvent('${eventName}', { detail: null }));
        }
      `;

      // Inject script to head/document element
      (document.head || document.documentElement).appendChild(script);
      script.remove();

      // Implement a fast timeout fallback if script is blocked by CSP
      setTimeout(() => {
        window.removeEventListener(eventName, handler);
        resolve(null);
      }, 150);
    });
  }

  /**
   * Fallback scraping of editor lines directly from the DOM.
   * @returns {string} The reconstructed code.
   * @throws {Error} If editor components cannot be found.
   */
  function extractCodeViaDOM() {
    // 1. Locate Monaco container
    let container = null;
    for (const sel of SELECTORS.MONACO_CONTAINER) {
      container = document.querySelector(sel);
      if (container) break;
    }

    if (!container) {
      throw new Error("Monaco Editor container element not found in DOM");
    }

    // 2. Query lines inside the editor
    let lines = [];
    for (const sel of SELECTORS.VIEW_LINE) {
      const lineEls = container.querySelectorAll(sel);
      if (lineEls && lineEls.length > 0) {
        lines = Array.from(lineEls).map((el) => el.textContent || "");
        break;
      }
    }

    if (lines.length === 0) {
      throw new Error("No text content or view lines could be scraped from the editor");
    }

    return lines.join("\n");
  }

  const SolutionParser = {
    /**
     * Parses the current user solution from the page editor.
     * @returns {Promise<string>} The parsed code.
     */
    async parse() {
      // 1. Try script injection first (Monaco Model API)
      try {
        const injectedCode = await extractCodeViaInjection();
        if (injectedCode !== null && injectedCode !== undefined) {
          Logger.info("SolutionParser: Successfully extracted code via main-world Monaco API");
          return injectedCode;
        }
      } catch (err) {
        Logger.warn("SolutionParser: Injected parser failed, falling back to DOM parsing:", err.message);
      }

      // 2. Fall back to DOM node scraping
      Logger.info("SolutionParser: Falling back to DOM-based lines compilation");
      return extractCodeViaDOM();
    }
  };

  LeetCodeAutoSync.SolutionParser = SolutionParser;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
