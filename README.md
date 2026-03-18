# Cursor Skills

Cursor IDE agent skills: markdown instructions the agent follows (e.g. create a PR, research from links). Use in chat with **/skill-name** or **@skill-name**.

---

## Where to find things

| You want to… | See |
|--------------|-----|
| **Install** (clone, deps, sync skills, use from another repo) | [Local setup](#local-setup) |
| **Run scripts** (sync, link-fetcher, tests) | [What to run (summary)](#what-to-run-summary) |
| **List of skills** (search, plan, execute, gh-*) | [Skills](#skills-what-each-one-does) |
| **Scripts vs skills**, install once / use anywhere | [Scripts vs skills](#scripts-vs-skills) below |
| **Link-fetcher** (Chrome, fetch/crawl, options) | [scripts/README.md](scripts/README.md) |

---

## Scripts vs skills

- **Scripts** (`scripts/`) — Reusable CLI tools: **sync** (skills ↔ Cursor), **link-fetcher** (fetch/crawl in Chrome). Scripts are shared; more than one skill can use the same script.
- **Skills** (`skills/`) — Agent workflows that *call* those scripts. One skill can use one or more scripts.
- **Install once:** Clone this repo → install deps → sync skills. Then use skills from **any project** by setting **`CURSOR_SKILLS_REPO`** to this repo’s path so the agent can run the scripts (e.g. **search** uses link-fetcher).

---

## Local setup

**Repo root** = directory that contains `scripts/` and `skills/`.

1. **Clone** the repo (use your fork URL if you have one).
2. **Install** script dependencies (Node.js LTS): `npm install --prefix scripts`
3. **Install skills into Cursor:** `node scripts/skills/sync.js in` (use `in -y` to clear existing first).
4. **Use from another project:** Set **`CURSOR_SKILLS_REPO`** to the **absolute path** of this repo (e.g. in your shell config: `~/.zshrc`, `~/.bashrc`, or `~/.profile`). Then the agent can run scripts when your workspace is a different repo.
5. **Optional (for search):** Start a second Chrome window with a debug profile so link-fetcher can attach — see [Chrome profile for search](#5-optional-chrome-profile-for-search) below.

### 1. Clone the repo

```bash
git clone https://github.com/gustavogardusi/cursor-skills.git
cd cursor-skills
```

Run the following from this directory (repo root).

### 2. Install script dependencies

Requires **Node.js** (LTS). Check with `node -v`. Dependencies install under `scripts/` only (no global install).

```bash
npm install --prefix scripts
```

### 3. Install skills into Cursor

```bash
node scripts/skills/sync.js in
```

On first run this just installs. If `~/.cursor/skills-cursor` already has skills, you’ll be prompted to clear and install fresh. To clear first without prompting:

```bash
node scripts/skills/sync.js in -y
```

### 4. Shell environment (for use from another repo)

- **Workspace is this repo:** Nothing else needed; skills use `scripts/link-fetcher` from the workspace root.
- **Workspace is another project:** Set **`CURSOR_SKILLS_REPO`** to the **absolute path** of this repo so the agent can run scripts (e.g. link-fetcher for **search**).

Add the export to whichever config file your shell sources (variations by environment):

- **zsh:** `~/.zshrc`
- **bash:** `~/.bashrc` or `~/.bash_profile`
- **shared (login shells):** `~/.profile`

From repo root, appending to a specific file (adjust the path if you use a different one):

```bash
echo 'export CURSOR_SKILLS_REPO="'"$(pwd)"'"' >> ~/.zshrc
source ~/.zshrc
```

Or edit your shell config by hand and add: `export CURSOR_SKILLS_REPO="$HOME/github/personal/cursor-skills"` (adjust path).

**Restart Cursor** after changing your shell config (or open Cursor from a terminal that has already sourced it) so the agent sees the new variable.

**Alternative:** Copy **`.env.example`** to **`.env`** and set `CURSOR_SKILLS_REPO` there (if your IDE loads `.env` from the workspace).

### 5. (Optional) Chrome profile for search

The **search** skill uses link-fetcher, which attaches to Chrome via remote debugging. Keep your normal Chrome for daily use; for **search**, use a **second** Chrome window with its own profile:

1. In Terminal, start Chrome with a dedicated user-data dir and remote debugging (opens a new window):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"
```

2. In that window, log in to any sites you need (e.g. GitHub). Leave the window open.
3. **Then** run **search** (or link-fetcher with `--connect-chrome`); it attaches on port 9222 and opens each link there.

More detail: [scripts/README.md](scripts/README.md) (§ First-time setup: Chrome profile and login).

---

## Skills (what each one does)

### Search, plan, execute (research workflow)

Three-step workflow: **search** (fetch links → context file) → **plan** (read context + repo → plan file) → **execute** (read plan → change repo). **search** and **plan** do not change the repo; they only read/write **`.cursor/`** (add `.cursor/` to `.gitignore`). Only **search** may change the context file; only **execute** modifies the codebase.

| Skill | What it does |
|-------|----------------|
| **search** | Fetch-only: receive links, run BFS in Chrome via `scripts/link-fetcher` (fetch.js or crawl.js). Tunable: BFS layers, nodes per layer, wait after load, delay between pages. Write or merge into **`.cursor/research-context.json`**; use `--visited-file .cursor/research-visited.txt` to skip already-visited URLs. Does not modify the repo. |
| **plan** | Read **`.cursor/research-context.json`** (read-only) and the repo (read-only). Craft a plan; write **`.cursor/research-plan.md`** only. Re-running overwrites the plan file; never touches the context file or the repo. |
| **execute** | Read **`.cursor/research-plan.md`** and apply the implementation plan: run commands, add/change/update files. Only the repo is modified; does not edit `.cursor/`. Use after **plan** is done. |

### GitHub

| Skill | What it does |
|-------|----------------|
| **gh-branch** | Create a new branch from main; name it from a Jira key, GitHub issue, or short description. |
| **gh-pull** | Pull the current branch, merge main and/or upstream, resolve conflicts, push if merged. |
| **gh-pr** | Create or update the PR to main/upstream: summarize changes and write the description; does not add/commit/push. |
| **gh-pr-review** | Load PR comments and failed checks; fix each with minimal changes scoped to the PR diff. |
| **gh-push** | Run format, lint, and tests; then make a summarized commit and push on the current branch. |

---

## Quick start

1. **Local setup (once):** [Local setup](#local-setup) — clone → `npm install --prefix scripts` → `node scripts/skills/sync.js in`. For other repos set `CURSOR_SKILLS_REPO` in your shell config (§4); restart Cursor after that. For **search** optionally start Chrome with debug profile.
2. **Verify setup (optional):** From repo root run `npm test --prefix scripts`.
3. In Cursor chat use **@search**, **@plan**, **@execute**, **@gh-pr**, etc.
4. Script details (sync, link-fetcher, Chrome, tests): **[scripts/README.md](scripts/README.md)**.

To add or edit skills: change **`skills/…/SKILL.md`**, then run **`node scripts/skills/sync.js in`** again.

---

## What to run (summary)

| When | Commands (from repo root) |
|------|----------------------------|
| **First time** | Clone repo → `npm install --prefix scripts` → `node scripts/skills/sync.js in`. Optionally: add `export CURSOR_SKILLS_REPO="/path/to/cursor-skills"` to your shell config (`~/.zshrc`, `~/.bashrc`, or `~/.profile`), then `source` it and **restart Cursor**. |
| **Use search from another repo** | Set `CURSOR_SKILLS_REPO` in your shell config. **Restart Cursor** so it sees the variable. **First** open a second Chrome window with `--remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"`; **then** run the skill. |
| **Reinstall skills after editing** | `node scripts/skills/sync.js in` |
| **Run tests** | `npm test --prefix scripts` |
| **Run tests with coverage** | `npm run test:coverage --prefix scripts` |
| **Check coverage threshold (80%)** | `npm run test:coverage:check --prefix scripts` |

**CI:** On push and pull requests to `main`, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs tests and the 80% coverage check. Add a lint step to the workflow when the project adds a lint script.

Tests cover: skills sync, link-fetcher (fetch, crawl, interactive, visited, link-filter). All use mocks (no real Chrome or network). See [scripts/README.md](scripts/README.md) § Tests and coverage.
