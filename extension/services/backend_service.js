/**
 * @fileoverview Service to manage network communication with the FastAPI backend.
 * This is the single isolated module responsible for all fetch requests.
 */

((global) => {
  const LeetCodeAutoSync = global.LeetCodeAutoSync || {};
  const { Logger } = LeetCodeAutoSync;

  const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
  const TIMEOUT_MS = 8000;

  /**
   * Reads the configured backend URL from chrome.storage.local.
   * @returns {Promise<string>}
   */
  function getBackendUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ backendUrl: DEFAULT_BACKEND_URL }, (items) => {
        resolve(items.backendUrl || DEFAULT_BACKEND_URL);
      });
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
   * Normalizes network exceptions/errors.
   * @param {Error} error - The caught exception.
   * @returns {Object} Normalized response structure.
   */
  function normalizeError(error) {
    let message = error.message || "Unknown communication error";
    if (error.name === "AbortError") {
      message = "Request timed out";
    } else if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      message = "Connection refused (backend is likely stopped)";
    }
    return normalizeResponse(false, null, message, null);
  }

  /**
   * Performs a fetch request with a timeout boundary.
   * @param {string} url - Target URL.
   * @param {Object} options - Standard fetch options.
   * @returns {Promise<Response>}
   */
  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
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

  const BackendService = {
    /**
     * Exposes the active target URL.
     * @returns {Promise<string>}
     */
    async getUrl() {
      return getBackendUrl();
    },

    /**
     * Checks if the FastAPI backend is running and healthy.
     * @returns {Promise<Object>} Normalized response status.
     */
    async checkBackend() {
      Logger.info("BackendService: Checking health connectivity status...");
      const baseUrl = await getBackendUrl();
      try {
        const response = await fetchWithTimeout(`${baseUrl}/health`, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });

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
        code: submission.code
      };

      const baseUrl = await getBackendUrl();
      Logger.info(`BackendService: Payload validated. Dispatching to backend POST ${baseUrl}/submit...`);
      try {
        const response = await fetchWithTimeout(`${baseUrl}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

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
