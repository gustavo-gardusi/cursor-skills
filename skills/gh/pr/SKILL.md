---
name: gh-pr
description: >-
  Run gh-push first (check, docs, commit, push), then resolve open PR by head,
  diff vs base, write title/body from diff, edit or create. No merge.
---

# PR

**Cursor skill:** **`@gh-pr`** — Invoked with **`@gh-pr`** in Cursor.

**Depends on:** 
- **`@gh-check`** (runs before any code changes)
- **`@gh-pull-merge`** (internal utility, used if sync needed)

**Sole purpose:** (1) Ensure branch is checked. (2) Resolve an open PR for this head/base if one exists. (3) Fetch the real base ref, diff `base...HEAD`, write title and body. (4) `gh pr edit` or `gh pr create`.

## Workflow

1. **Verify State**: Ask user if code is ready to PR.
2. **Checks**: Run **`@gh-check`**. If it fails, stop.
3. **Commit & Push**: Commit any final changes. Push to remote (`git push -u origin HEAD`).
4. **Resolve existing open PR**: Check if PR already exists for this branch.
5. **Diff & Write**: Fetch base ref (`main` or `upstream/main`), diff vs `HEAD`, and write a strong title/body.
6. **Create/Edit**: Run `gh pr create` or `gh pr edit` using the generated text.

## PR Description Format

### Structure
1. **✨ Summary** — Bullet points. Bold main outcomes.
2. **📊 Impact** — *Optional*. Omit if no runtime impact.
3. **📁 Changes** — Brief Added / Modified / Deleted.

### Rules
- Emoji in body only; `--title` is plain text.
- Focus on behavior and tree changes reviewers must see.
