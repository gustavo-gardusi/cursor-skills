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
   Use **@browser-open** to start Chrome with the shared profile and remote debugging; log in once and leave it running. Then **@context-add** uses it via `--connect-chrome`. See [scripts/README.md](scripts/README.md) for url scripts and profile path.

**Result:** Skills are in `~/.cursor/skills-cursor/`. Use them from any project via **@skill-name** in Cursor chat.

---

## Using skills in the agent

In **Cursor chat** (Composer or regular chat), reference a skill so the agent follows it.

### Research flow (context + browser)

1. **@browser-open** — Open Chrome with a **shared profile** (same for all projects). Create the profile dir if missing; log in once and leave Chrome running.
2. **@context-add** — Uses that browser via `--connect-chrome`: fetches pages from URLs, extracts content and a **list of found links** per page (`--links`), writes `.cursor/research-context.json`. Handles GitHub (repo, PR, Actions), Jira, Slack (use web URL), and other sites with per-site instructions.
3. **@context-plan** — Reads the context and the **current codebase** (read-only); compares and writes a plan to `.cursor/research-plan.md`. Use for research vs repo, **PR review** (address comments), **failing tests**, or any “plan ahead” task.
4. **@context-show** — **Summarizes** the context (count, lastFetched, URLs). Use after add to confirm what was stored.
5. **@context-execute** — Reads the plan and applies changes to the repo. **@context-clear** clears context and visited to start fresh. **@browser-close** closes Chrome (graceful then force if needed).

Browser skills live under **`skills/browser/`** (neighbor of `context/`); they are shared across any project. Context skills and `.cursor/` data are per-repo.

### Skills list

**Browser** (`skills/browser/`):

- **@browser-open** — Open Chrome with shared profile and remote debugging; leave running for context-add.
- **@browser-close** — Close that Chrome instance (graceful then force).

**Context** (`skills/context/`):

- **@context-add** — Fetch from URLs with Chrome already open; always use `--links` so each result includes a list of found links. Per-site rules for GitHub (repo/PR/Actions), Jira, Slack (browser URL). Recommends user actions: login in tab, Slack in browser (not app), unwrap thread / nested thread (depth 3), only relevant sublinks. Recorder of pages: when done with a page, recommends next links (depth limit 3). Writes `.cursor/research-context.json`. Only this skill may change the context file.
- **@context-show** — Show context summary (count, lastFetched, URLs). Use after context-add to confirm.
- **@context-clear** — Clear `.cursor/research-context.json` and `.cursor/research-visited.txt` to start fresh.
- **@context-plan** — Read context + repo (read-only); write `.cursor/research-plan.md`. Use for research vs codebase, **PR review** (gather comments, compare with code, plan minimal changes), **failing tests**, or large information vs repo.
- **@context-execute** — Read the plan and apply it to the repo.

**GitHub** (`skills/gh/`): **@gh-branch**, **@gh-pull**, **@gh-pr**, **@gh-push**.

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

Structure matches the repo: **`skills/browser/`**, **`skills/context/`**, **`skills/gh/`**.

| Skill | Purpose |
|-------|---------|
| **browser-open** | Open Chrome with shared profile and remote debugging; leave running (shared across all projects). |
| **browser-close** | Close that Chrome instance (graceful then force). |
| **context-add** | Fetch from URLs with Chrome; always extract links per page. Writes `.cursor/research-context.json`. Per-site: GitHub (repo/PR/Actions), Jira, Slack (web URL). Only this skill may change the context file. |
| **context-show** | Summarize context (count, lastFetched, URLs). Use after context-add to confirm. Read-only. |
| **context-clear** | Clear `.cursor/research-context.json` and `.cursor/research-visited.txt` to reset. |
| **context-plan** | Read context + repo (read-only); write `.cursor/research-plan.md`. Use for research, **PR review** (plan minimal changes per comment), failing tests, or info vs codebase. |
| **context-execute** | Read the plan and apply it to the repo (edits code/config). |
| **gh-branch** | New branch from main; name from ticket or description. |
| **gh-pull** | Pull, merge main/upstream, resolve conflicts. |
| **gh-pr** | Create or update PR (description only; no commit/push). |
| **gh-push** | Format, lint, test → commit and push. |

---

## Scripts vs skills

- **Scripts** (`scripts/`) — CLI tools: **sync** (skills ↔ Cursor), **url** (fetch in Chrome, with retry), **context** (clear/show research context). Shared by skills.
- **Skills** (`skills/`) — Agent workflows that call those scripts. Placeholders like `{{base:scripts/url}}` are replaced at **sync in** with the repo path so installed skills are self-contained.

**Reinstall after editing a skill:**  
`node scripts/skills/sync.js in`

Full script and test docs: **[scripts/README.md](scripts/README.md)**.
