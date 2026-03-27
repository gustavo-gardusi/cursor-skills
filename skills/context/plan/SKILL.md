---
name: context-plan
description: Build or update `.cursor/research-plan.md` from local context notes.
---

# Context: Plan (Strategy Builder)

**Cursor skill:** **`@context-plan`**

Builds a concrete implementation strategy for the current project from local context notes.

## Interactive Flow

1. Read `.cursor/research-context.md`.
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