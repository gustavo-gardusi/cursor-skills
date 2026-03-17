---
name: research-execute
description: >-
  Reads the implementation plan from .cursor/research-plan.md (or from the
  chat) and applies it to the repo: add, change, update files and run
  one-off commands. Mostly query from plan, change the current repo only.
  Use after research-plan is done.
---

# Research execute (query plan; change repo only)

**Goal:** **Mostly query from the plan** and **change the current repo.** Read the implementation plan from **`.cursor/research-plan.md`** (or from the user’s message). Apply it: add or change files, update/wire code, run one-off commands as specified in each chunk. **Only the repo (code/config) is modified**; do not change `.cursor/research-context.json` or `.cursor/research-plan.md`. Use after **research-plan** is done.

**Input:** Prefer **`.cursor/research-plan.md`**. If missing, use the plan the user pasted or provided in chat.

---

## Plan file structure (what to parse)

**research-plan** writes `.cursor/research-plan.md` with this structure:

- **`## Relation to repo`** — Short paragraph (informational).
- **`## Impact summary`** — Table: source/context → repo areas (informational).
- **`## Implementation plan`** — Chunked actions:
  - **`### Chunk N: [label]`** — Each chunk contains bullets:
    - **Run / one-off:** command to run (e.g. install deps) or N/A.
    - **Add / change:** what to add or change and at which file path(s).
    - **Update / wire:** what to update or wire and at which file path(s).

Parse each **`### Chunk`** and apply the three bullet types in order. Respect any explicit order or dependencies stated in the plan.

---

## Query plan; change repo only

- **Read** the plan file (or plan from chat). Parse **Relation to repo**, **Impact summary**, and **Implementation plan** chunks.
- **Apply** each chunk to the **repo**: run one-off commands, create or edit files (Add/change, Update/wire). Do **not** write back to the plan file or touch the context file.

---

## On invoke

1. **Load the plan** — Read **`.cursor/research-plan.md`** if it exists. Else use the plan from the user’s message. Parse the markdown: `## Implementation plan`, then each `### Chunk N` with Run/one-off, Add/change, Update/wire.
2. **Apply each chunk** — In order (respect dependencies if the plan specifies order):
   - **Run / one-off:** Run the command if any (e.g. install deps, generate code).
   - **Add / change:** Create or edit the listed file(s) as specified.
   - **Update / wire:** Update the listed file(s) (e.g. register routes, wire config).
3. **Verify** — After applying, run format/lint/tests if appropriate and fix any issues. Scope changes to the plan only.

---

## Scope and safety

- **Only change what the plan specifies.** Do not refactor or edit files not mentioned in the plan unless necessary to wire something (minimal changes).
- If the plan is ambiguous or a path is missing, ask the user or infer from the repo layout before editing.
- Do not modify `.cursor/` (context or plan file); only read the plan and modify the repo.

---

## Verification

- [ ] Plan loaded and chunks parsed; each chunk applied to the repo.
- [ ] No edits to `.cursor/research-context.json` or `.cursor/research-plan.md`.
- [ ] Optional: format, lint, test; branch/PR via **gh-branch**, **gh-push**, **gh-pr**.

---

## Notes

- **Workflow:** **research-append** (only changes context file) → **research-plan** (only reads context + repo, writes plan file) → **research-execute** (only reads plan, changes repo).
- **Branch/PR:** Consider **gh-branch** or **start-task-jira** before executing; after changes, **gh-push** or **gh-pr**.
