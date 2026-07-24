/**
 * @fileoverview Robust multi-tier solution extraction engine for LeetCode Monaco Editor.
 * Priority Tier 1: Main-World Monaco Editor Model API (search all models for matching active solution)
 * Priority Tier 2: React Fiber / Internal DOM Editor Model State
 * Priority Tier 3: Hidden Textarea & Source Containers / LocalStorage Fallback
 * Priority Tier 4: Position-Sorted Viewport DOM Node Scraping (Last Resort)
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  const SELECTORS = {
    MONACO_CONTAINER: ['.monaco-editor', '.editor', '#editor', '[data-track-load="code_editor"]'],
    VIEW_LINE: ['.view-line', '.line-content'],
    TEXTAREA: ['textarea.inputarea', 'textarea.monaco-aria-textarea', 'textarea[name="code"]']
  };

  /** Diagnostic logs for extraction attempts */
  let extractionDiagnostics = [];
  /**
   * Validates code completeness and syntax integrity.
   * @param {string} code - The extracted code string.
   * @param {string} [language] - Target programming language if known.
   * @returns {{ valid: boolean, reason: string }} Validation result.
   */
  function validateExtractedCode(code, language) {
    if (typeof code !== 'string') {
      return { valid: false, reason: "Extracted code is not a string" };
    }

    const trimmed = code.trim();
    if (!trimmed) {
      return { valid: false, reason: "Extracted code is empty or whitespace-only" };
    }

    if (trimmed.length < 15) {
      return { valid: false, reason: `Extracted code length abnormally short (${trimmed.length} chars)` };
    }

    // Check for common truncated start signatures (e.g. code starts mid-function without header)
    const lowerCode = trimmed.toLowerCase();
    const langLower = (language || "").toLowerCase();

    // Check if code contains expected top-level keywords
    const hasHeaderSignature = (
      lowerCode.includes("solution") ||
      lowerCode.includes("#include") ||
      lowerCode.includes("import ") ||
      lowerCode.includes("package ") ||
      lowerCode.includes("def ") ||
      lowerCode.includes("function") ||
      lowerCode.includes("class ") ||
      lowerCode.includes("pub fn") ||
      lowerCode.includes("func ") ||
      lowerCode.includes("struct ") ||
      lowerCode.includes("using ") ||
      lowerCode.includes("type ") ||
      lowerCode.includes("var ") ||
      lowerCode.includes("const ") ||
      lowerCode.includes("let ")
    );

    // Language-specific heuristics
    if (langLower.includes("cpp") || langLower.includes("c++")) {
      if (!lowerCode.includes("class") && !lowerCode.includes("#include") && !lowerCode.includes("struct")) {
        return { valid: false, reason: "C++ solution missing class/struct/include header signature" };
      }
    } else if (langLower.includes("java")) {
      if (!lowerCode.includes("class")) {
        return { valid: false, reason: "Java solution missing class header signature" };
      }
    } else if (langLower.includes("python")) {
      if (!lowerCode.includes("class") && !lowerCode.includes("def ")) {
        return { valid: false, reason: "Python solution missing class/def header signature" };
      }
    }

    // Brace balance check for curly-brace languages
    const isBraceLanguage = !langLower.includes("python");
    if (isBraceLanguage) {
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;

      // If code starts with close-brace or ends with open-brace mismatch > 5, likely truncated
      if (trimmed.startsWith("}") && !trimmed.startsWith("};")) {
        return { valid: false, reason: "Code starts with closing brace (truncated middle snippet)" };
      }

      if (openBraces > 0 && closeBraces === 0) {
        return { valid: false, reason: "Missing all closing braces (truncated bottom snippet)" };
      }

      if (openBraces > 0 && (openBraces - closeBraces) > 2) {
        return { valid: false, reason: `Unbalanced closing braces ({: ${openBraces}, }: ${closeBraces})` };
      }
    }

    return { valid: true, reason: "VALID" };
  }

  /**
   * Tier 1: Main-World Script Injection (Monaco Editor Model API).
   * Searches ALL models returned by window.monaco.editor.getModels() to pick the complete solution.
   * @returns {Promise<{ code: string|null, modelCount: number, selectedModelUri: string }>} Result object.
   */

  function extractViaMonacoAPI() {
    return new Promise((resolve) => {
      const eventName = `LEETCODE_MONACO_EXTRACT_` + Math.random().toString(36).substring(2, 9).toUpperCase();

      const handler = (event) => {
        window.removeEventListener(eventName, handler);
        const data = event.detail || {};
        resolve({
          code: data.code || null,
          modelCount: data.modelCount || 0,
          selectedModelUri: data.selectedModelUri || "none"
        });
      };

      window.addEventListener(eventName, handler);

      const script = document.createElement("script");
      script.textContent = `
        (function() {
          try {
            if (window.monaco && window.monaco.editor) {
              const models = window.monaco.editor.getModels();
              if (models && models.length > 0) {
                let bestCode = null;
                let bestScore = -1;
                let selectedUri = "";

                for (let i = 0; i < models.length; i++) {
                  const m = models[i];
                  const val = m.getValue();
                  if (!val || val.trim().length === 0) continue;

                  const uriStr = m.uri ? m.uri.toString() : "";
                  let score = val.length;

                  // Boost score if model URI or content matches solution patterns
                  const lowerVal = val.toLowerCase();
                  if (lowerVal.includes("class solution") || lowerVal.includes("def ") || lowerVal.includes("function")) {
                    score += 10000;
                  }
                  if (uriStr.includes("solution") || uriStr.includes("code") || uriStr.includes("inmemory")) {
                    score += 5000;
                  }

                  if (score > bestScore) {
                    bestScore = score;
                    bestCode = val;
                    selectedUri = uriStr;
                  }
                }

                window.dispatchEvent(new CustomEvent('${eventName}', {
                  detail: { code: bestCode, modelCount: models.length, selectedModelUri: selectedUri }
                }));
                return;
              }
            }
            window.dispatchEvent(new CustomEvent('${eventName}', { detail: { code: null } }));
          } catch (err) {
            window.dispatchEvent(new CustomEvent('${eventName}', { detail: { code: null } }));
          }
        })();
      `;

      (document.head || document.documentElement).appendChild(script);
      script.remove();

      // Generous timeout fallback (500ms) for busy pages
      setTimeout(() => {
        window.removeEventListener(eventName, handler);
        resolve({ code: null, modelCount: 0, selectedModelUri: "timeout" });
      }, 500);
    });
  }

  /**
   * Tier 2: React Fiber & DOM Internal Editor Model Scraping.
   * Inspects React internal Fiber nodes attached to Monaco container elements.
   * @returns {string|null} Code string or null.
   */
  function extractViaReactState() {
    for (const sel of SELECTORS.MONACO_CONTAINER) {
      const container = document.querySelector(sel);
      if (!container) continue;

      // Inspect React Fiber keys
      const fiberKey = Object.keys(container).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
      if (fiberKey && container[fiberKey]) {
        try {
          let curr = container[fiberKey];
          let depth = 0;
          while (curr && depth < 30) {
            if (curr.memoizedProps) {
              const props = curr.memoizedProps;
              if (typeof props.value === "string" && props.value.length > 20) {
                return props.value;
              }
              if (props.editor && typeof props.editor.getValue === "function") {
                return props.editor.getValue();
              }
              if (props.model && typeof props.model.getValue === "function") {
                return props.model.getValue();
              }
            }
            curr = curr.return;
            depth++;
          }
        } catch (e) {
          // Ignore state inspection errors
        }
      }
    }
    return null;
  }

  /**
   * Tier 3: Hidden Textarea & Source Containers / LocalStorage.
   * Scrapes hidden textareas used by Monaco or CodeMirror.
   * @returns {string|null} Code string or null.
   */
  function extractViaHiddenTextarea() {
    // 1. Textareas inside editor
    for (const sel of SELECTORS.TEXTAREA) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el && typeof el.value === "string" && el.value.trim().length > 15) {
          return el.value;
        }
      }
    }

    // 2. LocalStorage fallback
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes("code_submission") || key.includes("leetcode_editor_code"))) {
            const val = window.localStorage.getItem(key);
            if (val && val.trim().length > 15) {
              return val;
            }
          }
        }
      }
    } catch (e) {
      // LocalStorage access restricted in some frames
    }

    return null;
  }

  /**
   * Tier 4: Position-Sorted Viewport DOM Line Scraping (Last Resort).
   * Queries view line DOM elements, sorting them strictly by CSS top coordinate / line index.
   * @returns {string|null} Code string or null.
   */
  function extractViaSortedDOM() {
    let container = null;
    for (const sel of SELECTORS.MONACO_CONTAINER) {
      container = document.querySelector(sel);
      if (container) break;
    }

    if (!container) return null;

    let lineEls = [];
    for (const sel of SELECTORS.VIEW_LINE) {
      const found = container.querySelectorAll(sel);
      if (found && found.length > 0) {
        lineEls = Array.from(found);
        break;
      }
    }

    if (lineEls.length === 0) return null;
    // Sort elements by their top offset style or DOM position
    lineEls.sort((a, b) => {
      const topA = parseFloat(a.style.top || "0");
      const topB = parseFloat(b.style.top || "0");
      if (topA !== topB) return topA - topB;
      // Fall back to DOM node order
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    const lines = lineEls.map((el) => el.textContent || "");
    return lines.join("\n");
  }

  const SolutionParser = {
    /**
     * Parses the complete solution code using multi-tier fallback priority order.
     * @param {string} [language] - Expected programming language.
     * @returns {Promise<string>} The parsed, validated solution code.
     * @throws {Error} If all extraction tiers fail or fail validation.
     */
    async parse(language) {
      extractionDiagnostics = [];
      const startTime = performance.now();

      // Tier 1: Main-World Monaco API
      try {
        const t1Start = performance.now();
        const t1Res = await extractViaMonacoAPI();
        const t1Time = performance.now() - t1Start;

        if (t1Res.code) {
          const valRes = validateExtractedCode(t1Res.code, language);
          const diag = {
            strategy: "MONACO_API",
            executionTimeMs: Math.round(t1Time),
            characterCount: t1Res.code.length,
            lineCount: t1Res.code.split("\n").length,
            success: valRes.valid,
            validationResult: valRes.reason,
            selectedStrategy: valRes.valid ? "MONACO_API" : "NONE",
            modelUri: t1Res.selectedModelUri
          };
          extractionDiagnostics.push(diag);

          if (valRes.valid) {
            Logger.info(`SolutionParser: Extracted code via MONACO_API (${diag.characterCount} chars, ${diag.lineCount} lines)`);
            return t1Res.code;
          } else {
            Logger.warn("SolutionParser: Tier 1 MONACO_API code failed validation:", valRes.reason);
          }
        } else {
          extractionDiagnostics.push({
            strategy: "MONACO_API",
            executionTimeMs: Math.round(t1Time),
            characterCount: 0,
            lineCount: 0,
            success: false,
            validationResult: "No monaco models found",
            selectedStrategy: "NONE"
          });
        }
      } catch (err) {
        Logger.warn("SolutionParser: Tier 1 MONACO_API failed:", err.message);
      }

      // Tier 2: React State Scraping
      try {
        const t2Start = performance.now();
        const t2Code = extractViaReactState();
        const t2Time = performance.now() - t2Start;

        if (t2Code) {
          const valRes = validateExtractedCode(t2Code, language);
          const diag = {
            strategy: "REACT_STATE",
            executionTimeMs: Math.round(t2Time),
            characterCount: t2Code.length,
            lineCount: t2Code.split("\n").length,
            success: valRes.valid,
            validationResult: valRes.reason,
            selectedStrategy: valRes.valid ? "REACT_STATE" : "NONE"
          };
          extractionDiagnostics.push(diag);

          if (valRes.valid) {
            Logger.info(`SolutionParser: Extracted code via REACT_STATE (${diag.characterCount} chars, ${diag.lineCount} lines)`);
            return t2Code;
          } else {
            Logger.warn("SolutionParser: Tier 2 REACT_STATE code failed validation:", valRes.reason);
          }
        } else {
          extractionDiagnostics.push({
            strategy: "REACT_STATE",
            executionTimeMs: Math.round(t2Time),
            characterCount: 0,
            lineCount: 0,
            success: false,
            validationResult: "No React state models found",
            selectedStrategy: "NONE"
          });
        }
      } catch (err) {
        Logger.warn("SolutionParser: Tier 2 REACT_STATE failed:", err.message);
      }
      // Tier 3: Hidden Textarea & LocalStorage
      try {
        const t3Start = performance.now();
        const t3Code = extractViaHiddenTextarea();
        const t3Time = performance.now() - t3Start;

        if (t3Code) {
          const valRes = validateExtractedCode(t3Code, language);
          const diag = {
            strategy: "HIDDEN_TEXTAREA",
            executionTimeMs: Math.round(t3Time),
            characterCount: t3Code.length,
            lineCount: t3Code.split("\n").length,
            success: valRes.valid,
            validationResult: valRes.reason,
            selectedStrategy: valRes.valid ? "HIDDEN_TEXTAREA" : "NONE"
          };
          extractionDiagnostics.push(diag);

          if (valRes.valid) {
            Logger.info(`SolutionParser: Extracted code via HIDDEN_TEXTAREA (${diag.characterCount} chars, ${diag.lineCount} lines)`);
            return t3Code;
          } else {
            Logger.warn("SolutionParser: Tier 3 HIDDEN_TEXTAREA code failed validation:", valRes.reason);
          }
        } else {
          extractionDiagnostics.push({
            strategy: "HIDDEN_TEXTAREA",
            executionTimeMs: Math.round(t3Time),
            characterCount: 0,
            lineCount: 0,
            success: false,
            validationResult: "No hidden textareas found",
            selectedStrategy: "NONE"
          });
        }
      } catch (err) {
        Logger.warn("SolutionParser: Tier 3 HIDDEN_TEXTAREA failed:", err.message);
      }

      // Tier 4: Position-Sorted Viewport DOM (Last Resort)
      try {
        const t4Start = performance.now();
        const t4Code = extractViaSortedDOM();
        const t4Time = performance.now() - t4Start;

        if (t4Code) {
          const valRes = validateExtractedCode(t4Code, language);
          const diag = {
            strategy: "DOM_SORTED",
            executionTimeMs: Math.round(t4Time),
            characterCount: t4Code.length,
            lineCount: t4Code.split("\n").length,
            success: valRes.valid,
            validationResult: valRes.reason,
            selectedStrategy: valRes.valid ? "DOM_SORTED" : "NONE"

          };
          extractionDiagnostics.push(diag);

          if (valRes.valid) {
            Logger.info(`SolutionParser: Extracted code via DOM_SORTED (${diag.characterCount} chars, ${diag.lineCount} lines)`);
            return t4Code;
          } else {
            Logger.warn("SolutionParser: Tier 4 DOM_SORTED code failed validation:", valRes.reason);
          }
        } else {
          extractionDiagnostics.push({
            strategy: "DOM_SORTED",
            executionTimeMs: Math.round(t4Time),
            characterCount: 0,
            lineCount: 0,
            success: false,
            validationResult: "No view lines found in DOM",
            selectedStrategy: "NONE"
          });
        }
      } catch (err) {
        Logger.warn("SolutionParser: Tier 4 DOM_SORTED failed:", err.message);
      }

      const totalTime = Math.round(performance.now() - startTime);
      Logger.error(`SolutionParser: All 4 extraction tiers failed after ${totalTime}ms.`);
      throw new Error(`Failed to extract solution: all 4 extraction tiers failed or failed validation`);
    },

    /**
     * Retrieves diagnostics history for the latest extraction run.
     * @returns {Array<Object>} List of per-strategy diagnostic records.
     */
    getDiagnostics() {
      return extractionDiagnostics;
    },

    /**
     * Validates a code string directly.
     * @param {string} code
     * @param {string} [language]
     * @returns {{ valid: boolean, reason: string }}
     */
    validateCode(code, language) {
      return validateExtractedCode(code, language);
    }
  };

  LeetCodeAutoSync.SolutionParser = SolutionParser;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
