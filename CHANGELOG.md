# Changelog 📜

All notable changes to **LeetCode Auto Sync** are documented in this file.

The format follows **[Keep a Changelog](https://keepachangelog.com/en/1.0.0/)** and this project adheres to **[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)**.

---

## [1.0.0] - 2026-07-26

### 🎉 Initial Release

This is the first stable public release of **LeetCode Auto Sync**, providing an end-to-end automation platform for synchronizing accepted LeetCode submissions to GitHub with metadata enrichment, documentation generation, and intelligent Git automation.

### Added

#### Browser Extension
- Implemented a Chrome Manifest V3 extension for automatic detection of Accepted LeetCode submissions.
- Added a multi-stage Monaco Editor extraction pipeline with API, viewport, and DOM fallbacks for reliable solution capture.
- Implemented a submission lifecycle state machine for robust synchronization triggering.
- Added popup-based diagnostics, health reporting, and backend connectivity validation.
- Added transient error retries (1s, 2s) for 502/503/504 gateway errors and background state persistence via `chrome.storage.local`.

#### Backend
- Implemented a FastAPI backend exposing REST endpoints for synchronization, diagnostics (`GET /diagnostics`), health monitoring (`GET /status`), and telemetry (`GET /metrics`).
- Added centralized configuration management with environment-based settings.
- Implemented structured request validation and standardized API error handling.

#### Synchronization Engine
- Added an idempotent synchronization engine using SHA-256 source hashing and repository-state analysis.
- Implemented intelligent change detection to eliminate redundant filesystem writes, duplicate commits, and unnecessary Git pushes.
- Added atomic synchronization workflow with repository validation before write operations.

#### Metadata Pipeline
- Integrated LeetCode GraphQL metadata enrichment.
- Added support for:
  - Difficulty
  - Topic Tags
  - Company Tags
  - Acceptance Rate
  - Similar Problems
  - Problem Statistics

#### Documentation Generator
- Added automatic generation of:
  - Root repository README
  - Problem READMEs
  - Topic index pages
  - Repository statistics dashboard
- Added configurable documentation templates:
  - Classic
  - Detailed
  - Minimal
- Added configurable repository layouts and folder naming strategies.

#### Git Automation
- Added automatic repository validation.
- Added intelligent staging, commit creation, and push workflow.
- Implemented fast-forward synchronization before repository updates.
- Added Git identity validation without modifying user configuration.

#### Reliability
- Added configurable request timeout handling (45-second submit boundary).
- Implemented exponential backoff retry for transient failures (HTTP 502, 503, and 504).
- Added background synchronization persistence using `chrome.storage.local`.
- Added structured diagnostics and synchronization telemetry.

#### Installation & Tooling
- Added cross-platform installation scripts for:
  - Windows (`install.ps1`)
  - Linux (`install.sh`)
  - macOS (`install.command`)
- Added environment validation through the built-in Doctor utility.
- Added production-ready GitHub Actions CI pipeline with automated testing and release validation.

### Security

- Ensured Git identity is validated but never modified automatically.
- Added repository integrity verification before synchronization.
- Prevented duplicate synchronization through payload deduplication and source integrity checks.

### Documentation

- Added comprehensive installation guide.
- Added configuration reference.
- Added architecture documentation.
- Added troubleshooting guide.
- Added contributing guidelines.
- Added security policy.
- Added code of conduct.
- Added project roadmap.

### Testing

- Added comprehensive automated backend test suite.
- Added automated extension test suite.
- Added regression tests covering synchronization, repository integrity, metadata extraction, documentation generation, and release workflows.

---

## Versioning

This project follows **Semantic Versioning**.

- **MAJOR** version for incompatible API or architecture changes.
- **MINOR** version for backward-compatible features.
- **PATCH** version for backward-compatible bug fixes.

For upgrade instructions, see **UPGRADING.md**.
