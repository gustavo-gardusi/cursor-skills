---
name: context-show
description: Show a concise summary from local context artifacts.
---

# Review Context

**Cursor skill:** **`@context-show`**

## Mode

Plan mode only.

## Role

Read-only context state summary.

## Data source

- `.cursor/research-context.json`
- Optional: `.cursor/research-plan.md`, `.cursor/research-context.txt`

## What to report

1. Goal summary (if present)
2. Count of context entries/notes
3. Top current blockers/open questions
4. Last significant decisions captured
5. Whether a plan file exists and appears up to date

## Next Actions

Based on the state, this skill will suggest:
- **Add context**: **[`@context-add`](../add/SKILL.md)**
- **Plan**: **[`@context-plan`](../plan/SKILL.md)**
- **Reset**: **[`@context-clear`](../clear/SKILL.md)**