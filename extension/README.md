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
```

Current behavior:

- The background service worker caches page contexts and submission states, handles changes, and serves data to the popup.
- The content script runs on `https://leetcode.com/*`, initializes the context observer and submission detector services.
- The submission detector listens to button clicks, Ctrl/Cmd+Shift+Enter shortcuts, and DOM changes to identify judging status.
- The submission state machine handles transitions between `IDLE`, `SUBMITTING`, `RUNNING`, and `FINISHED`.
- The popup displays the current page context, live submission states, and final verdicts with distinct badge colors.

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
