---
name: gh-check
description: >-
  Verify repository health only: discover stack, pre-check dependencies, prepare,
  run docs consistency checks, and evaluate format/lint/test/build checks.
---

# Test Overall

**Cursor skill:** **`@gh-check`**

## Role

Run repository/docs verification and report health.

## Workflow

1. Discover stack/tooling from docs, config, and CI.
2. Pre-check required executables and dependencies.
3. Prepare install/build prerequisites.
4. Validate docs consistency across `README.md`, `docs/*.md`, and `skills/README.md` against the current public skill set and storage model.
5. Evaluate format/lint/test/build checks.
6. Report pass/fail and blockers, including docs drift files if found.

## Does Not Do

- No git branch/sync operations.
- No commit/push/PR operations.

## Next Skill

- Publish branch: **[`@gh-push`](../push/SKILL.md)**
- Create/update PR: **[`@gh-pr`](../pr/SKILL.md)**

If blocked by missing tools, install prerequisites and rerun **[`@gh-check`](../check/SKILL.md)**.
