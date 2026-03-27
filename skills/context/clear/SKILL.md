---
name: context-clear
description: Show summary of context data, then ask for confirmation before clearing per-repo state.
---

# Context: Clear (Reset State)

**Cursor skill:** **`@context-clear`**

Clears the research context and queue for the **current repository only**. Global snapshots and visited lists are preserved.

## Execution Flow

1. **Pre-Flight Summary**:
   The skill runs `@context-show` first to display exactly what is about to be deleted:
   - Queue size
   - Context entries

2. **Confirmation**:
   The skill pauses and asks you to confirm the deletion:
   *"Are you sure you want to clear the context and queue for this repo? (Global snapshots are kept)"*

3. **Execution**:
   If confirmed, it deletes:
   - `.cursor/research-queue.json`
   - `.cursor/research-context.json`
   - `.cursor/research-plan.json`
   - `.cursor/research-plan.md`

Global state (`$HOME/.cursor/browser-profiles/` and `$HOME/.cursor/research-visited.txt`) is NEVER deleted by this skill.