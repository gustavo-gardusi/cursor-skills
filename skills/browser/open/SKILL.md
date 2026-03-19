---
name: browser-open
description: >-
  Open Chrome with the shared debug profile and remote debugging; leave it
  running so url scripts and context-add can attach with --connect-chrome.
  Creates the profile directory if missing; reuses it across all projects.
---

# Browser: open

**Goal:** Start Chrome with a **fixed, shared profile** and remote debugging, then **leave it running**. Any project can use this instance: url scripts (e.g. **@context-add**) attach via **`--connect-chrome`** and do not close it. The same profile is reused for all projects; create the directory if it does not exist, otherwise reuse it.

---

## Profile path

- **Path:** `$HOME/.chrome-debug-profile` (fixed; same for every repo).
- Create if missing: `mkdir -p "$HOME/.chrome-debug-profile"`.
- After the first run, log in to the sites you need; that state is reused across projects.

---

## Steps

1. Create the profile directory if missing:
   ```bash
   mkdir -p "$HOME/.chrome-debug-profile"
   ```
2. Start Chrome with that profile and remote debugging; **leave it open** (do not close after running fetch):
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"
   ```
   On Linux/Windows use the same flags with your Chrome (or Chromium) executable path.
3. Log in to any sites you need in this window. Then run **@context-add** (or fetch directly) with **`--connect-chrome`**; the script attaches to this instance and does not close it.

To stop Chrome when done, use **@browser-close**.
