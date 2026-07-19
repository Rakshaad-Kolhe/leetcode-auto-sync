/**
 * @fileoverview DOM parser to extract LeetCode problem metadata.
 * Uses fallback selectors and stable attributes to withstand frontend updates.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, PageContext } = LeetCodeAutoSync;

  let cachedDifficulty = null;
  let cachedTitleAndId = null;
  let cachedSlug = null;
  let cachedLanguage = null;

  /**
   * Centralized DOM selectors to simplify future maintenance.
   * @const {Object<string, string[]>}
   */
  const SELECTORS = {
    QUESTION_TITLE: [
      '.text-title-large',
      '[data-cy="question-title"]',
      '[data-e2e-locator="question-title"]',
      'h1',
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

    // Exact match check
    if (mapping[clean]) return mapping[clean];

    // Substring fallback check (e.g. for language labels containing dropdown chevrons)
    for (const key of Object.keys(mapping)) {
      if (clean.includes(key)) {
        return mapping[key];
      }
    }

    return clean;
  }

  function extractTitleAndIdDirect() {
    for (const selector of SELECTORS.QUESTION_TITLE) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
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
   * Extracts the problem title and ID from heading components.
   * Parses structures like "49. Group Anagrams".
   * @returns {{id: number, title: string}|null}
   */
  function extractTitleAndId() {
    const currentUrl = PageContext.getCurrentUrl();
    const currentSlug = PageContext.getProblemSlug(currentUrl);
    if (cachedSlug === currentSlug && cachedTitleAndId) {
      Logger.info("MetadataParser: Using cached title and ID:", cachedTitleAndId);
      return cachedTitleAndId;
    }
    const val = extractTitleAndIdDirect();
    if (val) {
      cachedTitleAndId = val;
      cachedSlug = currentSlug;
      return val;
    }
    return null;
  }

  function extractDifficultyDirect() {
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
   * Extracts the problem difficulty level.
   * @returns {"Easy" | "Medium" | "Hard" | null}
   */
  function extractDifficulty() {
    const currentUrl = PageContext.getCurrentUrl();
    const currentSlug = PageContext.getProblemSlug(currentUrl);
    if (cachedSlug === currentSlug && cachedDifficulty) {
      Logger.info(`MetadataParser: Using cached difficulty "${cachedDifficulty}" for slug "${currentSlug}"`);
      return cachedDifficulty;
    }
    const diff = extractDifficultyDirect();
    if (diff) {
      cachedDifficulty = diff;
      cachedSlug = currentSlug;
      return diff;
    }
    return null;
  }

  /**
   * Extracts the selected programming language from the editor UI.
   * Uses three tiers:
   *   1. Cached value (survives navigation away from editor)
   *   2. Attribute-based selectors (stable data-cy / id patterns)
   *   3. Text-content scan of all buttons/role=button (handles UI changes)
   * @returns {string|null}
   */
  function extractLanguage() {
    // Tier 1: Return cached value if available.
    // The language picker disappears on submission detail pages.
    if (cachedLanguage) {
      Logger.info(`MetadataParser: Using cached language "${cachedLanguage}"`);
      return cachedLanguage;
    }

    // Tier 2: Attribute-based selectors
    for (const selector of SELECTORS.LANGUAGE_SELECT) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        Logger.info(`MetadataParser: extractLanguage tier-2 matched selector "${selector}", raw text: "${text}"`);
        if (text) {
          const lang = normalizeLanguage(text);
          cachedLanguage = lang;
          return lang;
        }
      }
    }

    // Tier 3: Broad text-content scan.
    // LeetCode renders the language picker as a plain button showing the display name
    // (e.g. "Python3", "C++", "Java"). Scan all buttons for a known language token.
    const knownLangs = [
      'python3', 'python', 'java', 'c++', 'cpp', 'c', 'c#', 'javascript', 'typescript',
      'ruby', 'swift', 'go', 'scala', 'kotlin', 'rust', 'php', 'racket', 'erlang', 'elixir', 'dart'
    ];
    const buttonCandidates = document.querySelectorAll('button, [role="button"], [role="combobox"], [role="option"]');
    for (const el of buttonCandidates) {
      const raw = el.textContent.trim();
      if (!raw || raw.length > 40) continue; // Skip empty or long composite labels
      const clean = raw.toLowerCase().replace(/\s+/g, '');
      for (const lang of knownLangs) {
        const normalLang = lang.replace(/\s+/g, '');
        if (clean === normalLang || clean.startsWith(normalLang)) {
          Logger.info(`MetadataParser: extractLanguage tier-3 text scan matched "${raw}" for lang "${lang}"`);
          const normalized = normalizeLanguage(raw);
          cachedLanguage = normalized;
          return normalized;
        }
      }
    }

    Logger.warn("MetadataParser: extractLanguage() all three tiers failed. Selectors tried:", SELECTORS.LANGUAGE_SELECT);
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
    },

    /**
     * Attempts to extract and cache difficulty, title, and language early —
     * while the problem editor page is still fully rendered.
     * Language in particular must be cached here because the selector disappears
     * once LeetCode navigates to the submission detail URL.
     */
    preScrape() {
      try {
        const currentUrl = PageContext.getCurrentUrl();
        const currentSlug = PageContext.getProblemSlug(currentUrl);
        Logger.info(`MetadataParser: Running preScrape() for slug: "${currentSlug}"`);

        // Reset cache if slug has changed
        if (cachedSlug !== currentSlug) {
          cachedDifficulty = null;
          cachedTitleAndId = null;
          cachedLanguage = null;
          cachedSlug = currentSlug;
        }

        const diff = extractDifficultyDirect();
        if (diff) {
          cachedDifficulty = diff;
          Logger.info(`MetadataParser: Pre-scraped difficulty: "${diff}"`);
        }

        const titleAndId = extractTitleAndIdDirect();
        if (titleAndId) {
          cachedTitleAndId = titleAndId;
          Logger.info("MetadataParser: Pre-scraped title and ID:", titleAndId);
        }

        // Language must be captured NOW while the editor UI is visible.
        const lang = extractLanguage();
        if (lang) {
          Logger.info(`MetadataParser: Pre-scraped language: "${lang}"`);
        }

        // Staggered timeouts to capture late-loaded elements
        [200, 500, 1000, 2000, 4000].forEach((delay) => {
          setTimeout(() => {
            const nowUrl = PageContext.getCurrentUrl();
            const nowSlug = PageContext.getProblemSlug(nowUrl);
            if (nowSlug !== currentSlug) return; // Navigated away, ignore

            if (!cachedDifficulty) {
              const d = extractDifficultyDirect();
              if (d) {
                cachedDifficulty = d;
                Logger.info(`MetadataParser: Pre-scraped difficulty (timeout ${delay}ms): "${d}"`);
              }
            }

            if (!cachedTitleAndId) {
              const t = extractTitleAndIdDirect();
              if (t) {
                cachedTitleAndId = t;
                Logger.info(`MetadataParser: Pre-scraped title and ID (timeout ${delay}ms):`, t);
              }
            }

            if (!cachedLanguage) {
              const l = extractLanguage();
              if (l) {
                Logger.info(`MetadataParser: Pre-scraped language (timeout ${delay}ms): "${l}"`);
              }
            }
          }, delay);
        });
      } catch (err) {
        Logger.error("MetadataParser: Exception inside preScrape():", err);
      }
    }
  };

  LeetCodeAutoSync.MetadataParser = MetadataParser;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
