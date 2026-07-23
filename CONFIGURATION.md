# Configuration Guide ⚙️

LeetCode Auto Sync is configured via `config/default_config.json` or overridden dynamically via the Chrome Extension popup UI.

---

## Configuration Schema

```json
{
  "repository": {
    "repo_path": "~/leetcode-solutions",
    "folder_layout": "difficulty-number-title",
    "auto_generate_readme": true,
    "auto_generate_dashboard": true,
    "auto_generate_topics": true
  },
  "git": {
    "auto_commit": true,
    "auto_push": false,
    "commit_message": "Add {problem_number} - {title}"
  },
  "documentation": {
    "template": "classic"
  },
  "metadata": {
    "enable_graphql": true,
    "cache_days": 30
  }
}
```

---

## Options Reference

### Repository Settings
- `repo_path`: Path to your local Git repository.
- `folder_layout`:
  - `difficulty-number-title` $\rightarrow$ `Easy/0001-Two Sum/`
  - `difficulty-title` $\rightarrow$ `Easy/Two Sum/`
  - `number-title` $\rightarrow$ `0001-Two Sum/`
  - `flat` $\rightarrow$ `Two Sum/`
- `auto_generate_readme`: Boolean. Automatically create per-problem solution `README.md`.
- `auto_generate_dashboard`: Boolean. Automatically update root `README.md` dashboard.
- `auto_generate_topics`: Boolean. Automatically create/update `Topics/<TopicName>.md`.

### Git Settings
- `auto_commit`: Automatically create git commits after writing files.
- `auto_push`: Automatically push committed changes to remote repository.
- `commit_message`: Format string. Available placeholders: `{action}`, `{problem_number}`, `{problem_title}`, `{difficulty}`, `{language}`.

### Documentation Templates
- `template`:
  - `classic`: Standard badges, sections, and metadata.
  - `detailed`: Includes difficulty indicator, company breakdown, and problem stats.
  - `minimal`: Sleek, minimal markdown view.
