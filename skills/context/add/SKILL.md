---
name: context-add
description: >-
  Fetch pages from links using url scripts with an already-open Chrome; write or
  append to .cursor/research-context.json. Only this skill may change the context file.
  Use --visited-file to avoid revisiting; failed URLs go to research-failed.txt.
  Does not modify the repo.
---

# Context: add

**Goal:** Fetch from seed URLs using the **url scripts** (fetch.js or crawl.js) with **Chrome already open**, then write or append to **`.cursor/research-context.json`**. Use **`.cursor/research-visited.txt`** so already-visited URLs are skipped. URLs that still fail after retries (e.g. 404, login required) are written to **`.cursor/research-failed.txt`** and are **not** marked visited, so you can log in and re-run. Only this skill may change the context file. Does not modify the repo.

**Prerequisite:** Chrome must be running with the shared profile and remote debugging. If not, run **@browser-open** first. Browser management lives in **@browser-open** and **@browser-close** (neighbor of context, shared across all projects).

**Output:** `.cursor/research-context.json` with `{ results: [ { url, title, text, ok?, links? } ], lastFetched }`. Optionally `.cursor/research-visited.txt` and `.cursor/research-failed.txt`.

---

## Using the browser (already open)

Scripts attach to the existing Chrome via **`--connect-chrome`** (default localhost:9222). They do **not** launch or close Chrome. The same profile used by **@browser-open** is shared across all projects; only **`.cursor/`** (context, visited, failed, plan) is repo-specific.

---

## Url scripts (fetch and content extraction)

Scripts live at **`{{base:scripts/url}}`** (replaced at install with the actual path).

- **fetch.js** — Flat list of URLs; attaches to existing Chrome, fetches each page, extracts title and text (and optional links), writes JSON.
- **crawl.js** — BFS by rounds (seeds → next layer); same: attach, fetch, extract, write.

**Retries:** On 404 or other non-OK response, the script retries each URL (default **3** retries, 2s apart). If it still fails, the URL is appended to **`--failed-file`** and **not** added to visited, so after you log in you can re-run and those URLs will be tried again.

**Timing:** Use **`--wait-after-load 3000`** and **`--delay-between-pages 0`** when using **`--confirm-each-page`**. With **`--confirm-each-page`** the script prompts **"Proceed to next page? (y/n)"** after each page. Always use **`--visited-file .cursor/research-visited.txt`** and **`--failed-file .cursor/research-failed.txt`**.

**Commands (from workspace root):** `mkdir -p .cursor`. Run with **`--connect-chrome`** (Chrome must already be open via **@browser-open**).

Seeds only (with confirm, visited, failed file, retries):
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --wait-after-load 3000 --delay-between-pages 0 --confirm-each-page --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] URL1 URL2
```

BFS (layers, with confirm, visited, failed file):
```bash
node {{base:scripts/url}}/crawl.js --connect-chrome --wait-after-load 3000 --delay-between-pages 0 --confirm-each-page --seeds "URL1 URL2" --rounds 3 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append]
```

Without prompting (automated run):
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --wait-after-load 3000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] URL1 URL2
```

After the script runs, ensure the context file has **`lastFetched`** (ISO 8601). If **`.cursor/research-failed.txt`** has URLs, list them and suggest the user log in and re-run the same command to retry those pages. Summarize what was fetched; **context-show** can show the summary; **context-plan** reads the context next.

---

## On invoke

1. Ensure Chrome is open with the shared profile (if not, direct the user to **@browser-open**).
2. Parse seed URLs; decide append vs overwrite (**`--append`** to merge into existing context).
3. Ensure **`--visited-file .cursor/research-visited.txt`** and **`--failed-file .cursor/research-failed.txt`** are used.
4. Run **fetch.js** (flat URL list) or **crawl.js** (BFS) with **`--connect-chrome`** as above. Use **`--confirm-each-page`** and **`--wait-after-load 3000`** when the user wants to confirm each page.
5. Add `lastFetched` to the context file if the script did not; summarize. If any URLs were written to `.cursor/research-failed.txt`, list them and suggest logging in and re-running. Suggest **@context-show** to confirm.

---

## Verification

- [ ] Context file has `lastFetched` and `results`; no repo files changed.
- [ ] Failed URLs (if any) are in `.cursor/research-failed.txt`; user can log in and re-run.
- [ ] Next: **context-show** for summary; **context-plan** reads context (read-only) and writes `.cursor/research-plan.md`.
