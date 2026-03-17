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

- **fetch.js** — List of URLs → open one by one → collect title + text (+ optional links) → JSON.
- **interactive.js** — Single start URL → show top N same-site links → wait for input (1–N or q) → open chosen link; repeat. Defaults: **top 15**, **1 iteration**. Optional `--out` writes visited pages when done.
- **crawl.js** — Seed URLs + `--per-page N --top X --rounds Y` → multi-round crawl → JSON.

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
| **fetch.js**   | `--connect-chrome [url]`, `--urls-file <path>`, `--out <path>`, `--compact`, `--append`, `--wait-until`, `--selector`, `--timeout`, `--links`, `--links-limit`, `--links-same-site` / `--no-links-same-site`. |
| **interactive.js** | `<start-url>`, `--top <n>`, `--iterations <n>`, `--out <path>`, `--compact`, `--connect-chrome [url]`, `--timeout`. |
| **crawl.js**   | `--seeds "url1 url2"`, `--seeds-file <path>`, `--per-page N`, `--top X`, `--rounds Y`, `--connect-chrome [url]`, `--out <path>`, `--compact`, `--append`. |

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
| **fetch.js** | `parseArgs` (URLs, `--out`, `--compact`, `--append`, `--links`, `--connect-chrome`, etc.); `fetchUrl` (success, goto failure, `res.ok()` false, null response, links extraction and throw); `run` with getPage/getBrowser mocks, output shape (`fetched`, `results`), `--compact` single-line JSON, `--append` merge and edge cases (file missing, invalid JSON). |
| **crawl.js** | `parseArgs` (seeds, `--per-page`, `--top`, `--rounds`, `--compact`, `--append`); `isValidUrl`; `pickTopX`; `fetchPage` (success, goto failure, null response); `run` with mocks, two-round crawl, `--compact`, `--append` merge, output valid JSON. |
| **interactive.js** | `parseInteractiveArgs` (defaults, `--top`, `--iterations`, `--out`, `--compact`, pass-through); `pageEntry` (normalized page object, with/without `links`, with `error`); `runInteractive` with getPage/askFn mocks (quit, follow link, invalid input, max depth, child fetch error, Enter = link 1, `--out` and writeFile mock, multi-page output, valid JSON). |
| **skills/sync.js** | Path names, finding SKILL.md files, install/copy in and out with temp dirs. |

Everything is exercised without starting Chrome or reading real stdin.
