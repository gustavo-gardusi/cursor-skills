# Cursor Skills

Markdown-only Cursor skills for GitHub delivery workflow and optional context-driven planning.

Use skills in Cursor chat as `@skill-name` or `/skill-name`.

## Installation

This repo intentionally avoids Node/script tooling. Install with the single shell script:

```bash
./install.sh
```

Optional custom target:

```bash
./install.sh /path/to/custom/skills-cursor
```

By default, skills are installed to `~/.cursor/skills-cursor`.

## Repository layout

- `skills/` - public and internal skill markdown files
- `docs/` - documentation for architecture, usage, and references
- `install.sh` - only installer entrypoint

## Public skills

### Context

- `@context-add` - add sources and organize `.cursor/research-context.json`
- `@context-show` - review current context state
- `@context-plan` - craft `.cursor/research-plan.md` from context + repo
- `@context-execute` - execute plan (Plan mode confirmation, then Agent mode execution)
- `@context-clear` - reset context artifacts for the current workspace

### GitHub workflow

- `@gh-start` - start new task branch from canonical `main`
- `@gh-main` - align local `main` with canonical remote
- `@gh-pull` - sync current branch with tracking and canonical `main`
- `@gh-check` - test overall (verify stack/tooling/build/lint/test)
- `@gh-push` - publish branch after successful `@gh-check`
- `@gh-pr` - create/update PR after `@gh-pull` + `@gh-push`

## Canonical Skill DAGs

Legend:
- User interactions are top nodes.
- Orchestrator skills are in the middle.
- Leaf/internal skills are at the bottom.

### GH flow

```mermaid
flowchart TD
    startNewTask[Start New Task] --> ghStart[@gh-start]
    ghStart --> ghMain[@gh-main]

    createPr[Create PR] --> ghPr[@gh-pr]
    ghPr --> ghPull[@gh-pull]
    ghPr --> ghPushFromPr[@gh-push]
    ghPushFromPr --> ghCheckFromPr[@gh-check]

    publishBranch[Publish Branch] --> ghPush[@gh-push]
    ghPush --> ghCheck[@gh-check]

    syncBranch[Sync Branch] --> ghPullOnly[@gh-pull]

    testOverall[Test Overall] --> ghCheckOnly[@gh-check]
```

### Context flow

```mermaid
flowchart TD
    resetContext[Reset Context] --> contextClear[@context-clear]

    addSources[Add Sources] --> contextAdd[@context-add]
    contextAdd --> contextData[.cursor/research-context.json]

    reviewContext[Review Context] --> contextShow[@context-show]
    contextShow --> contextData

    iterateContext[Iterate] --> contextAdd
    iterateContext --> contextShow

    craftPlan[Craft Plan] --> contextPlan[@context-plan]
    contextPlan --> contextDataPlan[.cursor/research-context.json]
    contextPlan --> planFile[.cursor/research-plan.md]

    executePlan[Execute Plan] --> contextExecute[@context-execute]
```

### Bridge flow (recommended sequence)

```mermaid
flowchart TD
    startBranch[Start New Task] --> ghStartBridge[@gh-start]
    ghStartBridge --> contextDecision[Need Context Organization]
    contextDecision -->|No| ghPrDirect[@gh-pr]
    contextDecision -->|Yes| contextPlanBridge[@context-plan]
    contextPlanBridge --> contextExecuteBridge[@context-execute]
    contextExecuteBridge --> ghPrBridge[@gh-pr]
```

## When to use Context

Use Context flow when:
- you need multi-source research organization (tickets, PRs, docs, Slack, run logs),
- you want persistent artifacts (`.cursor/research-context.json`, `.cursor/research-plan.md`),
- or you need iterative planning before implementation.

Skip Context flow when:
- native planning in chat is enough,
- there is little or no external data to organize,
- and a direct GH delivery path is faster.

## Context storage model

Context is local to each repository under `.cursor/`:
- `.cursor/research-context.json`
- `.cursor/research-context.txt` (optional readable export)
- `.cursor/research-plan.md`

## More docs

- [Skills reference](skills/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [User guide](docs/USER_GUIDE.md)
- [Quick reference](docs/REFERENCE.md)
- [Testing notes](docs/TESTING.md)