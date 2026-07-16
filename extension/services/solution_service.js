/**
 * @fileoverview Solution service coordinator.
 * Manages extraction, validation, packaging, and dispatch of accepted submissions.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, SolutionParser, AcceptedSubmission, MessageTypes } = LeetCodeAutoSync;

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
    chrome.runtime.sendMessage({
      type: MessageTypes.SUBMISSION_ACCEPTED,
      payload: submissionModel
    }, (response) => {
      if (chrome.runtime.lastError) {
        Logger.warn("SolutionService: Failed to dispatch submission to background worker:", chrome.runtime.lastError.message);
      } else {
        Logger.info("SolutionService: Background worker cached accepted submission successfully:", response);
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
      Logger.info("SolutionService: Solution extraction started");

      try {
        // 1. Extract the code using the hybrid parser
        const code = await SolutionParser.parse();

        // 2. Validate the code content
        if (!validateCode(code)) {
          Logger.error("SolutionService: Solution code validation failed. Extraction aborted.");
          return;
        }

        Logger.info(`SolutionService: Solution extraction completed. Length: ${code.length} characters.`);

        // 3. Assemble complete AcceptedSubmission model
        const submission = new AcceptedSubmission({
          metadata: metadataModel,
          code: code,
          extractedAt: new Date().toISOString()
        });

        // 4. Validate complete model structure
        if (!submission.validate()) {
          Logger.error("SolutionService: Validation failed for complete AcceptedSubmission model.");
          return;
        }

        Logger.info("SolutionService: AcceptedSubmission model validated successfully. Character count:", code.length);

        // 5. Send complete submission object to background
        sendToBackground(submission);
      } catch (err) {
        Logger.error("SolutionService: Exception occurred during code extraction pipeline:", err);
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
