---
name: context-add
description: >-
  Fetch pages from links using url scripts with real Chrome; write or append to
  .cursor/research-context.json. Only this skill may change the context file.
  Use --visited-file to avoid revisiting. Does not modify the repo.
---

# Context: add (Chrome only)

**Goal:** Fetch from seed URLs using the **url scripts** (fetch.js or crawl.js) with **real Chrome**, and write or append to **`.cursor/research-context.json`**. Use **`.cursor/research-visited.txt`** so already-visited URLs are skipped. Only this skill may change the context file. Does not modify the repo.

**Output:** `.cursor/research-context.json` with `{ results: [ { url, title, text, ok?, links? } ], lastFetched }`. Optionally `.cursor/research-visited.txt` (one URL per line; avoids revisiting).

---

## Chrome (url scripts)

Scripts live at **`{{base:scripts/url}}`** (replaced at install with the actual path). Each script launches Chrome with the debug profile itself, fetches, then closes Chrome (no separate launcher or .sh).

- **fetch.js** — Flat list of URLs; launches Chrome, fetches, appends to output, closes Chrome.
- **crawl.js** — BFS by rounds (seeds → next layer); same lifecycle.

**Timing:** Use **`--wait-after-load 3000`** (3s for page to finish loading) and **`--delay-between-pages 0`** when using **`--confirm-each-page`**. With **`--confirm-each-page`** the script prompts **"Proceed to next page? (y/n)"** after each page. Keep wait-after-load (3s) larger than delay-between-pages. Always use **`--visited-file .cursor/research-visited.txt`** to avoid revisiting pages.

**Commands (from workspace root):** `mkdir -p .cursor`. Run with `node`; omit `--connect-chrome` so the script opens and closes Chrome by itself.

Seeds only (with confirm and visited set):
```bash
node {{base:scripts/url}}/fetch.js --wait-after-load 3000 --delay-between-pages 0 --confirm-each-page --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append] URL1 URL2
```

BFS (layers, with confirm and visited set). Crawl returns all filtered links per round (no top-X); the skill or user can filter further.
```bash
node {{base:scripts/url}}/crawl.js --wait-after-load 3000 --delay-between-pages 0 --confirm-each-page --seeds "URL1 URL2" --rounds 3 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append]
```

Without prompting (automated run):
```bash
node {{base:scripts/url}}/fetch.js --wait-after-load 3000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append] URL1 URL2
```

After the script runs, ensure the context file has **`lastFetched`** (ISO 8601). Summarize what was fetched; **context-show** can show the summary; **context-plan** reads the context next.

---

## On invoke

1. Parse seed URLs; decide append vs overwrite (**`--append`** to merge into existing context).
2. Ensure **`--visited-file .cursor/research-visited.txt`** is used so pages are not revisited.
3. Run **fetch.js** (flat URL list) or **crawl.js** (BFS) as above. Use **`--confirm-each-page`** and **`--wait-after-load 3000`** when the user wants to confirm each page.
4. Add `lastFetched` to the context file if the script did not; summarize. Suggest **@context-show** to confirm.

---

## Verification

- [ ] Context file has `lastFetched` and `results`; no repo files changed.
- [ ] Next: **context-show** for summary; **context-plan** reads context (read-only) and writes `.cursor/research-plan.md`.
