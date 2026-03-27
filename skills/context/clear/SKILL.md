---
name: context-clear
description: Show summary of context data, then ask for confirmation before clearing per-repo state.
---

# Context: Clear (Reset State)

**Cursor skill:** **`@context-clear`**

Clears local context files for the **current repository only**.

## Execution Flow

1. **Pre-Flight Summary**:
   The skill runs `@context-show` first to display exactly what is about to be deleted:
   - Context note count
   - Plan file presence

2. **Confirmation**:
   The skill pauses and asks you to confirm the deletion:
   *"Are you sure you want to clear local context files for this repo?"*

3. **Execution**:
   If confirmed, it deletes:
   - `.cursor/research-context.md`
   - `.cursor/research-plan.md`