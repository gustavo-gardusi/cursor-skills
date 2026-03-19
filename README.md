# Cursor Skills

[![Tests](https://img.shields.io/badge/tests-167%20passing-brightgreen?style=for-the-badge)](scripts/)
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
4. **Optional — add-context in Chrome mode:**  
   Url scripts launch Chrome themselves. For a logged-in profile (e.g. GitHub), create it once:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --user-data-dir="$HOME/.chrome-debug-profile"
   ```
   Log in, close Chrome. After that, fetch/crawl runs use this profile. See [scripts/README.md](scripts/README.md) for details.

**Result:** Skills are in `~/.cursor/skills-cursor/`. Use them from any project via **@skill-name** in Cursor chat.

---

## Using skills in the agent

In **Cursor chat** (Composer or regular chat), reference a skill so the agent follows it:

**Context** (research workflow; skills live under `context/`):

- **@context-add** — Fetch from URLs using url scripts with real Chrome; write to `.cursor/research-context.json`. Use `--visited-file` to avoid revisiting; use `--confirm-each-page` to prompt before each page (3s load wait). Only this skill may change the context file.
- **@context-show** — Show a short summary of the current research context (count, lastFetched, URLs). Use after context-add to confirm what was stored.
- **@context-clear** — Clear `.cursor/research-context.json` and `.cursor/research-visited.txt` to start fresh.
- **@context-plan** — Read context + repo (read-only), write `.cursor/research-plan.md`.
- **@context-execute** — Read the plan and apply changes to the repo.

**GitHub:** **@gh-branch**, **@gh-pull**, **@gh-pr**, **@gh-pr-review**, **@gh-push** — Branch, pull, PR, review, push.

Skills are listed in Cursor’s skill picker when you type `@`. After setup, no extra env or paths are needed.

---

## Tests

Tests are under `scripts/` and use **mocks only** (no real Chrome or network). From **repo root**:

| Command | What it does |
|---------|----------------|
| `npm test --prefix scripts` | Run all tests (sync, skills-validate, url) |
| `npm run test:skills --prefix scripts` | Sync + skills validation only |
| `npm run test:url --prefix scripts` | Url scripts (fetch, crawl, interactive, visited, link-filter) only |
| `npm run test:context --prefix scripts` | Context integration (clear → append → show → clear) |
| `npm run test:coverage --prefix scripts` | All tests with line/branch/function coverage |
| `npm run test:coverage:check --prefix scripts` | Fail if line coverage &lt; 90% |

**Integration-style tests:** (1) The sync suite includes an **“install locally”** test: it runs `run(['in', '-y'])` with a temp `CURSOR_DIR`, installs from the real repo `skills/`, and asserts that the installed **context-add** skill has `{{base:...}}` resolved. (2) The **context** suite (`npm run test:context --prefix scripts`) runs clear → append → show → clear plus crawl and visited-file. Run all with `npm test --prefix scripts`.

CI runs tests and the coverage check on push/PR to `main` (see [.github/workflows/ci.yml](.github/workflows/ci.yml)). More detail: [scripts/README.md](scripts/README.md) § Tests and coverage.

---

## Skills

**Context** (nested under `context/`: add → clear → plan → execute):

| Skill | Purpose |
|-------|---------|
| **context-add** | Fetch from links using url scripts with real Chrome. Writes `.cursor/research-context.json`; use `--visited-file` and optionally `--confirm-each-page` (3s wait, then prompt). Only this skill may change the context file. |
| **context-show** | Show current context summary (count, lastFetched, URLs). Use after context-add to confirm what was stored. Read-only. |
| **context-clear** | Clear `.cursor/research-context.json` and `.cursor/research-visited.txt` to reset the research workflow. |
| **context-plan** | Read context + repo (read-only), write `.cursor/research-plan.md`. |
| **context-execute** | Read the plan and apply it to the repo (edits code/config). |

**GitHub:**

| Skill | Purpose |
|-------|---------|
| **gh-branch** | New branch from main; name from ticket or description. |
| **gh-pull** | Pull, merge main/upstream, resolve conflicts. |
| **gh-pr** | Create or update PR (description only; no commit/push). |
| **gh-pr-review** | Apply PR review comments and fix failed checks. |
| **gh-push** | Format, lint, test → commit and push. |

---

## Scripts vs skills

- **Scripts** (`scripts/`) — CLI tools: **sync** (skills ↔ Cursor), **url** (fetch/crawl in Chrome), **context** (clear/show research context). Shared by skills.
- **Skills** (`skills/`) — Agent workflows that call those scripts. Placeholders like `{{base:scripts/url}}` are replaced at **sync in** with the repo path so installed skills are self-contained.

**Reinstall after editing a skill:**  
`node scripts/skills/sync.js in`

Full script and test docs: **[scripts/README.md](scripts/README.md)**.
