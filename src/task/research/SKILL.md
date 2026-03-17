---
name: task-research
description: >-
  Research a given task against the current repo: gather task data, compare repo
  fit, summarize expected outcomes and recommend file-level changes. Use when
  analyzing a task (e.g. add an API, new feature) to see what the repo needs
  and what to implement where. Read-only; produces an implementation plan.
---

# Task research

**Responsibility:** Take a **provided task** (e.g. ticket, spec, “add an API”) and **gather as much data as possible** from it. **Compare** whether the current repo matches the task’s goal. **Summarize** what is expected to achieve and **recommend** which changes to make across the project, with **file paths and concrete actions**. Does **not** implement code—only researches and documents. Use when the user wants to understand how a task relates to the repo and what would need to be implemented (e.g. “add an API” → does it fit here? which parts change? what to do at which files?).

**Goal:** End with a clear **relation task ↔ repo** and an **implementation plan** in chunks: “run X”, “do Y at files ABC”, “update Z at files DEF”.

## On invoke

Treat the user message (and any pasted ticket/spec/URL) as the **task**. Run the steps in order. Explore the repo; do not apply edits. Produce the summary and plan as the main output.

---

## Step 1 — Parse and chunk the provided task

Extract everything useful from the task. Attach or quote the raw text when needed.

- **Source:** User message, pasted ticket/spec, or content from any provided URL (fetch if needed).
- **Extract:**
  - **Deliverables** — What must exist when done (e.g. “new REST endpoint”, “new table”, “CLI flag”).
  - **Constraints** — Tech stack, style, non-goals, “must not” / “should”.
  - **Acceptance criteria / requirements** — Bullet or numbered items; keep exact wording for traceability.
  - **References** — Links to APIs, docs, other repos, tickets.
- **Chunk the task** — Split into **discrete sub-tasks** (e.g. “1. Add API route”, “2. Add persistence”, “3. Add tests”). Each chunk will later map to repo areas and file-level actions.

**Output:** Structured task summary: deliverables, constraints, acceptance criteria, and a numbered list of **task chunks** with short labels.

---

## Step 2 — Explore the repository

Gather data about the **current repo** so you can compare it to the task.

- **Layout:** Root files (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc.), main dirs (`src/`, `app/`, `cmd/`, `internal/`, `api/`, etc.).
- **Entrypoints:** Main binary, server, CLI, or app entry (e.g. `main.go`, `src/index.ts`, `cmd/server/main.go`).
- **Conventions:** How routes/APIs are defined, where handlers live, how config/env is used, test layout.
- **Existing surface** relevant to the task: e.g. for “add an API”—existing routes, middleware, request/response types, existing similar features.
- **Config / env:** How the app is configured; where new config would go.

Use **file paths** and short **code references** (e.g. “routes in `src/routes/index.ts`”, “handlers in `internal/handler/`”). Prefer listing real paths over generic descriptions.

**Output:** Short “repo map”: structure, entrypoints, conventions, and **paths** of files/dirs that are relevant to the task chunks.

---

## Step 3 — Compare task vs repo (fit and gaps)

For the **task goal** and each **task chunk**:

- **Fit** — Does this repo’s purpose and structure **match** the task? (e.g. “Add an API” in a backend API repo = fits; in a static site repo = may need justification or a different place.)
- **Gaps** — What exists today vs what the task requires? List missing pieces (new routes, new packages, new tables, new config).
- **Conflicts / constraints** — Anything in the task or repo that blocks a straightforward implementation? (e.g. “no new deps”, “must use existing auth”).

**Output:** For each chunk (and overall): **Fits / Partial / Doesn’t fit**; list **gaps** and **constraints** in one place.

---

## Step 4 — Map each task chunk to repo areas and actions

For **each task chunk**, identify:

- **Which parts of the repo** are involved (directories, files). Use **real file paths**.
- **What to do** there: add new file(s), extend existing file(s), add config, add tests, run a command (e.g. migration, codegen).
- **Dependencies between chunks** — e.g. “Add API” depends on “Add persistence”; order the list if it matters.

Write this as **concrete actions** with file paths, for example:

- “Add new route and handler in `internal/handler/users.go` and register in `internal/router/router.go`.”
- “Add new table migration in `migrations/YYYYMMDD_add_foo.sql` and run `make migrate`.”
- “Add integration test in `tests/api/test_foo.py` calling the new endpoint.”
- “Add env var `FOO_URL` in `config/config.go` and document in `README.md`.”

**Output:** A list of **action items**, each with **file path(s)** and a one-line description. Group by task chunk if helpful.

---

## Step 5 — Final summary and implementation plan

Produce a single summary the user can use to implement the task.

### 5a. Relation: task ↔ repo

- **In one short paragraph:** How the task relates to the current repo (fits well / fits with caveats / doesn’t fit and why).
- **Expected outcome:** What “done” looks like for this repo (e.g. “New endpoint `GET /api/foo` in this service, covered by tests and docs.”).

### 5b. Implementation plan (chunked, with file paths)

Format so it’s easy to follow. Prefer structure like:

```markdown
## Implementation plan

### Chunk 1: [label from task]
- **Run / one-off:** [command or “N/A”]
- **Add / change:** [what] at [file path(s)]
- **Update / wire:** [what] at [file path(s)]

### Chunk 2: [label from task]
- **Run / one-off:** ...
- **Add / change:** ... at ...
- **Update / wire:** ... at ...

### Chunk 3: ...
...
```

Use **real paths** and **concrete verbs** (add, update, run, register, extend). If a chunk only needs one kind of action, still list the path(s).

### 5c. Optional: order and risks

- **Recommended order** of chunks (if dependencies matter).
- **Risks or follow-ups** (e.g. “needs new dependency approval”, “coordinate with service X”).

---

## Verification (self-check)

Before finishing:

- [ ] Task is parsed into deliverables, constraints, and chunks; chunks are labeled.
- [ ] Repo is explored and key paths (entrypoints, routes, config, tests) are listed.
- [ ] Fit/gaps are stated for the task (and per chunk if useful).
- [ ] Every chunk has at least one action with **file path(s)**.
- [ ] Final summary includes: relation (task ↔ repo), expected outcome, and implementation plan in the chunked format (run X; do Y at files ABC; update Z at files DEF).
- [ ] No code or config was modified; output is research and plan only.

---

## Notes

- **Read-only:** This skill does not edit code, add files, or run build/test. It only gathers data and writes the summary and plan.
- **Paths:** Always prefer concrete file/dir paths (e.g. `src/api/routes.ts`, `internal/handler/foo.go`) over vague “the API layer” or “the frontend.”
- **Task source:** If the user pastes a Jira/Linear ticket, a spec, or a link, use that as the task; if they only say “add an API for X”, treat that as the task and infer deliverables and chunks.
- **Split:** Implementing the plan = normal coding or other skills. Starting a branch from a ticket = **start-task-jira** or **gh-branch**. Creating/updating a PR = **gh-pr**.
