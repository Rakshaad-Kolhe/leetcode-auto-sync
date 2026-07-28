# LeetCode Auto Sync 🚀

[![CI Pipeline](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Rakshaad-Kolhe/leetcode-auto-sync)](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/releases)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green)](https://developer.chrome.com/docs/extensions/)
[![License](https://img.shields.io/github/license/Rakshaad-Kolhe/leetcode-auto-sync)](LICENSE)

**LeetCode Auto Sync** is a production-grade automation platform that automatically synchronizes your accepted LeetCode submissions to your own GitHub repository.

The project combines a Chrome Manifest V3 extension with a FastAPI backend to create an event-driven synchronization pipeline that extracts accepted solutions, enriches them with problem metadata, generates repository documentation, and performs intelligent Git automation with minimal user interaction.

---

## ✨ Highlights

- ⚡ Automatic synchronization after every Accepted submission
- 🧠 Intelligent incremental synchronization with SHA-256 content hashing
- 🔄 Idempotent filesystem updates and Git operations
- 📚 Automatic README and topic page generation
- 🏷 GraphQL metadata enrichment
- 📊 Repository statistics dashboard
- 🔍 Built-in diagnostics and health monitoring
- 🔁 Automatic retry with configurable timeouts
- 🧪 Comprehensive automated testing
- 🚀 Cross-platform support (Windows, Linux, macOS)

---

## 🏗 Architecture

```
Accepted Submission
        │
        ▼
Chrome Extension
(Content Script)
        │
        ▼
Background Service Worker
        │
        ▼
FastAPI Backend
        │
        ├────────► Metadata Pipeline
        │
        ├────────► Documentation Generator
        │
        ├────────► Sync Engine
        │
        └────────► Git Automation
                     │
                     ▼
             GitHub Repository
```

---

## 🚀 Features

### Automatic Synchronization

Accepted submissions are detected automatically without manual interaction.

### Intelligent Synchronization

The synchronization engine prevents:

- duplicate commits
- unnecessary pushes
- redundant filesystem writes

using SHA-256 source verification and repository-state analysis.

### Metadata Enrichment

Problem metadata includes:

- Difficulty
- Topic Tags
- Company Tags
- Acceptance Rate
- Similar Questions
- Problem Statistics

### Documentation Generation

Automatically generates:

- Root README
- Problem README
- Topic pages
- Repository statistics
- Difficulty summaries

### Git Automation

Supports:

- Repository validation
- Fast-forward synchronization
- Automatic commits
- Automatic push
- Conflict detection
- Retry policies

### Reliability

Production-oriented engineering including:

- timeout recovery
- structured diagnostics
- retry logic
- background persistence
- health endpoints
- release automation

---

## 📦 Installation

See the complete installation guide:

**[INSTALL.md](INSTALL.md)**

The guide covers:

- Windows
- Linux
- macOS
- GitHub repository setup
- Git authentication
- Extension installation
- Backend configuration
- Troubleshooting

---

## 📚 Documentation

| Document | Description |
|-----------|-------------|
| INSTALL.md | Complete installation guide |
| CONFIGURATION.md | Configuration reference |
| ARCHITECTURE.md | System architecture |
| TROUBLESHOOTING.md | Troubleshooting guide |
| SECURITY.md | Security policy |
| CONTRIBUTING.md | Contributor guide |
| CODE_OF_CONDUCT.md | Community standards |
| ROADMAP.md | Future development |

---

## 🧪 Testing

Run all backend tests:

```bash
pytest
```

Run extension tests:

```bash
npm test
```

---

## 🤝 Contributing

We welcome contributions from the community.

Please read:

- CONTRIBUTING.md
- CODE_OF_CONDUCT.md

before opening an issue or pull request.

---

## 🔒 Security

LeetCode Auto Sync:

- never modifies Git configuration
- never stores GitHub credentials
- validates repository integrity
- performs deterministic synchronization
- uses your local Git installation

See:

**SECURITY.md**

---

## 📜 License

Distributed under the MIT License.

See **LICENSE** for details.
