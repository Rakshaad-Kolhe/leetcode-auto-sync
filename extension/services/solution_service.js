/**
 * @fileoverview Solution service coordinator.
 * Manages extraction, validation, packaging, and dispatch of accepted submissions.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, SolutionParser, AcceptedSubmission, MessageTypes } = LeetCodeAutoSync;

  // Load-time availability check
  Logger.info(`[SolutionService LOAD] SolutionParser=${typeof SolutionParser}, AcceptedSubmission=${typeof AcceptedSubmission}`);

  let initialized = false;

  /**
   * Performs validation on the extracted code string.
   * @param {string} code - Scraped code.
   * @returns {boolean} True if code meets basic format criteria.
   */
  function validateCode(code) {
    if (typeof code !== "string") {
      Logger.error("SolutionService: Extracted code is not a string type");
      return false;
    }

    const trimmed = code.trim();
    if (!trimmed) {
      Logger.error("SolutionService: Extracted code is empty or whitespace-only");
      return false;
    }

    // Code length checks (e.g. at least 5 characters and at most 1MB for safety)
    if (trimmed.length < 5) {
      Logger.error(`SolutionService: Extracted code length is abnormally short (${trimmed.length} chars)`);
      return false;
    }

    if (code.length > 1024 * 1024) {
      Logger.error(`SolutionService: Extracted code size exceeds 1MB limit (${code.length} chars)`);
      return false;
    }

    // Check for basic UTF-8 validity (prevent corrupt non-text payloads)
    try {
      const encoder = new TextEncoder();
      encoder.encode(code);
    } catch (err) {
      Logger.error("SolutionService: Extracted code failed UTF-8 encoding checks:", err);
      return false;
    }

    return true;
  }

  /**
   * Sends the full AcceptedSubmission payload to the background service worker.
   * @param {AcceptedSubmission} submissionModel - Complete validated submission object.
   */
  function sendToBackground(submissionModel) {
    Logger.info("SolutionService: Dispatching SUBMISSION_ACCEPTED message to background worker:", submissionModel);
    chrome.runtime.sendMessage({
      type: MessageTypes.SUBMISSION_ACCEPTED,
      payload: submissionModel
    }, (response) => {
      if (chrome.runtime.lastError) {
        Logger.error("SolutionService: Failed to dispatch submission to background worker:", chrome.runtime.lastError.message);
      } else {
        Logger.info("SolutionService: Background worker cached accepted submission successfully. Response:", response);
      }
    });
  }

  const SolutionService = {
    /**
     * Initializes the service.
     */
    init() {
      if (initialized) return;
      initialized = true;
      Logger.info("Solution service coordinator initialized");
    },

    /**
     * Entry point to extract solution code, bind with problem metadata, and cache it.
     * Called by MetadataService when metadata is verified.
     * @param {SubmissionModel} metadataModel - Validated problem details.
     */
    async processAcceptedSubmission(metadataModel) {
      Logger.info("SolutionService: processAcceptedSubmission() entered. metadataModel:", metadataModel);
      Logger.info(`SolutionService: SolutionParser at call time = ${typeof SolutionParser}, runtime = ${typeof LeetCodeAutoSync.SolutionParser}`);
      Logger.info(`SolutionService: AcceptedSubmission at call time = ${typeof AcceptedSubmission}, runtime = ${typeof LeetCodeAutoSync.AcceptedSubmission}`);

      const parser = SolutionParser || LeetCodeAutoSync.SolutionParser;
      const SubmissionClass = AcceptedSubmission || LeetCodeAutoSync.AcceptedSubmission;

      if (!parser) {
        Logger.error("SolutionService: SolutionParser is undefined — cannot extract code. Check script load order.");
        return;
      }
      if (!SubmissionClass) {
        Logger.error("SolutionService: AcceptedSubmission is undefined — cannot build model. Check script load order.");
        return;
      }

      Logger.info("SolutionService: Solution extraction started");

      try {
        // 1. Extract the code using the multi-tier parser
        Logger.info("SolutionService: Invoking SolutionParser.parse() with language:", metadataModel.language);
        const code = await parser.parse(metadataModel.language);
        Logger.info(`SolutionService: SolutionParser.parse() returned code content of length: ${code ? code.length : 0}`);

        // 2. Validate the code content
        if (!validateCode(code)) {
          Logger.error("SolutionService: Solution code validation failed. Extraction aborted.");
          return;
        }

        Logger.info(`SolutionService: Solution extraction completed. Length: ${code.length} characters.`);

        let sourceHash = null;
        try {
          if (typeof crypto !== "undefined" && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(code);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            sourceHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
          }
        } catch (hErr) {
          Logger.warn("SolutionService: Failed to compute SHA-256 hash:", hErr);
        }

        // 3. Assemble complete AcceptedSubmission model
        Logger.info("SolutionService: Assembling AcceptedSubmission model...");
        const submission = new SubmissionClass({
          metadata: metadataModel,
          code: code,
          sourceHash: sourceHash,
          extractedAt: new Date().toISOString()
        });

        // 4. Validate complete model structure
        Logger.info("SolutionService: Validating AcceptedSubmission model...");
        if (!submission.validate()) {
          Logger.error("SolutionService: Validation failed for complete AcceptedSubmission model.");
          return;
        }

        Logger.info("SolutionService: AcceptedSubmission model validated successfully. Character count:", code.length);

        // 5. Send complete submission object to background
        Logger.info("SolutionService: Calling sendToBackground()...");
        sendToBackground(submission);
      } catch (err) {
        Logger.error("SolutionService: UNCAUGHT EXCEPTION in processAcceptedSubmission:", err.message, err.stack);
      }
    },

    /**
     * Teardown method.
     */
    destroy() {
      if (!initialized) return;
      initialized = false;
      Logger.info("Solution service coordinator destroyed");
    }
  };

  LeetCodeAutoSync.SolutionService = SolutionService;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
