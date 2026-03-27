---
name: context-show
description: Show a concise summary from local `.cursor/research-context.md`.
---

# Context: Show (Local Summary)

**Cursor skill:** **`@context-show`**

Read-only summary of the current repository context data.

## Data source

- `.cursor/research-context.md`
- Optional: `.cursor/research-plan.md`

## What to report

1. Goal summary (if present)
2. Count of context entries/notes
3. Top current blockers/open questions
4. Last significant decisions captured
5. Whether a plan file exists and appears up to date

## Next Actions

Based on the state, this skill will suggest:
- **Add context**: Run `@context-add` with missing notes or links.
- **Plan**: Run `@context-plan` to update implementation strategy.
- **Reset**: Run `@context-clear` to remove local research files.