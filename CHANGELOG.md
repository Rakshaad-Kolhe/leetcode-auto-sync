# Changelog 📜

All notable changes to **LeetCode Auto Sync** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-26

### Added
- **Official Public Release of LeetCode Auto Sync v1.0.0**.
- **Intelligent, Idempotent Synchronization Engine**: SHA-256 source code and metadata hash verification prevents duplicate commits and redundant GitHub pushes.
- **Chrome Extension (Manifest V3)**: Multi-tier Monaco editor solution extractor (`Monaco API` -> `Viewport DOM lines` -> `Full DOM fallback`) with automated submission state machine (`IDLE` -> `SUBMITTING` -> `RUNNING` -> `FINISHED`).
- **GraphQL Metadata Enrichment**: Fetches problem tags, company tags, difficulty ratings, acceptance ratios, and similar problem recommendations directly from LeetCode GraphQL API.
- **Customizable Documentation Layouts**: Configurable directory structure (`difficulty-number-title`, `classic`, etc.) and markdown templates (`classic`, `detailed`, `minimal`).
- **Transient Error Retry & Endpoint Boundaries**: Configurable 45-second submit timeout boundary with automatic exponential backoff retries (1s, 2s) for 502/503/504 gateway errors.
- **Service Worker State Persistence**: Persists active sync outcomes to `chrome.storage.local` across background idle suspension and popup closing.
- **Diagnostics & Health Dashboard**: Built-in `GET /status`, `GET /diagnostics`, and `GET /metrics` endpoints with one-click report generator in popup.
- **Cross-Platform Installers**: Automated installation scripts for Windows (`install.ps1`), Linux (`install.sh`), and macOS (`install.command`).
