---
name: gh-push
description: >-
  Mandatory gh-check first, then docs touch-up, commit if needed, git push.
  Only this skill runs git push; verification lives entirely in gh-check.
---

# Push (commit + publish, after **`@gh-check`**)

**Cursor skill:** **`@gh-push`** — Invoked with **`@gh-push`** in Cursor. **Core concept:** **publish** the current branch—**commit** if needed, then **`git push`**. Everything before that is: (a) **verification** via **`@gh-check`** only, (b) **optional** minimal doc alignment so README matches the tree.

**Responsibility (only this skill):** This file is the **only** place that defines **verify → then commit/push**. (1) Run **full** **`@gh-check`** (**[`@gh-check`](../check/SKILL.md)**) before any staging, commit, or push. (2) Align main docs if needed. (3) **Commit** when the tree needs it. (4) **`git push`** / **`git push -u`**. No other skill runs **`git push`**.

**Does not do:** merges (**[`@gh-pull`](../pull/SKILL.md)**), moving/syncing `main` (**[`@gh-main`](../main/SKILL.md)**), destructive cleanup (**[`@gh-reset`](../reset/SKILL.md)**), or PR metadata (**[`@gh-pr`](../pr/SKILL.md)**). Verification commands live only in **`@gh-check`**.

**When another skill “publishes”:** **`@gh-start`** runs **this** skill **after** **`@gh-main`** and **`git checkout -b`** (new branch). **`@gh-pr`** runs **this** skill **first** (verify, commit, push), then PR metadata. **`@gh-main`** and **`@gh-pull`** do **not** invoke **`@gh-push`**. For **verify without push**, use **`@gh-check`** alone.

### Invariant (canonical)

**Never** `git add`, **`git commit`**, or **`git push`** until **§1** — the **complete** **`@gh-check`** skill — has **succeeded**. On failure, stop. If failure looks like missing or broken dependencies, **re-run** **`@gh-check`** after fixing README or environment (that skill maps installs before lint/test).

## On invoke

*`@gh-push`* — Run steps **1 → 2 → 3** in order. If **`@gh-check`** fails, **stop**—do not commit or push.

## Workflow

### 1. Hand off to **`@gh-check`** (required before §2–3)

> Execute the **entire** Cursor skill **[`@gh-check`](../check/SKILL.md)** — every section, in order. No shortcuts. **This step is the only definition of “green” before commit/push** for this repo workflow.

### 2. Documentation up to date (optional and minimal)

*`@gh-push`* — Only after §1 succeeded.

Compare README (and any other main docs) to the current repo. Apply minimal edits so documentation accurately describes the project.

- **Lists** (e.g. skills, features, modules) — Match what exists on disk; add, remove, or fix rows.
- **Setup / usage** — Update if scripts, commands, or paths changed.
- **Structure** — Adjust if the doc describes dirs or key files that no longer match.
- Only change what is wrong or outdated; no style-only rewrites.

### 3. Commit (if needed) and publish

*`@gh-push`* — Only after §1 succeeded. Includes `git push` / `git push -u` only as below.

- **If there are changes to commit** (`git status` not clean after step 2):
  - **Stage** — default to adding only the paths changed by the workflow/docs updates (`git add <path...>`). Use `git add .` only if the change list is very broad or the user explicitly asks for that behavior.
  - **Message** — One short line summarizing the change (e.g. from `git diff --stat` or a brief summary).
  - **Commit** — `git commit -m "<summary>"`.

- **Publish** (after successful **`@gh-check`** in §1; after commit when one was made, or when the tree was already clean after §2):
  - `BRANCH=$(git branch --show-current)`; fail if detached.
  - If upstream is configured and the branch is **ahead** of `@{u}`: `git push`.
  - Else if **no upstream** (`git rev-parse @{u}` fails): `git push -u origin "$BRANCH"` so the remote branch exists (including a new branch that only exists locally).
  - Else if not ahead and upstream exists: report branch is already published (nothing to push).
  - If push fails (permissions, protected branch), report the error; do not force-push unless the user explicitly asks.

## Notes

*`@gh-push`*
- Run from the repo root.
- If the tree is clean and docs are already accurate, §2 may be a no-op; **Publish** still runs when the branch is ahead (merge commits, new branches).
- After a successful push, to open or refresh a PR → invoke **`@gh-pr`** (it runs **`@gh-push`** again first; often a no-op if already clean and pushed).
