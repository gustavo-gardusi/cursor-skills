# Cursor Skills

Sync Cursor IDE agent skills between `~/.cursor` and this repo.

## Setup

```bash
git clone git@github.com:OWNER/cursor-skills.git
cd cursor-skills
./scripts/install-skills.sh
```

Or clone via HTTPS: `git clone https://github.com/OWNER/cursor-skills.git`

## Using skills

Invoke with `@skill-name` or describe what you want. Examples: `@gh-pr`, `@format-js`, `@setup-python`, `@ship`

## Project structure

```
cursor-skills/
  skills/             # Personal skills (empty by default)
  skills-cursor/      # Skills (nested: gh/pr/, code/format/js/, etc.)
  scripts/
    install-skills.sh # Repo → ~/.cursor
    sync-skills.sh    # ~/.cursor → repo
```

Skills use nested folders. Each skill is a directory with `SKILL.md`. Scripts copy recursively.

## Skills layout

```
skills-cursor/
  gh/                 # Repo: pull, push, PR
    pull-main/       # Merge main into branch
    pull-upstream/   # Sync fork with upstream
    push/            # Add, commit, push
    sync-skills/     # Backup skills to repo
    pr/              # Create/update PR
    pr-upstream/     # PR from fork to upstream
  code/              # Format, lint, test, setup, ship, settings
    format/          # js, rust, python, go
    lint/
    test/
    setup/           # First-time env: brew, venv
    ship/            # Format + lint + test + commit + push
    settings/cursor/
```

## Skills

| Domain | Skill | Use |
|--------|-------|-----|
| gh | gh-pull-main | Merge main into branch |
| gh | gh-pull-upstream | Sync fork with upstream |
| gh | gh-push | Add, commit, push |
| gh | gh-sync-skills | Backup skills to repo |
| gh | gh-pr | Create/update PR |
| gh | gh-pr-upstream | PR from fork to upstream |
| code | format-js, format-rust, format-python, format-go | Format by language |
| code | lint-js, lint-rust, lint-python, lint-go | Lint by language |
| code | test-js, test-rust, test-python, test-go | Test by language |
| code | setup-js, setup-rust, setup-python, setup-go | First-time env setup (brew, venv) |
| code | ship | Format, lint, test, commit, push |
| code | settings-cursor | Editor settings |

## Scripts

| Script | Purpose |
|--------|---------|
| `install-skills.sh` | Copy `skills/` and `skills-cursor/` from repo to `~/.cursor`. Run after clone or pull. |
| `sync-skills.sh` | Copy `~/.cursor/skills` and `~/.cursor/skills-cursor` into repo. Run after editing skills locally. |

Both scripts support nested structure. They find all `SKILL.md` files and preserve paths.

## Adding skills

Add `skills-cursor/domain/name/SKILL.md` (e.g. `code/format/ruby/SKILL.md`), then run `./scripts/install-skills.sh`
