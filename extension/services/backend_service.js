/**
 * @fileoverview Service to manage network communication with the FastAPI backend.
 * This is the single isolated module responsible for all fetch requests.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
  const HEALTH_TIMEOUT_MS = 5000;
  const DEFAULT_SUBMIT_TIMEOUT_MS = 45000;
  const MAX_TRANSIENT_RETRIES = 2;

  /**
   * Reads configured backend settings from chrome.storage.local.
   * @returns {Promise<{ backendUrl: string, submitTimeoutMs: number }>}
   */
  function getBackendSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(
          { backendUrl: DEFAULT_BACKEND_URL, submitTimeoutMs: DEFAULT_SUBMIT_TIMEOUT_MS },
          (items) => {
            resolve({
              backendUrl: items.backendUrl || DEFAULT_BACKEND_URL,
              submitTimeoutMs: typeof items.submitTimeoutMs === "number" ? items.submitTimeoutMs : DEFAULT_SUBMIT_TIMEOUT_MS
            });
          }
        );
      } else {
        resolve({ backendUrl: DEFAULT_BACKEND_URL, submitTimeoutMs: DEFAULT_SUBMIT_TIMEOUT_MS });
      }
    });
  }

  /**
   * Normalizes responses from the network layer.
   * @param {boolean} success - Whether the request completed successfully.
   * @param {Object|null} data - Received response body payload.
   * @param {string|null} errorMsg - Normalized error string if failed.
   * @param {number|null} statusCode - HTTP status code.
   * @returns {Object} Normalized response structure.
   */
  function normalizeResponse(success, data, errorMsg = null, statusCode = null) {
    return {
      success,
      data,
      error: errorMsg,
      statusCode
    };
  }

  /**
   * Normalizes network exceptions/errors into user-friendly messages with recovery hints.
   * @param {Error} error - The caught exception.
   * @returns {Object} Normalized response structure.
   */
  function normalizeError(error) {
    let message = error.message || "Unknown communication error";
    if (error.name === "AbortError") {
      message = "Request timed out after background processing boundary. Check server logs and network status.";
    } else if (message.includes("Failed to fetch") || message.includes("NetworkError") || message.includes("ECONNREFUSED")) {
      message = "Connection refused: Local backend server is not running. Start with 'python -m uvicorn server.app:app --reload --port 8000' and retry.";
    }
    return normalizeResponse(false, null, message, null);
  }

  /**
   * Performs a fetch request with a configurable timeout boundary.
   * @param {string} url - Target URL.
   * @param {Object} options - Standard fetch options.
   * @param {number} [timeoutMs] - Timeout limit in milliseconds.
   * @returns {Promise<Response>}
   */
  async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_SUBMIT_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Executes network fetch with exponential backoff retries for transient gateway or network failures.
   * Retries ONLY transient status codes (502, 503, 504) or network errors. Never retries 4xx client errors.
   * @param {string} url - Target URL.
   * @param {Object} options - Fetch options.
   * @param {number} timeoutMs - Per-attempt timeout.
   * @returns {Promise<Response>}
   */
  async function fetchWithRetry(url, options = {}, timeoutMs = DEFAULT_SUBMIT_TIMEOUT_MS) {
    let lastError = null;
    let attempt = 0;
    const backoffs = [1000, 2000];

    while (attempt <= MAX_TRANSIENT_RETRIES) {
      try {
        const response = await fetchWithTimeout(url, options, timeoutMs);
        // If response status is a transient server error, retry if attempts remain
        if ([502, 503, 504].includes(response.status) && attempt < MAX_TRANSIENT_RETRIES) {
          const delay = backoffs[attempt] || 2000;
          Logger.warn(`BackendService: Transient server error ${response.status}. Retrying in ${delay}ms (Attempt ${attempt + 1}/${MAX_TRANSIENT_RETRIES})...`);
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }
        return response;
      } catch (err) {
        lastError = err;
        // Do not retry client abort timeouts or client 4xx logic
        if (err.name === "AbortError" || attempt >= MAX_TRANSIENT_RETRIES) {
          throw err;
        }
        const delay = backoffs[attempt] || 2000;
        Logger.warn(`BackendService: Network request attempt ${attempt + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
      }
    }
    throw lastError;
  }

  const BackendService = {
    /**
     * Exposes the active target URL.
     * @returns {Promise<string>}
     */
    async getUrl() {
      const settings = await getBackendSettings();
      return settings.backendUrl;
    },

    /**
     * Checks if the FastAPI backend is running and healthy.
     * @returns {Promise<Object>} Normalized response status.
     */
    async checkBackend() {
      Logger.info("BackendService: Checking health connectivity status...");
      const { backendUrl } = await getBackendSettings();
      try {
        const response = await fetchWithTimeout(`${backendUrl}/health`, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        }, HEALTH_TIMEOUT_MS);

        if (response.ok) {
          const data = await response.json();
          return normalizeResponse(true, data, null, response.status);
        }

        return normalizeResponse(false, null, `Health check returned status ${response.status}`, response.status);
      } catch (err) {
        return normalizeError(err);
      }
    },

    /**
     * Sends the completed solution to the backend endpoint.
     * @param {Object} submission - Reconstructed AcceptedSubmission model object.
     * @returns {Promise<Object>} Normalized response status.
     */
    async submitSubmission(submission) {
      Logger.info("BackendService: Validating submission payload before network dispatch...");

      // 1. Verify schema contract
      if (!submission || typeof submission.validate !== "function" || !submission.validate()) {
        const err = "Payload validation failed (invalid AcceptedSubmission structure)";
        Logger.error("BackendService: Aborting request:", err);
        return normalizeResponse(false, null, err, null);
      }

      // 2. Map AcceptedSubmission fields to backend schemas.Submission contract
      const payload = {
        id: submission.metadata.id,
        title: submission.metadata.title,
        slug: submission.metadata.slug,
        difficulty: submission.metadata.difficulty,
        language: submission.metadata.language,
        code: submission.code,
        trace_id: submission.traceId,
        source_hash: submission.sourceHash || null
      };

      const { backendUrl, submitTimeoutMs } = await getBackendSettings();
      Logger.info(`BackendService: Payload validated. Dispatching to backend POST ${backendUrl}/submit (timeout: ${submitTimeoutMs}ms)...`);
      try {
        const response = await fetchWithRetry(`${backendUrl}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        }, submitTimeoutMs);

        Logger.info("BackendService: Backend responded with status", response.status);

        if (response.ok) {
          const data = await response.json();
          return normalizeResponse(true, data, null, response.status);
        }

        // Try parsing FastAPI validation error structure
        let errorMsg = `Server returned status ${response.status}`;
        try {
          const body = await response.json();
          if (body && body.detail) {
            errorMsg = typeof body.detail === "string" 
              ? body.detail 
              : JSON.stringify(body.detail);
          }
        } catch (_) {}

        return normalizeResponse(false, null, errorMsg, response.status);
      } catch (err) {
        return normalizeError(err);
      }
    }
  };

  LeetCodeAutoSync.BackendService = BackendService;
  global.LeetCodeAutoSync = LeetCodeAutoSync;
})(typeof globalThis !== 'undefined' ? globalThis : self);
