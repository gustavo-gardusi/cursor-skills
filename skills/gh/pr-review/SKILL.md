---
name: gh-pr-review
description: >-
  Fetch PR data from GitHub, compare current code with required changes.
  Consolidate each comment: what it says, how code looks now, why it's wrong
  (or wrong assumption). Address each so current code matches expectations. No
  sync, no running format/lint/test.
---

# PR review

**Responsibility:** Fetch all data from the existing PR (comments, failed checks) via `gh`. **Compare current code with what the comments require.** For each comment: consolidate into a single list entry—**what the comment says**, **how the code looks right now**, **why it’s wrong** (or that the comment may be a **wrong assumption**). Evaluate whether the comment actually needs a change; then address it so the current code matches the expected result. Does **not** sync with main/upstream (use **gh-pull**) or run format/lint/test (other skills). Does **not** create or update the PR (use **gh-pr**).

**Goal:** Compare current code with required changes and address each comment so the code is up to the expected results. **Touch only changed code**—avoid updating existing, previously working code. Stay focused on what matters for the current task. Do not run code or make it “perfect”; other skills handle that.

## On invoke

Run steps in order. Use the repo that contains the PR (current branch = PR head when possible). Focus only on: fetching PR data, comparing code to comments, consolidating the list, evaluating each comment, and proposing/applying the minimal change per comment.

---

## Step 1 — Resolve PR and base

- **PR:** From user message (PR URL or number). If URL, set `OWNER/REPO` and `NUMBER`. If only number, use current repo.
- **Base:** `git remote get-url upstream` → if present, base = `upstream/main`, else base = `main`. Used for diff/scope only (no fetch or merge).
- **Commands:** `gh pr view <PR> --json baseRefName,headRefName,number,title,body,url`

---

## Step 2 — Gather all comments from the PR

Fetch every source of comments and attach a section (General, Review, or path:line).

**2a. Top-level comments** — `gh pr view <PR> --json comments` → section **General**.

**2b. Review bodies** — `gh pr view <PR> --json reviews` → for each non-empty `body`, section **Review (by @author)**.

**2c. Inline (diff) comments** — `gh api repos/OWNER/REPO/pulls/NUMBER/comments` → each has `path`, `line` (or `original_line`), `body`, `user.login` → section **`path` (line N)**.

**2d. Pasted content / extra links** — If the user pastes logs, task text, or provides issue/task URLs, treat as additional comments or failed-check detail and add to the list.

**Output:** One list of comments: **section**, **author**, **body**. No duplicates.

---

## Step 3 — Gather failed checks (CI)

- `gh pr view <PR> --json statusCheckRollup` → filter where `conclusion` is not SUCCESS (FAILURE, ERROR, CANCELLED, etc.).
- `gh pr checks <PR>` → failed/errored rows.

**Output:** List of **failed checks**: name, conclusion, link (e.g. `detailsUrl`) if available. If the user pasted check logs or error output, attach to the relevant check.

---

## Step 4 — Scope: changed code only (PR diff)

- **Files in scope:** `git diff base...HEAD --name-only` (base from Step 1). If not in repo: `gh pr diff <PR> --name-only` or `gh pr view <PR> --json files`.
- **Prefer changed regions:** When a comment points to a file, prefer editing only the **lines or regions that the PR actually changed** (`git diff base...HEAD -U0 -- path` or inspect the diff). Avoid modifying unchanged, previously working code in the same file.
- **Rules:**
  - Only suggest or apply edits in **files that appear in the PR diff**. Do not change files that are not part of the PR.
  - Within those files, **avoid updating existing code** that the PR did not touch—limit edits to what’s needed to address the comment in the **changed** area.
  - **Major goal:** Touch changed code; avoid changes into previously working code. Focus on what matters for the current task.

---

## Step 5 — Consolidate: for each comment, compare current code with required change

Build a **single consolidated list**. For **each** comment (and each failed check that implies a code change), produce one entry with:

1. **Comment** — What the comment (or check) says. Quote or paraphrase. Author and section (e.g. `path/to/file.go L42`, General).

2. **Current code** — How the relevant code looks **right now**. Show the snippet (file, line range, or key lines). If the comment is about a specific line, show that line and nearby context.

3. **Why it’s wrong** — Short explanation of how the current code does not meet what the comment asks. If the comment might be a **wrong assumption** (e.g. outdated, or based on a misunderstanding), say so here instead of “wrong.”

4. **Needs change?** — **Evaluate:** Does this comment actually require a code change? Options: **Yes** — current code should be updated to match the comment. **No — wrong assumption** — the comment is outdated or incorrect; suggest a short reply to the reviewer instead of changing code. **No — already correct** — the code already matches; suggest a short reply that it’s done or point to the right line.

5. **Expected result** — If “Needs change? = Yes”: one minimal, concrete change so the **current code** becomes the **expected result** (the change the comment asks for). One small edit; no refactors. If “No”: suggested reply or “no change.”

**Output:** A clear list (table or bullets) so the user can go down the list and see: comment → current code → why wrong / wrong assumption → needs change? → expected result (or reply).

---

## Step 6 — Address each comment

For each entry in the consolidated list where **Needs change? = Yes**:

- **Apply** the minimal edit that brings current code to the expected result. **Only touch changed code** (files and, when possible, lines/regions in the PR diff). One comment → one focused change (or one reply when no code change).
- If **Needs change? = No** (wrong assumption or already correct): suggest a short reply to the reviewer; do not change code unless the user asks.

**Rules:**

- **Avoid updating existing code.** Limit edits to files in the PR diff and, within those files, to the areas the PR actually changed. Do not refactor or “improve” previously working code.
- Compare current code with required change; propose only what’s needed to satisfy the comment for the **current task goal**.
- Do not run format, lint, or test. Other skills handle that.
- Do not change files outside the PR diff or untouched regions for “improvement.”

---

## Step 7 — Failed checks (CI)

For each failed check from Step 3: if there are logs or pasted error output, **compare** the failure with the current code (relevant file/line). Propose the **minimal code change** that would fix the reported error **in changed code only** (file and region from the PR diff). Do not suggest edits to previously working, unchanged code. If no logs are available, state: “Open the check run for logs; then fix the reported error in <files in scope>.” Do not run the check locally; only compare and propose.

---

## Verification (self-check)

Before finishing:

- [ ] Every comment is in the consolidated list with: Comment, Current code, Why wrong / wrong assumption, Needs change?, Expected result.
- [ ] Each “Needs change? = Yes” has a concrete edit (or was applied); each “No” has a suggested reply.
- [ ] Every suggested or applied edit is in a file from the PR diff and, where possible, in changed regions only (no edits to previously working, unchanged code).
- [ ] No steps ran format, lint, or test (this skill only compares and addresses comments).

---

## Notes

- All data from `gh pr view`, `gh api`, `gh pr checks`, and `git diff`. No sync, no merge, no running format/lint/test.
- Base branch for diff/scope only: `upstream/main` or `main`.
- **Changed code only:** Avoid updating existing code. Touch only what the PR changed; do not modify previously working code. Focus on what matters for the current task.
- **Split:** Creating/updating the PR = **gh-pr**. Syncing branch and resolving conflicts = **gh-pull**. Running and fixing format/lint/test = other code skills.
