---
name: context-add
description: Orchestrate real-time browser exploration. Opens Firefox, listens for navigation events, and automatically recommends next steps.
---

# Context: Add (Explorer)

**Cursor skill:** **`@context-add`**

This skill orchestrates a real-time, interactive browser session. It opens Firefox, listens to your navigation, and automatically evaluates pages to recommend your next steps.

## How it works

1. **Launch**: Opens a Firefox window using a shared global profile (`$HOME/.cursor/browser-profiles/`). This means your logins (GitHub, Jira, etc.) persist across all your projects.
2. **Listen**: The skill listens to **all tabs** in that window via CDP (DevTools Protocol).
3. **Capture**: Every time you navigate to a new page, it automatically captures a text snapshot.
4. **Evaluate**: It scores the page against the current exploration goal (e.g., "Find PR description").
5. **Recommend**: It posts a summary in the chat with the top 3 recommended links to explore next.

## Usage

Simply invoke the skill with a starting URL:
`@context-add https://github.com/my-org/my-repo/pull/123`

Then, navigate the browser naturally. The chat will update automatically.

## Internal Flow (Sub-skills)

On every page load, this skill orchestrates the following internal utilities:
1. `browser-navigator`: Extracts page content.
2. `visited-check`: Ensures we don't re-process known URLs.
3. `snapshot-save`: Saves the extracted text to global storage.
4. `page-path-evaluator`: Calculates confidence and finds the best next links.
5. `queue-modify`: Updates the per-repo `.cursor/research-queue.json`.

When you are done exploring, simply close the Firefox window. The skill will detect this and print a final summary.

## Next Steps
After exploration, run **`@context-plan`** to build a strategy from what you found.