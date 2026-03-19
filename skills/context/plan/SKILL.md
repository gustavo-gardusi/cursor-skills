---
name: context-plan
description: >-
  Reads context and repo (read-only). Understands what context has to do with
  current branch and code; compares with main for minimal impact. Plans for
  research, PR review (all comments + code checks), failing tests. Writes only
  .cursor/research-plan.md. Does not modify context or repo.
---

# Context: plan (read context + repo; write plan only)

**Goal:** **Read-only.** Read **context** (from **`.cursor/research-context.json`** or the user’s message) and the **current repo** (read-only). **Understand what the context has to do with the current branch and code**: which files are in scope, how they differ from main, and what minimal changes are needed. **Compare and plan**: what can be done, and what to do (concrete steps with file paths). Write the result to **`.cursor/research-plan.md`** only. **Do not change** the context file or the repo. Use for many cases: research vs codebase, **PR review** (address all comments, review code checks), **failing tests**, or any task that benefits from “plan ahead” by comparing information with the codebase.

**Input (read-only):** `.cursor/research-context.json`, user task, pasted content (e.g. PR description, review comments, test logs). **Repo:** read-only.

**Output:** **`.cursor/research-plan.md`** only. **context-execute** reads this file to apply the plan.

---

## Relation to current branch and code

Before writing the plan, **establish scope** so the plan stays minimal and avoids high-impact changes to main:

1. **Current branch** — `git branch --show-current`. If the user is on a feature branch (e.g. for a PR), all edits in the plan should apply to **this branch**, not main.
2. **Diff vs base** — Determine base with fork-awareness:
   - Same-repo branch: **`git diff main...HEAD --name-only`**
   - Forked branch: **`git diff upstream/main...HEAD --name-only`** (when upstream/main exists)
   These files are “in scope”: the task (e.g. PR review, feature) already changed them. Prefer planning edits **only in these files** and, within them, **only in the regions that differ from base** (e.g. `git diff <base>...HEAD -- path`). This keeps the plan focused and avoids touching stable code from base.
3. **What the context applies to** — Map the context (requirements, comments, failures) to specific files and lines. If the context mentions “build_metadata_keywords”, find that in the repo and note the path; only plan changes there. Do not broaden the scope (e.g. “refactor the whole module”) unless the context explicitly requires it.
4. **Avoid impactful changes to main** — The plan must **not** instruct edits that would unnecessarily alter code that is identical to main or that is outside the diff. Prefer: add/change only what is **needed** to satisfy the context (e.g. address a comment, fix a test). No “while we’re here” refactors or style-only changes to unchanged lines.

---

## Use cases

- **Research / feature work** — Context from **context-add** (URLs, docs, tickets). Compare with repo; produce implementation plan (relation to repo, impact, chunks with file paths). Scope edits to files that need to change for the feature; compare with main so you don’t overwrite or conflict with it.
- **PR review** — User has a PR and review comments (or you fetch them via `gh pr view`, `gh api repos/.../pulls/.../comments`). **Compare current code with what each comment requires.** For each comment: what it says, how the code looks now, why it’s wrong (or wrong assumption), and the **minimal expected change** (file + line/region). **Ensure all comments are addressed** in the plan (each comment → one chunk or “Reply to reviewer: …”). **Review code checks**: run `gh pr checks <PR>` or use `statusCheckRollup`; list failed checks and, for each failure that implies a code change (e.g. lint, test), add a chunk to fix it. Plan = list of chunks (one per comment or per fix). Touch **only changed files** (`git diff base...HEAD --name-only`); within those files, prefer editing only the **lines the PR changed**. Do not refactor or “improve” unchanged code.
- **Failing tests** — User pastes test/CI logs or error output. Compare failure with the relevant code (file/line). Plan = minimal code changes to fix the reported error, in **changed or relevant code** only. If the failure is on a branch, scope to that branch’s diff vs main.
- **Lots of information** — User provides a large dump (e.g. many pages, many comments). Summarize; compare with repo; produce a prioritized plan (what to do first, with file paths and concrete steps). Keep scope minimal: only the files that must change.

---

## Context file shape (read-only)

**context-add** writes `.cursor/research-context.json`. Expect:

- **`results`** — Array of page objects: `{ url, title, text, ok, error?, links? }`. Each entry is one fetched page.
- **`lastFetched`** — ISO 8601 timestamp (optional).
- Optional: **`rounds`**, **`totalFetched`** if present (e.g. from other tools).

Use the **summary** of the context: themes, requirements, APIs, constraints from `results[].title` and `results[].text`. Only **context-add** may change this file.

---

## When the task is PR review

1. **Resolve PR and base** — PR from user (URL or number). Base: `upstream/main` if fork, else `main`. `gh pr view <PR> --json baseRefName,headRefName,number,title,body,url,comments,reviews`.
2. **Gather comments** — Top-level comments (`comments`), review bodies (`reviews`), inline comments (`gh api repos/OWNER/REPO/pulls/NUMBER/comments`). Plus any pasted content or failed-check logs. One list: section, author, body. **All comments must be addressed** in the plan (each appears as a chunk or a "Reply to reviewer" note).
3. **Code checks** — Run **`gh pr checks <PR>`** or use **`gh pr view <PR> --json statusCheckRollup`**. List all failed checks (lint, test, build). For each failure that requires a code change, include a chunk in the plan (e.g. fix lint, fix failing test). Review check logs if pasted; ensure the plan covers every fix needed so all checks can pass.
4. **Scope: changed code only** — **`git diff <base>...HEAD --name-only`**. Only plan edits in these files; within them, prefer **changed regions** (what the PR actually changed). Avoid touching previously working, unchanged code. Compare with base so edits don't unnecessarily impact code that is identical to base.
5. **Consolidate** — For each comment (and each failed check that implies a code change): **Comment** (what it says), **Current code** (snippet, file:line), **Why wrong** (or “wrong assumption”), **Needs change?** (Yes / No — wrong assumption / No — already correct), **Expected result** (minimal change or suggested reply).
6. **Plan** — Write **`.cursor/research-plan.md`** with an **Implementation plan** where each chunk is one comment or one check fix: **Add/change** or **Update/wire** at specific file path and line/region. So **context-execute** can apply each chunk. If “Needs change? = No”, note “Reply to reviewer: …” instead of a code edit. Ensure every comment and every failing check that needs a fix has a corresponding chunk.

---

## On invoke (general)

1. **Load context (read-only)** — Read `.cursor/research-context.json` if it exists; otherwise use the user’s message or pasted content. Summarize: themes, requirements, comments, errors.
2. **Parse the task** — What the user wants (implement feature, address PR review, fix failing tests, compare info with codebase).
3. **Explore the repo (read-only)** — Layout, entrypoints. **Establish scope**: current branch (`git branch --show-current`), diff vs main (`git diff main...HEAD --name-only` or `base...HEAD` for PRs). Only plan edits in scoped files and regions; avoid impacting code that is identical to main. No edits.
4. **Consolidate** — What the context says vs what the repo has; gaps; for PR review, the consolidated list (comment → current code → expected change).
5. **Craft the plan** — Relation to repo, impact summary, and **implementation plan** with concrete chunks (file paths, minimal changes). For PR review: one chunk per comment/fix.
6. **Write the plan only** — Save to **`.cursor/research-plan.md`**. Do not modify the context file or the repo.

---

## Plan file format (for `.cursor/research-plan.md`)

```markdown
## Relation to repo

[Short paragraph: does the task apply to this repo; what is necessary. Optionally: current branch, which files are in scope (diff vs main), and why edits are limited to those areas.]

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

- Use **real file paths** and **concrete verbs**. **context-execute** parses `## Relation to repo`, `## Impact summary`, `## Implementation plan` and `### Chunk N` with the three bullet types.
- For PR review, each chunk often = one comment addressed (minimal edit at file:line).

---

## Verification

- [ ] Context loaded (read-only); task parsed; repo explored (read-only).
- [ ] Plan written to **`.cursor/research-plan.md`** only; context file and repo unchanged.
- [ ] Next: **context-execute** reads the plan and applies changes.

---

## Notes

- **Workflow:** **context-add** → **context-plan** → **context-execute**. Use **context-clear** to reset. For PR review, context can be “PR comments + repo”; no need to run context-add if the user pasted the PR or you fetch it via `gh`.
- **PR review:** This skill follows the **gh-pr** flow: gather comments, compare with code, and produce a plan of minimal changes. It does not run format/lint/test or sync (use **gh-pull**, **gh-push**, etc. separately).
