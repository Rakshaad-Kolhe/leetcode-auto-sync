# LeetCode Auto Sync 🚀

![CI](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/workflows/CI%20Pipeline/badge.svg)
![Release](https://img.shields.io/github/v/release/Rakshaad-Kolhe/leetcode-auto-sync)
![License](https://img.shields.io/github/license/Rakshaad-Kolhe/leetcode-auto-sync)
![Python Version](https://img.shields.io/badge/python-3.10%2B-blue)
![Chrome Extension](https://img.shields.io/badge/chrome%20extension-manifest%20v3-green)

**LeetCode Auto Sync** is a production-quality, open-source tool that automatically synchronizes your accepted LeetCode submissions directly into your local Git repository with rich metadata, custom markdown READMEs, topic breakdown pages, and root repository statistics dashboard.

---

## Features ✨

- **Automatic Synchronization**: Detects accepted submissions on LeetCode and instantly syncs solution code and metadata.
- **Intelligent & Idempotent**: Prevents redundant filesystem writes, duplicate commits, or unnecessary Git pushes using SHA-256 content hashes.
- **Incremental Topic Pages**: Automatically categorizes solutions under `Topics/<TopicName>.md` without rewriting untouched topic pages.
- **GraphQL Metadata Enrichment**: Fetches topic tags, company tags, acceptance rates, difficulty badges, and similar questions from LeetCode GraphQL API.
- **Customizable Templates & Layouts**: Supports `classic`, `detailed`, and `minimal` documentation templates as well as `difficulty-number-title` or custom folder structures.
- **First-Time Setup Wizard & Health Dashboard**: Built-in `GET /status` and `GET /diagnostics` endpoints with interactive extension popup.

---

## Quick Start 🏁

### 1. Install Backend
```bash
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync

# On Windows:
.\scripts\install.ps1

# On Linux / macOS:
./scripts/install.sh
```

### 2. Launch Backend Service
```bash
python -m uvicorn server.app:app --reload --port 8000
```

### 3. Load Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` folder.

---

## Documentation 📚

- **[Installation Guide](INSTALL.md)** — Comprehensive setup guide for Windows, Linux, and macOS.
- **[Configuration Reference](CONFIGURATION.md)** — Complete reference for config parameters, layout options, and templates.
- **[Architecture Specification](ARCHITECTURE.md)** — Detailed overview of synchronization engine, metadata pipeline, and design principles.
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** — Solutions for common Git, Python, Chrome Extension, and CORS issues.
- **[Security Policy](SECURITY.md)** — Security guidelines, secret redaction, and vulnerability reporting.
- **[Contributing Guidelines](CONTRIBUTING.md)** — Guidelines for open-source contributors.
- **[Product Roadmap](ROADMAP.md)** — Future release plans and extension features.

---

## License 📜

Distributed under the [MIT License](LICENSE).
