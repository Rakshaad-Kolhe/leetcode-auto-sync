# ADR 001: Phase 2 Developer Intelligence OS Architecture

## Status
Accepted

## Context
Phase 2 of LeetCode Auto Sync requires transforming raw problem-solving statistics and repository synchronization history into an interactive, deterministic Developer Intelligence Platform ("Developer Intelligence OS"). The platform must feel comparable to Linear, Raycast, GitHub Insights, and VS Code.

## Decision
We establish a clean, domain-driven architecture for the extension intelligence layer (`extension/intelligence/`) and domain model layer (`extension/models/`).

### Architectural Principles:
1. **Zero UI Business Logic**: All scoring, pattern detection, milestone predictions, company readiness matrices, and recommendations are computed exclusively inside domain services (`DeveloperIntelligenceService`, `SkillTreeService`, `PatternService`, `InterviewMatrixService`, `ProjectionService`, `RepositoryAuditService`). UI components strictly render pre-computed domain objects and dispatch user action events.
2. **100% Deterministic & Explainable**: No black-box AI algorithms or magic numbers are used. Every recommendation, milestone target, and readiness percentage exposes measurable empirical evidence, exact mathematical formulas, and expected score improvements.
3. **Event-Driven & Reactive Caching**: Intelligence reports are recalculated automatically upon accepted submission synchronization, repository audits, or explicit user recomputation requests, and persisted in `chrome.storage.local`.
4. **AST Code Pattern Discovery Engine**: Algorithmic patterns (Sliding Window, Two Pointer, Binary Search, DFS, BFS, Backtracking, Union Find, Segment Tree, Trie, Monotonic Stack, etc.) are detected directly from solution source code AST and structural regex analysis.

## Consequences
- Clean separation of concerns allows adding future intelligence services (e.g. mock interview simulator, code complexity analyzer) without modifying existing UI or domain components.
- Complete testability with >95% target unit test coverage across all domain services.
