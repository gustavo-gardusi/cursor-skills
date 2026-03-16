# Cursor Skills

Sync Cursor IDE agent skills between `~/.cursor/skills-cursor` and this repo’s `src/`.

## Setup

```bash
git clone git@github.com:OWNER/cursor-skills.git
cd cursor-skills
./skills.sh in
```

Or clone via HTTPS: `git clone https://github.com/OWNER/cursor-skills.git`

## Using skills

In Cursor Agent chat: type `/` + skill name (e.g. `/gh-pr`, `/code-format-js`), or `@skill-name` to attach as context. You can also describe the task in plain language.

## Project structure

`src/` holds one `SKILL.md` per skill in nested dirs (e.g. `src/gh/pr` → skill name `gh-pr`). `./skills.sh` syncs repo ↔ `~/.cursor/skills-cursor`.

## Skills

| Skill | Use |
|-------|-----|
| gh-pull | Pull current branch, then merge main and/or upstream; push if merged |
| gh-pr | Sync build (branch + main/upstream), format & test, commit & push, then create/update PR |
| code-format-js, code-format-rust, code-format-python, code-format-go | Format by language |
| code-lint-js, code-lint-rust, code-lint-python, code-lint-go | Lint by language |
| code-test-js, code-test-rust, code-test-python, code-test-go | Test by language |
| code-setup-js, code-setup-rust, code-setup-python, code-setup-go | First-time env setup (brew, venv) |
| code-ship | Format, lint, test, commit, push |

## Sync (in / out)

| Command | Description |
|---------|-------------|
| `./skills.sh in` | Repo → Cursor. Install (or add/overwrite). `in -y` to clear existing first. |
| `./skills.sh out` | Cursor → Repo. Overwrite existing `src/` skills from local only. |

## Adding skills

Add `src/…/SKILL.md` with frontmatter `name: skill-name` (hyphenated path). Run `./skills.sh in`, or edit under `~/.cursor/skills-cursor` and run `./skills.sh out` to sync back.
