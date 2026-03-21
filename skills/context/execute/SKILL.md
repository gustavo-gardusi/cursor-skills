---
name: context-execute
description: >-
  Reads the implementation plan from .cursor/research-plan.md (or from the
  chat) and applies it to the repo: add, change, update files and run
  one-off commands. Mostly query from plan, change the current repo only.
  Use after context-plan is done.
---

# Context: execute (query plan; change repo only)

**Cursor skill:** **`@context-execute`** — Invoked with **`@context-execute`** in Cursor. **Only** changes the **repo** (code/config) per the plan; never rewrites `.cursor/research-context.json` or `.cursor/research-plan.md`. Run **after** **`@context-plan`** (or a user-pasted plan). Git publish/PR are **not** this skill—**Hand off** to **`@gh-push`** / **`@gh-pr`** when needed.

**Where it runs:** The **current Cursor workspace** — apply the plan to **this** checkout only.

**Goal:** **Mostly query from the plan** and **change the current repo.** Read the implementation plan from **`.cursor/research-plan.md`** (or from the user's message). Apply it: add or change files, update/wire code, run one-off commands as specified in each chunk. **Only the repo (code/config) is modified**; do not change `.cursor/research-context.json` or `.cursor/research-plan.md`. Use after **`@context-plan`** is done.

**Input:** Prefer **`.cursor/research-plan.md`**. If missing, use the plan the user pasted or provided in chat.

---

## Plan file structure (what to parse)

*`@context-execute`* — Input from **`@context-plan`**.

**`@context-plan`** writes `.cursor/research-plan.md` with this structure:

- **`## Relation to repo`** — Short paragraph (informational).
- **`## Impact summary`** — Table: source/context → repo areas (informational).
- **`## Implementation plan`** — Chunked actions:
  - **`### Chunk N: [label]`** — Each chunk contains bullets:
    - **Run / one-off:** command to run (e.g. install deps) or N/A.
    - **Add / change:** what to add or change and at which file path(s).
    - **Update / wire:** what to update or wire and at which file path(s).

Parse each **`### Chunk`** and apply the three bullet types in order. Respect any explicit order or dependencies stated in the plan. If the plan is malformed (missing `### Chunk`, missing `Add / change` and `Update / wire` targets, or impossible commands), stop and ask for a corrected plan instead of inventing edits.

---

## Query plan; change repo only

*`@context-execute`*

- **Read** the plan file (or plan from chat). Parse **Relation to repo**, **Impact summary**, and **Implementation plan** chunks.
- **Apply** each chunk to the **repo**: run one-off commands, create or edit files (Add/change, Update/wire). Do **not** write back to the plan file or touch the context file.

---

## On invoke

*`@context-execute`*

1. **Load the plan** — Read **`.cursor/research-plan.md`** if it exists. Else use the plan from the user's message. Parse the markdown: `## Implementation plan`, then each `### Chunk N` with Run/one-off, Add/change, Update/wire.
2. **Apply each chunk** — In order (respect dependencies if the plan specifies order):
   - **Run / one-off:** Run the command if any (e.g. install deps, generate code).
   - **Add / change:** Create or edit the listed file(s) as specified.
   - **Update / wire:** Update the listed file(s) (e.g. register routes, wire config).
3. **Verify** — After applying, run the full **[`@gh-check`](../../gh/check/SKILL.md)** skill (or **`@gh-push`** if the user is ready to commit and publish). Do **not** invent ad-hoc `npm test` / `cargo test` one-offs unless the plan names a specific command. Scope changes to the plan only.

---

## Scope and safety

*`@context-execute`*

- **Only change what the plan specifies.** Do not refactor or edit files not mentioned in the plan unless necessary to wire something (minimal changes).
- If the plan is ambiguous or a path is missing, ask the user or infer from the repo layout before editing.
- Do not modify `.cursor/` (context or plan file); only read the plan and modify the repo.

---

## Verification

*`@context-execute`*

- [ ] Plan loaded and chunks parsed; each chunk applied to the repo.
- [ ] No edits to `.cursor/research-context.json` or `.cursor/research-plan.md`.

---

## Notes

*`@context-execute`*
- **Workflow:** **`@context-add`** → **`@context-plan`** → **`@context-execute`**.

### Hand off (not part of `@context-execute`)

> **`@gh-start`** — New branch from a task; it runs **`@gh-main`** first, then creates the branch—do **not** run **`@gh-main`** separately before **`@gh-start`**. (External **`start-task-jira`** skill may overlap; avoid double **`@gh-main`**.)  
> **`@gh-check`** — Run the **full** skill **[`@gh-check`](../../gh/check/SKILL.md)** (map deps → install → format → lint e.g. Clippy/Ruff/Flake8 → test).  
> **`@gh-push`** — Commit + publish; run the **full** skill (verify-before-push is defined there only).  
> **`@gh-pr`** — Runs **`@gh-pull`** (merge **`main`**, conflicts), then **`@gh-push`** (**`@gh-check`** inside), then opens or updates PR metadata from the **full** diff vs destination.
