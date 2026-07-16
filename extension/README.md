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
  background.js        Service worker for future message coordination
  content.js           LeetCode-only content script placeholder
  popup.html           Browser action popup markup
  popup.js             Popup lifecycle behavior
  styles.css           Popup styles
  icons/               Placeholder extension icons
  README.md            Extension documentation
```

Current behavior:

- The background service worker logs startup and replies to messages with
  `{ "status": "ready" }`.
- The content script runs only on `https://leetcode.com/*` and logs that it
  loaded.
- The popup displays the extension name, version, backend status, and a
  disabled-in-spirit connection check that says `Coming Soon`.

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
