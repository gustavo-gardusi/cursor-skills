---
name: search
description: >-
  Search the web from links: run BFS in Chrome via link-fetcher, write or append
  to .cursor/research-context.json. Tunable: BFS layers, nodes per layer, wait
  after load, delay between pages. Use when the user provides links to gather
  page content. Only this skill may change the context file. Does not modify the repo.
---

# Search (fetch only)

**Goal:** **Only fetch.** Run a **BFS** from the provided links in Chrome and write or append to **`.cursor/research-context.json`**. You can tune **BFS depth**, **nodes per layer**, **wait after load**, and **delay between pages**. **Only this skill may change the context file.** Does not modify the repo.

**Output files:** **`.cursor/research-context.json`** (fetched page data; add `lastFetched` after the script). Optionally **`.cursor/research-visited.txt`** (one URL per line; use `--visited-file`). All under `.cursor/`; add `.cursor/` to `.gitignore`.

---

## Only this skill may change the context file

**plan** and **execute** must **never** write to or modify `.cursor/research-context.json`. Only **search** may create, overwrite, or append to it.

---

## Scripts used (link-fetcher)

This skill invokes scripts from **cursor-skills** `scripts/link-fetcher/`:

- **fetch.js** — Flat list of URLs: open each in Chrome, wait for load, collect title + text. Use for **seeds only** (no BFS).
- **crawl.js** — BFS by rounds: seeds → next layer → next layer. Use for **search with depth**.

**Script path (resolve in order):** (1) If workspace root has `scripts/link-fetcher/fetch.js`, use base **`scripts/link-fetcher`** and run from workspace root. (2) Else if **`CURSOR_SKILLS_REPO`** is set, use **`"$CURSOR_SKILLS_REPO/scripts/link-fetcher"`**. (3) Else ask the user to open cursor-skills or set `CURSOR_SKILLS_REPO` (see this repo's README for install steps). Use `<BASE>` in commands below.

---

## Tunable parameters (pass through to the script)

| Parameter | Script flag | Meaning | Default / typical |
|-----------|-------------|---------|-------------------|
| **BFS layers** | `--rounds N` | How many layers (round 0 = seeds, 1 = first hop, 2 = second hop, …). | 3 (seeds + 2 layers) |
| **Nodes per layer** | `--top N` | Max unique links to follow to the *next* layer. | 15 |
| **Links per page** | `--per-page N` | Max links extracted from each page. | 10 |
| **Wait after load (ms)** | `--wait-after-load N` | Wait N ms after page load before reading content (for SPAs). | 2000 |
| **Delay between pages (ms)** | `--delay-between-pages N` | Wait N ms between each page fetch. | 3000 |

Use these to control depth, breadth, and pacing. The agent may accept user preferences (e.g. "2 layers", "5s between pages") and pass the corresponding flags.

---

## Context file and timestamps

When writing or appending to `.cursor/research-context.json`:

- The script outputs `{ results: [ ... ] }` or `{ rounds, perPage, top, totalFetched, results }`. Keep **`results`** and add **`lastFetched`** (ISO 8601). With `--append`, merge new results into the existing array and set `lastFetched` to now.
- Optionally add **`fetchedAt`** per result.

**Stale context:** If `lastFetched` is older than a threshold (e.g. 24h), consider re-fetching and merging.

---

## BFS and dedupe

- **crawl.js**: `--rounds 3` = seeds (layer 0) + layer 1 (top X from seeds) + layer 2 (top X from layer 1). Increase `--rounds` for deeper search; increase `--top` for wider.
- **Dedupe:** Within a run the script never fetches the same URL twice. With **`--visited-file .cursor/research-visited.txt`** it skips URLs from previous runs and appends to the file at end.

---

## Do not change the repo

This skill only runs the link-fetcher and writes/merges into `.cursor/`. No repo source or config edits.

---

## Commands (from workspace root)

Create `.cursor` if needed: `mkdir -p .cursor`.

**Seeds only (no BFS):** use **fetch.js**. Replace URLs and tune wait/delay as needed.

```bash
node <BASE>/fetch.js --connect-chrome --wait-after-load 2000 --delay-between-pages 3000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append] URL1 URL2 URL3
```

**BFS (search with layers):** use **crawl.js**. Tunables: `--rounds`, `--top`, `--per-page`, `--wait-after-load`, `--delay-between-pages`.

```bash
node <BASE>/crawl.js --connect-chrome --wait-after-load 2000 --delay-between-pages 3000 --seeds "URL1 URL2 URL3" --per-page 10 --top 15 --rounds 3 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact [--append]
```

- **`--rounds`** = number of BFS layers (round 0 = seeds). **`--top`** = max links to follow to the next layer. **`--per-page`** = max links extracted per page.
- **`--append`** — Merge new results into existing `--out`. Use for **batch**: the agent can call this skill multiple times with different seeds; each call uses `--append` to add to the same context file.
- **Chrome:** User must **first** open a Chrome window with `--remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug-profile"` (second window; normal Chrome can stay open), **then** run the script.
- **`--wait-after-load`** / **`--delay-between-pages`** — Override with user preferences or leave as above.

---

## On invoke

1. **Chrome:** Ensure the user has **first** started Chrome with the debug profile. If not, tell them to open that window (see this repo's README §5 for steps), then re-run.
2. **Parse** seed URLs from the user message (or `--seeds-file`). Decide **append** (merge into existing context) or **overwrite**.
3. **Tunables:** If the user specified depth, breadth, or timing (e.g. "2 layers", "wait 5s between pages"), set `--rounds`, `--top`, `--wait-after-load`, `--delay-between-pages` accordingly. Otherwise use defaults above.
4. **Resolve** script base `<BASE>`. Ensure **`.cursor`** exists.
5. **Run** fetch.js (seeds only) or crawl.js (BFS) with **`--out .cursor/research-context.json`**, **`--visited-file .cursor/research-visited.txt`**, and the chosen tunables; use **`--append`** when appending.
6. **Post-process:** Ensure the context file has **`lastFetched`** (and optionally per-result `fetchedAt`).
7. **Summarize** what was fetched (count, main URLs). Mention that **plan** can read the context next to craft plans.

**Batch usage:** The agent may call this skill multiple times in one task (e.g. different seed sets). Each run should use **`--append`** and the same **`--out`** and **`--visited-file`** so all results accumulate in one context file.

---

## Verification

- [ ] Fetcher ran with correct `<BASE>`, `--out`, `--visited-file`; no repo files changed.
- [ ] `.cursor/research-context.json` has `lastFetched`; results are merged when appending.
- [ ] Next: **plan** reads the context (read-only) and writes `.cursor/research-plan.md`.

---

## Notes

- **Chrome:** See [scripts/README.md](https://github.com/gustavogardusi/cursor-skills/blob/main/scripts/README.md) for Chrome profile and remote debugging.
- **From another repo:** Set `CURSOR_SKILLS_REPO` to the path of a cursor-skills clone so `<BASE>` resolves. Install steps are in this repo's README.
