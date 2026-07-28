# Performance & Optimization Guide ⚡

This guide details performance tuning, telemetry, and memory optimizations in **LeetCode Auto Sync**.

---

## Key Performance Design Principles

1. **Idempotency & Hash Caching**:
   - Computes SHA-256 hashes for all generated files and stores them in `.cache/sync_hashes.json`.
   - On duplicate submissions, skips filesystem writes and Git operations completely, executing no-op syncs in **<100 ms**.
2. **Incremental Topic Page Generation**:
   - Only regenerates affected topic pages (e.g. `Topics/Array.md`) rather than rebuilding all topic pages across the entire repository.
3. **Atomic File Writes**:
   - Uses temporary file creation, `fsync`, and atomic rename to guarantee data integrity without leaving partially written files.

---

## Runtime Performance Telemetry

Monitor performance metrics via API:
```bash
curl http://127.0.0.1:8000/metrics
```

Output:
```json
{
  "total_syncs": 50,
  "successful_syncs": 50,
  "failed_syncs": 0,
  "cache_hits": 45,
  "cache_misses": 5,
  "cache_hit_ratio": 0.90,
  "avg_sync_duration_ms": 12.4,
  "metadata_fetch_avg_ms": 115.2,
  "readme_gen_avg_ms": 3.1,
  "git_stage_avg_ms": 15.0,
  "git_commit_avg_ms": 42.0,
  "git_push_avg_ms": 180.0
}
```
