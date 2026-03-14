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

## On invoke

**Start immediately.** When this skill is applied, run the first command right away. Do not summarize the workflow, ask for confirmation, or explain—use the Shell tool to run each command one by one until the PR is created or you must stop (e.g. not a fork, auth failed). Run one command, observe the result, then run the next.

## Prerequisites

Run these checks first. Stop if any fail.

| Check | Command | Install if missing |
|-------|---------|--------------------|
| Git repo | `git rev-parse --git-dir 2>/dev/null` | Must be in a git repo |
| gh CLI | `gh --version` | `brew install gh` |
| gh auth | `gh auth status` | `gh auth login` |
| Fork | `gh repo view --json parent -q .parent` | Repo must be a fork |

**First command to run:** `gh repo view --json parent -q .parent`

## Workflow

Run each step in sequence. After each command, run the next. Do not batch or skip.

### 1. Ensure upstream remote

Run:

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

Run in order:
1. `BRANCH=$(git branch --show-current)`
2. `git fetch upstream`
3. `git merge upstream/main`
4. **If conflicts** – Resolve each:
   - Run `git status` to list conflicted files
   - Edit each file to resolve conflicts
   - Run `git add <file>` then `git commit -m "Merge upstream/main into $BRANCH"`
5. **If no conflicts** – Merge completes automatically (or already up to date)

### 3. Push to fork

Run: `git push origin $BRANCH`

### 4. Create PR to upstream with gh

Run to get values:

```bash
FORK_OWNER=$(gh repo view --json owner -q .owner.login)
UPSTREAM=$(gh repo view --json parent -q '.parent.owner.login + "/" + .parent.name')
```

Run: `gh pr list --repo "$UPSTREAM" --head "$FORK_OWNER:$BRANCH" --base main`

If a PR exists, the push in step 3 already updated it. Done.

If no PR exists, run `gh pr create` to create it.

First run `git diff upstream/main...HEAD --stat` to see changes. Build title and body from that output:

**Title template:** One line summarizing the main change. Examples:
- `Add X` / `Fix Y` / `Simplify Z`
- `[TICKET-123] Add X` if user provides a ticket

**Body template:** Run `git diff upstream/main...HEAD --stat` and format as:

```markdown
## Summary
[One sentence: what this PR does]

## Changes
- [file/path]: [brief change]
- ...

## Notes
[Optional: user context, breaking changes, follow-up]
```

Example: For `4 files changed, 106 insertions(+), 50 deletions(-)` across README, .gitignore, package.sh, craft-pr-upstream:
- Title: `Simplify repo, add craft-pr-upstream skill`
- Body: List each file and its change (e.g. "README: clone-only setup", "craft-pr-upstream: new skill for fork→upstream PRs")

**You must run `gh pr create`** with the built title and body. Do not skip it.

## Notes

- Uses merge (not rebase) to keep history clear.
- To abort merge: `git merge --abort`
- Run from project root.
