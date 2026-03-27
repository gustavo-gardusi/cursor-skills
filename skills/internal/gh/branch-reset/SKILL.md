---
name: gh-reset
description: >-
  Stay on current branch: no stash—abort if dirty unless user confirms discarding
  all local changes; discover artifacts, confirm reset and git clean (dry-run),
  optional non-git caches. Leaf.
---

# Reset (stay on branch → keep or trash → discover → confirm → reset → clean)

**Cursor skill:** **`@gh-reset`** — Invoked with **`@gh-reset`** in Cursor. **Leaf:** does **not** hand off to other **`gh-*`** skills.

**Responsibility:** On the **current branch only**—**do not** `git checkout` elsewhere. **No `git stash`:** local work is either **left alone** (you **stop** the skill) or **destroyed** by **`git reset --hard`** + **`git clean`** after explicit user confirmation. (1) **Fetch** and resolve **`$TARGET`**. (2) If the tree is **dirty**, require a **binary choice** before continuing (see §5). (3) **Scan** the repo for common build/cache signals. (4) **Confirm** **`git reset --hard`**, then **`git clean`** (after **`git clean -fdxn`** dry-run), then **each** optional non-git command. (5) Execute. This skill **does not** manage stash lists, drops, or prunes.

**Not for:** merging **`main`** or publishing—use **`@gh-pull`**, **`@gh-main`**, **`@gh-push`**.

## On invoke

*`@gh-reset`* — **Do not** run **`git reset --hard`**, **`git clean -fdx`**, or **container/system prunes** without **user confirmation** after you show what will happen—except where **[Nested invocation](#nested-invocation-gh-main--gh-start)** allows one combined confirm.

**Never** use **`git stash`** in this skill.

## Workflow

### 1. Validate location

*`@gh-reset`*

`git rev-parse --is-inside-work-tree`.

### 2. Stay on the current branch

*`@gh-reset`* — **Do not switch branches.**

`BRANCH=$(git branch --show-current)`.

If detached HEAD, stop and ask the user to check out a branch first.

### 3. Fetch all remotes

*`@gh-reset`*

`git fetch --all --prune`.

### 4. Resolve target reference (for **this** branch)

*`@gh-reset`* — **`$TARGET`**: where **`$BRANCH`** should match after reset (you stay on **`$BRANCH`**).

Priority:

1. Upstream tracking exists: **`@{u}`**.
2. On **`main`** and **`upstream/main`** exists: **`upstream/main`**.
3. Else: **`origin/$BRANCH`**.
4. Fallback: **`origin/main`** (or **`upstream/main`** if missing).

`TARGET=<resolved_ref>`

### 5. Dirty tree — **use changes or trash** (no stash)

*`@gh-reset`* — If **`git status --short`** is **empty**, continue to §6.

If **not** empty:

1. Show **`git status --short`** (and a one-line summary: modified / untracked / staged counts).
2. **Stop** and present **only** these outcomes:
   - **Keep work / abort** — User does **not** want to lose anything. **End the skill.** Tell them to **commit**, **copy files aside**, or discard manually with a different workflow if they change their mind later.
   - **Trash and align** — User **explicitly** confirms that **all** local differences vs **`$TARGET`** (uncommitted tracked changes, and—after clean—untracked/ignored per dry-run) may be **permanently discarded**. Record that confirmation; then continue to §6.

**Do not** stash. **Do not** offer stash as a third path.

If the user is vague, default to **abort** until they choose **trash and align** in clear terms.

### 6. Discover — what kind of repo is this?

*`@gh-reset`* — **Read-only.** Scan the worktree (at least repo root; follow obvious monorepo hints if the README points at **`packages/*`**, **`apps/*`**, etc.). **List** which signals are present so the user understands what **`git clean -fdx`** may touch.

| Area | Look for | Often removed by `git clean -fdx` (if ignored) / note |
|------|-----------|--------------------------------------------------------|
| **Node** | `package.json`, lockfiles, `pnpm-workspace.yaml` | `node_modules/`, `.pnpm-store`, `dist/`, `build/`, `.turbo/`, `.next/`, `coverage/` |
| **Rust** | `Cargo.toml` | `target/` |
| **Go** | `go.mod` | binaries in tree if untracked; `vendor/` if not committed |
| **Python** | `pyproject.toml`, `requirements*.txt`, `Pipfile` | `.venv/`, `venv/`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.tox/` |
| **JVM** | `pom.xml`, `build.gradle*` | `target/`, `build/`, `.gradle/` (if ignored) |
| **.NET** | `*.csproj`, `global.json` | `bin/`, `obj/` |
| **Ruby** | `Gemfile` | `vendor/bundle/` if ignored |
| **PHP** | `composer.json` | `vendor/` |
| **Elixir** | `mix.exs` | `_build/`, `deps/` |
| **Terraform** | `*.tf` | `.terraform/` |
| **Containers** | `Dockerfile`, `docker-compose*.yml`, `Containerfile` | optional **`docker`/`podman` prune** (§12) |
| **Browsers in tests** | `playwright` / `cypress` in `package.json` | **browser binary cache** often **outside** repo—§12 |
| **OS junk** | — | `.DS_Store`, etc., if ignored |

**Report briefly** (bullet list): which signals matched and **any large paths** you expect **`git clean -fdxn`** to list.

### 7. Dry-run: what `git clean` would delete

*`@gh-reset`* — Before any **`git clean`** that removes files:

```bash
git clean -fdxn
```

Show the output (truncate if enormous: summarize counts + top directories). If the user prefers to **keep ignored** files, plan **`git clean -fdn`** / **`git clean -fd`** instead and say so before confirm.

### 8. Confirm — hard reset (**major removal #1**)

*`@gh-reset`* — State branch **`$BRANCH`** and **`git reset --hard "$TARGET"`**. Remind that **tracked** content will match **`$TARGET`** and any prior uncommitted **tracked** edits are discarded (§5 already handled a dirty tree).

**Stop and ask** the user to confirm before **`git reset --hard`**.

**Nested invocation:** see [below](#nested-invocation-gh-main--gh-start).

### 9. Execute hard reset

*`@gh-reset`* — Only after §8 confirm:

`git reset --hard "$TARGET"`

You remain on **`$BRANCH`**.

### 10. Confirm — working tree clean (**major removal #2**)

*`@gh-reset`* — Remind: **`git clean -fdx`** (or **`git clean -fd`**) matches the §7 dry-run. **Stop and ask** before the real clean.

**Nested invocation:** may merge with §8—see [below](#nested-invocation-gh-main--gh-start).

### 11. Execute clean

*`@gh-reset`* — Only after §10 confirm:

- Default: **`git clean -fdx`**
- If keeping ignored: **`git clean -fd`**

### 12. Optional — non-git / global caches (**major removal #3+**)

*`@gh-reset`* — **Each** command needs **its own** user confirmation. **Skip** if not applicable or the user did not ask.

| Topic | When to offer | Example | Confirm |
|-------|----------------|---------|---------|
| **Docker** | `Dockerfile` / compose present **or** user asked | `docker builder prune -f` | Yes before run |
| **Docker (aggressive)** | User explicitly asks | `docker system prune` / `-a` | **Strong** confirm |
| **Podman** | Containerfile / user asked | `podman builder prune`, `podman system prune` | Same as Docker |
| **npm (global cache)** | User asked | `npm cache clean --force` | Yes |
| **Playwright** | User asked; Playwright in deps | User cache under **`$HOME`** | Yes before delete |
| **Rust / extra** | User asks | project script / third-party tool | Yes per command |
| **Other** | README, Makefile, user names a tool | project-specific | Yes per command |

### 13. Final verification

*`@gh-reset`*

- `git branch --show-current` is **`$BRANCH`**.
- `git status --short` is clean.
- `git log -1 --oneline` matches **`$TARGET`**.

---

## Nested invocation (`@gh-main` / `@gh-start`)

When **`@gh-reset`** runs **inside** **[`@gh-main`](../main/SKILL.md)**:

- **Still** run §5: if **`main`** is dirty, user must choose **abort** or **trash and align**—no stash.
- **Still** run §6–§7 (short), show **`$TARGET`**.
- **One** confirmation may cover **both** §8 (reset) and §10 (clean) **if** §5 already established **trash and align** or the tree was clean—e.g. “Reset `main` to `$TARGET` and apply the clean dry-run above?”
- If the dry-run is **large** or **surprising**, split into **two** confirms.

**Standalone `@gh-reset`:** prefer **separate** confirms for §8 and §10 unless the user explicitly says “reset and clean in one step.”

---

## Notes

*`@gh-reset`*
- **No stash:** preserving work is **commit** or **abort**; this skill only **aligns** to **`$TARGET`** after explicit **trash** consent when the tree was dirty.
- Do not use if merge/rebase is in progress unless resolved first.
- **`@gh-main`** hands off here—see that skill for ordering.
- Solo **`@gh-reset`** only aligns **current** branch to **`$TARGET`**; it never checks out another branch.
