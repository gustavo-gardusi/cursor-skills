---
name: context-show
description: Show the current exploration state, including queue preview and confidence level.
---

# Context: Show (Intelligence Report)

**Cursor skill:** **`@context-show`**

Displays a summary of the current research state, queue, and overall confidence.

## What it shows

1. **Queue Preview**: The top 3 recommended links from `.cursor/research-queue.json`.
2. **Visited Count**: Total unique pages visited (from global visited list).
3. **Context Summary**: A brief overview of the destination pages found so far in `.cursor/research-context.json`.
4. **Confidence Level**: A % score indicating how close you are to the exploration goal, based on the collected context.

## Next Actions

Based on the state, this skill will suggest:
- **Continue**: Run `@context-add` to keep exploring the queue.
- **Strategize**: Run `@context-plan` to evaluate findings and decide next steps.
- **Reset**: Run `@context-clear` to start fresh.