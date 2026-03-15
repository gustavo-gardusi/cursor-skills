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

Invoke with `@skill-name` or describe what you want. Skill names match the folder path with hyphens. Examples: `@gh-pr`, `@code-format-js`, `@code-setup-python`, `@code-ship`

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
```

## Skills

Skill names = folder path with hyphens (e.g. `src/gh/pr` → `gh-pr`, `src/code/format/js` → `code-format-js`).

| Skill | Use |
|-------|-----|
| gh-pull-main | Merge main into branch |
| gh-pull-upstream | Sync fork with upstream |
| gh-push | Add, commit, push |
| gh-pr | Create/update PR |
| gh-pr-upstream | PR from fork to upstream |
| code-format-js, code-format-rust, code-format-python, code-format-go | Format by language |
| code-lint-js, code-lint-rust, code-lint-python, code-lint-go | Lint by language |
| code-test-js, code-test-rust, code-test-python, code-test-go | Test by language |
| code-setup-js, code-setup-rust, code-setup-python, code-setup-go | First-time env setup (brew, venv) |
| code-ship | Format, lint, test, commit, push |

## Install

Run `./install-skills.sh` after clone or pull. If `~/.cursor/skills-cursor` already has skills, you'll be prompted: clear existing and install fresh, or keep existing and add/overwrite. Use `./install-skills.sh -y` to skip the prompt and clear.

## Adding skills

Add `src/domain/name/SKILL.md`. Set `name:` in frontmatter to the path with hyphens (e.g. `src/code/format/ruby` → `name: code-format-ruby`). Run `./install-skills.sh`
