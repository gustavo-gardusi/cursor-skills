---
name: gh-push
description: >-
  Add changes, craft commit message, push. Use when user wants to commit and
  push, save changes, push to branch, or add-commit-push.
---

# Push

Add all changes, craft a relevant commit message from the diff, commit, and push to current branch.

## Steps

1. `git status` — see changes
2. `git add .` (or `git add -A`)
3. **Commit message** — Build from `git diff --cached --stat` or `git diff --stat`:
   - One-line summary: "Add X", "Fix Y", "Refactor Z"
   - Use user message if given
4. `git commit -m "message"`
5. `git push`

## Notes

- Run from project root
- Target: current branch (`git branch --show-current`)
- No checks—for validated changes use `ship`
