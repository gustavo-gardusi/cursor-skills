# Cursor Skills

This repo holds **Cursor IDE agent skills**: markdown instructions the agent can follow (e.g. “create a PR”, “research a task”). You use them in chat with **/skill-name** or **@skill-name**.

- **Skills** live in **`skills/`** (one `SKILL.md` per skill). To install them into Cursor, run from repo root: **`node scripts/skills/sync.js in`**. To copy edits from Cursor back into the repo: **`node scripts/skills/sync.js out`**.
- **Scripts** live in **`scripts/`**: the same sync tool plus a **link-fetcher** (Chrome-based URL fetch/crawl for the **research-append** skill). Full docs: **[scripts/README.md](scripts/README.md)**.

---

## Initial setup (run once)

From the **repo root** (the directory that contains **`scripts/`**), e.g. `/Users/gustavogardusi/github/personal/cursor-skills`:

```bash
# 1. Install script dependencies (Node LTS)
npm install --prefix scripts

# 2. Install skills into Cursor (add/overwrite)
node scripts/skills/sync.js in
# Or clear existing skills first: node scripts/skills/sync.js in -y
```

**Using research-append from another repo?** Set **`CURSOR_SKILLS_REPO`** to the **absolute path of this repo** (the folder that contains `scripts/`), so the agent can run the link-fetcher scripts:

- **Option A — Shell:** `export CURSOR_SKILLS_REPO=/path/to/cursor-skills` (add to `~/.zshrc` or `~/.bashrc` to persist).
- **Option B — .env:** Copy **`.env.example`** to **`.env`** in this repo, set `CURSOR_SKILLS_REPO=/path/to/cursor-skills`. If Cursor/your IDE loads `.env` from the workspace, the agent will see it when you open another project; otherwise use Option A.

When your Cursor **workspace is this repo**, you don’t need `CURSOR_SKILLS_REPO`; the skills use `scripts/link-fetcher` from the workspace root.

---

## Skills (what each one does)

### GitHub

| Skill | What it does |
|-------|----------------|
| **gh-branch** | Create a new branch from main; name it from a Jira key, GitHub issue, or short description. |
| **gh-pull** | Pull the current branch, merge main and/or upstream, resolve conflicts, push if merged. |
| **gh-pr** | Create or update the PR to main/upstream: summarize changes and write the description; does not add/commit/push. |
| **gh-pr-review** | Load PR comments and failed checks; fix each with minimal changes scoped to the PR diff. |
| **gh-push** | Run format, lint, and tests; then make a summarized commit and push on the current branch. |

### Research (three skills under `skills/research/`)

Three-step workflow: **append** (fetch links → context file) → **plan** (read context + repo → plan file) → **execute** (read plan → change repo). Append and plan **do not change the repo**—they only read/write **`.cursor/`** (ephemeral; add `.cursor/` to `.gitignore`). Only **research-append** may change the context file; only **research-execute** modifies the codebase.

| Skill | What it does |
|-------|----------------|
| **research-append** | Fetch-only: receive links, run a **BFS** in Chrome (N best at distance 1, then N best at distance 2) via `scripts/link-fetcher` (fetch.js or crawl.js). Write or merge into **`.cursor/research-context.json`** with timestamps; use `--visited-file .cursor/research-visited.txt` to skip already-visited URLs. Does not modify the repo. |
| **research-plan** | Read **`.cursor/research-context.json`** (read-only) and the repo (read-only). Craft a plan of what can be done and what to do; write **`.cursor/research-plan.md`** only. Re-running overwrites the plan file; never touches the context file or the repo. |
| **research-execute** | Read **`.cursor/research-plan.md`** and apply the implementation plan: run one-off commands, add/change/update files. Only the repo is modified; does not edit `.cursor/`. Use after the plan is done. |

---

## Quick start

1. **Initial setup** (once): see [Initial setup (run once)](#initial-setup-run-once) above.
2. In Cursor Agent chat, use **/gh-pr** or **@research-append** / **@research-plan** / **@research-execute** (etc.) to invoke a skill.
3. Script details (sync, link-fetcher, Chrome, research workflow, tests): **[scripts/README.md](scripts/README.md)**.

To add or edit skills: change **`skills/…/SKILL.md`** (frontmatter **name: skill-name**), then run **`node scripts/skills/sync.js in`** again.

---

## What to run right now (summary)

| When | Commands (from repo root) |
|------|----------------------------|
| **First time in this repo** | `npm install --prefix scripts` → `node scripts/skills/sync.js in` |
| **Use research-append from another repo** | Set `CURSOR_SKILLS_REPO` to this repo’s path (e.g. `export CURSOR_SKILLS_REPO=/Users/gustavogardusi/github/personal/cursor-skills`), or copy `.env.example` to `.env` and set it there |
| **Reinstall skills after editing** | `node scripts/skills/sync.js in` |
| **Run tests** | `npm test --prefix scripts` |
