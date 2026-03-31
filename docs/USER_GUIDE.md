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

Optional cleanup before install:

```bash
./install.sh --clean
# or
./install.sh /path/to/skills-cursor --reset
```

Installed skill names are generated from the full skill path (under `skills/`) with `/` replaced by `-`.
Example: `skills/a/b/c/SKILL.md` is installed and invoked as `@a-b-c`.

## Verify installation

In Cursor chat, type `@` and confirm you can see:
- `@context-add`
- `@context-show`
- `@context-plan`
- `@context-execute`
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
@context-add -> @context-show -> @context-plan -> @context-execute
```

Context files are stored in the active repo:
- `.cursor/research-context.json`
- `.cursor/research-context.txt` (optional)
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

- Public `gh-*` skills keep detached policy/orchestration guidance.
- Runnable terminal command sets are owned by `skills/internal/gh/*`.
- `@gh-check` is verification-only in public scope.
- `@gh-main` orchestrates sync; reset/clean remains in `@gh-reset`.
- `@gh-reset` is the only reset/clean skill.
- `@gh-push` is the only publish skill.
- `@context-execute` starts in Plan mode and must switch to Agent mode before applying changes.

## Troubleshooting

- If `@gh-check` reports missing tools, install the required runtime/toolchain and rerun.
- If you need GitHub PR actions, ensure `gh` is installed and authenticated.
- If context files become stale, run `@context-clear` and rebuild with `@context-add`.
