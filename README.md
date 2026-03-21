# Cursor Skills

[![Tests](https://img.shields.io/badge/tests-146%20passing-brightgreen?style=for-the-badge)](scripts/)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A590%25-brightgreen?style=for-the-badge)](scripts/)

Markdown instructions the Cursor agent follows (e.g. add context from URLs, create a PR, execute a plan). **Use in Cursor chat:** **`/skill-name`** or **`@skill-name`** (same picker; tables below use **`/`** for readability).

---

## Quick links

| You want to… | See |
|--------------|-----|
| **Set up on macOS (M chip)** | [Setup](#setup-macos-m-chip) |
| **Context skills** | [Context skills](#context-skills) |
| **GitHub skills** | [GitHub skills](#github-skills) |
| **Sync, url scripts, Chrome, coverage** | [scripts/README.md](scripts/README.md) |
| **Run tests** (unit + integration) | [Tests](#tests) |

## Repo structure and purpose

- **`skills/`** — Run in Cursor as **`/…`** skills (agent instructions and orchestration).
- **`scripts/`** — Sync, fetch, context helpers, tests, CI. Prefer invoking **skills** in chat over calling these CLIs yourself when a skill covers the task.
- **`.github/`** — CI for script tests and coverage.

---

## Setup (macOS, M chip)

Works on Apple Silicon with **Node.js LTS** (ARM64). No global install; dependencies live under `scripts/`.

1. **Clone** (from repo root from here on):
   ```bash
   git clone https://github.com/gustavogardusi/cursor-skills.git && cd cursor-skills
   ```
2. **Install script deps (for sync / tests):**  
   `npm install --prefix scripts`
3. **Install skills into Cursor:**  
   `node scripts/skills/sync.js in`  
   Use `in -y` to clear existing skills first. Sync replaces placeholders (e.g. `{{base:scripts/url}}`) with this repo’s path so skills work from any workspace. **After editing a skill in this repo, run `in` again** so `~/.cursor/skills-cursor/` stays current.
4. **Optional — research flow with Chrome:**  
   **`/context-add`** starts the required browser session. Profile and url tooling: [scripts/README.md](scripts/README.md).

**Result:** Skills live in `~/.cursor/skills-cursor/`. Use **`/skill-name`** from any project workspace.

---

## Using skills in the agent

In **Cursor chat**, invoke a skill so the agent loads it. Skills are the supported interface for day-to-day work; **`scripts/`** is for sync, tests, and contributing.

**Research flow (context):** **`/context-add`** → **`/context-plan`** → **`/context-show`** or **`/context-execute`**; **`/context-clear`** resets context files. Context data under `.cursor/` is **per-repo**.

---

## Context skills

Located in **`skills/context/`**.

| Skill | What it does |
|-------|----------------|
| `/context-add` | Shared-profile browser session; validate pages; fetch from URLs with Chrome and extract links (e.g. GitHub repo/PR/Actions, Jira, Slack web). Writes `.cursor/research-context.json`—only this skill may change that file. |
| `/context-show` | Summarize context (count, lastFetched, URLs). Read-only. |
| `/context-clear` | Clear `.cursor/research-context.json` and `.cursor/research-visited.txt`. |
| `/context-plan` | Read context + repo (read-only); write `.cursor/research-plan.md` (research, PR review, failing tests, codebase alignment). |
| `/context-execute` | Read the plan and apply changes to the repo. |

---

## GitHub skills

Located in **`skills/gh/`**.

| Skill | What it does | Calls other `gh-*` (in order) |
|-------|----------------|--------------------------------|
| `/gh-check` | Discover from README/config/CI; install/build; format, lint, test. **`/gh-push`** always runs this first. | — |
| `/gh-reset` | Stash (default), hard reset, clean; optional stash prune. | — |
| `/gh-pr` | Create or update PR via `gh` (description; no merge, no push). | — |
| `/gh-pull` | Fetch/merge tracking + canonical `main`; resolve conflicts; **no push**. | — |
| `/gh-push` | Docs, commit if needed, then `git push` (starts with full **`/gh-check`**). | `/gh-check` |
| `/gh-main` | Checkout `main`; reset and merge **main** locally (**no push**). | `/gh-reset` → `/gh-pull` |
| `/gh-start` | **`/gh-main`**, new branch, then **`/gh-push`** (publish the branch). | `/gh-main` → `/gh-push` |

**Orchestrators** (invoke other `gh-*` skills): **`/gh-start`**, **`/gh-main`**, **`/gh-push`**. **Do not invoke other `gh-*` from inside the skill:** **`/gh-check`**, **`/gh-reset`**, **`/gh-pull`**, **`/gh-pr`**.

---

## Tests

Tests live under **`scripts/`** and use **mocks only** (no real Chrome or network). From **repo root**:

| Command | What it does |
|---------|----------------|
| `npm test --prefix scripts` | Run all tests (sync, skills-validate, url) |
| `npm run test:skills --prefix scripts` | Sync + skills validation only |
| `npm run test:url --prefix scripts` | Url scripts (fetch, interactive, visited, link-filter) only |
| `npm run test:context --prefix scripts` | Context integration (clear → append → show → clear) |
| `npm run test:coverage --prefix scripts` | All tests with line/branch/function coverage |
| `npm run test:coverage:check --prefix scripts` | Fail if line coverage is below 90% |

**Integration-style tests:** (1) The sync suite includes an **“install locally”** test: it runs `run(['in', '-y'])` with a temp `CURSOR_DIR`, installs from the real repo `skills/`, and asserts that the installed **context-add** skill has `{{base:...}}` resolved. (2) The **context** suite runs clear → append → show → clear and visited-file. Run everything with `npm test --prefix scripts`.

CI runs tests and the coverage check on push/PR to `main` (see [.github/workflows/ci.yml](.github/workflows/ci.yml)). More detail: [scripts/README.md](scripts/README.md) (Tests and coverage).
