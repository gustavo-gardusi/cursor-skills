---
name: context-execute
description: Execute `.cursor/research-plan.md` after confirmation in Plan mode, then switch to Agent mode.
---

# Execute Plan

**Cursor skill:** **`@context-execute`**

## Mode

- Start in Plan mode for confirmation.
- Explicitly switch to Agent mode before applying changes.

## Role

Execute implementation chunks from `.cursor/research-plan.md`.

## Inputs

- `.cursor/research-plan.md` (or user-provided equivalent plan)

## Outputs

- Repository changes matching planned chunks.
- No edits to `.cursor/research-context.json` or `.cursor/research-plan.md`.

## Workflow

1. Read plan and summarize intended file/command changes.
2. Ask for explicit proceed confirmation.
3. Switch to Agent mode.
4. Execute plan chunks in order.
5. Verify with **[`@gh-check`](../../gh/check/SKILL.md)** or continue to **[`@gh-pr`](../../gh/pr/SKILL.md)**.

## Does Not Do

- Does not generate the plan (`@context-plan` does that).
- Does not publish by itself (`@gh-push` / `@gh-pr` handle delivery).

## Next Skill

- Verify only: **[`@gh-check`](../../gh/check/SKILL.md)**
- Create/update PR flow: **[`@gh-pr`](../../gh/pr/SKILL.md)**
