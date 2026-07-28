# Troubleshooting Guide 🔍

Common issues and solutions for **LeetCode Auto Sync**.

---

## Common Issues & Solutions

### 1. `InvalidRepositoryError: Configured repository path is not a valid git repository`
- **Cause**: The path specified in `repo_path` does not exist or does not contain a `.git` folder.
- **Solution**:
  1. Open a terminal and run `git init` in your desired target folder.
  2. Update `repo_path` in `config/default_config.json` or extension popup settings.

---

### 2. `DetachedHeadError: Repository is in detached HEAD state`
- **Cause**: Git HEAD is not currently on any active branch (e.g. checked out to a specific commit).
- **Solution**:
  Run `git checkout main` (or your preferred default branch) in your repository directory.

---

### 3. `CORS Error: Access to XMLHttpRequest blocked by CORS policy`
- **Cause**: The backend server is not running or extension origin is blocked.
- **Solution**:
  1. Ensure backend service is running (`python -m uvicorn server.app:app --port 8000`).
  2. Verify backend endpoint at `http://127.0.0.1:8000/status`.

---

### 4. Diagnostics Support Bundle
If you encounter unresolved issues, generate a support bundle:
```bash
curl http://127.0.0.1:8000/diagnostics > diagnostics_bundle.json
```
Include `diagnostics_bundle.json` when opening an issue on GitHub.
