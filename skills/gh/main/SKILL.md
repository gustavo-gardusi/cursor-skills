---
name: gh-main
description: >-
  Checkout main first (ignore prior branch for sync), then fetch, then hard reset
  to upstream/main if fork else origin/main, then git clean. No stash, no push.
  Standalone or step inside gh-start.
---

# Main (checkout `main` → fetch → match canonical remote → clean)

**Cursor skill:** **`@gh-main`** — Invoked with **`@gh-main`** in Cursor. **Self-contained:** does **not** hand off to **`@gh-pull`**.

**Where it runs:** The **current workspace** git repository.

**Mindset:** **Ignore the previous branch** for purposes of syncing—do **not** `git fetch` or `git reset` until **local `main`** is checked out. The first concrete goal is **`git checkout main`**; only then update remotes and align **`main`** to the canonical tip.

**Responsibility:** **Local `main`** matches **`upstream/main`** when **`upstream`** exists (fork), else **`origin/main`**. **No `git stash`:** user **commits**, **aborts**, or **confirms trash** before destructive steps. **No `git push`**—**[`@gh-push`](../push/SKILL.md)** publishes **`main`** (runs **`@gh-check`** inside).

**When to use:** (1) **Standalone** — clean **`main`** before new work. (2) **Inside [`@gh-start`](../start/SKILL.md)** — full **`@gh-main`**, then **`git checkout -b`**, then **`@gh-push`**.

## Command order (why this sequence)

*`@gh-main`* — Follow this order; do **not** reorder for “optimization” without reading this section.

| Step | What | Why |
| --- | --- | --- |
| 1 | **`git checkout main`** | Fetch/reset must target **`main`**, not a feature branch. Resets apply to **HEAD**; wrong branch ⇒ wrong result. |
| 2 | **`git fetch`** (`origin` + **`upstream`** if present) | **`origin/main`** / **`upstream/main`** must be **current** before you trust any reset or merge. **Reset before fetch** can pin **`main`** to a **stale** remote tip. |
| 3 | **`git reset --hard "$CANONICAL_MAIN"`** | After fetch, this makes **tracked** files on **`main`** **identical** to the canonical remote tip—**no merge commit**, predictable “start from scratch.” |
| 4 | **`git clean`** | Removes **untracked** (and ignored with **`-x`**) so the tree matches a fresh clone of that tip for build artifacts. |

**`git pull` vs this flow:** **`git pull`** on **`main`** is usually **fetch + merge** (or rebase). This skill already does **fetch** in step 2. **Do not** run **`git pull` after `git reset --hard "$CANONICAL_MAIN"`**—you already match that ref; **`pull`** would only duplicate fetch or create noise.

**When someone asks for “fetch + pull”:** After step 2, **`git merge --ff-only "$CANONICAL_MAIN"`** is the **non-destructive** analogue of “pull without merge commits” **only if** **`main`** has **no** local commits ahead of **`$CANONICAL_MAIN`**. If FF fails, **`main`** has diverged—**stop** or switch to **`reset --hard`** (with confirm). **Default for `@gh-main`** remains **`reset --hard`** so **`@gh-start`** always gets a known remote tip.

## On invoke

*`@gh-main`* — Run **§§1–12** in order. **No stash.** If **`upstream`** is missing but this should be a fork, stop and suggest **`git remote add upstream …`**.

## Workflow

### 1. Validate

*`@gh-main`*

`git rev-parse --is-inside-work-tree`.

### 2. Checkout `main` first (no fetch / reset before this)

*`@gh-main`* — **Do not** `git fetch`, `git reset`, or `git pull` while still on another branch.

`git checkout main`  
If **`main`** does not exist locally but **`origin/main`** exists: `git checkout -b main origin/main` (or `git branch main origin/main && git checkout main`) as appropriate.

If checkout **fails** (e.g. conflicts with a dirty tree), **stop**—user must **commit**, **stash elsewhere manually**, **abort**, or fix conflicts. **Do not** fetch/reset on the old branch as a workaround.

Confirm `git branch --show-current` is **`main`**.

### 3. Fetch once

*`@gh-main`* — **Single** fetch round for this skill; no second full fetch later.

- **`git fetch origin`**
- If **`git remote get-url upstream`** succeeds: **`git fetch upstream`** (minimum **`git fetch upstream main`** if bandwidth-constrained).

### 4. Canonical tip ref

*`@gh-main`* — Set **`CANONICAL_MAIN`**:

- **`upstream`** remote exists → **`CANONICAL_MAIN=upstream/main`**
- Else → **`CANONICAL_MAIN=origin/main`**

`git rev-parse "$CANONICAL_MAIN"` — if this fails after §3, stop (remotes / default branch / fetch issues).

### 5. Fast path (already aligned)

*`@gh-main`* — If **`git status --short`** is **empty** **and** `git rev-parse HEAD` equals `git rev-parse "$CANONICAL_MAIN"`, report **`main`** already matches **`$CANONICAL_MAIN`** and skip **§§6–10** → **§11**.

### 6. Dirty tree (no stash)

*`@gh-main`* — If §5 did not apply and **`git status --short`** is **not** empty:

1. Show **`git status --short`** (and a one-line summary).
2. **Stop** with only:
   - **Keep work / abort** — end **`@gh-main`**.
   - **Trash and align** — user **explicitly** confirms destruction of local diffs (tracked + untracked/ignored per **`git clean`** plan); then continue to §7.

**Do not** stash.

### 7. Discover — what `git clean` may touch

*`@gh-main`* — **Read-only** scan (repo root; monorepo hints from README if obvious). **Brief** bullets: stack signals and **large** paths likely in **`git clean -fdxn`** (e.g. **`node_modules/`**, **`target/`**, **`.venv/`**, **`dist/`**, **`build/`**).

### 8. Clean dry-run

*`@gh-main`*

```bash
git clean -fdxn
```

Show output (truncate huge: counts + top dirs). If the user prefers **keeping ignored** files, plan **`git clean -fd`** / **`git clean -fdn`** and say so before confirm.

### 9. Confirm — reset + clean

*`@gh-main`* — State **`git reset --hard "$CANONICAL_MAIN"`** + the **`git clean`** from §8. **One** confirm may cover **both** when §6 was **trash and align** or only untracked/ignored remain. Split into two confirms if the dry-run is **large** or **surprising**.

**Stop and ask** before **`git reset --hard`** / **`git clean`**.

### 10. Execute reset and clean

*`@gh-main`* — Only after §9:

- **`git reset --hard "$CANONICAL_MAIN"`**
- **`git clean -fdx`** (or **`git clean -fd`** if §8 chose keep-ignored)

**Do not** run **`git pull`** after this.

### 11. Optional — non-git caches

*`@gh-main`* — **Only** if the user **explicitly** asked (Docker prune, Playwright cache, etc.). **Each** command: **own** confirm; **skip** if not asked.

### 12. Verify

*`@gh-main`*

- `git branch --show-current` is **`main`**
- `git status --short` is clean
- `git rev-parse HEAD` equals `git rev-parse "$CANONICAL_MAIN"`

**Do not** run **`@gh-push`** inside **`@gh-main`**. For a **green** tree, **`@gh-check`** or **`@gh-push`** next.

## Notes

*`@gh-main`*
- **Fork:** **`upstream/main`** is source of truth when **`upstream`** exists.
- **Same-repo:** no **`upstream`** → **`origin/main`**.
- **Feature branch** sync (merge **`main` into** that branch) → **`@gh-pull`**, not **`@gh-main`**.
- **`@gh-start`** embeds **this** skill end-to-end.
