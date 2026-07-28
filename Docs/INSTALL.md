# Installation Guide 🛠️

Welcome to **LeetCode Auto Sync**!

This guide walks you through installing, configuring, and running LeetCode Auto Sync from a fresh machine. By the end of this guide, your Accepted LeetCode submissions will automatically synchronize to your own GitHub repository.

> **🔒 Git Identity Safety**
>
> LeetCode Auto Sync **never modifies your local or global Git configuration automatically.**
>
> It only validates your configuration and reports issues so your commit attribution remains under your control.

---

# Table of Contents

1. Prerequisites
2. Clone the Repository
3. Install LeetCode Auto Sync
4. Create Your GitHub Solutions Repository
5. Configure Git Identity
6. Configure GitHub Authentication
7. Start the Backend
8. Install the Browser Extension
9. Configure the Extension
10. Verify Installation
11. First Synchronization
12. Updating
13. Troubleshooting

---

# 1. Prerequisites

Before installing LeetCode Auto Sync, ensure your system meets the following requirements.

| Requirement | Version |
|-------------|----------|
| Python | 3.10+ |
| Git | 2.20+ |
| Google Chrome / Brave / Edge | Latest |
| GitHub Account | Required |

Verify your installation:

```bash
python --version
git --version
```

---

# 2. Clone the Repository

Clone the project.

```bash
git clone https://github.com/Rakshaad-Kolhe/leetcode-auto-sync.git
cd leetcode-auto-sync
```

---

# 3. Install LeetCode Auto Sync

## Windows

```powershell
.\scripts\install.ps1
```

---

## Linux

```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

---

## macOS

```bash
chmod +x scripts/install.command
./scripts/install.command
```

The installer automatically:

- Creates a Python virtual environment
- Installs required dependencies
- Validates Python
- Validates Git
- Installs backend packages
- Prepares the application

---

# 4. Create Your GitHub Solutions Repository

LeetCode Auto Sync stores your solutions in **your own GitHub repository**.

Create a new repository on GitHub.

Recommended name:

```
leetcode-solutions
```

Repository visibility:

- Public (recommended)
- Private (also supported)

Do **NOT** initialize with:

- README
- .gitignore
- License

The repository should be empty.

---

## Clone your repository

```bash
git clone https://github.com/<username>/leetcode-solutions.git
```

Example

```bash
git clone https://github.com/johndoe/leetcode-solutions.git
```

---

# 5. Configure Git Identity

Verify your Git identity.

```bash
git config --global user.name
git config --global user.email
```

If they are empty:

```bash
git config --global user.name "John Doe"

git config --global user.email "john@example.com"
```

LeetCode Auto Sync validates this information before making commits.

It **never changes** your Git configuration automatically.

---

# 6. Configure GitHub Authentication

LeetCode Auto Sync uses your local Git installation.

If you use HTTPS authentication, create a **Fine-Grained Personal Access Token**.

Recommended permissions:

Repository access

```
Only selected repositories
```

Select

```
leetcode-solutions
```

Permissions

```
Contents

Read & Write
```

Store your token securely.

During your first push Git may ask for credentials.

Username

```
your GitHub username
```

Password

```
your Personal Access Token
```

Git Credential Manager will securely remember it for future pushes.

---

# 7. Configure the Solutions Repository

Navigate into your solutions repository.

```bash
cd leetcode-solutions
```

Verify Git is configured.

```bash
git status
```

Verify the remote.

```bash
git remote -v
```

Expected:

```
origin https://github.com/<username>/leetcode-solutions.git
```

---

# 8. Run the Environment Doctor

Before starting the backend, run the diagnostics tool.

```bash
python scripts/doctor.py
```

Expected output:

```
✓ Python

✓ Git

✓ Git Identity

✓ Repository

✓ Remote Origin

✓ Permissions

✓ Dependencies
```

Resolve any reported issues before continuing.

---

# 9. Start the Backend

Launch the FastAPI backend.

```bash
python -m uvicorn server.app:app --host 127.0.0.1 --port 8000
```

You should see:

```
Application startup complete.
```

Verify backend health.

Open

```
http://127.0.0.1:8000/status
```

Expected response

```json
{
  "status": "ok"
}
```

---

# 10. Install the Browser Extension

Open

```
chrome://extensions/
```

Enable

```
Developer Mode
```

Click

```
Load unpacked
```

Select

```
leetcode-auto-sync/extension
```

Pin the extension to your browser toolbar.

---

# 11. Configure the Extension

Open the extension popup.

Configure the following settings.

## Backend URL

```
http://127.0.0.1:8000
```

---

## Solutions Repository

Browse to your local repository.

Example

```
C:\Users\John\Documents\leetcode-solutions
```

or

```
/home/john/leetcode-solutions
```

---

## Verify Connection

The popup should display

```
Backend

Connected
```

```
Repository

Valid
```

```
Git

Configured
```

---

# 12. Verify Installation

Run another health check.

```bash
python scripts/doctor.py
```

Everything should pass.

Open the extension popup.

Verify:

- Backend Connected
- Git Repository Found
- Git Identity Configured
- Ready to Sync

---

# 13. First Synchronization

Open

https://leetcode.com

Solve any problem.

Click

```
Submit
```

Wait until the verdict becomes

```
Accepted
```

LeetCode Auto Sync will automatically:

```
Accepted Submission
        │
        ▼
Extract Source Code
        │
        ▼
Collect Problem Metadata
        │
        ▼
Generate README
        │
        ▼
Update Repository Indexes
        │
        ▼
Write Solution Files
        │
        ▼
Create Git Commit
        │
        ▼
Push to GitHub
```

Within a few seconds you should see:

- Solution committed locally
- Repository updated
- README regenerated
- Commit pushed to GitHub
- Success notification in the extension

---

# Updating LeetCode Auto Sync

Pull the latest changes.

```bash
git pull
```

Run the installer again.

Windows

```powershell
.\scripts\install.ps1
```

Linux

```bash
./scripts/install.sh
```

macOS

```bash
./scripts/install.command
```

If upgrading between major versions, consult

```
UPGRADING.md
```

---

# Troubleshooting

## Backend not running

Verify

```bash
python -m uvicorn server.app:app
```

Ensure port **8000** is available.

---

## Repository not found

Verify

```bash
git status
```

inside your solutions repository.

---

## Missing Git identity

Run

```bash
git config --global user.name

git config --global user.email
```

---

## Push failed

Verify

- GitHub PAT is valid
- Repository permissions include **Contents: Read & Write**
- Remote origin exists

Check

```bash
git remote -v
```

---

## Extension cannot connect

Verify

```
Backend URL

http://127.0.0.1:8000
```

Check

```
http://127.0.0.1:8000/status
```

---

## Doctor reports errors

Run

```bash
python scripts/doctor.py
```

Resolve each reported issue before attempting synchronization.

---

# Security

LeetCode Auto Sync prioritizes user safety.

It:

- Never modifies your Git configuration
- Never changes Git identity automatically
- Never stores GitHub credentials
- Never uploads code except to your configured repository
- Uses your local Git installation for all Git operations

---

# Next Steps

Congratulations! 🎉

Your system is now fully configured.

Every Accepted LeetCode submission will now be automatically:

- Extracted from the browser
- Enriched with problem metadata
- Written to your local repository
- Documented automatically
- Committed using Git
- Pushed to GitHub

Happy coding! 🚀
