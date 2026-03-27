# Skills Quick Reference

Fast lookup for all available skills with dependencies and typical usage patterns.

---

## Public Skills

### Context Research

| Skill | Purpose | Dependencies |
|-------|---------|--------------|
| `@context-add [url]` | Smart queue manager to add/prioritize links | None |
| `@context-browse [url]` | Launch autonomous browser for real-time exploration | browser-navigator, visited-check, snapshot-save, page-path-evaluator, @context-add |
| `@context-show` | Display research state and queue | None |
| `@context-plan` | Build strategy through Q&A and Polls | None |
| `@context-execute` | Implement the drafted plan | None |
| `@context-clear` | Reset per-repo context | @context-show |

**Flow:** `@context-add <urls>` → `@context-browse` → navigate → `@context-show` → `@context-plan` → `@context-execute` → `@context-clear`

### GitHub Workflow

| Skill | Purpose | Dependencies |
|-------|---------|--------------|
| `@gh-start <ticket>` | Create a new branch, sync main, preserve work | @gh-pull |
| `@gh-reset` | Hard reset current branch to target | None |
| `@gh-pull` | Merge latest main with conflict resolution | None |
| `@gh-check` | Run format, lint, tests | None (discovers tools) |
| `@gh-push` | Verify, commit, push | @gh-check |
| `@gh-pr` | Create or update PR | @gh-push |

**Flow:** `@gh-start TIS-503` → code → `@gh-push` → `@gh-pr`

---

## Internal Skills

Not meant for direct invocation. Called by public skills.

### Context Utilities (`skills/internal/context/`)

| Skill | Purpose |
|-------|---------|
| browser-navigator | Extract page content via CDP |
| page-path-evaluator | Score pages and recommend next links |
| queue-modify | Complete queue management (add/pop/peek/reorder/clear) |
| snapshot-save | Save to global storage |
| url-patterns | URL matching rules |
| visited-check | Deduplicate URLs |

### GitHub Utilities (`skills/internal/gh/`)

No internal utilities remaining - all promoted to public skills.

---

## Dependency Graph

### Context
```
@context-browse
├── browser-navigator
├── visited-check
├── snapshot-save
├── page-path-evaluator → url-patterns
└── @context-add

@context-clear → @context-show
```

### GitHub
```
@gh-start
└── @gh-pull

@gh-pr
├── @gh-pull
└── @gh-push → @gh-check
```

---

## By Use Case

| I want to... | Use this |
|--------------|----------|
| Start new task | `@gh-start TIS-503` |
| Merge latest main | `@gh-pull` |
| Reset current branch | `@gh-reset` |
| Explore PR/docs | `@context-browse [url]` |
| Verify code | `@gh-check` |
| Commit & push | `@gh-push` |
| Create PR | `@gh-pr` |
| See research state | `@context-show` |
| Build plan | `@context-plan` |
| Clear research | `@context-clear` |

---

## Adding Skills

When creating new skills:
1. Add YAML frontmatter (name, description)
2. Mark internal with `visibility: internal`
3. Document dependencies
4. Run `./tests/run-all-tests.sh`
5. Update this reference
