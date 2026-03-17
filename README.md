# Cursor Skills

This repo holds **Cursor IDE agent skills**: markdown instructions the agent can follow (e.g. “create a PR”, “format Go”, “research a task”). You use them in chat with **/skill-name** or **@skill-name**.

- **Skills** live in **`skills/`** (one `SKILL.md` per skill). To install them into Cursor, run from repo root: **`node scripts/skills/sync.js in`**. To copy edits from Cursor back into the repo: **`node scripts/skills/sync.js out`**.
- **Scripts** live in **`scripts/`**: the same sync tool plus a **link-fetcher** (Chrome-based URL fetch/crawl for the research skill). Full docs, usage, and testing are in **[scripts/README.md](scripts/README.md)** — that’s the single place for how to run sync, how to use the fetcher with your Chrome (reuse auth), and how to run tests (mocks only, no browser required) and coverage (≥80% line).

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

### Research

| Skill | What it does |
|-------|----------------|
| **research** | Research a task against the repo: optional link crawl (N per page, top X, Y rounds), consolidate docs/tickets, compare impact on the codebase, and output an implementation plan (read-only; no code edits). |

### Code — format

| Skill | What it does |
|-------|----------------|
| **code-format-js** | Format JS/TS/CSS/JSON with Prettier. |
| **code-format-rust** | Format Rust with rustfmt / cargo fmt. |
| **code-format-python** | Format Python with ruff or black. |
| **code-format-go** | Format Go with gofmt. |

### Code — lint

| Skill | What it does |
|-------|----------------|
| **code-lint-js** | Lint JS/TS with ESLint or Biome. |
| **code-lint-rust** | Lint Rust with clippy. |
| **code-lint-python** | Lint Python with ruff or pylint. |
| **code-lint-go** | Lint Go with go vet or staticcheck. |

### Code — test

| Skill | What it does |
|-------|----------------|
| **code-test-js** | Run the JS/Node test suite (npm/yarn/pnpm). |
| **code-test-rust** | Run Rust tests with cargo. |
| **code-test-python** | Run Python tests with pytest. |
| **code-test-go** | Run Go tests. |

### Code — setup

| Skill | What it does |
|-------|----------------|
| **code-setup-js** | First-time JS/Node setup (Node, pnpm, etc.). |
| **code-setup-rust** | First-time Rust setup (rustup, cargo). |
| **code-setup-python** | First-time Python setup (Python, venv). |
| **code-setup-go** | First-time Go setup (install Go, env). |

### Code — ship

| Skill | What it does |
|-------|----------------|
| **code-ship** | Format, lint, test, then add, commit, and push in one flow. |

---

## Quick start

1. Clone the repo.
2. Install skills into Cursor: **`node scripts/skills/sync.js in`** (from repo root).
3. In Cursor Agent chat, use **/gh-pr** or **@research** (etc.) to invoke a skill.
4. For script details (sync options, link-fetcher, Chrome, tests): **[scripts/README.md](scripts/README.md)**.

To add or edit skills: change **`skills/…/SKILL.md`** (frontmatter **name: skill-name**), then run **`node scripts/skills/sync.js in`** again.
