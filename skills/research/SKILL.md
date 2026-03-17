---
name: research
description: >-
  Research a task against the repo: optional link crawl (depth N, X, Y),
  consolidate docs/tickets, compare impact on codebase, output implementation
  plan. Use for shallow analysis or deep multi-link research.
---

# Research

**Responsibility:** Take a **task** (ticket, spec, “add an API”, or a set of **links** to docs/tickets) and **gather data**. Optionally **crawl links** with configurable depth (N links per page, top X per round, Y rounds), **consolidate** fetched content, **compare** how it affects the current repo, and **recommend** file-level changes. Does **not** implement code—only researches and documents. Use when the user wants to understand how a task (and related links) relate to the repo and what to implement.

**Goal:** A clear **task ↔ repo** relation, **consolidated link data** (if depth crawl was used), **impact summary** (which areas/files are affected by which docs or tickets), and an **implementation plan** with file paths and concrete actions.

## Depth parameters (optional)

When the task involves **many links** (e.g. documentation, Jira tickets, specs), you can run a **depth crawl**:

- **N (per-page):** Max links to extract from each fetched page (e.g. 10).
- **X (top):** Max unique links to keep and open in the next round (e.g. 20).
- **Y (rounds):** How many rounds of “fetch → extract links → pick top X → fetch” (e.g. 2).

So: start from seed URLs → fetch each → find up to N links per page → filter to top X → fetch those → repeat Y times. Adjust N, X, Y for shallow (few links, 1 round) vs deep (many links, multiple rounds) research.

**Tooling:** This repo provides `scripts/link-fetcher/` (see **scripts/README.md** for use, Chrome/CDP, and options):

- **fetch.js** — List of URLs → open one by one in Chrome, wait for load, collect title + text → JSON. Use `--connect-chrome` to attach to the user’s current Chrome.
- **crawl.js** — Seed URLs + `--per-page N --top X --rounds Y` → depth crawl, output consolidated JSON of all fetched pages.

Invoke these when the user wants link data consolidated (e.g. “research these 5 doc links and how they affect the codebase” or “crawl this spec and related links 2 rounds”).

---

## On invoke

Treat the user message (and any pasted ticket/spec/URLs or “depth N, X, Y”) as the **task**. Run the steps in order. Use the link fetcher or crawl when the task benefits from opening many links. Produce the summary and plan as the main output.

---

## Step 1 — Parse the task and decide depth

- **Source:** User message, pasted ticket/spec, or URLs (and optional depth: N, X, Y).
- **Extract:**
  - **Deliverables** — What must exist when done.
  - **Constraints** — Tech stack, style, non-goals.
  - **Acceptance criteria** — Keep exact wording when possible.
  - **References** — Links to APIs, docs, other repos, tickets. These are **seed URLs** if you run a crawl.
- **Depth:** If the task has many links and the user wants broad coverage, set **N** (links per page), **X** (top links per round), **Y** (rounds). Default shallow: no crawl, or one round with a small list.

**Output:** Structured task summary and, if applicable, seed URL list + (N, X, Y).

---

## Step 2 — Gather link data (if needed)

If the task includes links and depth (N, X, Y) is non-trivial:

- **Option A — Flat list:** User or previous step produced a list of URLs. Use `scripts/link-fetcher/fetch.js` (with `--connect-chrome` if “use current Chrome” is desired). Input: URLs from task or from a file. Output: JSON (title, text, per URL).
- **Option B — Depth crawl:** Use `scripts/link-fetcher/crawl.js` with seed URLs and `--per-page N --top X --rounds Y`. Output: JSON of all fetched pages (title, text, links) for consolidation.

If no links or shallow research only, skip or run a single fetch pass over the given URLs.

**Output:** Path to or inline summary of **consolidated link data** (which URLs were opened, main points per URL).

---

## Step 3 — Explore the repository

Same as before: gather data about the **current repo** so you can compare it to the task and to the consolidated link data.

- **Layout:** Root files, main dirs (`src/`, `app/`, `cmd/`, `internal/`, etc.).
- **Entrypoints:** Main binary, server, CLI.
- **Conventions:** Routes, handlers, config, test layout.
- **Relevant surface:** Files/dirs that the task (and fetched docs/tickets) might affect.

Use **real file paths** and short code references.

**Output:** Short “repo map” with paths relevant to the task and to the link content.

---

## Step 4 — Consolidate and compare: links vs repo

- **Consolidate:** From the fetched link data, summarize **themes**: requirements, APIs, constraints, terminology. Group by source (URL) or by topic.
- **Compare:** For the **task goal** and for each **theme** from the links:
  - **Fit** — Does this repo match the task and the doc/ticket content?
  - **Gaps** — What exists today vs what the links say is needed?
  - **Impact** — Which **parts of the repo** (files, dirs) are affected by which docs or tickets? Map “link X says Y” → “therefore files A, B need Z”.
- **Conflicts / constraints** — Anything in the task or link content that blocks a straightforward implementation?

**Output:** Fit/gaps per chunk, and an **impact matrix**: link/source → repo areas/files affected.

---

## Step 5 — Map to repo areas and actions

For **each task chunk** (and for each impactful theme from the links):

- **Which parts of the repo** are involved (real file paths).
- **What to do** there: add file(s), extend file(s), config, tests, run a command.
- **Dependencies** between chunks; order if it matters.

Write **concrete actions** with file paths (e.g. “Add route in `internal/handler/users.go`, register in `internal/router/router.go`”).

**Output:** Action items with file path(s) and one-line description, grouped by chunk/theme if helpful.

---

## Step 6 — Final summary and implementation plan

### 6a. Relation: task ↔ repo (and links)

- **In one short paragraph:** How the task and the consolidated link content relate to the repo (fits well / fits with caveats / doesn’t fit and why).
- **Expected outcome:** What “done” looks like for this repo.

### 6b. Impact summary (if link data was used)

- **Which links/docs** mattered and **which repo areas** they affect (brief impact summary or table).

### 6c. Implementation plan (chunked, with file paths)

Same format as before:

```markdown
## Implementation plan

### Chunk 1: [label]
- **Run / one-off:** [command or N/A]
- **Add / change:** [what] at [file path(s)]
- **Update / wire:** [what] at [file path(s)]

### Chunk 2: ...
...
```

Use **real paths** and **concrete verbs**. Optional: recommended order and risks/follow-ups.

---

## Verification (self-check)

Before finishing:

- [ ] Task parsed (deliverables, constraints, chunks); depth (N, X, Y) chosen if applicable.
- [ ] If many links: fetcher/crawl used and link data consolidated.
- [ ] Repo explored; key paths listed.
- [ ] Consolidation and comparison done: links vs repo, impact mapped.
- [ ] Every chunk has at least one action with **file path(s)**.
- [ ] Final summary includes: relation (task ↔ repo, and links if used), expected outcome, impact summary (if links), implementation plan.
- [ ] No code or config modified; output is research and plan only.

---

## Notes

- **Read-only:** No edits; only research and plan.
- **Paths:** Prefer concrete file/dir paths.
- **Depth:** Adjust N, X, Y for shallow (single list, one round) vs deep (many links, multiple rounds). The scripts live in `scripts/link-fetcher/` and support `--connect-chrome` for the current Chrome.
- **Split:** Implementing the plan = normal coding. Branch from ticket = **start-task-jira** or **gh-branch**. PR = **gh-pr**.
