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
    background.js      Service worker coordinating page context changes
  content/
    content.js         Main content script coordinating observer and page context
    page_context.js    Page classification and slug extraction utility
    observer.js        Lightweight SPA navigation and history change observer
  popup/
    popup.html         Popup user interface markup
    popup.js           Popup behavior, querying background for context
    styles.css         Redesigned dark dashboard theme styles
  shared/
    constants.js       Shared PageTypes, MessageTypes, and endpoints
    logger.js          Prefixed, toggleable logger utility
```

Current behavior:

- The background service worker caches page contexts, listens to `PAGE_CHANGED` events, and responds to popup queries.
- The content script runs on `https://leetcode.com/*`, initializes the observer, determines context, logs it, and messages the background.
- The observer detects SPA navigation, browser back/forward history navigation, and direct page changes without duplications.
- The popup displays the extension status, current page type (with appropriate badge color), problem slug (if applicable), and current URL.

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
