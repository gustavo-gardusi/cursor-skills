---
name: context-plan
description: Build `.cursor/research-plan.md` from local context and repo analysis.
---

# Craft Plan

**Cursor skill:** **`@context-plan`**

## Mode

Plan mode only.

## Role

Create actionable implementation plan from context + repo state.

## Interactive Flow

1. Read `.cursor/research-context.json`.
2. Read relevant repository files in read-only mode.
3. Identify repo-specific goals, constraints, and impacted areas.
4. Draft or update `.cursor/research-plan.md` with actionable chunks.
5. Keep the plan concise, ordered, and directly executable.

## Plan format

Use this structure in `.cursor/research-plan.md`:
- `## Relation to repo`
- `## Impact summary`
- `## Implementation plan`
  - `### Chunk N: <label>`
  - `Run / one-off:`
  - `Add / change:`
  - `Update / wire:`

## When to use

- After adding enough project context with `@context-add`.
- Before implementation to reduce ambiguity and drift.

## Next Skill

- Execute plan: **[`@context-execute`](../execute/SKILL.md)**