# Cursor Skills

Sync Cursor IDE agent skills between `~/.cursor/skills-cursor` and this repo’s `src/`.

## Setup

```bash
git clone git@github.com:OWNER/cursor-skills.git
cd cursor-skills
./install-skills.sh in
```

Or clone via HTTPS: `git clone https://github.com/OWNER/cursor-skills.git`

## Using skills

In Cursor Agent chat: type `/` + skill name (e.g. `/gh-pr`, `/code-format-js`), or `@skill-name` to attach as context. You can also describe the task in plain language.

## Project structure

`src/` holds one `SKILL.md` per skill in nested dirs (e.g. `src/gh/pr-upstream` → skill name `gh-pr-upstream`). `install-skills.sh` syncs repo ↔ `~/.cursor/skills-cursor`.

## Skills

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

## Sync (in / out)

| Command | Description |
|---------|-------------|
| `./install-skills.sh in` | Repo → Cursor. Install (or add/overwrite). Use `-y` to clear existing first. |
| `./install-skills.sh out` | Cursor → Repo. Overwrite existing `src/` skills from local; no new paths created. |

## Adding skills

Add `src/…/SKILL.md` with frontmatter `name: skill-name` (hyphenated path). Then `./install-skills.sh in`, or edit under `~/.cursor/skills-cursor` and run `out` to sync back.
