# Cursor Skills

[![Tests](https://img.shields.io/badge/tests-149%20passing-brightgreen?style=for-the-badge)](scripts/README.md#tests-and-coverage)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A590%25-brightgreen?style=for-the-badge)](scripts/README.md#tests-and-coverage)

This repository holds **Cursor skills**: markdown the agent follows for research (URLs), git/PR flows, and planning. In chat, invoke with **`/skill-name`** or **`@skill-name`** (this doc uses **`/`**).

## Quick links

1. [Setup](#setup-macos-m-chip)
2. [Using skills](#using-skills-in-the-agent)
3. [Documentation](#documentation)

---

## Setup (macOS, M chip)

Target: **Apple Silicon (ARM64)** with **Node.js LTS**. Dependencies install under **`scripts/`** (no global npm packages required for the basics).

1. **Clone**
   ```bash
   git clone https://github.com/gustavogardusi/cursor-skills.git && cd cursor-skills
   ```
2. **Install script dependencies** (needed for **`sync`**, and for **context/url** skills that run **`fetch.js`** / Playwright from **this** clone):
   ```bash
   npm install --prefix scripts
   ```
3. **Install skills into Cursor** — copies each **`SKILL.md`** under **`skills/`** into **`~/.cursor/skills-cursor/<name>/`** so they show up in the **`/`** and **`@`** pickers:
   ```bash
   node scripts/skills/sync.js in -y
   ```
   - **`in -y`** — Clears **`~/.cursor/skills-cursor/`** then copies every skill fresh (no merge prompt).
   - **`in`** (no **`-y`**) — Merges into an existing install; you may be prompted.
   - Sync resolves **`{{base:…}}`** to absolute paths in **this** clone and rewrites cross-skill links for the flat install layout.

**You’re done when:** step **3** finishes without errors — skills are on disk under **`~/.cursor/skills-cursor/`** and ready for Cursor. If a skill doesn’t appear in chat, restart Cursor once after syncing.

4. **Optional — research with Chrome** — After skills are installed, use **`/context-add`** in a project. Chrome, the fetch CLI, and **`.cursor/`** file layout are described under **Url scripts** in **Scripts** (see [Documentation](#documentation)).

**Using installed skills:** Open **any** git repository as the Cursor workspace. Run **`/context-add`**, **`/gh-push`**, and the rest against **that** project; the agent reads and writes git and **`.cursor/`** there—not inside the cursor-skills repo unless that repo is the workspace.

---

## Using skills in the agent

Open the **target repository** as the Cursor project (git + **`.cursor/`** live there). Invoke skills with **`/`** or **`@`**.

**Ways to use them** (mix and match; not only “ship a feature”):

- **End-to-end branch + PR** — see the diagram below (**`/gh-start`** → optional **context** loop → **`/gh-pr`**).
- **Verify the open repo** — **`/gh-check`** (format / lint / test from README + CI); no commit or push.
- **Publish the current branch** — **`/gh-push`** (runs **`/gh-check`**, then commit if needed, then **`git push`**).
- **Integrate latest `main`** into your branch — **`/gh-pull`** (fetch + merges; resolve conflicts there, then **`/gh-push`** or **`/gh-check`** when you want green + remote).
- **Reset local `main` to the remote tip** — **`/gh-main`** (then branch or **`/gh-push`** as needed).
- **Browser research + captured pages** — **`/context-add`** (writes **`.cursor/research-context.json`**); **`/context-show`** (read-only summary); **`/context-clear`** (reset context/visited).
- **Plan from context + repo, then implement** — **`/context-plan`** (writes **`.cursor/research-plan.md`**) → **`/context-execute`** (applies the plan to the repo; use **`/gh-push`** / **`/gh-pr`** when you want git publish/PR).

Full names, chains, and edge cases: **Skills reference** in [Documentation](#documentation) below.

**Diagram — one common arc (feature work → PR):**

```text
   /gh-start              context (*)                 /gh-pr
 ┌────────────┐         ┌────────────┐         ┌────────────┐
 │ new branch │   ──▶   │  optional  │   ──▶   │ merge main │
 │ from main  │         │    loop    │         │ verify+PR  │
 └────────────┘         └────────────┘         └────────────┘
                               │
                          (*) repeat
```

---

## Documentation

- **[Skills reference](skills/README.md)** — Every skill, handoff table, typical **start → context → pr** flow, and smaller slices.
- **[Scripts](scripts/README.md)** — Clone setup for **`scripts/`**, **`sync`**, URL/context CLIs, tests, coverage, fixture regen, and GitHub Actions.
