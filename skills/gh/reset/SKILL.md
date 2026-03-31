---
name: gh-reset
description: >-
  Stay on current branch: no stash—abort if dirty unless user confirms discarding
  all local changes; discover artifacts, confirm reset and git clean (dry-run),
  optional non-git caches. Leaf.
---

# Reset (stay on branch → keep or trash → discover → confirm → reset → clean)

**Cursor skill:** **`@gh-reset`**

**Recommendation**: Use a model with strong reasoning capabilities for this skill, such as `gemini-3.1-pro`. Do not use fast/mini models; always prioritize the highest reasoning capability.

**Responsibility:** On the **current branch only**. Never stash in this skill.  
This public skill owns user-facing safety policy and confirmation checkpoints.  
Terminal commands are executed by **[`internal/gh/branch-reset`](../../internal/gh/branch-reset/SKILL.md)**.

## Canonical ownership

`@gh-reset` is the **only** GH skill boundary for destructive reset/clean behavior.

Other gh skills must delegate here and must not duplicate reset/clean logic.

**Not for:** merging **`main`** or publishing—use **`@gh-pull`**, **`@gh-push`**.

## On invoke

*`@gh-reset`* — Delegate terminal execution to **[`internal/gh/branch-reset`](../../internal/gh/branch-reset/SKILL.md)**.

**Never** use stash in this skill.

## Workflow

### 1. Stay on current branch

Do not switch branches during reset flow.

### 2. Target alignment intent

Prefer aligning branch tip to `origin/main` for reset-style recovery when available.

### 3. Dirty tree decision (binary)

If local work exists, stop and present only:
- **Keep work / abort**
- **Trash and align**

If user is vague, default to abort.

### 4. Mandatory proceed prompt on impact

When planned reset/clean actions would change tracked content or delete local files, explicitly prompt before proceeding.

### 5. Destructive confirmations (separate gates)

Require distinct confirmations for:
- hard reset action
- clean action
- each optional non-git/global cleanup action

### 6. Verification and stop

Use internal verification results to report branch, target, and clean status.

---

## Notes

*`@gh-reset`*
- **No stash:** preserving work is **commit** or **abort**.
- Do not use if merge/rebase is in progress unless resolved first.
- Solo **`@gh-reset`** aligns current branch to a resolved target; it never checks out another branch.
