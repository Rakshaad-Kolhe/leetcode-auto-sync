# Upgrading LeetCode Auto Sync

This guide assists existing users in upgrading LeetCode Auto Sync to the latest stable release (**v1.0.1**).

---

## 🔒 Important Security & Privacy Guarantee

> **Git Identity Read-Only Safety**: LeetCode Auto Sync **NEVER modifies your local or global Git configuration automatically**. It strictly reads and validates `user.name` and `user.email` to protect your commit attribution and warn if a placeholder email is detected.

---

## 🔄 Step-by-Step Upgrade Instructions

### Step 1: Update Local Repository & Python Dependencies

1. Pull the latest repository updates:
   ```bash
   git pull origin main
   ```
2. Activate your virtual environment and update dependencies:
   ```bash
   # Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   pip install --upgrade -r server/requirements.txt

   # macOS / Linux (Terminal)
   source .venv/bin/activate
   pip install --upgrade -r server/requirements.txt
   ```

---

### Step 2: Reload the Browser Extension

1. Open your browser's Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Locate **LeetCode Auto Sync**.
3. Click the **Reload icon (↻)** on the extension card.
4. Verify that the extension version reflects `v1.0.1`.

---

### Step 3: Run First-Run Diagnostics Doctor

Verify system readiness with the new diagnostic doctor script:
```bash
python scripts/doctor.py
```
You should see:
```text
[PASS] Python Version                 : Python 3.10+
[PASS] Git Executable                 : Found on PATH
[PASS] Repository Structure           : Valid Git repo
[PASS] Git Identity                   : Valid (non-placeholder)
[PASS] Backend Server                 : Reachable at http://127.0.0.1:8000/health
[PASS] Repository Permissions         : Write permissions verified
```

---

## ⚙️ Configuration Schema Updates (v1.0.1)

If you are using a custom `config.json`, the following optional settings are now available under the `git` section:

```json
{
  "git": {
    "auto_commit": true,
    "auto_push": true,
    "auto_rebase": true,
    "commit_message": "Add {problem_number} - {problem_title}"
  }
}
```

- `auto_rebase`: When set to `true` (default), the backend automatically attempts `git pull --rebase` if remote contains newer commits before pushing.
