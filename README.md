# LeetCode Auto Sync

LeetCode Auto Sync is a local-first backend foundation for a future browser-extension-driven workflow that will capture LeetCode activity and synchronize it into a Git-backed repository. This PR establishes only the server base so later milestones can layer in parsing, Git automation, and repository synchronization without exposing credentials to the browser extension.

## Architecture

```mermaid
flowchart LR
    LC[LeetCode] --> EXT[Manifest V3 Browser Extension]
    EXT --> API[Local FastAPI Server]
    API --> GIT[Local Git Repository]
    GIT --> GH[GitHub]
```

## Current Features

- FastAPI application skeleton
- Structured JSON logging
- Root endpoint for service metadata
- Health endpoint for readiness checks
- Centralized configuration values
- JSON exception handling for API errors

## Installation

Create a virtual environment and install the server dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r server/requirements.txt
```

## Running the Server

Start the API from the `server` directory:

```bash
cd server
uvicorn app:app --reload
```

You can also override configuration with environment variables such as `HOST`,
`PORT`, `LOG_LEVEL`, `LEETCODE_REPO_PATH`, `AUTO_PUSH`, `REMOTE_NAME`, and
`DEFAULT_BRANCH`.

## Example Health Response

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

## Roadmap

- Add the `/submit` workflow in a later PR
- Implement LeetCode parsing and problem extraction
- Add Git automation for local repository sync
- Generate problem README files and folder structure
- Add browser extension integration
- Expand configuration and operational logging

## API

### POST /submit

Accepts a JSON payload describing an accepted LeetCode submission. The server
validates the request and returns a stable acknowledgement on success.

Example request:

```json
{
  "id": 49,
  "title": "Group Anagrams",
  "slug": "group-anagrams",
  "difficulty": "Medium",
  "language": "cpp",
  "code": "#include <bits/stdc++.h>..."
}
```

Example success response:

```json
{
  "status": "accepted",
  "message": "Submission received successfully.",
  "problem": {
    "id": 49,
    "title": "Group Anagrams"
  }
}
```

Example validation error (missing or invalid fields):

```json
{
  "detail": [
    {
      "loc": ["body", "id"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

## Repository Writer

This service will generate a local repository layout for validated submissions.

Layout produced under the configured `LEETCODE_REPO_PATH` (default is the
project root) in a `Leetcode-solutions/` directory. Example structure:

```
Leetcode-solutions/
  Easy/
    0001-Two-Sum/
      README.md
      solution.cpp
  Medium/
  Hard/
```

Supported language -> filename mapping:

- `cpp` -> `solution.cpp`
- `python3`, `python` -> `solution.py`
- `java` -> `Solution.java`
- `javascript` -> `solution.js`
- `typescript` -> `solution.ts`
- `go` -> `solution.go`
- `rust` -> `solution.rs`
- `c` -> `solution.c`
- `csharp` -> `Solution.cs`
- `kotlin` -> `Solution.kt`
- `swift` -> `Solution.swift`

Configure the target repository root by setting the `LEETCODE_REPO_PATH`
environment variable or updating `server/config.py`.

## Root README generation

The server can automatically generate the repository's root `README.md` by
scanning the `Leetcode-solutions/` tree. The generator produces a deterministic
index and statistics summary (total solved, counts by difficulty, and a table
of problems) and overwrites the repository README on each run. The generator
is invoked automatically after a successful repository write (for example
when a new problem is added via the `POST /submit` flow).

Root README generation includes:

- Repository scanning from `Easy/`, `Medium/`, and `Hard/`
- Statistics for total solved and solved counts by difficulty
- A problem index sorted by problem number
- Deterministic regeneration from the filesystem source of truth

See `server/repository_scanner.py` and `server/root_readme.py` for implementation
details and configuration options.

## Git Service Foundation

The backend includes a reusable Git service abstraction in
`server/git_service.py`. It wraps the local `git` executable with Python
`subprocess` and keeps Git operations out of API routes and business workflows.

The service currently provides foundation methods to:

- Verify a valid Git repository
- Read the current branch
- Read repository status
- Stage changes
- Commit staged changes
- Push a branch to the configured remote

This service is not invoked automatically yet. The `/submit` response remains
unchanged; a later PR will integrate Git operations after repository writing
and root README generation.

### Git Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_PUSH` | `true` | Future integration flag for automatic pushes. |
| `REMOTE_NAME` | `origin` | Remote used by `GitService.push_changes()`. |
| `DEFAULT_BRANCH` | `main` | Expected default branch used for branch metadata. |
| `LEETCODE_REPO_PATH` | project root | Local repository root used by default. |

### Git Errors

The service raises custom exceptions instead of exposing raw subprocess
exceptions:

- `GitNotInstalledError`
- `InvalidRepositoryError`
- `DetachedHeadError`
- `PushFailedError`
- `CommitFailedError`
- `MissingRemoteError`

Structured logging records repository validation, current branch, repository
status, commit hashes, and push results. Credentials are never logged.

### Commit Messages

`generate_problem_commit_message()` produces deterministic messages for future
submission integration:

- New problem: `Add 0049 - Group Anagrams`
- Updated problem: `Update 0049 - Group Anagrams`
