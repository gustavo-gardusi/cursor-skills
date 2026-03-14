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

## Structure

Mirrors `~/.cursor`:

```
skills/          → ~/.cursor/skills
skills-cursor/   → ~/.cursor/skills-cursor
scripts/
  install-skills.sh   # repo → ~/.cursor
  sync-skills.sh      # ~/.cursor → repo
```

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
| sync-skills | Backup local skills to repo |
| run-tests | Run project test suite |
| format-code | Format with project formatter |
| craft-pr | Create/update PR with gh CLI |
| create-rule | Add `.cursor/rules/` |
| create-skill | Write new skills |
| create-subagent | Define subagents |
| cursor-blame | Attribution |
| migrate-to-skills | Convert rules/commands to skills |
| shell | Literal command via `/shell` |
| update-cursor-settings | Editor settings |

Skills apply when your request matches. Examples: "sync my branch with main", "run tests", "format code", "craft a PR".

## Adding skills

**In repo:** Add `skills/name/SKILL.md` or `skills-cursor/name/SKILL.md`, then run `./scripts/install-skills.sh`

**Locally:** Create in `~/.cursor/skills` or `~/.cursor/skills-cursor`, run `./scripts/sync-skills.sh`, then `git add skills/ skills-cursor/ && git commit -m "Sync skills"`
