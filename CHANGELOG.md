# Changelog 📜

All notable changes to **LeetCode Auto Sync** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-07-24

### Added
- **Modular Structured Logging**: `server/logging/` package with JSON and human-readable formatters emitting structured telemetry events (`SYNC_STARTED`, `METADATA_FETCHED`, `FILES_UPDATED`, `GIT_COMMIT_CREATED`, `GIT_PUSH_COMPLETED`).
- **Runtime Performance Telemetry**: `server/metrics/` package with `GET /metrics` returning sync count, average duration, cache hit ratio, and Git/GraphQL breakdown.
- **Benchmark Suite**: `benchmarks/benchmark_sync.py` measuring 100, 500, and 1000 submission runs.
- **Release Automation**: `scripts/release.py` verifying versions, package checksums, and release notes.

### Fixed
- Included `httpx>=0.27.0` in `server/requirements.txt` to fix GitHub Actions CI test client failure.
- Updated Pydantic `@validator` to `@field_validator` in `server/schemas.py`.

---

## [1.0.0] - 2026-07-23

### Added
- Initial public release candidate of LeetCode Auto Sync.
- Intelligent, idempotent synchronization engine with SHA-256 change detection.
- GraphQL metadata enrichment with topic tags, company tags, and similarity recommendations.
- Custom README templates (`classic`, `detailed`, `minimal`) and layout strategies.
- Health dashboard (`GET /status`) and support bundle generator (`GET /diagnostics`).
- Cross-platform installation scripts for Windows, Linux, and macOS.
