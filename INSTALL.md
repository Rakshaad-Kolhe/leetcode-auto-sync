# Installation Guide 🛠️

This guide provides step-by-step instructions for installing and onboarding **LeetCode Auto Sync** on Windows, Linux, and macOS.

> **🔒 Git Identity Safety**: LeetCode Auto Sync **NEVER modifies your local or global Git configuration automatically**. It strictly reads, validates, and reports identity issues to protect your commit attribution.

---

## Prerequisites

- **Python**: Version 3.10 or higher.
- **Git**: Version 2.20 or higher installed and configured on your system PATH.
- **Google Chrome** (or Chromium-based browser like Brave, Edge, Arc).

---

## Operating System Installation

### Windows (PowerShell)
```powershell
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync
.\scripts\install.ps1
```

### Linux (Bash)
```bash
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync
chmod +x scripts/install.sh
./scripts/install.sh
```

### macOS (Terminal)
```bash
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync
chmod +x scripts/install.command
./scripts/install.command
```

---

## First-Run Diagnostics Doctor

Run the environment doctor to verify all prerequisites before starting:
```bash
python scripts/doctor.py
```

---

## Starting Backend Service

Run the server using Python:
```bash
python -m uvicorn server.app:app --host 127.0.0.1 --port 8000
```

Verify backend health by navigating to:
[http://127.0.0.1:8000/status](http://127.0.0.1:8000/status)

---

## Installing Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select the `extension` directory inside the repository.
4. Click the LeetCode Auto Sync popup icon in your browser toolbar to verify system status.

---

## Upgrading

Existing users upgrading from prior versions should refer to the [Upgrading Guide](UPGRADING.md).
