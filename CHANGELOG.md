# Changelog

All notable changes to **DevPulse** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-08-18

### Highlights
* **Official Product Rebrand**: Rebranded as **DevPulse — Developer Intelligence for Competitive Programming**.
* **Production-Ready Popup Architecture**: High-density developer UI featuring 6 unified tabs:
  * **Dashboard**: Real-time streak, acceptance metrics, live daily challenge, and activity heatmap.
  * **Activity**: Interactive monthly calendar with problem submission timeline and language filters.
  * **Analytics**: Automated skill proficiency radar, Blind 75 / NeetCode 150 / LeetCode 75 trackers, and personalized Next 7 plan.
  * **Repo**: Live repository control center with synchronization health, commit hashes, and solution explorer.
  * **Diagnostics**: Real-time multi-subsystem status checks (FastAPI backend, Git working tree, LeetCode session, and GitHub remote).
  * **Settings**: Centralized configuration store with instant theme application, sync windows, alarms, and JSON export.
* **Repository-Driven Curated Progress**: Progress tracking across Blind 75, NeetCode 150, and LeetCode 75 is derived directly from local git solutions via the Canonical Identity Resolver.
* **Personalized Recommendation Engine**: Generates targeted Next 7 problem plans based on actual topic strengths and difficulty readiness.
* **Zero Hardcoded Runtime Values**: Comprehensive production audit and hardening across all UI components and background workers.

### Reliability & Hardening
* **24 / 24 Extension Test Suites Passing**: Comprehensive automated tests covering domain stores, curated pipeline, analytics engine, diagnostics, and settings.
* **144 / 144 Backend Pytest Tests Passing**: Full validation of FastAPI endpoints, repository scanner, Git operations, and README generation.
* **Manifest V3 Scoped Permissions**: Strict least-privilege permissions (`storage`, `cookies`, `alarms`, `notifications`).
* **Race Condition Safeguards**: Safe unhydrated popup rendering guards and candidate endpoint fallback.
* **Safe Data Export**: `devpulse-export-YYYY-MM-DD.json` captures non-sensitive operational state while strictly omitting tokens and credentials.

---

## [1.0.0] - 2026-08-15
* Initial baseline release of core LeetCode submission extraction, local FastAPI bridge, and Git sync pipeline.
