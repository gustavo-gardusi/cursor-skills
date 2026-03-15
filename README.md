# Cursor Skills

Sync Cursor IDE agent skills between `~/.cursor` and this repo.

## Setup

```bash
git clone git@github.com:OWNER/cursor-skills.git
cd cursor-skills
./install-skills.sh
```

Or clone via HTTPS: `git clone https://github.com/OWNER/cursor-skills.git`

## Using skills

Invoke with `@skill-name` or describe what you want. Examples: `@gh-pr`, `@format-js`, `@setup-python`, `@ship`

## Project structure

```
cursor-skills/
  src/                # Skills (nested: gh/pr/, code/format/js/, etc.)
  install-skills.sh   # src/ → ~/.cursor/skills-cursor
```

Each skill is a directory with `SKILL.md`. The install script copies recursively.

## Skills layout

```
src/
  gh/                 # Repo: pull, push, PR
    pull-main/       # Merge main into branch
    pull-upstream/   # Sync fork with upstream
    push/            # Add, commit, push
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
| gh | gh-pr | Create/update PR |
| gh | gh-pr-upstream | PR from fork to upstream |
| code | format-js, format-rust, format-python, format-go | Format by language |
| code | lint-js, lint-rust, lint-python, lint-go | Lint by language |
| code | test-js, test-rust, test-python, test-go | Test by language |
| code | setup-js, setup-rust, setup-python, setup-go | First-time env setup (brew, venv) |
| code | ship | Format, lint, test, commit, push |
| code | settings-cursor | Editor settings |

## Install

Run `./install-skills.sh` after clone or pull. Copies `src/` to `~/.cursor/skills-cursor`.

## Adding skills

Add `src/domain/name/SKILL.md` (e.g. `src/code/format/ruby/SKILL.md`), then run `./install-skills.sh`
