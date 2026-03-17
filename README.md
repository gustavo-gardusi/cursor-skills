# Cursor Skills

This repo holds **Cursor IDE agent skills**: markdown instructions the agent can follow (e.g. “create a PR”, “format Go”, “research a task”). You use them in chat with **/skill-name** or **@skill-name**.

- **Skills** live in **`skills/`** (one `SKILL.md` per skill). To install them into Cursor, run from repo root: **`node scripts/skills/sync.js in`**. To copy edits from Cursor back into the repo: **`node scripts/skills/sync.js out`**.
- **Scripts** live in **`scripts/`**: the same sync tool plus a **link-fetcher** (Chrome-based URL fetch/crawl for the **research-append** skill). Full docs, usage, and testing are in **[scripts/README.md](scripts/README.md)** — including [how to use the link-fetcher from another repo](scripts/README.md#use-from-another-repo) (set `CURSOR_SKILLS_REPO`).

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

1. Clone the repo.
2. Install skills into Cursor: **`node scripts/skills/sync.js in`** (from repo root).
3. In Cursor Agent chat, use **/gh-pr** or **@research-append** / **@research-plan** / **@research-execute** (etc.) to invoke a skill.
4. For script details (sync, link-fetcher, Chrome, research workflow, tests): **[scripts/README.md](scripts/README.md)**.

To add or edit skills: change **`skills/…/SKILL.md`** (frontmatter **name: skill-name**), then run **`node scripts/skills/sync.js in`** again.
