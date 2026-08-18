# Developer Intelligence OS Architecture & Data-Flow Diagrams

This document illustrates the sequence and data-flow diagrams for the **Developer Intelligence OS** pipeline in LeetCode Auto Sync.

## 1. Domain Architecture Overview

```mermaid
graph TD
    Sub[LeetCode Accepted Submission] --> Detector[Submission Detector & State]
    Detector --> SolutionService[Solution Service Coordinator]
    SolutionService --> SyncEngine[Backend Git Sync Engine]
    SyncEngine --> IntelService[Developer Intelligence Master OS Service]
    
    IntelService --> SkillTreeService[SkillTreeService]
    IntelService --> JourneyService[JourneyService]
    IntelService --> PatternService[PatternService]
    IntelService --> InterviewMatrixService[InterviewMatrixService]
    IntelService --> RecommendationService[RecommendationService]
    IntelService --> AchievementService[AchievementService]
    IntelService --> ProjectionService[ProjectionService]
    IntelService --> RepositoryAuditService[RepositoryAuditService]

    IntelService --> Storage[(chrome.storage.local)]
    Storage --> UI[Popup OS Views & Daily Brief]
```

## 2. Intelligence Processing & UI Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant PopupUI as Popup OS Workspace
    participant Background as Background Worker
    participant MasterOS as DeveloperIntelligenceService
    participant SubServices as Domain Sub-Services

    User->>PopupUI: Open Extension Popup / Daily Brief
    PopupUI->>Background: Send GET_INTELLIGENCE_REPORT message
    Background->>MasterOS: getOrComputeIntelligence(force=false)
    alt Cache Available
        MasterOS-->>Background: Return cached DeveloperReport
    else Compute Fresh Report
        MasterOS->>SubServices: Evaluate SkillTree, Patterns, Matrix & Projections
        SubServices-->>MasterOS: Return domain calculations
        MasterOS->>MasterOS: Compute overall score & readiness level
        MasterOS-->>Background: Return compiled DeveloperReport
    end
    Background-->>PopupUI: Render Developer OS Workspace
```

## 3. Streak Architecture & Data Isolation

The extension maintains three independent streak concepts in `DeveloperDataStore.stats`:

### Official Streak
- **Source**: `streakCounter.streakCount` (LeetCode GraphQL top-level endpoint)
- **Features**: Includes Time Travel Tickets, skipped-day recovery (`daysSkipped`), and current day completion status (`currentDayCompleted`).
- **UI Display**: Authoritative streak rendered in Popup UI & Developer View Model (`🔥 {officialStreak} Days`).

### Calendar Streak
- **Source**: `userCalendar.streak` (LeetCode GraphQL matchedUser endpoint)
- **Features**: Raw consecutive submission count directly from user calendar response.
- **Usage**: Analytical tracking and data parity verification.

### Reconstructed Streak
- **Source**: Computed locally from `userCalendar.submissionCalendar` active daily timestamps.
- **Features**: Deterministic consecutive day calculation starting from today/yesterday.
- **Usage**: Internal validation, debugging, and offline fallback.

