---
name: context-add
description: >-
  Fetch pages from links using url scripts with real Chrome; write or append to
  .cursor/research-context.json. Only this skill may change the context file.
  Use --visited-file to avoid revisiting; failed URLs go to research-failed.txt.
  Does not modify the repo.
---

# Context: add (Chrome only)

**Goal:** Fetch from seed URLs using the **url scripts** (fetch.js or crawl.js) with **real Chrome**, and write or append to **`.cursor/research-context.json`**. Use **`.cursor/research-visited.txt`** so already-visited URLs are skipped. URLs that still fail after retries (e.g. 404, login required) are written to **`.cursor/research-failed.txt`** and are **not** marked visited, so you can log in and re-run. Only this skill may change the context file. Does not modify the repo.

**Output:** `.cursor/research-context.json` with `{ results: [ { url, title, text, ok?, links? } ], lastFetched }`. Optionally `.cursor/research-visited.txt` (one URL per line) and `.cursor/research-failed.txt` (URLs that failed after retries; may need login).

---

## Shared profile (one for all repos)

Chrome uses a **single profile** across all projects: **`~/.chrome-debug-profile`**. Log in once (e.g. GitHub, internal docs) and reuse it everywhere. The only things **private to this repo** are under **`.cursor/`**: the context file (add), the visited list, the failed list, and the plan/reasoning (context-plan). Add `.cursor/` to `.gitignore`.

---

## Open Chrome (optional but recommended)

To use a **logged-in** session or to keep Chrome open across runs:

1. **Open Chrome** with the shared profile and remote debugging (run once per session):
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"
   ```
   (On Linux/Windows use the same flags with your Chrome path.) Log in to the sites you need in this window.
2. Run the url script with **`--connect-chrome`** so it attaches to this instance instead of launching its own. The script will **not** close Chrome when it finishes.
3. **Close Chrome** when you are done (or leave it open for other projects). Just close the window; no separate quit command needed.

If you omit this step, the script can launch Chrome itself with the same profile, fetch, then close it when done.

---

## Chrome (url scripts)

Scripts live at **`{{base:scripts/url}}`** (replaced at install with the actual path).

- **fetch.js** — Flat list of URLs; with `--connect-chrome` attaches to existing Chrome; otherwise launches Chrome, fetches, then closes it.
- **crawl.js** — BFS by rounds (seeds → next layer); same behaviour.

**Retries:** On 404 or other non-OK response, the script retries each URL (default **3** retries, 2s apart). If it still fails, the URL is appended to **`--failed-file`** and **not** added to visited, so after you log in you can re-run and those URLs will be tried again.

**Timing:** Use **`--wait-after-load 3000`** and **`--delay-between-pages 0`** when using **`--confirm-each-page`**. With **`--confirm-each-page`** the script prompts **"Proceed to next page? (y/n)"** after each page. Always use **`--visited-file .cursor/research-visited.txt`** and **`--failed-file .cursor/research-failed.txt`**.

**Commands (from workspace root):** `mkdir -p .cursor`. With Chrome already open (see Open Chrome above), use **`--connect-chrome`**.

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

1. Parse seed URLs; decide append vs overwrite (**`--append`** to merge into existing context).
2. Ensure **`--visited-file .cursor/research-visited.txt`** and **`--failed-file .cursor/research-failed.txt`** are used.
3. If the user has Chrome open with the profile, use **`--connect-chrome`**; otherwise the script can launch Chrome.
4. Run **fetch.js** (flat URL list) or **crawl.js** (BFS) as above. Use **`--confirm-each-page`** and **`--wait-after-load 3000`** when the user wants to confirm each page.
5. Add `lastFetched` to the context file if the script did not; summarize. If any URLs were written to `.cursor/research-failed.txt`, list them and suggest logging in and re-running. Suggest **@context-show** to confirm.

---

## Verification

- [ ] Context file has `lastFetched` and `results`; no repo files changed.
- [ ] Failed URLs (if any) are in `.cursor/research-failed.txt`; user can log in and re-run.
- [ ] Next: **context-show** for summary; **context-plan** reads context (read-only) and writes `.cursor/research-plan.md`.
