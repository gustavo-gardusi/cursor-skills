# Scripts

Tooling for this repo: **skills sync** and **link-fetcher**. One `package.json` in `scripts/`; no per-folder READMEs.

---

## Install

Install dependencies from **repo root** or from **scripts/**:

```bash
# From repo root (recommended)
npm install --prefix scripts

# Or from scripts/
cd scripts && npm install
```

You need **Node.js** (LTS). No global install. Playwright is a dependency; for tests you don’t need to run `npx playwright install chromium` (tests use mocks). Only install Chromium if you run the link-fetcher **without** `--connect-chrome`.

---

## Run from repo root

All of these can be run from the **repository root**:

| What | Command (from repo root) |
|------|---------------------------|
| **Sync skills into Cursor** | `node scripts/skills/sync.js in` |
| **Sync skills, clear first** | `node scripts/skills/sync.js in -y` |
| **Copy Cursor skills back to repo** | `node scripts/skills/sync.js out` |
| **Run fetch (link-fetcher)** | `node scripts/link-fetcher/fetch.js [options] url1 [url2 ...]` |
| **Run fetch interactive** | `node scripts/link-fetcher/interactive.js [options] <start-url>` |
| **Run crawl (link-fetcher)** | `node scripts/link-fetcher/crawl.js [options]` |
| **Run all tests** | `npm test --prefix scripts` |
| **Run tests with coverage** | `npm run test:coverage --prefix scripts` |
| **Check coverage threshold** | `npm run test:coverage:check --prefix scripts` |

Using npm scripts from repo root (same as above, but via package.json):

```bash
npm run sync --prefix scripts -- in        # or: in -y
npm run sync --prefix scripts -- out
npm run fetch --prefix scripts -- --connect-chrome https://example.com
npm run fetch-interactive --prefix scripts -- --connect-chrome https://example.com
npm run crawl --prefix scripts -- --seeds "https://example.com" --rounds 1
npm test --prefix scripts
npm run test:coverage --prefix scripts
npm run test:coverage:check --prefix scripts
```

From **scripts/** you can drop `--prefix scripts` and run:

```bash
cd scripts
npm run sync -- in
npm run sync -- out
npm run fetch -- --connect-chrome https://example.com
npm run crawl -- --seeds "https://example.com" --rounds 1
npm test
npm run test:coverage
npm run test:coverage:check
```

---

## 1. Skills sync (`skills/`)

Syncs **skills/** ↔ **~/.cursor/skills-cursor** so Cursor Agent can use them.

- **`node scripts/skills/sync.js in`** — Copy repo skills into Cursor (add/overwrite).
- **`node scripts/skills/sync.js in -y`** — Same, but clear existing skills first (no prompt).
- **`node scripts/skills/sync.js out`** — Copy from Cursor back into **skills/**.

**Env (optional):** `SKILLS_SOURCE_DIR` and `CURSOR_DIR` override source and destination (used in tests).

---

## 2. Link fetcher (`link-fetcher/`)

Fetches data from URLs using **Chrome** (or a launched browser). Scripts attach to an existing Chrome via CDP so you reuse cookies and logins.

### Use from another repo

You can run the link-fetcher from **any repo** (e.g. in Cursor chat from a different project) to gather context from URLs:

1. **Clone this repo** (cursor-skills) somewhere, e.g. `~/github/cursor-skills`.
2. **Install deps** in the clone: `npm install --prefix scripts` (from repo root).
3. **Set** `CURSOR_SKILLS_REPO` to that path, e.g. `export CURSOR_SKILLS_REPO=~/github/cursor-skills`.
4. From the other repo, the **research-append** skill (when installed from cursor-skills) will run:
   - `node "$CURSOR_SKILLS_REPO/scripts/link-fetcher/fetch.js" ...` or
   - `node "$CURSOR_SKILLS_REPO/scripts/link-fetcher/crawl.js" ...`
   so you get the same Chrome-based fetch/crawl without copying the script.

Example (BFS: seeds + distance 1 + distance 2, output to `.cursor/`):

```bash
mkdir -p .cursor
node "$CURSOR_SKILLS_REPO/scripts/link-fetcher/crawl.js" --connect-chrome --seeds "https://example.com/doc" --per-page 10 --top 15 --rounds 3 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact
```

### Partial context storage (`.cursor/`)

Research skills use **`.cursor/`** for ephemeral output (readable by Cursor, not part of the repo; add `.cursor/` to `.gitignore`). **Only research-append** may change the context file; **research-plan** only reads it and writes the plan file; **research-execute** only reads the plan and changes the repo.

- **`.cursor/research-context.json`** — Written **only by research-append** (fetch/crawl output). Should include a top-level **`lastFetched`** (ISO timestamp). Use `--append` to merge new results; if `lastFetched` is older than a reasonable threshold (e.g. 24h), re-fetch to update. **research-plan** reads this (read-only) to craft plans.
- **`.cursor/research-visited.txt`** — Optional: use **`--visited-file .cursor/research-visited.txt`** so the fetcher skips URLs already visited in previous runs (one URL per line). Append writes this; plan and execute do not use it.
- **`.cursor/research-plan.md`** — Written by **research-plan** (implementation plan with file paths). **research-execute** reads this and applies the plan to the repo. Plan does not modify the context file.

When running the fetcher manually: `--out .cursor/research-context.json` (and `--append` to add to existing), `--visited-file .cursor/research-visited.txt` to skip already-visited URLs; create `.cursor/` with `mkdir -p .cursor` if needed.

### Research skills ↔ link-fetcher

| Skill | Scripts / behavior |
|-------|--------------------|
| **research-append** | Uses **fetch.js** (seeds only: `--out`, `--visited-file`, `--append`, `--compact`, `--connect-chrome`, URLs as args or `--urls-file`) or **crawl.js** (BFS: `--seeds` / `--seeds-file`, `--per-page N`, `--top X`, `--rounds Y`, same flags). Writes `.cursor/research-context.json` (and optionally `.cursor/research-visited.txt`). Script output shape: `{ results: [ { url, title, text, ok, error?, links? } ] }` (crawl also has `rounds`, `perPage`, `top`, `totalFetched`). Append adds `lastFetched` (ISO) to the context file after the run. |
| **research-plan** | Does **not** run link-fetcher. Reads `.cursor/research-context.json` (read-only) and the repo (read-only). Writes `.cursor/research-plan.md` only. |
| **research-execute** | Does **not** run link-fetcher. Reads `.cursor/research-plan.md` and applies the plan to the repo (edits source/config). |

- **fetch.js** — List of URLs → open one by one → collect title + text (+ optional links) → JSON.
- **interactive.js** — Single start URL → show top N same-site links → wait for input (1–N or q) → open chosen link; repeat. Defaults: **top 15**, **1 iteration**. Optional `--out` writes visited pages when done.
- **crawl.js** — Seed URLs + `--per-page N --top X --rounds Y` → multi-round crawl → JSON.

**Visited set (avoid re-visiting):** All three scripts support **`--visited-file <path>`**. The file stores one URL per line (LLM-friendly: plain text, easy to grep or feed to a model). On start, the script loads this set and skips any URL already in it; after each visit it adds the URL; when the run finishes it writes the full set back to the file. Use the same path across runs to accumulate a growing “already seen” list and avoid re-fetching the same page.

**Link filtering (content-only links):** When extracting links, the scripts drop **images**, **static assets**, and **out-of-scope** URLs so you get content pages only (better for research and LLMs). Filtered out:

- **Auth / session:** `login`, `signin`, `signout`, `register`, `auth`, `oauth`, `share`, `embed`
- **Image and binary extensions:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.ico`, `.pdf`, `.mp4`, etc.
- **Asset path segments:** `/img/`, `/images/`, `/image/`, `/assets/`, `/static/`, `/media/`, `/cdn/`, `/_next/static/`, `/dist/`

So **fetch** (with `--links`) puts all raw links in `links.all` and the filtered list in `links.best`; **crawl** and **interactive** only enqueue or show filtered links. The tests include example website responses (content + login + images + assets) and assert what is kept vs filtered.

### First-time setup: Chrome profile and login

Use a **separate Chrome profile** so remote debugging works and you only log in once (or periodically when sessions expire).

1. **Quit Chrome completely** (so one instance uses the profile).
2. Start Chrome with a dedicated user-data dir and remote debugging:
   ```bash
   # macOS – profile stored in ~/.chrome-debug-profile
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.chrome-debug-profile"
   ```
   On Linux, use the path to your Chrome binary; on Windows, use `chrome.exe` with the same flags.
3. In that Chrome window, **log in** to any sites you need (GitHub, internal docs, etc.). The profile is saved; next time you start Chrome with the same `--user-data-dir`, you stay logged in. Re-log when cookies or sessions expire (e.g. every few weeks).
4. Leave that Chrome window **open**. In **another terminal**, run the link-fetcher commands with `--connect-chrome`. They attach to this browser; no new window is opened by the script.

### Workflow: one Chrome, many commands

1. Start Chrome once (step 2 above).
2. Run any number of commands from repo root or `scripts/`:
   ```bash
   node scripts/link-fetcher/fetch.js --connect-chrome --links https://example.com
   node scripts/link-fetcher/fetch.js --connect-chrome --out pages.json --compact url1 url2
   node scripts/link-fetcher/interactive.js --connect-chrome --out visited.json https://docs.example.com
   node scripts/link-fetcher/crawl.js --connect-chrome --seeds "https://docs.example.com" --rounds 2 --out crawl.json
   # Reuse a visited list so you don’t re-fetch the same pages:
   node scripts/link-fetcher/fetch.js --connect-chrome --visited-file visited-urls.txt url1 url2
   node scripts/link-fetcher/crawl.js --connect-chrome --visited-file visited-urls.txt --seeds "https://docs.example.com" --rounds 2
   ```
   Default CDP URL is `http://localhost:9222`; use `--connect-chrome http://host:port` to override.

**Without `--connect-chrome`:** A Chromium window is launched by Playwright (no existing auth; requires `npx playwright install chromium`).

### Output format (agent-friendly)

All scripts emit **JSON** that is easy for tools and agents to consume.

- **Where:** With no `--out`, JSON is printed to **stdout**. With `--out <path>`, it is written to that file. Usage/errors go to stderr.
- **Shape:** Each source is one object in an array:
  - **fetch.js:** `{ fetched, results }` — `results` is an array of page objects.
  - **crawl.js:** `{ rounds, perPage, top, totalFetched, results }` — `results` is an array of page objects.
  - **interactive.js** (with `--out`): `{ pages, totalVisited }` — `pages` is an array of page objects.

Each **page object** has:

| Field   | Type    | Description |
|--------|---------|-------------|
| `url`  | string  | Page URL. |
| `title`| string  | Document title. |
| `text` | string  | Main text (e.g. from `body` or `--selector`). |
| `ok`   | boolean | HTTP success. |
| `error`| string  | Set only on failure. |
| `links`| array   | Optional: follow-up URLs (fetch: `links.best` when `--links`; crawl: `links`; interactive: `links`). |

- **Single-line JSON (for piping / agents):** Use `--compact`. One line per run, no pretty-print.
- **Appending runs:** Use `--out <file>` and `--append`. New results are merged into the existing file’s `results` array so you can accumulate multiple runs reliably.

Examples:

```bash
# Stdout, pretty-printed (default)
node scripts/link-fetcher/fetch.js --connect-chrome https://a.com https://b.com

# File, compact (one line) – good for agents
node scripts/link-fetcher/fetch.js --connect-chrome --out out.json --compact https://a.com

# Append more URLs to an existing file
node scripts/link-fetcher/fetch.js --connect-chrome --out out.json --append https://c.com https://d.com
```

### Options summary

| Script         | Main options |
|----------------|---------------|
| **fetch.js**   | `--connect-chrome [url]`, `--urls-file <path>`, `--out <path>`, `--compact`, `--append`, `--visited-file <path>`, `--wait-until`, `--selector`, `--timeout`, `--links`, `--links-limit`, `--links-same-site` / `--no-links-same-site`. |
| **interactive.js** | `<start-url>`, `--top <n>`, `--iterations <n>`, `--out <path>`, `--compact`, `--visited-file <path>`, `--connect-chrome [url]`, `--timeout`. |
| **crawl.js**   | `--seeds "url1 url2"`, `--seeds-file <path>`, `--per-page N`, `--top X`, `--rounds Y`, `--visited-file <path>`, `--connect-chrome [url]`, `--out <path>`, `--compact`, `--append`. |

Used by the **research** skill.

---

## 3. Tests and coverage

All tests use **mocks only**: no real Chromium, no real readline, no network. Link-fetcher tests inject a fake page and (when needed) fake `existsSync` / `readFileSync` / `writeFile` so behavior is deterministic and fast.

### Run tests

From **repo root** or from **scripts/**:

```bash
# From repo root
npm test --prefix scripts
npm run test:coverage --prefix scripts
npm run test:coverage:check --prefix scripts

# From scripts/
npm test
npm run test:coverage
npm run test:coverage:check
```

- **test** — Runs all tests (skills sync + link-fetcher).
- **test:coverage** — Same with line/branch/function coverage (Node 22+).
- **test:coverage:check** — Exits with error if line coverage is below 80%.

Run a subset:

- **Skills only:** `npm run test:skills --prefix scripts` (or `npm run test:skills` from `scripts/`).
- **Link-fetcher only:** `npm run test:link-fetcher --prefix scripts` (or `npm run test:link-fetcher` from `scripts/`).

### What the tests cover

| Area | Covered |
|------|--------|
| **fetch.js** | `parseArgs` (URLs, `--out`, `--compact`, `--append`, `--links`, `--visited-file`, `--connect-chrome`, etc.); `fetchUrl` (success, goto failure, `res.ok()` false, null response, links extraction and throw); link filtering (example website response: content vs login/images/assets); `run` with getPage/getBrowser mocks, output shape (`fetched`, `results`), `--compact` single-line JSON, `--append` merge, `--visited-file`. |
| **crawl.js** | `parseArgs` (seeds, `--per-page`, `--top`, `--rounds`, `--compact`, `--append`, `--visited-file`); `isValidUrl`; `pickTopX`; `fetchPage` (success, goto failure, null response, **filters images/noise from links**); `run` with mocks, two-round crawl, `--compact`, `--append` merge, `--visited-file`, output valid JSON. |
| **interactive.js** | `parseInteractiveArgs` (defaults, `--top`, `--iterations`, `--out`, `--compact`, `--visited-file`, pass-through); `pageEntry` (normalized page object, with/without `links`, with `error`); `runInteractive` with getPage/askFn mocks (quit, follow link, invalid input, max depth, child fetch error, Enter = link 1, `--out` and writeFile mock, multi-page output, valid JSON). |
| **link-filter.js** | `isNoiseUrl`: filters auth paths (login, signin, oauth, etc.), image/asset extensions (jpg, png, gif, svg, pdf, mp4, etc.), asset path segments (/img/, /images/, /static/, /assets/, etc.); allows content pages. |
| **visited.js** | `normalizeVisitedUrl` (strip hash, http(s) only); `loadVisitedSet` (one URL per line, empty when missing); `saveVisitedSet` (sorted, one per line). |
| **skills/sync.js** | Path names, finding SKILL.md files, install/copy in and out with temp dirs. |

Tests include **example website responses**: mock pages with a mix of content links, login, images (e.g. `.png`, `/images/`), and static assets; tests assert that `links.best` (fetch) or `result.links` (crawl) contain only content URLs and that login/image/asset URLs are filtered out.

Everything is exercised without starting Chrome or reading real stdin.
