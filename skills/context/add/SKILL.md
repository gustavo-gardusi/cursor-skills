---
name: context-add
description: Add and organize research context in local `.cursor/research-context.json`.
---

# Add Sources

**Cursor skill:** **`@context-add`**

## Mode

Plan mode only.

## Role

Collect and organize research context data for current workspace.

## Storage model

- File: `.cursor/research-context.json`
- Scope: current repository only
- This skill owns create/update of this artifact.

## Workflow

1. Ingest sources (URLs, notes, constraints).
2. Normalize and deduplicate entries.
3. Update `.cursor/research-context.json`.
4. Summarize what was added and what is missing.

## Does Not Do

- Does not create execution plan (`@context-plan` does that).
- Does not modify repository source code.

## Next Steps

- Review context: **[`@context-show`](../show/SKILL.md)**
- Craft plan: **[`@context-plan`](../plan/SKILL.md)**