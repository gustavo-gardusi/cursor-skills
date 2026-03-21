---
name: gh-pr
description: >-
  Run full gh-pull then full gh-push (gh-check inside push), then PR title/body.
  After pull/push: §4 resolves PR; §5 runs gh repo view --json pullRequestTemplates (then local); if still none, Body — canonical structure in this skill. Body covers full $BASE_GIT..HEAD delta (summarize long logs).
  TL;DR-first nested bullets, list-based tradeoffs—no commit counts or review-route in body.
---

# PR

**Cursor skill:** **`@gh-pr`** — Invoked with **`@gh-pr`** in Cursor. Runs against the **git repo for the current Cursor workspace** (fork or same-origin); PR target is that repo’s **`main`** (or **`upstream/main`** as base ref when you use a fork workflow).

**Chain (fixed order):**

1. **[`@gh-pull`](../gh-pull/SKILL.md)** (`/gh-pull`) — **Full** skill: **§1 Branch** through **§6 Done** — fetch **`origin`** (and **`upstream`** if configured), merge **`@{u}`** when present, set **`ROOT_BRANCH`**, merge canonical **`main`**, **resolve conflicts**, complete merge commits. **No** `@gh-push`, **no** `@gh-check`, **no** `git push`.
2. **[`@gh-push`](../gh-push/SKILL.md)** (`/gh-push`) — **Full** skill **§1 → §3**: **§1** = **entire** **[`@gh-check`](../gh-check/SKILL.md)** (`/gh-check`) in order; **§2** docs alignment; **§3** commit if needed + `git push` / `-u`.
3. **`@gh-pr`** only — **§4** resolve open **`PR_NUM`** (or empty); **§5** **run** `gh repo view --json pullRequestTemplates` (then local, then canonical); **§6–§8** delta, write, apply.

Only after steps **1–2** succeed, touch **`gh`** for the PR. **`@gh-pr`** does **not** merge the PR on GitHub—only title/body create/edit.

After the chain above, **§4–§8** resolve **`PR_NUM`**, discover templates (**§5**: **`gh repo view`** → local files → **[Body — canonical structure](#body--canonical-structure)**), draft from the full **`$BASE_GIT..HEAD`** delta (**§6–§7**), then **`gh pr edit`** / **`gh pr create`** with a **plain** title.

**Destination (`$BASE_GIT`, PR base on GitHub):** **Fork** → **`upstream/main`**. **Same-repo** → **`main`** (or **`origin/main`** if that matches how **`@gh-pull`** merged canonical **`main`** in the **current** workspace). **`$BASE_GIT`** is the **PR base** ref; **§6** reads its tip from the worktree after **§2–§3**.

**Target:** Same repo → GitHub base **`main`**, head = current branch. Fork → GitHub base **`main`** on **UPSTREAM**, head = `FORK_OWNER:$BRANCH`. If `BRANCH` is **`main`** and **same-repo** (no `upstream`): run **`@gh-pull`** + **`@gh-push`** if you want a synced **`main`**, then **stop**—no PR to open.

## On invoke

*`@gh-pr`* — **Order is fixed:** **`@gh-pull`** → **`@gh-push`** → **`§4`** (resolve **`PR_NUM`**) → **`§5`** (template query + fallback) → **`§6–§8`**. **Never** `gh pr create` to discover duplicates—**always set `PR_NUM` or confirm empty via §4** before **`gh pr create`**. **`gh pr edit`** **overwrites** title and body with **fresh** content from **§6–§7**, but when **`PR_NUM`** is set you **must** treat the **current PR body on GitHub** as a **house-style** hint (see [Existing PR as template](#existing-pr-as-template)).

**Diff scope:** The PR narrative must reflect **everything** different between **destination** and **current `HEAD`** for this branch (merge-aware file list), **not** a subset tied to the “last PR update.”

**After §2–§3:** **§6** uses **`$BASE_GIT`** (from §0) and **`HEAD`** on disk. **`@gh-pull`** integrated **`$BASE_GIT`** into the branch; **`@gh-push`** may have added commits—both completed before PR text. **Order matters for reviewers:** draft title/body **only after** **`@gh-push`** so **local `HEAD` matches what you intend on the remote head branch** (when a push ran); the narrative is the **full** range **`$BASE_GIT..HEAD`** (commits) and merge-aware **`$BASE_GIT...HEAD`** (files)—i.e. **current branch vs destination tip**, not “since last PR edit” or “last commit only.”

**If the diff looks wrong** (empty range, story does not match **`git diff`**): re-check §0 (**fork vs same-repo**, **`$BASE_GIT`**). If the branch still needs another integration pass, run **full** **`@gh-pull`** again, then **full** **`@gh-push`**, then continue from **§4**.

**“Since last commit on destination”:** The narrative is everything on **`HEAD`** after the **current** tip of **`$BASE_GIT`**: **`$(git rev-parse "$BASE_GIT")`**; commits **`$BASE_GIT..HEAD`** (two-dot).

## Workflow

### 0. Classify fork vs same-repo and set variables

*`@gh-pr`*

- `git remote get-url upstream` → if success, **fork**: **`UPSTREAM`** = `owner/repo` from URL, **`FORK_OWNER`** from `origin` URL, **`BASE_GIT`** = **`upstream/main`**, GitHub PR **base** = **`main`** on **`$UPSTREAM`**.
- Else **same-repo**: **`BASE_GIT`** = **`main`** (or **`origin/main`** if that matches how **`@gh-pull`** merged canonical main in the **current** workspace), GitHub PR **base** = **`main`**, no **`UPSTREAM`**.

If fork intent but **`upstream`** missing → stop; suggest `git remote add upstream …`.

### 1. Branch and head ref

*`@gh-pr`*

`BRANCH=$(git branch --show-current)`.

- **Same-repo** and **`BRANCH`** is **`main`**: after steps 2–3 (pull + push), **stop**—no PR step.
- **Fork** and **`BRANCH`** is **`main`**: PR head = **`$FORK_OWNER:main`** (fork PR to upstream).
- **Feature branch same-repo:** head = **`$BRANCH`**.
- **Feature branch fork:** head = **`$FORK_OWNER:$BRANCH`**.

### 2. Hand off to **`@gh-pull`** (required)

> **Run the full Cursor skill [`@gh-pull`](../gh-pull/SKILL.md)** — invoke **`/gh-pull`** and execute it **end-to-end** (not a subset of git commands you invent).
>
> **Checklist (must all complete before §3):**
> - **§2 Fetch** — `git fetch origin`; if **`upstream`** exists, `git fetch upstream` (or at least **`main`** per that skill).
> - **§3** — Merge **`@{u}`** when the branch tracks a remote; skip only when there is no upstream.
> - **§4–§5** — Merge **`ROOT_BRANCH`** (`upstream/main` when upstream exists, else `origin/main`), including **`--ff-only` on `main`** when that skill says so.
> - **Conflicts** — Resolve under **`@gh-pull`**’s rules; commit merge results. **No** half-resolved state.
>
> If **`@gh-pull`** errors, the user aborts, or conflicts stay unresolved → **stop** **`@gh-pr`** here.

### 3. Hand off to **`@gh-push`** (required)

> **Run the full Cursor skill [`@gh-push`](../gh-push/SKILL.md)** — invoke **`/gh-push`** and execute **§1 → §2 → §3** in order.
>
> **Checklist:**
> - **§1** — Run **complete** **[`@gh-check`](../gh-check/SKILL.md)** (`/gh-check`): discover → prepare → evaluate (format/lint/test per repo). **No** `git commit` / `git push` before this finishes successfully.
> - **§2** — Refresh main docs if the tree changed; minimal edits.
> - **§3** — Commit if dirty, then push (or report up-to-date).
>
> If **`@gh-check`** or **`@gh-push`** fails → **stop** **`@gh-pr`** here.

### 4. Resolve existing open PR (before create or before drafting)

*`@gh-pr`* — **Run immediately after §3**, **before** template discovery and **before** **`git log` / `git diff`** for the body. Set **`PR_NUM`** empty, then fill:

- **Same repo:** `gh pr list --head "$BRANCH" --base main --state open --json number --jq '.[0].number // empty'`
- **Fork:** `gh pr list --repo "$UPSTREAM" --head "$FORK_OWNER:$BRANCH" --base main --state open --json number --jq '.[0].number // empty'`

**API fallback** if empty:

- Fork: `gh api "repos/$UPSTREAM/pulls?head=$FORK_OWNER:$BRANCH&state=open&per_page=5" --jq '.[0].number // empty'`
- Same-repo: `gh repo view --json nameWithOwner -q .nameWithOwner` → `gh api "repos/OWNER/REPO/pulls?head=OWNER:$BRANCH&state=open&per_page=5" --jq '.[0].number // empty'`

**If `PR_NUM` is set** — right after resolving it, **`gh pr view "$PR_NUM" --json body,title`** (fork: **`--repo "$UPSTREAM"`**). Use the returned **`body`** only for **house style**: **which themes got their own heading**, **tone**, **emoji habits**, **list depth**. **Do not** copy **facts** from that body (SHAs, stale lists, old rationale)—rebuild substance from **§6** + current `git` output. **Prefer** **§5** template (**GitHub API** or local) + **[canonical body](#body--canonical-structure)** (**TL;DR first** when template allows); migrate away from openings that only **mirror GitHub’s compare header**.

**If `PR_NUM` is empty (new PR):** still run **§5**; gaps are filled from **[Body — canonical structure](#body--canonical-structure)** when **`$PR_TEMPLATE_SOURCE`** is **`canonical`**.

### 5. Discover pull request templates (**run commands** — GitHub first, then local, then this skill)

*`@gh-pr`* — Run **after §4**, **before §6**. When you create the PR description **`.md`** file, **this section is the template pass**: **first** run **Step A** (**`gh repo view`**); only if that yields **no** usable template, **Step B** (local files); only if still none, **Step C** (**canonical** sections in **this** `SKILL.md`). **Do not** skip the **`gh`** call: **actually execute** it in the shell and **read** the JSON output.

#### Step A — Run `gh repo view` (required)

Pick the **repository where the PR will be opened** (that repo’s default branch holds the templates). **Run one** of:

- **Same-repo** (no `upstream`, PR against this repo’s `main`)  
  - `gh repo view --json pullRequestTemplates`
- **Fork** (PR base = **`main`** on **`$UPSTREAM`**)  
  - `gh repo view "$UPSTREAM" --json pullRequestTemplates`

Use the same **`owner/repo`** string as **`$UPSTREAM`** (e.g. `acme/upstream-service`). On GitHub Enterprise, set **`GH_HOST`** (or your `gh` host config) so the command hits the right server.

**Parse the output** (the printed JSON). Inspect **`pullRequestTemplates`**:

- Optional quick check: `gh repo view … --json pullRequestTemplates --jq '(.pullRequestTemplates | length)'` — must still be preceded or accompanied by reading **full** entries when length **> 0**.

**If `pullRequestTemplates` has one or more objects:**

- **`$PR_TEMPLATE_SOURCE`** = `github-api`.
- Each object from **`gh`** includes at least the template text (often a **`body`** field; some versions add **`filename`** / **`name`** — use whatever fields **`gh`** returns for markdown content).
- **One object** → **`$PR_TEMPLATE_BODY`** = that template’s markdown (**`body`** or equivalent).
- **Several** → pick **one**: (1) **`filename` / `name`** vs **branch** or change kind (`bugfix`, `feature`, …); (2) **first** in the array if still tied.
- **Scaffold** = that markdown; **fill** from **§6** and apply [Body — canonical structure](#body--canonical-structure) **substance** rules (TL;DR-first, nested lists, no commit-count noise).

**If `pullRequestTemplates` is `[]` or missing** — proceed to **Step B**.

**If `gh` errors** (auth, network) — retry once; if still failing, proceed to **Step B** and note the failure briefly for the user.

#### Step B — Local files (only when Step A returned **no** usable template)

Search the **current** clone (for templates **not** on GitHub yet or API empty):

- **`.github/PULL_REQUEST_TEMPLATE.md`**, **`.github/pull_request_template.md`**
- **`.github/PULL_REQUEST_TEMPLATE/*.md`**
- **`PULL_REQUEST_TEMPLATE.md`** (repo root), **`docs/pull_request_template.md`**

Use **`git ls-files`** + glob / `ls`. **Several** → pick by name vs branch/kind, then **`git log -1 --format=%ci -- <path>`**, then lexicographic path.

- **Found** → **`$PR_TEMPLATE_SOURCE`** = `local`; **`$PR_TEMPLATE_BODY`** = file contents.
- **Not found** → proceed to **Step C**.

#### Step C — **Canonical template in this skill** (no GitHub + no local template)

**`$PR_TEMPLATE_SOURCE`** = `canonical`; **`$PR_TEMPLATE_BODY`** = **empty**.

**Scaffold** = **[Body — canonical structure](#body--canonical-structure)** in **this `SKILL.md`** (sections **⚡ TL;DR** through **⚠️ Caveats** / **✨ Extras** as applicable). That is the **built-in** default when **`gh`** reports **no** templates and the **clone** has **no** template files.

#### Merge rules (all sources)

When **`$PR_TEMPLATE_BODY`** is **non-empty** (GitHub or local): template supplies **headings / checklists / HTML comments**; canonical rules still govern **substance**. **Prepend** **`## ⚡ TL;DR`** and **`## 📋 What changed`** (nested bullets) **above** the template body if the template has **no** short opener—**unless** the template forbids extra top sections (then **fold** into its first section). **Strip** checklist items that only **duplicate** **Files changed**; **keep** **policy** items (security, breaking changes).

When **`$PR_TEMPLATE_SOURCE`** is **`canonical`**: draft **only** from **[Body — canonical structure](#body--canonical-structure)** — no empty wrapper.

### 6. Compute PR delta

*`@gh-pr`* — Use **`$BASE_GIT`** (§0) and **`HEAD`** (after §2–§3) for every **`git log`** / **`git diff`** below. Output is for **drafting accuracy** and **[triple pass](#triple-pass-review-before-submit)**—**do not** paste **base/HEAD SHAs**, **commit counts**, or other **compare metadata** into the PR body (GitHub’s UI already shows that).

**Full-branch coverage (required):** The PR description must reflect the **entire** meaningful delta from **`$BASE_GIT`** to **`HEAD`**, not “since the last push,” not “the latest commit only,” and not a **subset** that happened to be in an older PR draft. **Inventory** every changed area, then **explain** it.

1. **Build an area checklist (internal)** from the merge-aware file list:
   - Run **`git diff --name-status "$BASE_GIT...HEAD"`**.
   - Group paths by **top-level directory / concern** (e.g. `skills/`, `scripts/`, `.github/`, `README.md`).
   - **§7** **📋 What changed** must **account for each group** that has non-trivial edits. Merge tiny tweaks under one parent bullet; for **noise-only** paths (generated fixtures, lockfiles), a **single** honest sub-bullet is enough—do **not** omit the group if reviewers care.

2. **Commits** — **`git log --oneline "$BASE_GIT..HEAD"`** (two-dot). Use this to **cluster themes** across the **whole** branch.
   - **Short history** (roughly **≤ ~12** commits, one clear theme): you may **weave** commits into narrative bullets without pasting the log.
   - **Long or multi-era history** (many commits, large merges, or obvious phases): **do not** dump the raw log. **Summarize** older phases in **1–3 tight bullets** each (what landed, why it mattered); give **slightly more detail** to the **most recent** work if it **finishes** the branch. **Never** write a description that reads as if only the tip commit exists.

3. **Optional sanity check** (messy graph or surprising empty range):
   - **`git merge-base --is-ancestor "$BASE_GIT" HEAD`** — for a typical PR, should succeed. If it fails, note in **Caveats** and still summarize from **`name-status`** + log.

4. **Pin the destination tip** (internal check only—not for the posted body):
   - **`git rev-parse "$BASE_GIT"`**, **`git log -1 --format=%s "$BASE_GIT"`**

5. **Pin `HEAD`** (internal check only):
   - **`git rev-parse --short HEAD`**, **`git log -1 --format=%s HEAD`**

**Commits (on `HEAD` since base tip, two-dot range):**

```bash
git log --oneline "$BASE_GIT..HEAD"
```

For a **chronological story** in the body (optional): **`git log --reverse --oneline "$BASE_GIT..HEAD"`**.

**Files (PR-style, merge-aware):**

```bash
git diff --name-status "$BASE_GIT...HEAD"
```

Use **three-dot** `...` for the **file list** so merges match typical PR “files changed.” Use **two-dot** `..` in **`git log`** for “commits on **`HEAD`** not contained in **`$BASE_GIT`**.” If the graph is unusual (e.g. many merges), summarize from **`name-status`** + log; call out **merge complexity** in **Caveats** if needed—**without** quoting **commit totals** in the PR text.

### 7. Write title and body — **full replace**

*`@gh-pr`* — Follow **[PR description](#pr-description)**. Cover the **entire** meaningful delta vs **`$BASE_GIT`** (per **§6**)—not “since last PR edit” or “last commit only.” **Start from** **`$PR_TEMPLATE_BODY`** when **§5** set **`$PR_TEMPLATE_SOURCE`** to `github-api` or `local`. When **`$PR_TEMPLATE_SOURCE`** is **`canonical`**, draft **only** from **[Body — canonical structure](#body--canonical-structure)** (no separate pasted template file).

**Length and tone:** For **small** PRs, stay **dense**. For **large** PRs (long **`$BASE_GIT..HEAD`** range), the body may be **longer** so nothing material is dropped: **TL;DR** can run to **~6–10** tight bullets; **📋 What changed** may use **extra top-level bullets** or **bold sub-headings** under one section—still **grouped by concern**, not a file-by-file transcript. Prioritize **why it matters** and **tradeoffs** over listing paths. Optional **ASCII** in a fenced block only when it **clarifies** structure better than prose—**do not** default to big **architecture** diagrams.

**Anti-pattern:** A **short** PR that **omits** whole themes present in **`git diff --name-status "$BASE_GIT...HEAD"`**; paragraphs that only echo **Files changed**; line-by-line file narration; repeating GitHub’s compare header; empty checklist theater.

**Before `gh pr edit` / `gh pr create`:** run the **[triple pass review](#triple-pass-review-before-submit)** on the drafted markdown **three times** (three distinct read-throughs), fixing issues each time.

### 8. Apply — `edit` or `create` (one)

- **`PR_NUM` set:** `gh pr edit "$PR_NUM"` `--title` `--body` / `--body-file` (fork: `--repo "$UPSTREAM"`).
- **Empty:** `gh pr create` with same, `--base main`, `--head` as §1 (fork: `--repo "$UPSTREAM"`).

---

## PR description

*`@gh-pr`* — **`--title`** and **`--body`**. **Replace** the previous body’s **substance** with **§6**-grounded narrative (`git log` / `git diff` vs **`$BASE_GIT`**), using **`$PR_TEMPLATE_SOURCE`** / **`$PR_TEMPLATE_BODY`** from **§5** (`github-api` / `local` = merge template + canonical rules; **`canonical`** = this skill’s **[Body — canonical structure](#body--canonical-structure)** only). **Do not** duplicate GitHub’s compare header (base branch, SHAs, **commit counts**) in markdown.

### Existing PR as template

When **`PR_NUM`** is set, the **open PR body** hints at **voice** and **grouping**:

- **Reuse from the old body (style only)**
  - Which **themes** had dedicated headings; shapes that worked (including small **tables** if that was the house style).
  - **Tone** (crisp vs narrative); **emoji** cadence in headings.
- **Do not reuse from the old body**
  - Any **facts** (paths, behavior, SHAs) without re-checking **`git`**.
  - Section order that buries the **TL;DR** or **duplicates compare metadata** — **reorder** toward **[canonical](#body--canonical-structure)**.

If the old opening **only** restates the title, **replace** with **TL;DR + nested “what changed”**. Omit sections that add no value for **this** diff.

### Data sources (for drafting — mostly invisible in the posted body)

- **File changes** — `git diff --name-status "$BASE_GIT...HEAD"` — drives **nested “what changed”** groupings; **summarize** by **area**, not per-file play-by-play.
- **Commit themes** — `git log --oneline "$BASE_GIT..HEAD"` — cluster into **themes**; do **not** paste the raw log as the description.
- **Branch / chat** — Ticket keys, **`Fixes #n`**, user goal — title prefix and **TL;DR** / **tradeoffs**.
- **Old PR body** — **Style** only when editing; never **authority** for facts.

### Information order (what reviewers see first)

**Default** (canonical; **§5** template may rename or merge):

1. **⚡ TL;DR** — **Top**: merge recommendation in a **short** block (a few **bold** lines or tight bullets). Slightly **more detail** than a one-liner is OK when it **replaces** a separate “summary” section.
2. **📋 What changed** — **Nested bullets** by **subsystem / concern** (not a table). Under each top bullet: **sub-bullets** for **substance** (behavior, API, UX)—**not** a file list mirroring the diff.
3. **⚖️ Choices & tradeoffs** — **Nested lists** (see [Body — canonical structure](#body--canonical-structure)); **not** a wide comparison table unless values are **tiny** (then a **small** table is OK).
4. **⚠️ Caveats** / **✨ Extras** — Only when they change merge judgment.

### Triple pass review (before submit)

1. **Pass 1 — TL;DR + outline**
   - **Question:** Does the **opening** state **what** shipped, **why merge**, and **main risk** without scrolling? Does **📋 What changed** cover **every major area** from **`git diff --name-status "$BASE_GIT...HEAD"`** (or explicitly bucket “chore” noise)? Is grouping by **concern**, not by **file**?
   - **If “no”:** Add missing themes; tighten TL;DR; regroup bullets; cut diff-parroting.
2. **Pass 2 — Form**
   - **Question:** **Bold** / *italic* / `` `code` `` / **nested** lists / emoji **headings**; **tables** only for **small** key–value or short matrices?
   - **If “no”:** Reflow; remove compare **metadata** and **commit counts**; fix nested code fences.
3. **Pass 3 — Accuracy**
   - **Question:** Does every claim match **`git diff`** / **`git log`**? Stale lines from the old PR body?
   - **If “no”:** Re-run **§6** commands; rewrite.

Only after **three passes** call **`gh pr edit`** / **`gh pr create`**.

### Title (**plain text only — no emoji**)

- One line; **no emoji**, no markdown headings, no leading decorative symbols.
- Summarize **the whole branch outcome** vs destination (concrete themes from paths + commits).

**Linked task / issue — evaluate before finalizing the title:**

1. **Branch name** — e.g. `tis-503-feature`, `PROJ-123-short-desc` → candidate **`TIS-503`** / **`PROJ-123`** prefix.
2. **Commit messages** — scan `git log "$BASE_GIT..HEAD"` for `Fixes #n`, `Closes #n`, `JIRA-KEY`, etc.
3. **Existing PR** (if **`PR_NUM`** set) — `gh pr view` for linked issues / project fields.
4. **User / task context** — Jira/GitHub URLs or ticket keys in the chat that apply to **this** branch.
5. **Choose:** If a key is **clear and agreed**, use **`KEY-123: Concise outcome`** or **`#78: Concise outcome`** (team convention wins). If **ambiguous or multiple** tickets, pick the **primary** one or **omit** the prefix and put the rest in the body (**TL;DR** or **Linked work** bullet).
- **Avoid** empty process titles (“Update PR”, “Sync”, “WIP”) unless that is literally the only effect.

### Body — canonical structure

**Goal:** Explain **what changed**, **why**, and **tradeoffs**—not what GitHub’s compare view already shows. **Skip** sentences that only confirm a file was touched unless you add **insight**.

**Formatting:** **bold**, *italic*, `` `backticks` ``, **nested lists**, emoji **headings**. **Tables** — use for **small** grids (e.g. **Key** | **Value**, **Option** | **One-line note**), **not** as the main vehicle for tradeoffs or the whole “what changed” story.

**1. ⚡ TL;DR (first section)**  
- **3–6 short lines** or **tight bullets** for a **small** branch; **up to ~10** when the branch spans **many commits** or **several unrelated themes**—still **scannable** (bold lead phrases, no wall of text).  
- **what** merges, **why** it matters, *italic* **risk** or **scope** if useful.  
- This can be **slightly longer** than a tweet when it **absorbs** what used to be a separate “executive summary.”

**2. 📋 What changed (nested bullets—not a table)**  
- **Top-level bullets** = **areas** (`skills/gh`, `scripts`, `.github`, …) or **themes** (auth, perf, DX)—must **map to the §6 inventory** so nothing large is “lost.”  
- **Nested bullets** = **substance**: behavior, contracts, user-visible effects.  
- **Long branches:** add a **“Earlier on this branch (summarized)”** (or similar) top-level bullet with **compressed** bullets for older phases; keep **recent** work **more specific**.  
- **Merge** tiny edits under the same parent; **do not** list every path.

Example shape:

- **Tooling** — …
  - …
  - …
- **Agent skills** — …
  - …

**3. ⚖️ Choices & tradeoffs (lists, not wide tables)**  
For **each** decision, use a **small nested block**:

- **Decision label** (e.g. “Sync link rewrite”)  
  - *Problem:* …  
  - **This PR:** …  
  - *Alternative:* …  
  - **Why here:** …  

Use a **compact table** **only** when each cell is **short** (e.g. **Flag** | **Value**).

**4. 🎁 Outcomes**  
*Optional* if **TL;DR** + **What changed** already cover value.

**5. 📎 Optional ASCII**  
*Rare.* One **fenced** block if a **small** diagram is clearer than prose—**not** a default “architecture section.”

**6. ⚠️ Caveats**  
Breaking changes, migrations, **merge-risk**—omit if none.

**7. ✨ Extras**  
*Optional.* Minor wins.

**Do not include:** **How to verify** / command checklists (**`@gh-check`** ran in **`@gh-push`**). **Do not** paste **commit counts**, **base/HEAD** tables, or a **review route** section.

**When §5 template exists:** **Map** content into the template’s headings; **keep** **TL;DR** (or equivalent) **high**; **fold** nested “what changed” into the template’s description sections if needed. **Still** satisfy **§6** full-branch coverage inside those headings.

### Format rules

- **Emoji:** in **section headings** as listed; light use in bullets is OK. **Never** in the **title**.
- **Line length:** keep table cells and prose lines **GitHub-readable** (wrap long cells).
- **Honesty:** omit empty sections; surface real risks in **Caveats**.

### Example skeleton (shape only — replace with real content)

```markdown
## ⚡ TL;DR
- **Merges** … — …
- **Risk / scope:** *…*

## 📋 What changed
- **API / services**
  - …
- **Docs & DX**
  - …
- **CI**
  - …

## ⚖️ Choices & tradeoffs
- **…**
  - *Problem:* …
  - **This PR:** …
  - *Alternative:* …
  - **Why here:** …

## ⚠️ Caveats
- …
```

---

## Notes

*`@gh-pr`*
- **Prerequisites:** `gh` CLI, `gh auth status`, repo root.
- **Fork:** `upstream` remote required.
- **Order:** **`@gh-pull`** → **`@gh-push`** (§1 = full **`@gh-check`**) → PR title/body. **Do not** substitute ad-hoc `git fetch` / `npm test` for those skills.
- **PR body:** **§4** resolves **`PR_NUM`**; **§5** must **run** `gh repo view --json pullRequestTemplates` on the **PR target** repo, then **local** paths, then **[Body — canonical structure](#body--canonical-structure)**. **§6–§7** ground the text in the **full** **`$BASE_GIT..HEAD`** delta (summarize long logs). **TL;DR** first, **nested** “what changed,” **list** tradeoffs—**no** **commit counts**, **review route**, or compare-metadata in the posted body.

### Hand off (outside **`@gh-pr`**)

> To **only** sync with **`main`** without opening/updating a PR, run **`@gh-pull`** then **`@gh-push`** alone. **`@gh-pr`** is for when you also want the **GitHub PR** updated from the **full** branch vs **destination** diff.
