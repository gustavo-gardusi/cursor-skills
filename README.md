# Cursor Skills

[![Tests](https://img.shields.io/badge/tests-135%20passing-brightgreen?style=for-the-badge)](scripts/)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A590%25-brightgreen?style=for-the-badge)](scripts/)

Markdown instructions the Cursor agent follows (e.g. add context from URLs, create a PR, execute a plan). **Use in Cursor chat:** type **@skill-name** or **/skill-name** (e.g. **@context-add**, **@gh-pr**, **@context-execute**) so the agent loads that skill and follows it.

---

## Quick links

| You want to… | See |
|--------------|-----|
| **Set up on macOS (M chip)** | [Setup](#setup-macos-m-chip) |
| **Run tests** (unit + integration) | [Tests](#tests) |
| **List of skills** | [Skills](#skills) |
| **Sync, url scripts, Chrome, coverage** | [scripts/README.md](scripts/README.md) |

## Repo structure and purpose

This repo is split into two layers:

- `skills/` contains agent workflows triggered via Cursor (`@skill-name`), mainly instructions and orchestration.
- `scripts/` contains shared CLI tooling those workflows call (`sync`, `fetch`, context utilities).
- `.github/` holds CI to run script tests and enforce coverage.

---

## Setup (macOS, M chip)

Works on Apple Silicon with **Node.js LTS** (ARM64). No global install; dependencies live under `scripts/`.

1. **Clone** (from repo root from here on):
   ```bash
   git clone https://github.com/gustavogardusi/cursor-skills.git && cd cursor-skills
   ```
2. **Install script deps:**  
   `npm install --prefix scripts`
3. **Install skills into Cursor:**  
   `node scripts/skills/sync.js in`  
   Use `in -y` to clear existing skills first. Sync replaces placeholders (e.g. `{{base:scripts/url}}`) with this repo’s path so skills work from any workspace.
4. **Optional — research flow with Chrome:**  
   **@context-add** starts the required browser session automatically using the shared profile. See [scripts/README.md](scripts/README.md) for url scripts and profile path.

**Result:** Skills are in `~/.cursor/skills-cursor/`. Use them from any project via **@skill-name** in Cursor chat.

---

## Using skills in the agent

In **Cursor chat** (Composer or regular chat), reference a skill so the agent follows it.

### Research flow (context)

1. **@context-add** — Start a shared-profile browser session, monitor destination pages in real time, validate what the page currently shows vs what is expected, and write done pages to `.cursor/research-context.json`. Handles GitHub (repo, PR, Actions), Jira, Slack (use web URL), and other sites with per-site instructions.
2. **@context-plan** — Reads the context and the **current codebase** (read-only); compares and writes a plan to `.cursor/research-plan.md`. Use for research vs repo, **PR review** (address comments), **failing tests**, or any “plan ahead” task.
3. **@context-show** — **Summarizes** the context (count, lastFetched, URLs). Use after add to confirm what was stored.
4. **@context-execute** — Reads the plan and applies changes to the repo. **@context-clear** clears context and visited to start fresh.

Context skills and `.cursor/` data are per-repo.

### Skills list

**Context** (`skills/context/`):

- **@context-add** — Starts a shared-profile browser session per invocation, opens each URL in a dedicated tab, and validates destination states as `current / expected / action`. Per-site rules for GitHub (repo/PR/Actions), Jira, Slack (browser URL). Recommends user actions: login in tab, Slack in browser (not app), open thread/view. Writes `.cursor/research-context.json` only when destination is reached. Only this skill may change the context file.
- **@context-show** — Show context summary (count, lastFetched, URLs). Use after context-add to confirm.
- **@context-clear** — Clear `.cursor/research-context.json`, `.cursor/research-context.txt`, and `.cursor/research-visited.txt` to start fresh.
- **@context-plan** — Read context + repo (read-only); write `.cursor/research-plan.md`. Use for research vs codebase, **PR review** (gather comments, compare with code, plan minimal changes), **failing tests**, or large information vs repo.
- **@context-execute** — Read the plan and apply it to the repo.

**GitHub** (`skills/gh/`): **@gh-branch**, **@gh-pull**, **@gh-pr**, **@gh-push**, **@gh-reset**.

**Project** (`skills/project/`): **@project-setup**.

Skills are listed in Cursor’s skill picker when you type `@`. After setup, no extra env or paths are needed.

---

## Tests

Tests are under `scripts/` and use **mocks only** (no real Chrome or network). From **repo root**:

| Command | What it does |
|---------|----------------|
| `npm test --prefix scripts` | Run all tests (sync, skills-validate, url) |
| `npm run test:skills --prefix scripts` | Sync + skills validation only |
| `npm run test:url --prefix scripts` | Url scripts (fetch, interactive, visited, link-filter) only |
| `npm run test:context --prefix scripts` | Context integration (clear → append → show → clear) |
| `npm run test:coverage --prefix scripts` | All tests with line/branch/function coverage |
| `npm run test:coverage:check --prefix scripts` | Fail if line coverage &lt; 90% |

**Integration-style tests:** (1) The sync suite includes an **“install locally”** test: it runs `run(['in', '-y'])` with a temp `CURSOR_DIR`, installs from the real repo `skills/`, and asserts that the installed **context-add** skill has `{{base:...}}` resolved. (2) The **context** suite (`npm run test:context --prefix scripts`) runs clear → append → show → clear and visited-file. Run all with `npm test --prefix scripts`.

CI runs tests and the coverage check on push/PR to `main` (see [.github/workflows/ci.yml](.github/workflows/ci.yml)). More detail: [scripts/README.md](scripts/README.md) § Tests and coverage.

---

## Skills

Structure matches the repo: **`skills/context/`**, **`skills/gh/`**, **`skills/project/`**.

| Skill | Purpose |
|-------|---------|
| **context-add** | Fetch from URLs with Chrome; always extract links per page. Writes `.cursor/research-context.json`. Per-site: GitHub (repo/PR/Actions), Jira, Slack (web URL). Only this skill may change the context file. |
| **context-show** | Summarize context (count, lastFetched, URLs). Use after context-add to confirm. Read-only. |
| **context-clear** | Clear `.cursor/research-context.json` and `.cursor/research-visited.txt` to reset. |
| **context-plan** | Read context + repo (read-only); write `.cursor/research-plan.md`. Use for research, **PR review** (plan minimal changes per comment), failing tests, or info vs codebase. |
| **context-execute** | Read the plan and apply it to the repo (edits code/config). |
| **gh-branch** | New branch from main; name from ticket or description. |
| **gh-pull** | Pull, merge main/upstream, resolve conflicts. |
| **gh-pr** | Create or update PR (description only; no commit/push). |
| **gh-reset** | Hard-reset and clean working tree to a target tracking/root ref. |
| **gh-push** | Format, lint, test → commit and push. |
| **project-setup** | Read README/workflow + run install, build, test, and validation commands. |

---

## Scripts vs skills

- **Scripts** (`scripts/`) — CLI tools: **sync** (skills ↔ Cursor), **url** (fetch in Chrome, with retry), **context** (clear/show research context). Shared by skills.
- **Skills** (`skills/`) — Agent workflows that call those scripts. Placeholders like `{{base:scripts/url}}` are replaced at **sync in** with the repo path so installed skills are self-contained.

**Reinstall after editing a skill:**  
`node scripts/skills/sync.js in`

Full script and test docs: **[scripts/README.md](scripts/README.md)**.
