---
name: gh-start
description: >-
  Run gh-main (clean local main), create a new branch from a ticket or activity,
  then gh-push to publish the branch. Expect context: key, issue, or short instruction.
---

# Start (main → new branch from a task)

**Cursor skill:** **`@gh-start`** — Invoked with **`@gh-start`** in Cursor. **Depends on [`@gh-main`](../main/SKILL.md)** and **[`@gh-push`](../push/SKILL.md):** run the **full** **`@gh-main`** skill **before** **`git checkout -b`**—**do not** reimplement checkout/fetch/merge of `main` here. Branch **naming** and **`git checkout -b`** are **`@gh-start`** only. **Always** finish with **full** **`@gh-push`** so the new branch exists on the remote (unless the user explicitly cancels publish—then report and stop before push).

**Responsibility:** Derive a branch name from a **Jira ticket**, **GitHub issue**, or **activity**; **`@gh-main`** on **`main`**; create the new branch; **`@gh-push`** to publish it. Does not open a PR—use **`@gh-pr`** after work is ready.

**Expected context (one of):**
- **Jira** — Ticket key (e.g. `TIS-503`, `PROJ-123`) or link. Branch name: lowercase with hyphen, e.g. `tis-503`, `proj-123`, or `tis-503-short-description` if a short description is given.
- **GitHub issue** — Issue number or URL (e.g. `#42`, `https://github.com/owner/repo/issues/42`). Branch name: `42` or `42-short-slug` (e.g. `42-fix-login`) from the issue title if available.
- **Activity / instruction** — Short phrase (e.g. "add user login", "refactor auth"). Branch name: **kebab-case** slug, e.g. `add-user-login`, `refactor-auth`. No spaces; keep it short.

## On invoke

*`@gh-start`* — Run steps in order. If the user did not give a ticket, issue, or activity, ask: "What's the Jira ticket, GitHub issue, or activity for this branch?" If you are on **`main`** with **uncommitted changes**, **`@gh-main`** → **`@gh-reset`** will **not** stash: user must **commit**, **abort**, or **explicitly confirm trash** (see **`@gh-reset`**). Prefer **commit** before **`@gh-start`** if they need to keep the work.

## Workflow

1. **Get context** — *`@gh-start`* — From the user message, identify:
   - **Jira:** Key like `PROJ-123` or URL. Normalize to lowercase-hyphen: `proj-123`. Optionally append a short slug from the ticket title/description (e.g. `proj-123-add-login`).
   - **GitHub issue:** Number (`#42` or `42`) or issue URL. Fetch title if possible: `gh issue view 42 --json title -q .title` (in the repo) and derive a slug (e.g. `42-fix-login`). Else use `42` or `issue-42`.
   - **Activity:** Free-form phrase. Convert to **kebab-case**, lowercase, no special chars: e.g. "Add user login" → `add-user-login`. Keep under ~4–5 words when possible.

2. **Branch name** — *`@gh-start`* — Set `BRANCH=<derived-name>`. Must be a valid git branch name (no spaces, no `..`, no `~^:`). If the derived name is empty or invalid, ask the user for a branch name.

3. **Hand off to `@gh-main`** (required before step 4)

> **Run the full Cursor skill [`@gh-main`](../main/SKILL.md)** — not a shortcut.  
> Execute **every** step of **`@gh-main`**: validate → checkout `main` → **`@gh-reset`** → **`@gh-pull`** (merge only). **`@gh-main`** does **not** run **`@gh-push`**. This is how **`@gh-start`** “goes back to **main**”; **do not** replace it with ad-hoc git on **`main`** here.  
> If **`@gh-main`** aborts (e.g. user declines destructive reset, merge conflicts on `main` you cannot resolve), **stop** **`@gh-start`** and report; do not create the branch until **`main`** is healthy.

4. **Create branch** — *`@gh-start`* — Confirm `git branch --show-current` is `main` and the tree is clean as expected after **`@gh-main`**. Then: `git checkout -b "$BRANCH"`.

5. **Hand off to `@gh-push`** (required)

> **Run the full Cursor skill [`@gh-push`](../push/SKILL.md)** — not a shortcut.  
> On the **new** branch (`$BRANCH`), execute **every** step of **`@gh-push`** (**`@gh-check`** → docs → commit if needed → **`git push` / `git push -u`**). This publishes the branch the user just started.  
> If the user **explicitly** asks not to push yet, **skip** this hand-off, report that the branch exists **only locally**, and remind them to run **`@gh-push`** when ready.

6. **Confirm** — *`@gh-start`* — Report: branch `$BRANCH` created from **`main`** (after **`@gh-main`**); pushed to remote when step 5 ran, or local-only if the user skipped push.

## Branch name examples

| Context        | Example input     | Branch name      |
|----------------|-------------------|------------------|
| Jira           | TIS-503           | `tis-503`        |
| Jira + desc    | TIS-503 add login | `tis-503-add-login` |
| GH issue       | #42               | `42` or `42-fix-login` (from title) |
| GH issue URL   | …/issues/17       | `17` or `17-refactor-api` |
| Activity       | add user login    | `add-user-login` |
| Activity       | Fix bug in parser | `fix-bug-in-parser` |

## Notes

*`@gh-start`*
- Run from the repo root. Prerequisites: `git`; for GH issue title, `gh` and repo context.
- **Do not** run **`@gh-main`** again in other skills when the user asked for **`@gh-start`**—**`@gh-start`** already includes it.
- To **only** refresh **local** **`main`** without a new branch, invoke **`@gh-main`** alone—not **`@gh-start`**. To publish **`main`**, run **`@gh-push`** after **`@gh-main`**.
- For a PR (includes verify + push first): **`@gh-pr`**. For **verify only** (no push): **`@gh-check`**.
