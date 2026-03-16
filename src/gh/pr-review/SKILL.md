---
name: gh-pr-review
description: >-
  Review an existing PR: get the most data from the PR and any extra links,
  then fix every situation (comments, checks, local standards) until done.
---

# PR review

**Responsibility:** Get the **most data possible** from the existing PR and any additional links (task, issue, pasted logs). Then **keep trying until every situation is fixed**: all comments addressed, all CI and local checks passing. Does **not** create or update the PR (use **gh-pr**) or merge main/upstream (use **gh-pull**).

Gather all comments (by section/file), failed checks, and run local standards (format, lint, test). Address each item with minimal, scoped changes. Scope edits to **files in the PR diff** (main or upstream/main). **Iterate:** after applying fixes, re-run local standards and re-check; repeat until all pass or no further progress.

## On invoke

Run steps in order. Use the repo that contains the PR (clone or `gh pr view` with full URL). Prefer running from the PR’s repo root. **Additional links:** If the user provides task/issue URLs or pasted content, treat as extra context—fold into comments or check errors and include in the summary.

---

## Step 1 — Resolve PR and base branch

- **PR:** From user message (e.g. PR URL or number). If only a number, use current repo. If URL, e.g. `https://github.com/OWNER/REPO/pull/N`, set `OWNER/REPO` and `N`.
- **Base:** If repo has upstream: base = `upstream/main`, else `main`. Same base used later for diff and scope.
- **Commands:**  
  `git remote get-url upstream` (if present).  
  `gh pr view <PR number or URL> --json baseRefName,headRefName,number,title,body,url`

---

## Step 2 — Gather all comments (by section)

Fetch every source of comments so each can be tied to a section (file/path or “general”).

**2a. Top-level PR comments (Conversation tab)**  
`gh pr view <PR> --json comments -q '.comments[] | "\(.author.login): \(.body)"'`  
Or full JSON: `gh pr view <PR> --json comments`  
→ Section: **General** (or “PR conversation”).

**2b. Review summaries (e.g. “Request changes”, “Approve”)**  
`gh pr view <PR> --json reviews`  
→ For each review with a non-empty `body`, section: **Review (by <author>)**.

**2c. Inline / review comments (on diff)**  
`gh api repos/OWNER/REPO/pulls/NUMBER/comments` (or `gh api "repos/{owner}/{repo}/pulls/{pull_number}/comments"` with owner/repo from PR)  
→ Each has `path`, `line` (or `original_line`), `body`, `user.login`. Section: **`path` (line N)**.  
If the list is long, use `--paginate` or multiple pages.

**2d. Additional links and pasted content**  
- **Issue/task links:** If user provides Jira, Linear, Notion, or GitHub issue URLs, fetch or ask for the content (acceptance criteria, comments, errors) and add to the comment/context list.  
- **Pasted content:** Any pasted logs, error output, or task text = additional comments or failed-check detail. Fold into the same structure (by section or check).  
- **Issue comments (GitHub):** If PR is linked to an issue, `gh api repos/OWNER/REPO/issues/NUMBER/comments` can add context.

**Output to build:** A single list of “comments” where each has: **section** (General | Review (@user) | path:line), **author**, **body**. No duplicates; merge by section.

---

## Step 3 — Gather failed checks

**3a. Status check rollup**  
`gh pr view <PR> --json statusCheckRollup -q '.statusCheckRollup[]? | select(.conclusion != "SUCCESS" and .conclusion != null) | "\(.name): \(.conclusion)"'`  
Or full JSON and filter: any `conclusion` in FAILURE, ERROR, CANCELLED, TIMED_OUT, etc. (treat anything other than SUCCESS and null as “failed” for reporting).

**3b. Checks run list**  
`gh pr checks <PR>`  
→ Parse output for failed / errored rows; include check name and, if shown, link or details.

**Output:** List of **failed checks**: name, conclusion/status, and link if available (e.g. from `detailsUrl` in statusCheckRollup).

---

## Step 4 — List files in scope (PR diff only)

Only suggest or apply edits in files that actually changed in the PR. Do not change unrelated files.

- **Command:**  
  `git diff base...HEAD --name-only`  
  with `base` = `upstream/main` or `main` (from Step 1).  
  If not in the repo: `gh pr diff <PR> --name-only` (or infer from `gh pr view <PR> --json files`).

- **Scope rule:** Every fix or suggestion must reference only these files (or “no code change” for general/process comments). Do not add refactors or “improve” existing structures outside this set.

---

## Step 5 — Run local standards (format, lint, test)

From the PR’s repo root (current branch = PR head), run the project’s usual toolchain so the **newest changes** pass format, lint, and test. Prefer what CI uses (e.g. `.github/workflows/*.yml`); otherwise infer from project files.

**Detect and run:**

- **Rust** — `cargo fmt --check` (or `cargo fmt` then report changes); `cargo clippy`; `cargo test`. Fix fmt with `cargo fmt`; fix clippy/test in scope.
- **Go** — `gofmt -l .` or `go fmt ./...`; `go vet ./...`; `go test ./...`.
- **JS/TS (npm/pnpm/yarn)** — `npm run format` or `npx prettier --check .`; `npm run lint` or `npx eslint .`; `npm test` (or `npm run test`).
- **Python** — `ruff format --check .` or `black --check .`; `ruff check .` or `pylint`; `pytest`.
- **Makefile** — If present, try `make format` (or `make fmt`), `make lint`, `make test`.

Run **format** first, then **lint**, then **test**. Capture stdout/stderr for any failure.

**Output:** For each of format / lint / test: **OK** or **FAILED** with the relevant log excerpt (file, line, or error message). Treat failures like failed checks: list them in the summary (Step 6) and address in Steps 8–9 (minimal fix in a file from the PR diff).

---

## Step 6 — Present summary (clear structure)

Produce a single review summary the user can follow line by line.

**6a. Local standards (Step 5)**

- **Format** — OK or list issues (and which files).
- **Lint** — OK or list issues (e.g. clippy, eslint, ruff).
- **Test** — OK or list failing tests / errors.

**6b. Comments by section**

- **General** — List each top-level/issue comment: author, body (short), and whether it needs a code change or a reply.
- **Review (by author)** — Same for each review body.
- **File-specific** — Group by `path`. Under each path, list comments by line (or “whole file”): author, body.  
  Example:

  ```
  path/to/file.go
    L42  @reviewer: "Use constant here"
    L99  @reviewer: "Handle nil"
  ```

**6c. Failed checks (CI)**

- One line per failed check: **Name** — conclusion/status (and link if available).  
- If there are logs or error snippets (e.g. user pasted them), add a short “Error / note” under that check.

**6d. Scope reminder**

- “Edits below are limited to files in the PR diff: …” (list or “see Step 4”).

---

## Step 7 — Address each comment (minimal, scoped)

For **each** comment (and each failed check that implies a code fix):

1. **Identify** — Section (General / path:line) and the exact request.
2. **Locate** — If it’s about code, the file and line (or region) in the **PR diff**. If the file is not in the diff list from Step 4, do **not** suggest a code change (only a reply or doc change if appropriate).
3. **Propose** — One small, concrete change: the minimal edit that satisfies the comment. Preserve existing structure; avoid renaming or refactoring unrelated code.
4. **Apply** — If the user wants edits in the repo, make only that edit (or a short sequence of minimal edits). If the comment is non-blocking or question-only, suggest a short reply instead.

**Rules:**

- One comment → one focused response (one change or one reply).
- Prefer the smallest edit (e.g. fix the line, add the null check, use the constant). Do not rewrite the whole function or file unless the comment explicitly asks for it.
- Do not change formatting, naming, or structure in files that are not part of the PR diff or not required by the comment/check.

---

## Step 8 — Address failed checks (CI) and local standards

**CI failed checks (from Step 3):**

For each failed check:

- **Build / test failure:** From logs or `gh run view` / run URL, identify the failing test or step. Suggest the minimal code or config change in a file that is in the PR diff. If logs are not available, suggest: “Run `gh pr checks <PR>` and open the failed run for logs; fix the reported errors in <list of changed files>.”
- **Linter:** Same: minimal change in the reported file/line, scoped to the diff.
- **Other:** Summarize what failed and one concrete next step (e.g. “Re-run the job” or “Fix X in file Y”).

**Local standards (from Step 5):**

- **Format failed:** Apply the project’s formatter (e.g. `cargo fmt`, `go fmt`, `prettier --write`) only to files in the PR diff; re-run format to confirm.
- **Lint failed:** Fix the reported issues (e.g. clippy, eslint, ruff) in the reported file/line; keep changes minimal and in scope.
- **Test failed:** Fix the failing test or code under test in a file from the PR diff; re-run tests to confirm.

---

## Step 9 — Iterate until every situation is fixed

After applying fixes (Steps 7–8), **re-run** local standards (format, lint, test) and, if possible, re-check CI status. If anything still fails or any comment is left unaddressed:

- Fix the next failure or comment (minimal, scoped).
- Commit and push if working in the repo (so CI can re-run).
- Re-run local format/lint/test.
- **Repeat** until (a) all comments addressed, all local checks and CI pass, or (b) no further progress can be made (then report what remains).

Goal: **perfect current situation** for the PR—all feedback resolved, all checks green.

---

## Step 10 — Verification (self-check)

Before finishing:

- [ ] Local standards (format, lint, test) were run and results are in the summary (Step 5 → 6a).
- [ ] Every comment is listed with a section (General / path:line).
- [ ] Every failed check (CI and local) is listed with name and conclusion/link or log.
- [ ] Every suggested or applied edit is in a file from the PR diff (Step 4).
- [ ] No edits were made to files outside the diff for “improvement” or refactor.
- [ ] Each comment has exactly one response (one minimal change or one reply).
- [ ] Local format/lint/test re-run after fixes (if any) and pass.
- [ ] Iteration (Step 9): repeated until all pass or no further progress.

---

## Notes

- **No browser or bookmarklet.** All data comes from `gh pr view`, `gh api`, `gh pr checks`, and `git diff`.
- **Base branch:** Prefer `upstream/main` when the repo has an upstream remote; otherwise `main`.
- **Pasted content:** If the user pastes extra context (e.g. task description, logs), treat it as additional comments or check errors and fold into the same structure (by section / check).
- **Task/issue links:** If the user only provides a Jira/Linear/Notion link, ask for the PR URL or pasted text (comments, acceptance criteria, errors); then run the steps above and fold that content into the summary. **Get the most data:** always use PR URL + any extra links or paste the user gives.
- **Split:** For creating/updating the PR (ensure project works, then open/update), use **gh-pr**. For syncing branch with main/upstream and resolving conflicts until tests pass, use **gh-pull**.
