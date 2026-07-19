/**
 * @fileoverview Metadata service coordinator.
 * Listens for Accepted submissions, parses problem details, validates, and reports to background.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger, SubmissionState, MetadataParser, SubmissionModel, MessageTypes, Verdicts } = LeetCodeAutoSync;

  // Singleton identity check — each module should see the same object reference
  const _stateRef = SubmissionState;
  const _stateId = _stateRef ? (typeof _stateRef._instanceId !== 'undefined' ? _stateRef._instanceId : '(no _instanceId)') : 'undefined';
  Logger.info(`[MetadataService LOAD] SubmissionState=${typeof _stateRef}, Verdicts=${typeof Verdicts}, MetadataParser=${typeof MetadataParser}, SubmissionModel=${typeof SubmissionModel}`);
  Logger.info(`[MetadataService LOAD] SubmissionState._instanceId=${_stateId}`);

  let initialized = false;

  /**
   * Triggers the metadata extraction flow on successful verification.
   */
  function handleSubmissionAccepted() {
    Logger.info("MetadataService: handleSubmissionAccepted() entered.");
    try {
      Logger.info("MetadataService: Metadata extraction started");

      // Guard: confirm MetadataParser is available at call time (not just at load time)
      Logger.info(`MetadataService: MetadataParser at call time = ${typeof MetadataParser}`);
      Logger.info(`MetadataService: LeetCodeAutoSync.MetadataParser at call time = ${typeof LeetCodeAutoSync.MetadataParser}`);

      // Use runtime lookup as fallback if load-time capture was undefined
      const parser = MetadataParser || LeetCodeAutoSync.MetadataParser;
      if (!parser) {
        Logger.error("MetadataService: MetadataParser is undefined — cannot parse. Check script load order.");
        return;
      }

      // 1. Scrape raw data from the parser
      const parsedData = parser.parse();
      Logger.info("MetadataService: MetadataParser.parse() returned:", parsedData);
      if (!parsedData) {
        Logger.error("MetadataService: Dom parsing returned null. Extraction aborted.");
        return;
      }

      // 2. Build the structured SubmissionModel
      const ModelClass = SubmissionModel || LeetCodeAutoSync.SubmissionModel;
      Logger.info(`MetadataService: SubmissionModel at call time = ${typeof SubmissionModel}, runtime = ${typeof LeetCodeAutoSync.SubmissionModel}`);
      if (!ModelClass) {
        Logger.error("MetadataService: SubmissionModel is undefined — cannot build model.");
        return;
      }
      const model = new ModelClass({
        id: parsedData.id,
        title: parsedData.title,
        slug: parsedData.slug,
        difficulty: parsedData.difficulty,
        language: parsedData.language,
        url: parsedData.url,
        verdict: Verdicts ? Verdicts.ACCEPTED : "Accepted"
      });

      // 3. Validate model fields
      Logger.info("MetadataService: Running model.validate()...", {
        id: model.id,
        title: model.title,
        slug: model.slug,
        difficulty: model.difficulty,
        language: model.language,
        verdict: model.verdict
      });
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
      Logger.info(`MetadataService: LeetCodeAutoSync.SolutionService = ${typeof LeetCodeAutoSync.SolutionService}`);
      if (LeetCodeAutoSync.SolutionService) {
        Logger.info("MetadataService: Relaying metadata model to SolutionService.processAcceptedSubmission()");
        LeetCodeAutoSync.SolutionService.processAcceptedSubmission(model);
      } else {
        Logger.error("MetadataService: SolutionService coordinator not found");
      }
    } catch (err) {
      Logger.error("MetadataService: UNCAUGHT EXCEPTION in handleSubmissionAccepted:", err.message, err.stack);
    }
  }

  let unsubscribeStateListener = null;

  const MetadataService = {
    /**
     * Initializes the service, hooks into the submission state machine changes.
     */
    init() {
      if (initialized) {
        Logger.warn("MetadataService: init() called but already initialized. Skipping.");
        return;
      }
      initialized = true;

      // Log what SubmissionState reference this module sees
      Logger.info("MetadataService: init() running.");
      Logger.info(`MetadataService: SubmissionState ref = ${typeof SubmissionState}, States = ${JSON.stringify(SubmissionState ? SubmissionState.States : null)}`);
      Logger.info(`MetadataService: Verdicts.ACCEPTED = ${Verdicts ? Verdicts.ACCEPTED : 'undefined'}`);

      Logger.info("MetadataService: Registering state change listener");
      // Subscribe to submission state transitions
      unsubscribeStateListener = SubmissionState.onStateChanged((state, _oldState, verdict) => {
        Logger.info(`MetadataService: State change listener [MetadataService] triggered. state: ${state}, oldState: ${_oldState}, verdict: ${verdict}`);
        Logger.info(`MetadataService: Checking condition — state==FINISHED: ${state === SubmissionState.States.FINISHED}, verdict==Accepted: ${verdict === Verdicts.ACCEPTED} (verdict raw: "${verdict}", Verdicts.ACCEPTED: "${Verdicts.ACCEPTED}")`);
        if (state === SubmissionState.States.FINISHED && verdict === Verdicts.ACCEPTED) {
          Logger.info("MetadataService: Transition to FINISHED with Accepted verdict. Starting extraction handler.");
          handleSubmissionAccepted();
        } else {
          Logger.info(`MetadataService: State change ignored. Required state: FINISHED with Accepted. Got state: ${state}, verdict: ${verdict}`);
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
      Logger.info("MetadataService: Unregistering state change listener");
      // Clean up explicit state machine listener to avoid leaks and duplicates
      if (unsubscribeStateListener) {
        unsubscribeStateListener();
        unsubscribeStateListener = null;
      }
      Logger.info("Metadata extraction service destroyed");
    }
  };

  LeetCodeAutoSync.MetadataService = MetadataService;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
