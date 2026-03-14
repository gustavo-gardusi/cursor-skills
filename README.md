# Cursor Skills

Sync Cursor IDE agent skills between `~/.cursor` and this repo.

## Setup

Clone and install:

```bash
# SSH
git clone git@github.com:OWNER/cursor-skills.git
cd cursor-skills

# or HTTPS
git clone https://github.com/OWNER/cursor-skills.git
cd cursor-skills

./scripts/install-skills.sh
```

## Using skills in Cursor

After install, skills are available in Cursor chat. The agent applies them when your request matches.

**Invoke a skill:**
- Type `@skill-name` (e.g. `@craft-pr-upstream`) to attach the skill to your message
- Or describe what you want: "sync my branch with main", "run tests", "create PR to upstream"

**Examples:**
- `@craft-pr-upstream` — runs the full workflow: merge upstream main, resolve conflicts, push, create PR
- `@sync-main` — merge main into your branch
- `@sync-upstream` — sync with upstream (fetch, merge, resolve, push)
- `@format-code` — format the project
- `@run-tests` — run the test suite
- `@ship` — run checks, then commit and push

Skills run automatically when the agent detects a matching intent. Use `@skill-name` when you want to force a specific skill.

## Structure

Mirrors `~/.cursor`:

```
skills/          → ~/.cursor/skills
skills-cursor/   → ~/.cursor/skills-cursor
scripts/
  install-skills.sh   # repo → ~/.cursor (run after clone/pull)
  sync-skills.sh      # ~/.cursor → repo (run after editing skills locally)
```

## Scripts

| Script | Purpose |
|--------|---------|
| `install-skills.sh` | Copy `skills/` and `skills-cursor/` from repo to `~/.cursor`. Run after clone or pull. |
| `sync-skills.sh` | Copy `~/.cursor/skills` and `~/.cursor/skills-cursor` into repo. Run after adding or editing skills locally. |

## Install vs sync

| Action | When | Command |
|--------|------|---------|
| Install | New machine, after pull | `./scripts/install-skills.sh` |
| Sync | After editing skills in ~/.cursor | `./scripts/sync-skills.sh` |

Install copies repo → `~/.cursor`. Sync copies `~/.cursor` → repo.

## Skills

| Skill | Use |
|-------|-----|
| sync-main | Merge main into current branch |
| sync-upstream | Sync with upstream main (fetch, merge, resolve, push) |
| sync-skills | Backup local skills to repo |
| run-tests | Run project test suite |
| format-code | Format with project formatter |
| ship | Run format/lint/test, then add, commit, push |
| craft-pr | Create/update PR with gh CLI |
| craft-pr-upstream | PR from fork to original repo (merge upstream main first) |
| create-rule | Add `.cursor/rules/` |
| create-skill | Write new skills |
| create-subagent | Define subagents |
| cursor-blame | Attribution |
| migrate-to-skills | Convert rules/commands to skills |
| shell | Literal command via `/shell` |
| update-cursor-settings | Editor settings |

Skills apply when your request matches. Examples: "sync my branch with main", "sync with upstream", "run tests", "format code", "ship changes", "craft a PR", "create PR to upstream".

## Adding skills

**In repo:** Add `skills/name/SKILL.md` or `skills-cursor/name/SKILL.md`, then run `./scripts/install-skills.sh`

**Locally:** Create in `~/.cursor/skills` or `~/.cursor/skills-cursor`, run `./scripts/sync-skills.sh`, then `git add skills/ skills-cursor/ && git commit -m "Sync skills"`
