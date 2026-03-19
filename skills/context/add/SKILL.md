---
name: context-add
description: >-
  Fetch pages from URLs (read-only; no interaction). Store results in
  .cursor/research-context.json and a readable .cursor/research-context.txt.
  Validate each result against expected content per URL type; prompt user to
  adjust page and retry or skip until success. Only this skill may change the
  context files. Does not modify the repo.
---

# Context: add

**Goal:** Fetch from a **flat list of URLs** using **fetch.js** with **Chrome already open**. The script **only loads each URL and extracts content** (title, text, links). It does **not** click, type, or interact with the page. Store results in **`.cursor/research-context.json`** (for reuse between skills) and **`.cursor/research-context.txt`** (readable, with spacing between pages for review). Always use **`--links --links-limit 15`** so each result includes **`links.best`**. After fetch, **evaluate** each result against expected content for that URL type; if something is missing, **prompt the user** to adjust the page (e.g. open the right view, wait for load) and **retry** until the response matches expectations or the user says **skip**. Only this skill may change the context files. Does not modify the repo.

**Prerequisite:** Chrome must be running with the shared profile and remote debugging. If not, run **@browser-open** first.

**Output:**
- **`.cursor/research-context.json`** — Canonical store: `{ results: [ { url, title, text, ok?, links?: { best } } ], lastFetched }`. Other skills (context-plan, context-show) read this.
- **`.cursor/research-context.txt`** — Human-readable: one block per page with URL, title, text, and LINKS, separated by spacing for easier review. Generate after each fetch with `node {{base:scripts/context}}/write-readable.js` (or equivalent from repo path).

---

## Read-only restriction

**fetch.js only loads pages.** It navigates to each URL, waits for load, then extracts title, body text, and links. It does **not** click buttons, fill forms, or trigger navigation. Use this for **getting** page content only. If a site requires interaction to show content (e.g. “Open in browser”), the **user** does that in Chrome; then you run fetch on the resulting URL.

---

## Using the browser (already open)

fetch.js attaches to the existing Chrome via **`--connect-chrome`** (default localhost:9222). It does **not** launch or close Chrome. The same profile used by **@browser-open** is shared across all projects; only **`.cursor/`** (context, visited, failed, plan) is repo-specific.

---

## Script: fetch.js

Script path: **`{{base:scripts/url}}`** (replaced at install with the actual repo path).

- **fetch.js** — Flat list of URLs. Attaches to Chrome, **loads** each page (no interaction), extracts title, text, and **links**. **Retries** each URL on non-OK response (default 3 retries, 2s apart). **Always** use **`--links --links-limit 15`** so each result includes **`links.best`**.

**Always use:** **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, and **`--links --links-limit 15`**.

---

## Expected content per URL type

Use these labels to **evaluate** whether a fetched result contains what we expect. If the result’s **text** (and optionally title) does not contain enough of these, consider the page incomplete and prompt the user to adjust and retry.

| URL type | Expected in result (at least 1–2 of these) |
|----------|---------------------------------------------|
| **GitHub PR** | "Conversation", "Description", "pull", "merge", "commits", "Files changed", "review" |
| **GitHub Actions run** | "Run", "job", "Summary", "succeeded", "failed", "workflow" |
| **Jira task** | "Key details", "Description", "Assignee", "browse", "TIS-", "Acceptance" |
| **Slack channel** | "Messages", "View thread", message bodies, user/display names, "Slack" in title |

If the page is a **Slack** URL and the result has empty or very short text, or "Execution context was destroyed", the page may have navigated or not finished loading. Use a **longer wait** (e.g. **`--wait-after-load 5000`**) and ask the user to **open the channel/thread in the browser first**, wait until messages are visible, then say "ready" so you run fetch.

---

## Validation and retry loop (in the skill)

After each fetch run:

1. **For each result** in `results`, infer the URL type (GitHub PR, Actions, Jira, Slack, other) from the URL.
2. **Check** that the result’s `text` (and title if useful) contains at least one or two of the **expected content** labels for that type (see table above). If the result has `ok: false` or `error`, treat it as failed.
3. **If a result does not match** (e.g. Slack page with no messages, or PR with no "Conversation"):
   - Tell the user: *"The page at [URL] didn’t contain the expected content for a [type] page (e.g. missing: [labels]). Please open the correct view in the browser (e.g. for Slack, open the thread and wait for messages to load; for a PR, ensure the Conversation tab is visible), then reply **retry** when ready, or **skip** to skip this URL."*
   - **Wait for the user** to reply **retry** or **skip**.
   - If **retry**: run fetch again for that URL only (or for all failed URLs), with a **longer `--wait-after-load`** for Slack (e.g. 5000 ms). Re-evaluate. Repeat until the result passes or the user says **skip**.
   - If **skip**: leave that result as-is and continue.
4. After all results pass or are skipped, **write the readable .txt** (run write-readable.js or generate `.cursor/research-context.txt` from the JSON with spacing between blocks). Summarize and list **links.best** per page.

**Slack-specific:** For Slack URLs, before the first fetch you can say: *"For Slack, please open the channel or thread in your browser and wait until the messages are visible. If you see an 'Open in browser' link, use it. When the page is ready, tell me and I’ll fetch."* When the user confirms, run fetch with **`--wait-after-load 5000`** so the SPA has time to render.

---

## Common usages (VTEX search team)

| What to add | URL | Notes |
|-------------|-----|------|
| **PR** | `https://github.com/vtex/intelligent-search-indexer/pull/NUMBER` | Expect: description, Conversation, files changed. |
| **GitHub Actions run** | `https://github.com/vtex/.../actions/runs/RUN_ID` or `/job/JOB_ID` | Expect: run summary, job list. |
| **Jira task** | `https://vtex-dev.atlassian.net/browse/TIS-XXX` | Expect: Key details, Description. |
| **Slack channel/thread** | Browser URL from address bar | User opens in browser first; use `--wait-after-load 5000`; expect messages or "View thread". |

---

## Commands (from workspace root)

`mkdir -p .cursor`. Run with **`--connect-chrome`** (Chrome must already be open via **@browser-open**).

**Fetch (multiple URLs, with links; read-only):**
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --links --links-limit 15 --wait-after-load 3000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] URL1 URL2
```

**For Slack URLs** use a longer wait:
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --links --links-limit 15 --wait-after-load 5000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] SLACK_URL
```

**After fetch, write readable .txt:**
```bash
node {{base:scripts/context}}/write-readable.js
```
(Or from repo: `node scripts/context/write-readable.js` with CURSOR_ROOT set to workspace root.)

---

## On invoke

1. Ensure Chrome is open with the shared profile (if not, direct the user to **@browser-open**).
2. **Normalize URLs:** GitHub (repo, PR, Actions) — use as-is. Jira — browser URL (atlassian.net). Slack — **browser URL only**; if the user has an app link, ask them to open Slack in the browser and copy the URL. For Slack, tell the user to open the channel/thread and wait for messages to load, then say when ready.
3. Run **fetch.js** with **`--connect-chrome`**, **`--links --links-limit 15`**, **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, **`--retries 3`**. Use **`--wait-after-load 5000`** for Slack URLs.
4. **Validate** each result against the expected content for its URL type. For any result that does not match, **prompt the user**: adjust the page (e.g. open thread, wait for load), then reply **retry** or **skip**. If **retry**, run fetch again for the failed URL(s) (use longer wait for Slack) and re-validate. Repeat until all pass or user skips.
5. Run **write-readable.js** to generate **`.cursor/research-context.txt`** with spacing between pages. Summarize what was stored and list **links.best** per page. If any URLs are in `.cursor/research-failed.txt`, list them and suggest logging in and re-running. Suggest **@context-show** to confirm.

---

## Verification

- [ ] Context: **.cursor/research-context.json** and **.cursor/research-context.txt** present; each result has **links.best** when the page had links; no repo files changed.
- [ ] Fetch was **read-only** (no interaction with pages).
- [ ] Results were validated; user was prompted to retry or skip when content didn’t match.
- [ ] Next: **context-show** for summary; **context-plan** reads context (read-only) and writes `.cursor/research-plan.md`.
