---
name: context-clear
description: >-
  Clear research context and visited set: remove or truncate
  .cursor/research-context.json, .cursor/research-visited.txt.
  Optionally .cursor/research-context.txt. Use when starting fresh or resetting the research workflow.
---

# Context: clear

**Goal:** Clear the research context and visited set so the next **context-add** run starts fresh. Remove or truncate **`.cursor/research-context.json`**, **`.cursor/research-context.txt`** (if present), and **`.cursor/research-visited.txt`**. Does not modify the repo or **`.cursor/research-plan.md`** unless the user asks to clear the plan too.

**When to use:** User wants to reset context, discard previously fetched data, or start a new research run without old URLs in the visited set. Clears **`.cursor/research-context.json`** and **`.cursor/research-visited.txt`**.

---

## On invoke

1. If **`.cursor/research-context.json`** exists: delete it or overwrite with `{ results: [], lastFetched: null }`. If **`.cursor/research-context.txt`** exists, delete it.
2. If **`.cursor/research-visited.txt`** exists: delete it or overwrite with an empty file.
3. Optionally clear **`.cursor/research-plan.md`** only if the user explicitly asks to clear the plan as well.
4. Confirm in chat what was cleared.

---

## Verification

- [ ] `.cursor/research-context.json` is empty or removed; `.cursor/research-visited.txt` is empty or removed.
- [ ] No repo files changed.
