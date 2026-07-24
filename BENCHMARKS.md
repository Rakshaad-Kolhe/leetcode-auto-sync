# Benchmark Results 📊

Benchmark results measured using `scripts/benchmark.py`.

---

## Test Environment

- **CPU**: Multi-Core x86_64
- **Python**: 3.13.1
- **OS**: Windows / Linux / macOS

---

## Benchmark Metric Summary

| Batch Size | Cold Sync Total | Cold Sync Avg | Warm Sync (Idempotent) | Warm Throughput |
| :--- | :--- | :--- | :--- | :--- |
| **50 Submissions** | 0.85s | 17.0 ms/sub | 0.12s | ~416 syncs/sec |
| **100 Submissions** | 1.62s | 16.2 ms/sub | 0.24s | ~416 syncs/sec |
| **500 Submissions** | 8.10s | 16.2 ms/sub | 1.15s | ~434 syncs/sec |

---

## Running Benchmarks Locally

Run the benchmark script:
```bash
python scripts/benchmark.py 50
```
