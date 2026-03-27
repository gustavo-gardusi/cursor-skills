---
name: context-plan
description: Interactive strategy builder. Analyzes findings and suggests next steps via Q&A.
---

# Context: Plan (Strategy Builder)

**Cursor skill:** **`@context-plan`**

An interactive, multi-phase analysis tool that builds a clear strategy from your research context.

**Recommendation**: Use a model with strong reasoning capabilities for this skill, such as `claude-sonnet-4.5`.

## Interactive Flow

1. **Analyze State**: The skill reads `.cursor/research-context.json` and `.cursor/research-queue.json`.
2. **Q&A Loop**: It will ask you a series of clarifying questions (usually 3-5 rounds) to build the strategy:
   - What is the primary exploration goal?
   - What key information have we found so far?
   - What critical pieces are still missing?
   - Should we prioritize specific URL types next?
3. **Draft Strategy**: It drafts a recommended path forward.
4. **Refine**: You can ask to refine or adjust the strategy.
5. **Output**: Once confirmed, it writes the strategy to:
   - `.cursor/research-plan.json` (structured data)
   - `.cursor/research-plan.md` (human-readable summary)

## When to use

- After a long `@context-add` exploration session.
- When you are stuck and need to synthesize what you've found.
- Before starting to code, to ensure all requirements are gathered.