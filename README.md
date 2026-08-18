# DevPulse

### Developer Intelligence for Competitive Programming

[![CI Pipeline](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/Release-v1.1.0-blue)](https://github.com/Rakshaad-Kolhe/leetcode-auto-sync/releases)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green)](https://developer.chrome.com/docs/extensions/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**DevPulse** is a focused developer companion that connects LeetCode activity, personalized competitive-programming recommendations, and local GitHub solution management into one unified, production-hardened workflow.

---

## 🚀 Core Features (v1.1.0)

* **1. Dashboard**: Real-time LeetCode profile integration, current streak counter, contest rating pill, difficulty breakdown (Easy / Med / Hard), live Daily Challenge card, and 30-day activity heatmap.
* **2. Activity**: Interactive monthly calendar with problem submission timeline, language filters (Python, C++, Java, TypeScript), and date-specific problem views.
* **3. Personalized Analytics**: Automated skill proficiency radar, Blind 75 / NeetCode 150 / LeetCode 75 trackers, and a deterministic Next 7 problem recommendation plan tailored to your topic gaps.
* **4. Repository Synchronization**: Incremental, idempotent solution synchronization with SHA-256 content hashing, Git branch and commit tracking, and full problem explorer.
* **5. Curated Lists**: Repository-driven progress tracking across Blind 75, NeetCode 150, and LeetCode 75 using the Canonical Identity Resolver.
* **6. Multi-Subsystem Diagnostics**: Live latency and health telemetry across FastAPI backend, local Git repository, active branch/commit, LeetCode session, and GitHub remote.
* **7. Configuration & Settings**: Granular auto-sync toggles, configurable sync windows (with midnight-spanning support), periodic alarm scheduler, instant theme switcher (System/Dark/Light), and one-click JSON data export.

---

## 🏗 System Architecture

```text
LeetCode.com (Active Problem Session)
      │
      ▼
Chrome Content Script (DOM & Monaco Parser)
      │
      ▼
Background Service Worker (Alarms, Notifications & Settings Guard)
      │
      ▼ [POST /submit]
FastAPI Local Backend Server (:8000)
      │
      ├────────► Canonical Identity Resolver
      ├────────► Metadata Enrichment Pipeline
      ├────────► README & Topic Page Documentation Engine
      └────────► Git & Solution Storage Engine
                   │
                   ▼
           Local Solutions Repository & GitHub Remote
```

---

## 📥 Installation & Setup

### 1. Backend Server Setup
```bash
# Clone the repository
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# Start the local backend service
python -m uvicorn server.app:app --reload --port 8000
```

### 2. Chrome Extension Setup
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the `extension/` directory from this repository.
4. Open the extension popup from your toolbar.

---

## 🧪 Testing & Verification

### Run Extension Test Suite (Node.js)
```bash
node extension/tests/run_tests.js
```
*Executes all 24 extension test suites covering stores, curated pipelines, analytics engines, diagnostics, and settings.*

### Run Backend Test Suite (Pytest)
```bash
pytest
```
*Executes all 144 backend test suites covering API routes, git operations, and documentation engines.*

---

## 🛡️ Security & Privacy

* **Zero Secret Leakage**: Extension state exports and diagnostic logs strictly exclude authentication tokens, session cookies, and passwords.
* **Least-Privilege Scoping**: Manifest V3 permissions are strictly limited to `storage`, `cookies`, `alarms`, and `notifications`.
* **Local-First Processing**: Code analysis and repository management run locally on your machine without third-party data tracking.

---

## ⚠️ Current Limitations (v1.1.0)

* Requires the local FastAPI backend server to be running on `http://127.0.0.1:8000` for git synchronization.
* Requires an active LeetCode login in Chrome for live profile and contest rating queries.

---

## 🗺️ Roadmap

### Current Release: v1.1.0 (Feature Freeze)
* Full popup tabs (Dashboard, Activity, Analytics, Repo, Diagnostics, Settings)
* Canonical identity resolver & repository-driven curated progress
* Live diagnostics and dynamic theme engine

### Planned: v2.0
* Zero-configuration instant profile onboarding wizard
* Client-side offline synchronization queue
* Spaced repetition and revision planner (SM-2 intervals)
* Personal problem notes and mistake logs
* Automated GitHub Pages showcase deployment
* Contest companion countdown and live archive tracker

### Future
* Plugin ecosystem and extensibility hooks
* Multi-platform browser support (Firefox, Edge, Safari)
