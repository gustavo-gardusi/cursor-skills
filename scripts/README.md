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
| **Run crawl (link-fetcher)** | `node scripts/link-fetcher/crawl.js [options]` |
| **Run all tests** | `npm test --prefix scripts` |
| **Run tests with coverage** | `npm run test:coverage --prefix scripts` |
| **Check coverage threshold** | `npm run test:coverage:check --prefix scripts` |

Using npm scripts from repo root (same as above, but via package.json):

```bash
npm run sync --prefix scripts -- in        # or: in -y
npm run sync --prefix scripts -- out
npm run fetch --prefix scripts -- --connect-chrome https://example.com
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

Fetches data from URLs using **Chrome** (or a launched browser). Meant to **reuse your existing Chrome** (cookies, auth) via CDP.

- **fetch.js** — List of URLs → open one by one → collect title + text → JSON.
- **crawl.js** — Seed URLs + depth (N per page, top X, Y rounds) → multi-round crawl → JSON.

**Using your Chrome (reuse auth):**

1. Start Chrome with remote debugging:
   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
2. Run from repo root (or from `scripts/` with `link-fetcher/` in the path):
   ```bash
   node scripts/link-fetcher/fetch.js --connect-chrome https://example.com
   node scripts/link-fetcher/crawl.js --connect-chrome --seeds "https://docs.example.com" --rounds 2 --out crawl.json
   ```
   Default CDP URL is `http://localhost:9222`; use `--connect-chrome http://host:port` to override.

**Without Chrome:** Omit `--connect-chrome`; a Chromium window will launch (requires `npx playwright install chromium`; no existing auth).

**fetch.js:** `--urls-file <path>`, `--wait-until load|domcontentloaded|networkidle`, `--selector <css>`, `--timeout <ms>`, `--out <path>`.

**crawl.js:** `--seeds "url1 url2"`, `--seeds-file <path>`, `--per-page N`, `--top X`, `--rounds Y`, `--connect-chrome [url]`, `--out <path>`.

Output is JSON (`fetched`/`results` or `rounds`/`totalFetched`/`results`). Used by the **research** skill.

---

## 3. Tests and coverage

Tests use **mocks only** (no real Chromium). Run from repo root or from `scripts/`:

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

- **test** — All tests (skills + link-fetcher).
- **test:coverage** — Same with coverage report (Node 22+).
- **test:coverage:check** — Fails if line coverage is below 79% (target 80%).

Per-project: `npm run test:skills --prefix scripts` and `npm run test:link-fetcher --prefix scripts` (or from `scripts/`: `npm run test:skills`, `npm run test:link-fetcher`).
