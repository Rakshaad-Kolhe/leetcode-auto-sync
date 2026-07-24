# LeetCode Auto Sync — Installation Guide

Get **LeetCode Auto Sync** installed and running on your local machine in under **5 minutes**.

---

## 📋 Prerequisites

Before installing, ensure you have:
1. **Python**: Version `3.10` or higher ([Download Python](https://www.python.org/downloads/)).
2. **Git**: Installed and configured on your system ([Download Git](https://git-scm.com/downloads)).
3. **Browser**: Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Opera).

---

## ⚡ Quick Start (5-Minute Setup)

### 1. Clone Repository & Setup Backend

#### Windows (PowerShell / CMD)
```powershell
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r server/requirements.txt
```

#### macOS / Linux (Terminal)
```bash
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r server/requirements.txt
```

---

### 2. Verify Git Configuration

Make sure your Git identity is configured:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```
*(Ensure `user.email` matches your primary GitHub email for contribution graph attribution.)*

---

### 3. Start Local FastAPI Backend Server

From the repository root directory, start the server:
```bash
python -m uvicorn server.app:app --reload --port 8000
```
You should see:
```text
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

Verify backend health in your browser:
👉 [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 4. Install Browser Extension

1. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `extension` folder located inside the cloned `leetcode-auto-sync` repository directory.
5. Click the extension icon in your browser toolbar to open the LeetCode Auto Sync popup!

---

## ✅ Verification

1. Go to any LeetCode problem page (e.g., [https://leetcode.com/problems/two-sum/](https://leetcode.com/problems/two-sum/)).
2. Submit your solution.
3. Upon receiving **Accepted**, LeetCode Auto Sync automatically:
   - Formats and writes the solution file (`Leetcode-solutions/...`)
   - Generates a problem `README.md` with problem metadata
   - Updates the root repository dashboard
   - Creates a Git commit and pushes to your remote repository!

---

## 🔧 Troubleshooting & Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `Connection refused` | Backend server not running | Run `python -m uvicorn server.app:app --reload --port 8000` |
| `Git is not configured` | Missing `user.email` | Run `git config --global user.email "you@example.com"` |
| `Branch Diverged` | Remote contains newer commits | Run `git pull --rebase origin main` |

---

## 📄 License

Distributed under the [MIT License](LICENSE).
