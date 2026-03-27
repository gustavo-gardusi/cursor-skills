# User Guide

## Installation

```bash
git clone https://github.com/gardusig/cursor-skills.git
cd cursor-skills
./install.sh
```

Optional target path:

```bash
./install.sh /path/to/skills-cursor
```

## Verify installation

In Cursor chat, type `@` and confirm you can see:
- `@context-add`
- `@context-show`
- `@context-plan`
- `@context-clear`
- `@gh-check`
- `@gh-main`
- `@gh-reset`
- `@gh-pull`
- `@gh-push`
- `@gh-pr`
- `@gh-start`

## Context workflow (local files only)

```text
@context-add -> @context-show -> @context-plan -> @context-clear
```

Context files are stored in the active repo:
- `.cursor/research-context.md`
- `.cursor/research-plan.md`

## GitHub workflow

```text
@gh-start -> coding -> @gh-push -> @gh-pr
```

Useful subsets:
- Verify only: `@gh-check`
- Sync/integrate `main`: `@gh-main`
- Merge `main` into current branch: `@gh-pull`
- Destructive cleanup/reset: `@gh-reset`

## Important boundaries

- `@gh-check` is verification-only and does not run git commands.
- `@gh-main` handles merge/conflict sync for `main`, not reset/clean.
- `@gh-reset` is the only reset/clean skill.
- `@gh-push` is the only publish skill.

## Troubleshooting

- If `@gh-check` reports missing tools, install the required runtime/toolchain and rerun.
- If you need GitHub PR actions, ensure `gh` is installed and authenticated.
- If context files become stale, run `@context-clear` and rebuild with `@context-add`.
