/**
 * @fileoverview DOM parser to extract LeetCode problem metadata.
 * Uses fallback selectors and stable attributes to withstand frontend updates.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, PageContext } = LeetCodeAutoSync;

  /**
   * Centralized DOM selectors to simplify future maintenance.
   * @const {Object<string, string[]>}
   */
  const SELECTORS = {
    QUESTION_TITLE: [
      '[data-cy="question-title"]',
      '[data-e2e-locator="question-title"]',
      'h4[class*="title"]',
      'div[class*="question-title"]',
      'h3' // Fallback for contest page titles
    ],
    DIFFICULTY: [
      '[data-difficulty]',
      '[class*="difficulty-"]',
      'div[class*="difficulty"]',
      'span[class*="difficulty"]'
    ],
    LANGUAGE_SELECT: [
      '[data-cy="lang-select"]',
      'button[id^="lang-select"]',
      'button[id="lang-select"]',
      'button[class*="lang-select"]',
      '.lang-select'
    ]
  };

  /**
   * Normalizes programming language display names into standardized keys.
   * @param {string} rawLang - Raw display language text (e.g. "C++").
   * @returns {string} Normalized code language name.
   */
  function normalizeLanguage(rawLang) {
    const mapping = {
      'c++': 'cpp',
      'cpp': 'cpp',
      'java': 'java',
      'python': 'python',
      'python3': 'python3',
      'c': 'c',
      'c#': 'csharp',
      'csharp': 'csharp',
      'javascript': 'javascript',
      'js': 'javascript',
      'typescript': 'typescript',
      'ts': 'typescript',
      'ruby': 'ruby',
      'swift': 'swift',
      'go': 'go',
      'golang': 'go',
      'scala': 'scala',
      'kotlin': 'kotlin',
      'rust': 'rust',
      'php': 'php',
      'racket': 'racket',
      'erlang': 'erlang',
      'elixir': 'elixir',
      'dart': 'dart'
    };
    const clean = rawLang.toLowerCase().trim().replace(/\s+/g, '');
    return mapping[clean] || clean;
  }

  /**
   * Extracts the problem title and ID from heading components.
   * Parses structures like "49. Group Anagrams".
   * @returns {{id: number, title: string}|null}
   */
  function extractTitleAndId() {
    for (const selector of SELECTORS.QUESTION_TITLE) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (!text) continue;

        // Matches numeric ID prefix, e.g. "49. Group Anagrams"
        const match = text.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
          return {
            id: parseInt(match[1], 10),
            title: match[2].trim()
          };
        }
      }
    }
    return null;
  }

  /**
   * Extracts the problem difficulty level.
   * @returns {"Easy" | "Medium" | "Hard" | null}
   */
  function extractDifficulty() {
    // 1. Check direct difficulty text class or attr markers
    for (const selector of SELECTORS.DIFFICULTY) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent.trim();
        if (text === "Easy" || text === "Medium" || text === "Hard") {
          return text;
        }
      }
    }

    // 2. Scan leaf text elements inside the description pane as fallback
    const descriptionPane = document.querySelector('[data-key="description-content"]') || document.body;
    const leafSpans = descriptionPane.querySelectorAll('span, div, p');
    for (const el of leafSpans) {
      if (el.children.length === 0) {
        const text = el.textContent.trim();
        if (text === "Easy" || text === "Medium" || text === "Hard") {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * Extracts the selected programming language.
   * @returns {string|null}
   */
  function extractLanguage() {
    for (const selector of SELECTORS.LANGUAGE_SELECT) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text) {
          return normalizeLanguage(text);
        }
      }
    }
    return null;
  }

  const MetadataParser = {
    /**
     * Scrapes the page DOM for metadata.
     * @returns {Object|null} Semi-parsed metadata properties, or null on total parse failure.
     */
    parse() {
      try {
        const titleAndId = extractTitleAndId();
        const difficulty = extractDifficulty();
        const language = extractLanguage();
        const url = PageContext.getCurrentUrl();
        const slug = PageContext.getProblemSlug(url);

        if (!titleAndId) {
          Logger.warn("Parser: Failed to extract Problem Title and ID");
          return null;
        }

        return {
          id: titleAndId.id,
          title: titleAndId.title,
          slug: slug || "",
          difficulty: difficulty,
          language: language,
          url: url
        };
      } catch (err) {
        Logger.error("Parser: Exception during DOM parsing:", err);
        return null;
      }
    }
  };

  LeetCodeAutoSync.MetadataParser = MetadataParser;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
