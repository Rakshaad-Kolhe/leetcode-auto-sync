# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-16

This is the first stable release of LeetCode Auto Sync, delivering robust local synchronization of solved LeetCode problems to your repository.

### Added
- **Core foundation**: Manifest V3 extension structure and FastAPI backend service.
- **Page Context Detection**: Observer and classifier for active LeetCode URLs, identifying problem, contest, profile, and exploration routes.
- **Submission Lifecycle Detection**: DOM scanners, hotkey triggers, and MutationObservers to track judging cycles (`IDLE` -> `SUBMITTING` -> `RUNNING` -> `FINISHED`).
- **Metadata Extraction**: Scraper to capture problem ID, title, slug, difficulty, and programming language.
- **Solution Extraction**: Hybrid solution parsing connecting Monaco Editor main-world memory models with DOM scraping fallback lines.
- **Backend Sync Pipeline**: Automatic `POST` dispatch of accepted solutions to the local backend, checking connection health.
- **Diagnostics Dashboard**: Diagnostics panel inside the popup to check versions, targeted URL configurations, client user-agents, sync errors, and connection health status.
- **Configuration Persistence**: Save and reload settings using `chrome.storage.local`.
- **Community Templates**: Added PR templates, issue templates, CONTRIBUTING rules, and MIT LICENSE.
