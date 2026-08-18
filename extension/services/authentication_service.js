/**
 * AuthenticationService
 * Dedicated Authentication Layer monitoring LeetCode session cookies, CSRF tokens,
 * and login/logout state transitions. Emits AUTH_STATE_CHANGED events.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DeveloperDataStore, Logger } = LeetCodeAutoSync;

  const AUTH_STATES = {
    AUTHENTICATED: "AUTHENTICATED",
    EXPIRED: "EXPIRED",
    UNAUTHENTICATED: "UNAUTHENTICATED"
  };

  class AuthenticationService {
    constructor() {
      this.authState = AUTH_STATES.UNAUTHENTICATED;
      this.sessionToken = null;
      this.csrfToken = null;
      this.listeners = new Set();
      this.initCookieObserver();
    }

    /**
     * Subscribe to authentication state events.
     * @param {Function} listener
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChanged(listener) {
      if (typeof listener === "function") {
        this.listeners.add(listener);
      }
      return () => this.listeners.delete(listener);
    }

    /**
     * Notify subscribers of auth state change.
     */
    notifyAuthSubscribers(state) {
      this.listeners.forEach((listener) => {
        try {
          listener(state, { sessionToken: this.sessionToken, csrfToken: this.csrfToken });
        } catch (err) {
          if (Logger && Logger.error) Logger.error("AuthenticationService listener error:", err);
        }
      });
    }

    /**
     * Initialize browser cookie change listener if chrome.cookies is available.
     */
    initCookieObserver() {
      if (typeof chrome !== "undefined" && chrome.cookies && chrome.cookies.onChanged) {
        chrome.cookies.onChanged.addListener((changeInfo) => {
          const cookie = changeInfo.cookie;
          if (cookie && cookie.domain && cookie.domain.includes("leetcode.com")) {
            if (cookie.name === "LEETCODE_SESSION" || cookie.name === "csrftoken") {
              if (Logger && Logger.info) Logger.info(`AuthenticationService: Detected cookie change for ${cookie.name}`);
              this.verifyAuthenticationState();
            }
          }
        });
      }
    }

    /**
     * Verify current authentication state via cookies or API status.
     * @returns {Promise<string>} Auth state
     */
    async verifyAuthenticationState() {
      if (typeof chrome !== "undefined" && chrome.cookies) {
        return new Promise((resolve) => {
          if (chrome.cookies.get) {
            chrome.cookies.get({ url: "https://leetcode.com", name: "LEETCODE_SESSION" }, (cookie) => {
              if (cookie && cookie.value) {
                this.sessionToken = cookie.value;
                this.setAuthState(AUTH_STATES.AUTHENTICATED);
                return resolve(AUTH_STATES.AUTHENTICATED);
              }
              // Fallback to getAll across leetcode.com domain
              if (chrome.cookies.getAll) {
                chrome.cookies.getAll({ domain: "leetcode.com", name: "LEETCODE_SESSION" }, (cookies) => {
                  if (cookies && cookies.length > 0 && cookies[0].value) {
                    this.sessionToken = cookies[0].value;
                    this.setAuthState(AUTH_STATES.AUTHENTICATED);
                    return resolve(AUTH_STATES.AUTHENTICATED);
                  }
                  this.sessionToken = null;
                  this.setAuthState(AUTH_STATES.UNAUTHENTICATED);
                  resolve(AUTH_STATES.UNAUTHENTICATED);
                });
              } else {
                this.sessionToken = null;
                this.setAuthState(AUTH_STATES.UNAUTHENTICATED);
                resolve(AUTH_STATES.UNAUTHENTICATED);
              }
            });
          } else {
            resolve(this.authState);
          }
        });
      }
      return this.authState;
    }

    /**
     * Set internal auth state and update DeveloperDataStore.
     * @param {string} newState
     */
    setAuthState(newState) {
      const changed = this.authState !== newState;
      this.authState = newState;

      if (DeveloperDataStore && DeveloperDataStore.status) {
        DeveloperDataStore.status.authenticated = newState === AUTH_STATES.AUTHENTICATED;
      }

      if (changed) {
        if (Logger && Logger.info) Logger.info(`AuthenticationService: Auth state transition -> ${newState}`);
        this.notifyAuthSubscribers(newState);
      }
    }
  }

  LeetCodeAutoSync.AUTH_STATES = AUTH_STATES;
  LeetCodeAutoSync.AuthenticationService = new AuthenticationService();

})(typeof self !== "undefined" ? self : this);
