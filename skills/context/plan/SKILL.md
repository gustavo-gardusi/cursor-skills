---
name: context-plan
description: >-
  Reads the summary of context (.cursor/research-context.json) and the repo
  (read-only). Crafts plans of what can be done and what to do; writes only
  .cursor/research-plan.md. Does not modify the context file or the repo.
  Re-running produces a new plan (overwrites the plan file only).
---

# Context: plan (read context + repo; write plan only)

**Goal:** **Mostly read.** Read the **summary of context** from **`.cursor/research-context.json`** (written only by **context-add**) and explore the **current repo** (read-only). From that, **craft plans**: what can be done, and what to do (concrete steps with file paths). Store the result in **`.cursor/research-plan.md`**. **Do not change the context file**—only read it. If you run again, **re-evaluate and write a new plan** (overwrite the plan file only). Does not modify the repo.

**Input (read-only):** `.cursor/research-context.json`, user task (and optionally pasted context or another path). **Repo:** read-only exploration.

**Output:** **`.cursor/research-plan.md`** only. **context-execute** will read this file to apply the plan.

---

## Context file shape (read-only)

**context-add** writes `.cursor/research-context.json`. Expect:

- **`results`** — Array of page objects: `{ url, title, text, ok, error?, links? }`. Each entry is one fetched page (from fetch.js or crawl.js).
- **`lastFetched`** — ISO 8601 timestamp (optional but recommended) indicating when context was last updated.
- Optional: **`rounds`**, **`perPage`**, **`top`**, **`totalFetched`** if the file was written by crawl.js.

Use the **summary** of the context: extract themes, requirements, APIs, constraints from `results[].title` and `results[].text`. Do not write to this file; only **context-add** may change it.

---

## Do not change the context file or the repo

**context-plan** must **never** write to or modify `.cursor/research-context.json`. Only **context-add** may change the context file. Plan only **reads** the context (and the repo) and **writes** the plan file. It does not add, edit, or delete any repo source files or config. When re-running, overwrite **`.cursor/research-plan.md`** only.

---

## On invoke

1. **Load context (read-only)** — Read **`.cursor/research-context.json`** if it exists. Summarize: themes, requirements, APIs, constraints from `results`. If the file is missing, use the user's message or provided context.
2. **Parse the task** — Deliverables, constraints, acceptance criteria, how they relate to the loaded context.
3. **Explore the repository (read-only)** — Layout, entrypoints, conventions, surface that the task and context might affect (real file paths). No edits.
4. **Consolidate** — What the context says (what can be done) and how it fits the repo (gaps, impact: context/source → repo areas/files). Conflicts or constraints.
5. **Craft the plan** — What to do: relation to repo, impact summary, and a chunked **implementation plan** with concrete file paths and actions.
6. **Write the plan only** — Save to **`.cursor/research-plan.md`** using the format below. Create `.cursor/` if needed. Summarize in chat. Do not write to the context file.

---

## Plan file format (for `.cursor/research-plan.md`)

Write markdown so **context-execute** (and humans) can parse chunks reliably. Structure:

```markdown
## Relation to repo

[One short paragraph: does the task apply to this repo; fit and what's necessary to implement.]

## Impact summary

| Source / context | Repo areas affected |
|------------------|---------------------|
| …                | …                   |

## Implementation plan

### Chunk 1: [label]
- **Run / one-off:** [command or N/A]
- **Add / change:** [what] at [file path(s)]
- **Update / wire:** [what] at [file path(s)]

### Chunk 2: [label]
...
```

- Use **real file paths** and **concrete verbs**. Optional: order of work, risks, follow-ups.
- **context-execute** will look for sections `## Relation to repo`, `## Impact summary`, `## Implementation plan` and parse `### Chunk N` blocks with the three bullet types (Run/one-off, Add/change, Update/wire).

---

## Verification

- [ ] Context loaded (read-only); task parsed; repo explored (read-only).
- [ ] Plan crafted and written to **`.cursor/research-plan.md`** only; context file and repo unchanged.
- [ ] Next: **context-execute** reads the plan and applies changes to the repo.

---

## Notes

- **Workflow:** **context-add** (only skill that changes context) → **context-plan** (reads context + repo, writes plan only) → **context-execute** (reads plan, changes repo only). Use **context-clear** to reset context and visited set before a fresh run.
