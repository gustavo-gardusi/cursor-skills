---
name: context-add
description: >-
  Fetch pages from URLs using fetch.js with an already-open Chrome; retry on
  failure; store results and a list of found links per page in
  .cursor/research-context.json. Per-site rules for GitHub, Jira, Slack (browser
  URL). For VTEX search team: PRs, Jira tasks, Slack threads. Only this skill
  may change the context file. Does not modify the repo.
---

# Context: add

**Goal:** Fetch from a **flat list of URLs** using **fetch.js** with **Chrome already open**. The script opens each URL, retries on failure (default 3 retries), and stores title, text, and a **list of found links** per page in **`.cursor/research-context.json`**. Always use **`--links --links-limit 15`** so each result includes **`links.best`**. Use **`.cursor/research-visited.txt`** to skip already-visited URLs. Failed URLs (after retries) go to **`.cursor/research-failed.txt`** so the user can log in and re-run. Only this skill may change the context file. Does not modify the repo.

**Prerequisite:** Chrome must be running with the shared profile and remote debugging. If not, run **@browser-open** first.

**Output:** `.cursor/research-context.json` with `{ results: [ { url, title, text, ok?, links?: { best } } ], lastFetched }`. Each result includes **`links.best`** (list of found links on that page). Optionally `.cursor/research-visited.txt` and `.cursor/research-failed.txt`.

---

## Using the browser (already open)

fetch.js attaches to the existing Chrome via **`--connect-chrome`** (default localhost:9222). It does **not** launch or close Chrome. The same profile used by **@browser-open** is shared across all projects; only **`.cursor/`** (context, visited, failed, plan) is repo-specific.

---

## Script: fetch.js

Script path: **`{{base:scripts/url}}`** (replaced at install with the actual repo path).

- **fetch.js** — Flat list of URLs: pass as many as needed (`URL1 URL2 URL3 ...`). Attaches to Chrome, fetches each page in sequence, extracts title, text, and **links**. **Retries** each URL on non-OK response (default 3 retries, 2s apart). **Always** use **`--links --links-limit 15`** so each result includes **`links.best`**.

**Always use:** **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, and **`--links --links-limit 15`**.

---

## Common usages (VTEX search team)

Typical workflow for a software engineer on the **search team** using **GitHub**, **Jira**, and **Slack**:

| What to add | URL / source | Notes |
|-------------|--------------|--------|
| **PR (review, description)** | `https://github.com/vtex/intelligent-search-indexer/pull/NUMBER` | PR body, conversation, files changed. Use as-is. |
| **GitHub Actions run** | `https://github.com/vtex/.../actions/runs/RUN_ID` or `.../job/JOB_ID` | Run summary, job list. Use as-is. |
| **Jira task** | `https://vtex-dev.atlassian.net/browse/TIS-XXX` | Description, acceptance criteria, comments. Use browser URL (atlassian.net). |
| **Slack channel / thread** | Web URL from browser address bar | **Must** be the **browser** URL (e.g. `app.slack.com/...` or `workspace.slack.com/archives/...`). Do **not** use `slack://` or app-only links; Chrome cannot fetch them. If the user has only an app link, ask them to open Slack in the browser and copy the URL. |

Pass multiple URLs in one command: e.g. PR URL + Jira URL + Actions run URL. Results and **`links.best`** are stored per page; the user can add more URLs in a follow-up run from **`links.best`** if needed.

---

## What to add (per URL type)

### GitHub

- **Repo / README / code** — URL as-is. Content: README, file list, code. **`links.best`** includes PRs, Issues, Actions.
- **Pull request** — PR page URL. Content: description, conversation, files changed. **`links.best`**: commits, checks, linked issues.
- **GitHub Actions run** — Run or job URL. Content: run summary, job list, logs (if visible). **`links.best`**: workflow file, other runs, PR.

### Jira

- **Task / issue** — **Browser** URL: `https://YOUR-DOMAIN.atlassian.net/browse/TICKET-123`. Content: title, description, acceptance criteria, comments, subtasks. Same URL in Chrome loads the web view.

### Slack

- **Channel or thread** — **Browser (web) URL only.** `slack://` or app links cannot be fetched. Use `https://app.slack.com/client/...` or `https://your-workspace.slack.com/archives/...`. If the user only has an app link or channel name, tell them to open Slack in the browser, then copy the URL from the address bar.

### Other sites

- Add URL as-is. Use **`--links --links-limit 15`**. If login required, failed URLs go to **`.cursor/research-failed.txt`**; after logging in in Chrome, re-run to retry.

---

## Commands (from workspace root)

`mkdir -p .cursor`. Run with **`--connect-chrome`** (Chrome must already be open via **@browser-open**).

**Multiple URLs (with links and retry):**
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --links --links-limit 15 --wait-after-load 3000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] URL1 URL2
```

With **`--confirm-each-page`** (prompt after each page):
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --links --links-limit 15 --wait-after-load 3000 --delay-between-pages 0 --confirm-each-page --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] URL1 URL2
```

After the script runs, ensure the context file has **`lastFetched`** (ISO 8601). If **`.cursor/research-failed.txt`** has URLs, list them and suggest the user log in and re-run. Summarize what was fetched and **list the found links** (from **`results[].links.best`**). **context-show** can show the summary; **context-plan** reads the context next.

---

## On invoke

1. Ensure Chrome is open with the shared profile (if not, direct the user to **@browser-open**).
2. **Normalize URLs by type:** GitHub (repo, PR, Actions) — use as-is. Jira — browser URL (atlassian.net). Slack — **browser URL only** (app.slack.com or workspace.slack.com); do not use `slack://` or app-only links.
3. Parse seed URLs (one or many). Use **`--append`** to merge into existing context.
4. Run **fetch.js** with **`--connect-chrome`**, **`--links --links-limit 15`**, **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, **`--retries 3`**. Use **`--confirm-each-page`** and **`--wait-after-load 3000`** when the user wants to confirm each page.
5. Summarize what was fetched and the **found links** per page (**`links.best`**). If any URLs are in `.cursor/research-failed.txt`, list them and suggest logging in and re-running. Suggest **@context-show** to confirm.

---

## Verification

- [ ] Context file has `lastFetched` and `results`; each result has **`links.best`** when the page had links; no repo files changed.
- [ ] Failed URLs (if any) are in `.cursor/research-failed.txt`; user can log in and re-run.
- [ ] Next: **context-show** for summary; **context-plan** reads context (read-only) and writes `.cursor/research-plan.md`.
