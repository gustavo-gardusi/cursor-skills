# Cursor Skills

Markdown-only Cursor skills for GitHub workflow and project-local context planning.

Use skills in Cursor chat as `@skill-name` or `/skill-name`.

## Installation

This repo intentionally avoids Node/script tooling. Install with the single shell script:

```bash
./install.sh
```

Optional custom target:

```bash
./install.sh /path/to/custom/skills-cursor
```

By default, skills are installed to `~/.cursor/skills-cursor`.

## Repository layout

- `skills/` - public and internal skill markdown files
- `docs/` - documentation for architecture, usage, and references
- `install.sh` - only installer entrypoint

## Public skills

### Context

- `@context-add` - create/update local project context in `.cursor/research-context.md`
- `@context-show` - summarize current local context and plan status
- `@context-plan` - generate/update `.cursor/research-plan.md` from local context
- `@context-clear` - clear local context files for the current repo

### GitHub workflow

- `@gh-check` - repository verification only (discover, pre-check deps, prepare, format/lint/test); no git operations
- `@gh-main` - move to `main` and integrate canonical `main` with merge/conflict handling
- `@gh-reset` - destructive reset/clean (explicitly confirmed)
- `@gh-pull` - merge canonical `main` into current branch and resolve conflicts
- `@gh-push` - commit/push flow after successful `@gh-check`
- `@gh-pr` - create/update PR metadata after `@gh-push`
- `@gh-start` - derive branch name, run `@gh-main`, create branch, optionally publish via `@gh-push`

## Context storage model

Context is local to each repository under `.cursor/`:

- `.cursor/research-context.md`
- `.cursor/research-plan.md`

No global browser profile or global context cache is required.

## More docs

- [Skills reference](skills/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [User guide](docs/USER_GUIDE.md)
- [Quick reference](docs/REFERENCE.md)
- [Testing notes](docs/TESTING.md)