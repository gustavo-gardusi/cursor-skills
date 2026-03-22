---
name: browser-navigator
description: Open Firefox with a shared profile, listen to navigation events via CDP, and auto-capture page snapshots.
visibility: internal
---

# Context: Browser Navigator

This internal skill manages the Firefox browser lifecycle and DevTools Protocol (CDP) connection. It enables the passive listening architecture where the user navigates naturally and the skill captures data in the background.

## Browser Management

- **Browser**: Firefox (required for open-source nature and clean CDP support)
- **Profile**: Global shared profile at `$HOME/.cursor/browser-profiles/Default`
- **Lifecycle**: One window opened per `@context-add` invocation. Stays open until user manually closes it.

## Execution Flow

When invoked by `@context-add`:

1. **Launch**:
   - Create profile directory if missing.
   - Launch Firefox with remote debugging enabled.
   - Connect via CDP (Chrome DevTools Protocol).
   - Open initial URL (if provided).

2. **Listen (Event Loop)**:
   - Monitor `Target.targetCreated` (new tabs) and `Page.frameNavigated` / `Page.loadEventFired` (page loads) for ALL tabs.
   - On each navigation completion:
     - Wait 3-5 seconds for dynamic content to settle (SPA frameworks like Jira/Slack).
     - Execute text extraction script in the page context.
   
3. **Extraction Script**:
   - Extract `window.location.href`.
   - Extract `document.title`.
   - Extract all visible text: filter out `<script>`, `<style>`, `hidden` elements. Deduplicate whitespace. Max 10KB.
   - Extract all `<a>` tags with `href` and `innerText`.

4. **Return Snapshot**:
   - Save the snapshot `{url, title, text, links}` using `@snapshot-save`.
   - Yield control back to the orchestrator (`@context-add`).

### Technical Implementation

The navigator should use `npx -y playwright` directly via a temporary shell script.

```javascript
// Example Playwright CDP inline script
const { firefox } = require('playwright');
// ... launch logic
```

5. **Termination**:
   - Detect when the Firefox process exits or the main window is closed.
   - Signal end of trip to the orchestrator.