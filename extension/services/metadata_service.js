/**
 * @fileoverview Metadata service coordinator.
 * Listens for Accepted submissions, parses problem details, validates, and reports to background.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, SubmissionState, MetadataParser, SubmissionModel, MessageTypes, Verdicts } = LeetCodeAutoSync;

  let initialized = false;

  /**
   * Triggers the metadata extraction flow on successful verification.
   */
  function handleSubmissionAccepted() {
    Logger.info("MetadataService: Metadata extraction started");

    // 1. Scrape raw data from the parser
    const parsedData = MetadataParser.parse();
    if (!parsedData) {
      Logger.error("MetadataService: Dom parsing returned null. Extraction aborted.");
      return;
    }

    // 2. Build the structured SubmissionModel
    const model = new SubmissionModel({
      id: parsedData.id,
      title: parsedData.title,
      slug: parsedData.slug,
      difficulty: parsedData.difficulty,
      language: parsedData.language,
      url: parsedData.url,
      verdict: Verdicts.ACCEPTED
    });

    // 3. Validate model fields
    if (!model.validate()) {
      Logger.error("MetadataService: Validation failed for submission model. Required fields missing.", {
        id: model.id,
        title: model.title,
        slug: model.slug,
        difficulty: model.difficulty,
        language: model.language
      });
      return;
    }

    Logger.info("MetadataService: Metadata extraction completed and validated successfully", model);

    // 4. Relay details to SolutionService for code scraping
    if (LeetCodeAutoSync.SolutionService) {
      LeetCodeAutoSync.SolutionService.processAcceptedSubmission(model);
    } else {
      Logger.error("MetadataService: SolutionService coordinator not found");
    }
  }

  const MetadataService = {
    /**
     * Initializes the service, hooks into the submission state machine changes.
     */
    init() {
      if (initialized) return;
      initialized = true;

      // Subscribe to submission state transitions
      SubmissionState.onStateChanged((state, _oldState) => {
        if (state === SubmissionState.States.FINISHED && SubmissionState.getVerdict() === Verdicts.ACCEPTED) {
          handleSubmissionAccepted();
        }
      });

      Logger.info("Metadata extraction service initialized");
    },

    /**
     * Teardown method.
     */
    destroy() {
      if (!initialized) return;
      initialized = false;
      Logger.info("Metadata extraction service destroyed");
    }
  };

  LeetCodeAutoSync.MetadataService = MetadataService;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
