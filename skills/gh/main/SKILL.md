---
name: gh-main
description: >-
  Clean local main: checkout main, gh-reset, gh-pull. No push—use gh-push separately
  or rely on gh-start after a new branch. Standalone or step 1 of gh-start.
---

# Main (checkout main, reset, pull)

**Cursor skill:** **`@gh-main`** — The user runs this workflow by invoking **`@gh-main`** in Cursor. Every step below is part of **`@gh-main`** unless a **Hand off** block tells you to run a *different* skill in full.

**Responsibility:** Put **local `main`** in a known-good state **without publishing**: after checkout (steps below), run **`@gh-reset`** → **`@gh-pull`**. **`@gh-pull`** does **not** push. To **`git push`** **`main`** (or any branch), run **`@gh-push`** **after** **`@gh-main`** when the user asks to publish.

**When to use:** (1) **Standalone** — clean, up-to-date **`main`** locally only. (2) **Inside [`@gh-start`](../start/SKILL.md)** — **`@gh-start`** runs **this entire skill** first, then creates a branch, then **`@gh-push`**; **do not** run **`@gh-main`** again before **`@gh-start`** or duplicate its git steps elsewhere for “get on **main** first.”

## On invoke

*`@gh-main`* — State that **`@gh-reset`** does **not** stash: on a dirty **`main`**, the user must **abort** or **explicitly trash** local changes before reset+clean (see that skill). Run commands one by one.

## Workflow

### 1. Validate

*`@gh-main`* — Local prep only (not another skill).

`git rev-parse --is-inside-work-tree`. Fail if detached HEAD is required to be avoided—**checkout `main` first** (step 2).

### 2. Checkout main

*`@gh-main`* — Local git only.

`git checkout main`  
If `main` does not exist locally but exists as `origin/main`: `git checkout -b main origin/main` or `git branch main origin/main && git checkout main` as appropriate.

### 3. Hand off to **`@gh-reset`**

> **Run the full Cursor skill [`@gh-reset`](../reset/SKILL.md)** — not a shortcut.  
> On the current branch (`main`), execute **every** step: validate → stay on branch → fetch → resolve **`$TARGET`** → **if dirty: abort or confirm trash** (no stash) → **discover** repo signals → **`git clean -fdxn`** dry-run → **confirm** reset+clean (see **`@gh-reset`** nested rule for one combined confirm) → **`git reset --hard`** → **confirm** clean if not combined → **`git clean -fdx`** → optional non-git caches (if user asked) → verify. Do **not** replace with ad-hoc `git reset`/`clean` unless the user explicitly opts out of the skill.

### 4. Hand off to **`@gh-pull`**

> **Run the full Cursor skill [`@gh-pull`](../pull/SKILL.md)** — not a shortcut.  
> While still on `main`, execute **every** step of **`@gh-pull`** through its **§6 Done** (merge only; **no** **`@gh-push`** inside **`@gh-pull`**).

### 5. Verify

*`@gh-main`* — Confirm the outcome of **`@gh-main`**.

`git status --short` is clean. `git branch --show-current` is `main`. `git log -1 --oneline` matches expectations for up-to-date main.

**Do not** run **`@gh-push`** inside **`@gh-main`**. If the user wants **`main`** on the remote, tell them to run **`@gh-push`** next ( **`@gh-check`** runs inside **`@gh-push`**).

## Notes

*`@gh-main`*
- **Order matters:** **`@gh-reset`** → **`@gh-pull`** only.
- **`@gh-reset`** does **not** stash—if **`main`** is dirty, **commit** first or **abort**; to throw work away, confirm **trash and align** inside **`@gh-reset`**.
- For a **feature branch** sync (not switching to main), use **`@gh-pull`** alone on that branch, not **`@gh-main`**.
