---
name: research-append
description: >-
  Fetch-only: start a BFS from provided links in Chrome (N best at distance 1,
  then N best at distance 2), skip URLs already accessed in the current run,
  append data to .cursor/research-context.json with timestamps. Only this skill
  may change the context file. Use when the user provides links to gather page
  content. Does not modify the repo.
---

# Research append (fetch only)

**Goal:** **Only fetch.** Run a **BFS** from the provided links in Chrome: **distance 0** = seeds (all fetched), then **N best nodes at distance 1** (neighbors of seeds), then **N best nodes at distance 2** (neighbors of distance-1), and so on. BFS fits gathering information and appending to context—it explores by **radius** from the seeds. **Skip any page already accessed in the current run**; use **`--visited-file .cursor/research-visited.txt`** to also skip URLs from previous runs. Append the new data to **`.cursor/research-context.json`** with **timestamps**. **Only this skill may change the context file.** Does not modify the repo.

**Output files:** **`.cursor/research-context.json`** (fetched page data; add `lastFetched` after the script). Optionally **`.cursor/research-visited.txt`** (one URL per line; written by the script when using `--visited-file`). All under `.cursor/`; not part of the repo (add `.cursor/` to `.gitignore`).

---

## Only append may change the context file

**research-plan** and **research-execute** must **never** write to or modify `.cursor/research-context.json`. Only **research-append** may create, overwrite, or append to it.

---

## Scripts used (link-fetcher)

This skill invokes scripts from **cursor-skills** `scripts/link-fetcher/`:

- **fetch.js** — Flat list of URLs: open each in Chrome, wait for load, collect title + text. Output: `{ fetched, results }`. Supports `--append`, `--visited-file`, `--out`, `--compact`, `--connect-chrome`. Use for **seeds only** (no BFS).
- **crawl.js** — BFS by rounds: round 0 = seeds, round 1 = top N links from seeds (distance 1), round 2 = top N from those (distance 2), etc. Output: `{ rounds, perPage, top, totalFetched, results }`. Same `results` shape. Supports `--seeds "url1 url2"` or `--seeds-file <path>`, `--per-page N`, `--top X`, `--rounds Y`, `--append`, `--visited-file`, `--out`, `--compact`, `--connect-chrome`.

**Script output shape (both):** `results` is an array of page objects: `{ url, title, text, ok, error?, links? }`. The scripts **do not** add timestamps; after running, add **`lastFetched`** (and optionally per-result **`fetchedAt`**) when writing the context file.

**Script path (resolve in order):** (1) If workspace root has `scripts/link-fetcher/fetch.js`, use base **`scripts/link-fetcher`** and run from workspace root. (2) Else if **`CURSOR_SKILLS_REPO`** is set, use **`"$CURSOR_SKILLS_REPO/scripts/link-fetcher"`**. (3) Else ask the user to open cursor-skills or set `CURSOR_SKILLS_REPO`. Use `<BASE>` in commands below.

---

## Context file format and timestamps

When writing or appending to `.cursor/research-context.json`:

- The script writes `{ results: [ ... ] }` (fetch) or `{ rounds, perPage, top, totalFetched, results }` (crawl). For the context file we keep at least **`results`** and add:
- **`lastFetched`** (ISO 8601) — when this write/append happened. When using `--append`, merge the new `results` into the existing array (the script may do this if you pass the same `--out`) and set `lastFetched` to the current time for the merged file.
- Optionally **`fetchedAt`** on each result object.

**Stale context:** If existing `.cursor/research-context.json` has **`lastFetched`** older than a threshold (e.g. **24 hours**), consider re-fetching the same seeds (or key URLs) and merging so the context is updated.

---

## BFS by distance; dedupe

- **BFS:** We want **N best at distance 1, then N best at distance 2**. **crawl.js** implements this: `--rounds 3` = distance 0 (seeds) + distance 1 (top X from seeds) + distance 2 (top X from distance-1). Each round skips URLs already in **fetchedUrls** (within run) and, with **`--visited-file`**, URLs from previous runs.
- **Dedupe:** Within one run the script never fetches the same URL twice. With **`--visited-file .cursor/research-visited.txt`** the script loads that file at start (one URL per line), skips any URL in it, and writes the updated set back at end.

---

## Do not change the repo

This skill only runs the link-fetcher and writes/merges into `.cursor/`. No repo source or config edits.

---

## Commands (from workspace root)

Create `.cursor` if needed: `mkdir -p .cursor`.

**Seeds only (no BFS):** use **fetch.js**. Replace `URL1 URL2 URL3` with the user’s links (or use **`--urls-file .cursor/seeds.txt`** for many URLs).

```bash
node <BASE>/fetch.js --connect-chrome --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append] URL1 URL2 URL3
```

**BFS (seeds + distance 1 + distance 2):** use **crawl.js**. Seeds as space-separated in `--seeds` or from a file with **`--seeds-file`** (one URL per line).

```bash
node <BASE>/crawl.js --connect-chrome --seeds "URL1 URL2 URL3" --per-page 10 --top 15 --rounds 3 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append]
```

- **`--rounds 3`** = distance 0 + 1 + 2. Use **`--rounds 2`** for seeds + distance 1 only.
- **`--per-page`** = max links extracted per page (default 10). **`--top`** = max unique links to follow to the next round (default 15 or 20).
- **`--append`** — Merge new results into existing `--out` file (both fetch and crawl support this). After the script exits, ensure the context file has **`lastFetched`** (read the file, add/update the key, write back if needed).
- **`--connect-chrome`** — Attach to Chrome with remote debugging (port 9222). User must start Chrome with `--remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"`. Omit to launch headless Chromium (no auth).
- Optional: **`--timeout 30000`**, **`--wait-until load`** if pages need longer or different load condition (see scripts/README).

---

## On invoke

1. **Parse** seed URLs from the user message (or a file path like `--seeds-file`). Decide **append** (merge into existing context) or **overwrite** (fresh file).
2. **Stale check (optional):** If `.cursor/research-context.json` exists and has `lastFetched` older than the threshold (e.g. 24h), consider re-fetching the same seeds and merging.
3. **Resolve** script base (`<BASE>`). Ensure **`.cursor`** exists.
4. **Run** fetch.js (seeds only) or crawl.js (BFS) with **`--out .cursor/research-context.json`** and **`--visited-file .cursor/research-visited.txt`**; use **`--append`** when appending.
5. **Post-process:** Ensure the context file has **`lastFetched`** (and optionally per-result `fetchedAt`).
6. **Summarize** in chat what was fetched (count, main URLs). Mention that only append may change the context file; **research-plan** will read it to craft plans.

---

## Verification

- [ ] Fetcher ran with correct `<BASE>`, `--out`, `--visited-file`; no repo files changed.
- [ ] `.cursor/research-context.json` has `lastFetched`; results are merged when appending.
- [ ] Next: **research-plan** reads the context (read-only) and writes `.cursor/research-plan.md`.

---

## Notes

- **Chrome:** See [scripts/README.md](https://github.com/gustavogardusi/cursor-skills/blob/main/scripts/README.md) for Chrome profile and remote debugging.
- **From another repo:** Set `CURSOR_SKILLS_REPO` to the path of a cursor-skills clone so `<BASE>` resolves.
