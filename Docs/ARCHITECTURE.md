# Architecture Specification 🏗️

LeetCode Auto Sync is structured into decoupled core layers:

```
+-------------------------------------------------------+
|                 Chrome Extension                      |
| (Content Script -> Background Service Worker -> Popup) |
+---------------------------+---------------------------+
                            | HTTP POST /submit
                            v
+-------------------------------------------------------+
|                    FastAPI App                        |
|                     server/app.py                     |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|                 Intelligent SyncEngine                |
|                    server/sync/                       |
|  +--------------------+   +-----------------------+   |
|  |   ChangeDetector   |   |    RepositoryState    |   |
|  | (SHA-256 Caching)  |   | (Immutable Snapshot)  |   |
|  +--------------------+   +-----------------------+   |
|  |      FileDiff      |   |     CommitPlanner     |   |
|  | (Normalized Diff)  |   | (Git Status Check)    |   |
|  +--------------------+   +-----------------------+   |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|               Documentation Generator                 |
|             server/documentation/                     |
|  (Templates: Classic / Detailed / Minimal)            |
+-------------------------------------------------------+
```

## Core Modules

1. **`server/sync/`**:
   - `file_diff.py`: Line-ending normalization and SHA-256 hashing.
   - `change_detector.py`: Hash-based disk change detection.
   - `repository_state.py`: Immutable repository state snapshot.
   - `commit_planner.py`: Git commit/push action planner.
   - `sync_engine.py`: Central idempotent synchronization coordinator.
2. **`server/metadata/`**:
   - `graphql_client.py`: LeetCode GraphQL API metadata fetcher.
   - `cache.py`: Local disk cache for enriched metadata.
   - `metadata_service.py`: High-level enrichment orchestrator.
3. **`server/config/`**:
   - `config_manager.py`: Thread-safe singleton configuration manager.
