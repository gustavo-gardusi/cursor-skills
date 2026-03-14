# Cursor Skills

Sync Cursor IDE agent skills between `~/.cursor` and this repo.

## Structure

Mirrors `~/.cursor`:

```
skills/          → ~/.cursor/skills
skills-cursor/   → ~/.cursor/skills-cursor
scripts/
  install-skills.sh
  sync-skills.sh
```

## Setup

```bash
git clone <your-repo-url>
cd <repo-name>
./scripts/install-skills.sh
```

## New laptop (from zip)

Transfer the zip to the new machine, then:

```bash
unzip cursor-commands.zip
cd cursor-commands
./scripts/install-skills.sh
```

To create your own repo from the content:

```bash
cd cursor-commands
rm -rf .git
git init
git add .
git commit -m "Initial: Cursor skills"
gh repo create cursor-commands --public --source=. --remote=origin --push
```

## Package (create zip)

```bash
./scripts/package.sh
```

Creates `<repo-name>.zip` in the repo directory (excludes .git). Transfer the zip to another machine to set up there.

## Install vs sync

| Action | When | Command |
|--------|------|---------|
| Install | New machine, after pull | `./scripts/install-skills.sh` |
| Sync | After editing skills in ~/.cursor | `./scripts/sync-skills.sh` |

Install copies repo → `~/.cursor`. Sync copies `~/.cursor` → repo.

## Usage

Skills apply when your request matches. Examples: "sync my branch with main", "run tests", "format code", "craft a PR".

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

## Adding skills

**In repo:** Add `skills/name/SKILL.md` or `skills-cursor/name/SKILL.md`, then run `./scripts/install-skills.sh`

**Locally:** Create in `~/.cursor/skills` or `~/.cursor/skills-cursor`, run `./scripts/sync-skills.sh`, then `git add skills/ skills-cursor/ && git commit -m "Sync skills"`
