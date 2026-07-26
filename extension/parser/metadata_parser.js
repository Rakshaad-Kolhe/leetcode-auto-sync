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

  /**
   * Converts a raw problem title to its expected URL slug.
   * @param {string} title
   * @returns {string}
   */
  function titleToSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  function extractTitleAndIdDirect() {
    const currentUrl = PageContext.getCurrentUrl();
    const currentSlug = PageContext.getProblemSlug(currentUrl);

    for (const selector of SELECTORS.QUESTION_TITLE) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.trim();
        if (!text) continue;

        // Matches numeric ID prefix, e.g. "49. Group Anagrams"
        const match = text.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
          const id = parseInt(match[1], 10);
          const title = match[2].trim();
          const domSlug = titleToSlug(title);

          if (currentSlug && domSlug && domSlug !== currentSlug) {
            Logger.warn(`MetadataParser: DOM title "${title}" (slug "${domSlug}") disagrees with URL slug "${currentSlug}". Rejecting stale DOM element.`);
            continue;
          }

          return { id, title };
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
  /**
   * Extracts the selected programming language from the editor UI.
   * Uses three tiers:
   *   1. Cached value (survives navigation away from editor if for same slug)
   *   2. Attribute-based selectors (stable data-cy / id patterns)
   *   3. Text-content scan of all buttons/role=button (handles UI changes)
   * @returns {string|null}
   */
  function extractLanguage() {
    const currentUrl = PageContext.getCurrentUrl();
    const currentSlug = PageContext.getProblemSlug(currentUrl);

    // Tier 1: Return cached value if available and bound to current slug.
    if (cachedSlug === currentSlug && cachedLanguage) {
      Logger.info(`MetadataParser: Using cached language "${cachedLanguage}" for slug "${currentSlug}"`);
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
          cachedSlug = currentSlug;
          return lang;
        }
      }
    }

    // Tier 3: Broad text-content scan.
    const knownLangs = [
      'javascript', 'typescript', 'python3', 'python', 'elixir', 'erlang',
      'kotlin', 'racket', 'scala', 'swift', 'dart', 'java', 'rust', 'php',
      'ruby', 'c++', 'cpp', 'c#', 'go', 'c'
    ];
    const buttonCandidates = document.querySelectorAll('button, [role="button"], [role="combobox"], [role="option"]');
    for (const el of buttonCandidates) {
      const raw = el.textContent.trim();
      if (!raw || raw.length > 40) continue;
      const clean = raw.toLowerCase().replace(/\s+/g, '');
      for (const lang of knownLangs) {
        const normalLang = lang.replace(/\s+/g, '');
        const isExact = clean === normalLang;
        const isPrefix = clean.startsWith(normalLang) &&
          !/[a-z0-9]/.test(clean[normalLang.length] || '');
        if (isExact || isPrefix) {
          Logger.info(`MetadataParser: extractLanguage tier-3 text scan matched "${raw}" for lang "${lang}"`);
          const normalized = normalizeLanguage(raw);
          cachedLanguage = normalized;
          cachedSlug = currentSlug;
          return normalized;
        }
      }
    }

    Logger.warn("MetadataParser: extractLanguage() all three tiers failed. Selectors tried:", SELECTORS.LANGUAGE_SELECT);
    return null;
  }



  function clearCache() {
    cachedDifficulty = null;
    cachedTitleAndId = null;
    cachedSlug = null;
    cachedLanguage = null;
    Logger.info("MetadataParser: Internal cache cleared due to navigation");
  }

  const MetadataParser = {
    clearCache,

    /**
     * Clears all in-memory parser caches.
     */
    clearCache() {
      cachedDifficulty = null;
      cachedTitleAndId = null;
      cachedSlug = null;
      cachedLanguage = null;
      Logger.info("MetadataParser: In-memory metadata caches cleared.");
    },

    /**
     * Scrapes the page DOM for metadata and returns an immutable MetadataSnapshot.
     * @returns {MetadataSnapshot|null} Atomic frozen snapshot or null on parse failure.

     */
    parse() {
      try {
        const url = PageContext.getCurrentUrl();
        const slug = PageContext.getProblemSlug(url);

        // Clear stale cached metadata if slug has changed
        if (cachedSlug && cachedSlug !== slug) {
          clearCache();
        }

        const titleAndId = extractTitleAndId();
        const difficulty = extractDifficulty();
        const language = extractLanguage();
        const url = PageContext.getCurrentUrl();
        const slug = PageContext.getProblemSlug(url);
        const ObserverObj = LeetCodeAutoSync.Observer;
        const navVersion = ObserverObj && typeof ObserverObj.getNavigationVersion === "function"
          ? ObserverObj.getNavigationVersion()
          : 0;


        if (!titleAndId) {
          Logger.warn("Parser: Failed to extract Problem Title and ID");
          return null;
        }

        if (!slug) {
          Logger.warn("Parser: Failed to extract problem slug from URL:", url);
          return null;
        }

        const SnapshotClass = LeetCodeAutoSync.MetadataSnapshot;
        if (SnapshotClass) {
          const snapshot = new SnapshotClass({
            id: titleAndId.id,
            title: titleAndId.title,
            slug: slug,
            difficulty: difficulty,
            language: language,
            url: url,
            navVersion: navVersion
          });
          Logger.info(`Parser: Created frozen MetadataSnapshot [${snapshot.snapshotId}] (navVersion=${navVersion}):`, snapshot);
          return snapshot;

        }

        return {
          id: titleAndId.id,
          title: titleAndId.title,
          slug: slug,
          difficulty: difficulty,
          language: language,
          url: url,
          navVersion: navVersion
        };
      } catch (err) {
        Logger.error("Parser: Exception during DOM parsing or snapshot creation:", err);
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
        const ObserverObj = LeetCodeAutoSync.Observer;
        const startNavVersion = ObserverObj && typeof ObserverObj.getNavigationVersion === "function"
          ? ObserverObj.getNavigationVersion()
          : 0;

        Logger.info(`MetadataParser: Running preScrape() for slug: "${currentSlug}" [nav_version=${startNavVersion}]`);

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
            const nowNavVersion = ObserverObj && typeof ObserverObj.getNavigationVersion === "function"
              ? ObserverObj.getNavigationVersion()
              : 0;
            if (startNavVersion > 0 && nowNavVersion !== startNavVersion) {
              Logger.info(`MetadataParser: Ignoring preScrape timeout (${delay}ms) from past nav_version ${startNavVersion} (current: ${nowNavVersion})`);
              return;
            }

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
