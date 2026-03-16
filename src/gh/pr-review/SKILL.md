---
name: gh-pr-review
description: >-
  Review a PR: gather all comments and failed checks via gh CLI, then address
  each comment with minimal changes scoped to the PR diff (main/upstream).
---

# PR review

Gather **all comments** (by section/file) and **failed checks** for a PR using only `gh` CLI. Then address each item with **minimal, scoped changes**—no refactors; only touch what the comment or check concerns. Scope all edits to **files changed since the base branch** (main or upstream/main).

## On invoke

Run steps in order. Use the repo that contains the PR (clone or `gh pr view` with full URL). Prefer running from the PR’s repo root.

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

**2d. Optional — Issue comments linked to PR**  
If the PR was opened from an issue, `gh api repos/OWNER/REPO/issues/NUMBER/comments` can add context. Only if user indicated an issue.

**Output to build:** A single list of “comments” where each has: **section** (General | Review (@user) | path:line), **author**, **body**. No duplicates (e.g. same body in reviews and comments); merge by section.

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

## Step 5 — Present summary (clear structure)

Produce a single review summary the user can follow line by line.

**5a. Comments by section**

- **General** — List each top-level/issue comment: author, body (short), and whether it needs a code change or a reply.
- **Review (by author)** — Same for each review body.
- **File-specific** — Group by `path`. Under each path, list comments by line (or “whole file”): author, body.  
  Example:

  ```
  path/to/file.go
    L42  @reviewer: "Use constant here"
    L99  @reviewer: "Handle nil"
  ```

**5b. Failed checks**

- One line per failed check: **Name** — conclusion/status (and link if available).  
- If there are logs or error snippets (e.g. user pasted them), add a short “Error / note” under that check.

**5c. Scope reminder**

- “Edits below are limited to files in the PR diff: …” (list or “see Step 4”).

---

## Step 6 — Address each comment (minimal, scoped)

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

## Step 7 — Address failed checks (actionable)

For each failed check:

- **Build / test failure:** From logs or `gh run view` / run URL, identify the failing test or step. Suggest the minimal code or config change in a file that is in the PR diff. If logs are not available, suggest: “Run `gh pr checks <PR>` and open the failed run for logs; fix the reported errors in <list of changed files>.”
- **Linter:** Same: minimal change in the reported file/line, scoped to the diff.
- **Other:** Summarize what failed and one concrete next step (e.g. “Re-run the job” or “Fix X in file Y”).

---

## Verification (self-check)

Before finishing:

- [ ] Every comment is listed with a section (General / path:line).
- [ ] Every failed check is listed with name and conclusion/link.
- [ ] Every suggested or applied edit is in a file from the PR diff (Step 4).
- [ ] No edits were made to files outside the diff for “improvement” or refactor.
- [ ] Each comment has exactly one response (one minimal change or one reply).

---

## Notes

- **No browser or bookmarklet.** All data comes from `gh pr view`, `gh api`, `gh pr checks`, and `git diff`.
- **Base branch:** Prefer `upstream/main` when the repo has an upstream remote; otherwise `main`.
- **Pasted content:** If the user pastes extra context (e.g. task description, logs), treat it as additional comments or check errors and fold into the same structure (by section / check).
- **Task/issue links:** If the user only provides a Jira/Linear/Notion link, you cannot call GitHub. Ask for the PR URL or the pasted text (comments, acceptance criteria, errors) and then run the steps above on that input.
