# Maintainer Guide 🧙

Technical reference for core maintainers of **LeetCode Auto Sync**.

---

## Code Base Map

- `server/app.py`: FastAPI Web API layer (`/status`, `/metrics`, `/diagnostics`, `/submit`).
- `server/sync/`: Idempotent synchronization engine, change detector, repository state, commit planner, and snapshot rollback.
- `server/metadata/`: LeetCode GraphQL client, metadata models, and disk cache.
- `server/config/`: Configuration manager and schema definitions.
- `server/documentation/`: Documentation generator and templates (`classic`, `detailed`, `minimal`).

---

## Running Test Suite

Run full unit and integration test suite:
```bash
python -m pytest
```

Ensure all tests pass prior to merging any Pull Request.
