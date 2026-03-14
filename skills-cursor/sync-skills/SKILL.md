---
name: sync-skills
description: >-
  Pull skills from ~/.cursor/skills into the skills repo. Use when the user
  wants to sync skills, backup skills, or copy local skills into the repo.
---

# Sync skills into repo

Pull skills from `~/.cursor/skills` and `~/.cursor/skills-cursor` into the skills repo (the repo containing this skill). Use this to backup your local skills into version control.

## Steps

1. **Locate the skills repo** – The repo with `scripts/sync-skills.sh`. Ask if unclear.
2. **Run the sync script** – From the skills repo root:
   ```bash
   ./scripts/sync-skills.sh
   ```
3. **Review changes** – `git status` and `git diff` to see what was added/updated
4. **Commit** – If desired: `git add skills/ skills-cursor/ && git commit -m "Sync skills from ~/.cursor"`

## Notes

- Copies into `skills/` and `skills-cursor/` (same layout as ~/.cursor)
- Run after adding or updating skills locally to keep the repo in sync
- To restore skills from repo to local (e.g. new machine): `./scripts/install-skills.sh`
