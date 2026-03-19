---
name: browser-close
description: >-
  Close the Chrome instance that uses the shared debug profile. Try graceful
  shutdown first, then force kill if still running.
---

# Browser: close

**Goal:** Stop the Chrome instance that is using the shared profile (`$HOME/.chrome-debug-profile`). Prefer **graceful** shutdown, then **force** if it is still running.

---

## Steps

1. **Graceful:** Close the Chrome window from the UI, or quit the app (e.g. macOS: Cmd+Q, or run):
   ```bash
   osascript -e 'quit app "Google Chrome"'
   ```
   Wait a few seconds to see if the process exits.
2. **Force (if still running):** Kill the process using the debug profile:
   ```bash
   pkill -f "Google Chrome.*chrome-debug-profile" || pkill -f "Chromium.*chrome-debug-profile"
   ```
   To kill by PID: `pgrep -f "chrome-debug-profile"` then `kill -9 <pid>`.

After closing, the next **@browser-open** run will reuse the same profile directory (logins and data persist).
