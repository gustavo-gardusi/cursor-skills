---
name: craft-pr-upstream
description: >-
  Create a PR from a fork to the original repo. Merges upstream main into
  current branch, resolves conflicts, then opens PR. Use when the user wants
  to contribute to upstream, open a PR to the original repo, or submit changes
  from a fork.
---

# Craft PR to upstream

Create a pull request from your fork to the original (upstream) repo. First merges upstream `main` into your current branch and resolves conflicts, then creates the PR.

## Prerequisites

| Check | Command | Install if missing |
|-------|---------|--------------------|
| Git repo | `git rev-parse --git-dir 2>/dev/null` | Must be in a git repo |
| gh CLI | `gh --version` | `brew install gh` |
| gh auth | `gh auth status` | `gh auth login` |
| Fork | `gh repo view --json parent -q .parent` | Repo must be a fork |

## Workflow

### 1. Ensure upstream remote

```bash
gh repo view --json parent -q .parent
```

If no parent, stop—this repo is not a fork.

Add upstream if missing:

```bash
PARENT=$(gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name')
git remote add upstream "https://github.com/$PARENT.git" 2>/dev/null || true
```

### 2. Merge upstream main and resolve conflicts

1. **Save branch** – `BRANCH=$(git branch --show-current)`
2. **Fetch upstream** – `git fetch upstream`
3. **Merge** – `git merge upstream/main`
4. **If conflicts** – Resolve each:
   - List: `git status`
   - Edit conflicted files, remove `<<<<<<<`, `=======`, `>>>>>>>` markers
   - `git add <file>` after each resolution
   - `git commit -m "Merge upstream/main into $BRANCH"`
5. **If no conflicts** – Merge completes automatically (or already up to date)

### 3. Push to fork

```bash
git push origin $BRANCH
```

### 4. Create PR to upstream

Get fork owner and upstream repo:

```bash
FORK_OWNER=$(gh repo view --json owner -q .owner.login)
UPSTREAM=$(gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name')
```

Check for existing PR:

```bash
gh pr list --repo "$UPSTREAM" --head "$FORK_OWNER:$BRANCH" --base main
```

If PR exists, the push in step 3 already updated it. Done.

If no PR, create:

```bash
gh pr create --repo "$UPSTREAM" --base main --head "$FORK_OWNER:$BRANCH" --title "..." --body "..."
```

Build title from changes: `git diff upstream/main...HEAD --stat`. Use `[TICKET] Summary` if user provides a ticket.

## Notes

- Uses merge (not rebase) to keep history clear.
- To abort merge: `git merge --abort`
- Run from project root.
