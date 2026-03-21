# Skills reference

This folder is the **source** for Cursor agent skills. From the repo root, run **`node scripts/skills/sync.js in -y`** (or **`in`** without **`-y`** to merge into an existing install); copies land under **`~/.cursor/skills-cursor/<name>/`**. In chat, invoke with **`/skill-name`** or **`@skill-name`**.

**Workspace:** Skills run against the **open project** in Cursor (git + **`.cursor/`** for research files). **Context** skills that use Chrome/scripts also rely on **`{{base:…}}`** resolving to your **cursor-skills** clone—see [Setup in the main README](../README.md#setup-macos-m-chip).

---

## Typical flow (high level)

```text
/gh-start  ──▶  context (*)  ──▶  /gh-pr
                    │
                    └── (*) repeat as needed (add → plan → execute, etc.)
```

Composite skills run nested skills **in full** (e.g. **`/gh-push`** always runs **`/gh-check`** first). Details live in each **`SKILL.md`**.

---

## Context skills

Research and planning under **`.cursor/`** in the **target** repo (not inside this repository).

| Skill | Purpose |
| --- | --- |
| [**`/context-add`**](context/add/SKILL.md) | Browser session; validate pages; append to **`.cursor/research-context.json`** (only this skill may update it). |
| [**`/context-show`**](context/show/SKILL.md) | Read-only summary: counts, `lastFetched`, URLs. |
| [**`/context-clear`**](context/clear/SKILL.md) | Clears context and visited files under **`.cursor/`**. |
| [**`/context-plan`**](context/plan/SKILL.md) | Read-only on context + repo; writes **`.cursor/research-plan.md`**. |
| [**`/context-execute`**](context/execute/SKILL.md) | Applies the plan to the repo (code/config); does not open PRs by itself. |

---

## GitHub skills

**`git`** and **`gh`** in the **open** workspace. **Steps** = this skill **plus** distinct nested skills in its default chain (rough complexity / ordering hint).

| Steps | Skill | What it does | Hands off |
| ---: | --- | --- | --- |
| 4 | [**`/gh-pr`**](gh/pr/SKILL.md) | Merge **`main`**, verify, push, then PR title/body from full branch diff (fork or same-repo). | **`/gh-pull`** → **`/gh-push`** |
| 4 | [**`/gh-start`**](gh/start/SKILL.md) | New branch from clean **`main`**, then publish. | **`/gh-main`** → **`/gh-push`** |
| 2 | [**`/gh-push`**](gh/push/SKILL.md) | Full verification, doc touch-up, commit if needed, **`git push`**. | **`/gh-check`** |
| 1 | [**`/gh-check`**](gh/check/SKILL.md) | Discover stack from README/CI, install deps, format / lint / test. | — |
| 1 | [**`/gh-main`**](gh/main/SKILL.md) | Checkout **`main`**, fetch, hard reset to **`upstream/main`** (fork) or **`origin/main`**, **`git clean`**; no push. | — |
| 1 | [**`/gh-pull`**](gh/pull/SKILL.md) | Fetch; merge tracking + canonical **`main`**; no push. | — |

**Leaf vs chain:** **`/gh-check`**, **`/gh-main`**, **`/gh-pull`** do not call other **`gh-*`** skills. **`/gh-push`** is the only skill that runs **`git push`**. **`/gh-pr`** and **`/gh-start`** orchestrate the rows above.

---

## Smaller slices (same repo)

Without the full **start → context → pr** story:

- **`/gh-main`** — reset local **`main`** to canonical remote only.
- **`/gh-pull`** — merge **`main`** into the **current** branch.
- **`/gh-check`** — verify only (no commit/push).
- **`/gh-push`** — verify + publish.
- **`/context-clear`** — drop research files for a clean research run.

---

## Editing and tests

Change **`SKILL.md`** files here, then reinstall with **`node scripts/skills/sync.js in -y`**. The installer and golden fixtures are described in **[scripts/README.md → Tests and coverage](../scripts/README.md#tests-and-coverage)** (**`npm run test:install --prefix scripts`**, **`npm run regen:install-fixtures --prefix scripts`**).
