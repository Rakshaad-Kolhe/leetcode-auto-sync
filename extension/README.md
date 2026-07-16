# LeetCode Auto Sync Extension

This directory contains the Manifest V3 browser extension foundation for
LeetCode Auto Sync. The extension is intentionally framework-only in this PR:
it does not detect submissions, scrape LeetCode, or communicate with the local
backend yet.

## Purpose

The extension will eventually observe accepted LeetCode submissions and
coordinate synchronization with the local backend. This foundation establishes
the production extension shape needed for future PRs.

## Architecture

```text
extension/
  manifest.json        Manifest V3 configuration
  icons/               Placeholder extension icons
  README.md            Extension documentation
  background/
    background.js      Service worker caching page context and submission state
  content/
    content.js         Main content script coordinates context and submission services
    page_context.js    Page classification and slug extraction utility
    observer.js        Lightweight SPA navigation and history change observer
  popup/
    popup.html         Popup user interface markup
    popup.js           Popup behavior, querying background and rendering states live
    styles.css         Redesigned dark dashboard theme and status badge styles
  shared/
    constants.js       Shared PageTypes, MessageTypes, Verdicts, and endpoints
    logger.js          Prefixed, toggleable logger utility
  submission/
    submission_state.js Pure state machine for submission status tracking
    submission_detector.js Monitors DOM mutations, clicks, and shortcuts for status
  services/
    submission_service.js Coordinates detector events and state updates
    metadata_service.js   Coordinates metadata parsing, validation, and triggers solution service
    solution_service.js   Coordinates solution code parsing, validation, and messaging
    backend_service.js    Isolated client performing HTTP sync/health checks with FastAPI server
  models/
    submission_model.js   Schema and validator representing parsed problem details
    accepted_submission.js Schema and validator representing complete solution object
  parser/
    metadata_parser.js    Robust DOM parsing with fallback selectors for metadata
    solution_parser.js    Monaco Editor API and DOM parser to extract code
```

Current behavior:

- The background service worker caches page contexts, submission states, and complete AcceptedSubmission model details, and drives backend synchronization.
- The content script runs on `https://leetcode.com/*`, initializes all observers, context detectors, and solution code scrapers.
- The submission detector tracks submit interactions and DOM updates to coordinate state transitions.
- The metadata service listens for Accepted submissions, parses problem details, validates them, and hands over control to the solution service.
- The solution service triggers the hybrid solution parser, validates code criteria (UTF-8, size, content), creates the final AcceptedSubmission object, and dispatches it to the background.
- The backend service acts as the isolated HTTP gateway to verify backend health and publish accepted payloads to `/submit`.
- The popup dynamically queries and displays context, live submission states, completed accepted solution details, and real-time backend synchronization states.

## Permissions

Requested permissions are intentionally minimal:

- `storage`

Host permissions:

- `https://leetcode.com/*`

The extension does not request `tabs`, `scripting`, `activeTab`, `identity`,
`cookies`, or `management`.

## Development Setup

No build step is required. The extension is plain Manifest V3 JavaScript,
HTML, and CSS.

## Loading Unpacked

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose the `extension/` directory.
5. Open the extension popup from the toolbar.
6. Visit `https://leetcode.com/` and confirm the content script log appears.

## Future Roadmap

- Detect accepted submission state
- Extract normalized problem metadata
- Send accepted submissions to the local backend
- Add user-facing status and error states
- Add settings after the required options are clear

Out of scope for this foundation: DOM parsing, backend communication, retry
logic, notifications, storage usage, and Git integration.
