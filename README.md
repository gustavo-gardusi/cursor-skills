# Cursor Skills

Markdown instructions the Cursor agent follows (e.g., orchestrating browser research, creating a PR, building a plan). Use in Cursor chat: **`@skill-name`** or **`/skill-name`** (same picker).

---

## Quickstart & Installation

Since this repository uses a **skills-only architecture**, there are no `npm install` steps or scripts to build. You just need to tell Cursor where to find the `skills/` directory.

### Option 1: Automatic via Cursor (If supported)
1. Open Cursor Settings
2. Navigate to Features > Agent > Skills
3. Add this repository URL

### Option 2: Manual Sync (Recommended)
Run this one-liner from any terminal to sync the latest skills to your Cursor profile:
```bash
mkdir -p ~/.cursor/skills-cursor && cp -r /path/to/your/clone/cursor-skills/skills/* ~/.cursor/skills-cursor/
```

**Setup Alias:**
To make it easy to update in the future, add this to your `~/.zshrc` or `~/.bashrc`:
```bash
alias sync-cursor-skills="cp -r ~/github/personal/cursor-skills/skills/* ~/.cursor/skills-cursor/"
```
Then whenever you pull changes, just run `sync-cursor-skills`.

---

## What's This?

This repository provides reusable skills for the Cursor agent.

- **`skills/`**: Public, user-facing skills (e.g., `@context-add`, `@gh-pr`).
- **`skills/internal/`**: Internal utilities organized by domain (e.g., `context/`, `gh/`). Called by public skills; not meant for direct use.

For deep technical details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Public Skills Directory

### Context Research (Exploration Flow)

Located in **`skills/context/`**.

| Skill | What it does |
|-------|----------------|
| `@context-add` | Start interactive browser session. Opens Firefox, listens to all tabs, and provides real-time chat recommendations as you navigate. |
| `@context-show` | Show intelligence report: queue preview, visited count, confidence level, and current context summary. |
| `@context-plan` | Interactive strategy builder. Uses Q&A to analyze findings and output a concrete plan. |
| `@context-clear` | Show summary, then clear per-repo context/queue (keeps global snapshots). |

### GitHub Workflow

Located in **`skills/gh/`**.

| Skill | What it does |
|-------|----------------|
| `@gh-start` | Sync `main`, create a new branch from a ticket/issue, and publish it. |
| `@gh-pr` | Run full check/push cycle, then create or update a GitHub PR from diff. |
| `@gh-check` | Run format, lint, and test suites. Stops if anything fails. |

---

## Recommended Models by Task

When invoking skills, consider these models for optimal results. Skills inherit your default model; these are suggestions to optimize cost vs. quality.

| Task | Recommended Model | Why |
|------|-------------------|-----|
| **Planning & Strategy** (`@context-plan`) | `claude-sonnet-4.5` (with reasoning) | Iterative reasoning, multi-phase analysis |
| **Code Review & Refactoring** | `claude-sonnet-4.5` (with reasoning) | Deep code understanding and explanation |
| **General Coding** | `gemini-3.1-pro` | Excellent code generation, versatile |
| **Interactive Exploration** (`@context-add`) | `composer-2` | Fast real-time responsiveness while navigating |
| **Fast Decisions / Q&A** | `claude-haiku-4.5` | Quick answers, low cost |

---

## Storage Model: Global vs Per-Repo

This project uses a hybrid storage model to maximize efficiency:

**Global (shared across all repos)**:
- `$HOME/.cursor/browser-profiles/` — Shared Firefox profile + page snapshots.
- Keeps you logged in across all projects.
- Deduplicates page fetches (if you view a PR in Repo A, Repo B can reuse the text snapshot).

**Per-Repository (in `.cursor/` of each repo)**:
- `.cursor/research-queue.json` — Next links to explore for this specific project.
- `.cursor/research-context.json` — Destination pages found in this project's exploration.
- `.cursor/research-plan.json` / `.md` — Strategy and findings.