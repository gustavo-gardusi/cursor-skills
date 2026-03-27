---
name: context-add
description: Add or update project research context in local `.cursor/research-context.md`.
---

# Context: Add (Local CRUD)

**Cursor skill:** **`@context-add`**

Adds research notes for the current project into local context storage.

## Storage model

- File: `.cursor/research-context.md`
- Scope: current repository only
- This skill owns create/update entries in that file

## Usage

Invoke with one or more inputs (URLs, requirements, notes, constraints, decisions), for example:
`@context-add <note or URL>`

## Behavior

1. Ensure `.cursor/` exists.
2. Ensure `.cursor/research-context.md` exists with a basic template when missing.
3. Append a new dated entry including:
   - source (URL or user note)
   - concise summary
   - relevance to this repo/task
   - open questions or blockers
4. If the same source already exists, update that section instead of duplicating.
5. Keep entries concise and project-specific.

## Suggested template

Use this file structure:
- `# Research Context`
- `## Goal`
- `## Notes`
- `## Open Questions`
- `## Decisions`
- `## Blockers`

## Next Steps

- Run **`@context-show`** for a quick summary.
- Run **`@context-plan`** to produce/update `.cursor/research-plan.md`.