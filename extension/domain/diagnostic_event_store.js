/**
 * @fileoverview Central Diagnostic Event Store for LeetCode Auto Sync.
 * Stores structured operational events in-memory with chrome.storage.local persistence.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});
  const { DiagnosticEvent, DiagnosticEventType } = LeetCodeAutoSync;

  const STORAGE_KEY = "diagnostic_events";
  const MAX_EVENTS = 50;

  class DiagnosticEventStore {
    constructor() {
      this.events = [];
      this.listeners = new Set();
      this.hydrateFromStorage();
    }

    /**
     * Subscribe to new diagnostic events.
     * @param {Function} listener
     * @returns {Function} Unsubscribe callback
     */
    subscribe(listener) {
      if (typeof listener === "function") {
        this.listeners.add(listener);
      }
      return () => this.listeners.delete(listener);
    }

    /**
     * Notify subscribers of new events.
     */
    notifySubscribers() {
      this.listeners.forEach((listener) => {
        try {
          listener(this.events);
        } catch (e) {
          console.error("[DiagnosticEventStore] Subscriber notification error:", e);
        }
      });
    }

    /**
     * Add a diagnostic event to the store with deduplication.
     * @param {DiagnosticEvent|Object} eventPayload
     * @returns {DiagnosticEvent}
     */
    addEvent(eventPayload) {
      if (!eventPayload) return null;

      const evt = eventPayload instanceof DiagnosticEvent
        ? eventPayload
        : new DiagnosticEvent(eventPayload);

      // Deduplicate: ignore if an event with exact same signature occurred within 1000ms
      const isDuplicate = this.events.some((existing) => {
        if (existing.id === evt.id) return true;
        const timeDiff = Math.abs(existing.timestamp - evt.timestamp);
        return timeDiff < 1000 && existing.type === evt.type && existing.message === evt.message;
      });

      if (isDuplicate) {
        return evt;
      }

      this.events.unshift(evt);
      if (this.events.length > MAX_EVENTS) {
        this.events = this.events.slice(0, MAX_EVENTS);
      }

      this.persistToStorage();
      this.notifySubscribers();
      return evt;
    }

    /**
     * Retrieve recent events.
     * @param {number} [limit=20]
     * @returns {Array<DiagnosticEvent>}
     */
    getEvents(limit = 20) {
      return this.events.slice(0, limit);
    }

    /**
     * Clear all recorded events.
     */
    clearEvents() {
      this.events = [];
      this.persistToStorage();
      this.notifySubscribers();
    }

    /**
     * Persist current event list to chrome.storage.local.
     */
    persistToStorage() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY]: this.events }, () => {
            if (chrome.runtime.lastError) {
              // Ignore storage quotas / transient warnings
            }
          });
        }
      } catch (e) {}
    }

    /**
     * Hydrate events from storage.
     */
    hydrateFromStorage() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([STORAGE_KEY], (items) => {
            if (items && Array.isArray(items[STORAGE_KEY])) {
              this.events = items[STORAGE_KEY].map(raw => new DiagnosticEvent(raw));
              this.notifySubscribers();
            }
          });
        }
      } catch (e) {}
    }
  }

  LeetCodeAutoSync.DiagnosticEventStore = new DiagnosticEventStore();

})(typeof self !== "undefined" ? self : this);
