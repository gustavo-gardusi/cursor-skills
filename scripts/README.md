# Scripts

Tooling for this repo: **skills sync** and **url** (fetch with retry in Chrome). One `package.json` in `scripts/`; no per-folder READMEs.

## What this directory does

`scripts/` is the execution layer used by Cursor skills:

- `skills/` scripts install, export, and validate skill definitions in `.cursor/skills-cursor`.
- `url/` scripts run Chrome-driven fetches (including retry, filtering, and output shaping).
- `context/` scripts maintain research state files under `.cursor/` (context and visited URLs).

---

## Install

Install dependencies from **repo root** or from **scripts/**:

```bash
# From repo root (recommended)
npm install --prefix scripts

# Or from scripts/
cd scripts && npm install
```

You need **Node.js** (LTS). No global install. Playwright is a dependency; for tests you don’t need to run `npx playwright install chromium` (tests use mocks). For url scripts, **all requests go through Chrome**—either the script launches it (install Chromium if you use that path) or you attach with **`--connect-chrome`** to an already-running Chrome.

---

## Run from repo root

All of these can be run from the **repository root**:

| What | Command (from repo root) |
|------|---------------------------|
| **Sync skills into Cursor** | `node scripts/skills/sync.js in` |
| **Sync skills, clear first** | `node scripts/skills/sync.js in -y` |
| **Copy Cursor skills back to repo** | `node scripts/skills/sync.js out` |
| **Run fetch (url)** | `node scripts/url/fetch.js [options] url1 [url2 ...]` |
| **Run fetch interactive** | `node scripts/url/interactive.js [options] <start-url>` |
| **Clear research context** | `node scripts/context/clear.js` (optional: `CURSOR_ROOT`) |
| **Show context summary** | `node scripts/context/show.js` (optional: `CURSOR_ROOT`) |
| **Run all tests** | `npm test --prefix scripts` |
| **Run context integration tests** | `npm run test:context --prefix scripts` |
| **Run tests with coverage** | `npm run test:coverage --prefix scripts` |
| **Check coverage threshold** | `npm run test:coverage:check --prefix scripts` |

Using npm scripts from repo root (same as above, but via package.json):

```bash
npm run sync --prefix scripts -- in        # or: in -y
npm run sync --prefix scripts -- out
npm run fetch --prefix scripts -- --connect-chrome https://example.com
npm run fetch-interactive --prefix scripts -- --connect-chrome https://example.com
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

**Placeholders (sync in only):** When installing, sync replaces `{{base:path}}` with the absolute path to repo/path (e.g. `{{base:scripts/url}}` → your repo’s `scripts/url`), and `{{embed:path}}` with the file content. Installed skills are self-contained; no env vars needed.

---

## 2. Url scripts (`url/`)

Fetches data from URLs using **Chrome** only (no headless HTTP fetch). Every request is made via a browser: either the script launches Chrome with the debug profile (`~/.chrome-debug-profile`) or you use **`--connect-chrome`** to attach to an already-running Chrome.

### Use from any repo

Run **`node scripts/skills/sync.js in`** from the cursor-skills repo. The **context-add** skill gets `{{base:scripts/url}}` replaced with the repo path, so from any workspace the agent runs e.g. `node /path/to/cursor-skills/scripts/url/fetch.js ...` (no `CURSOR_SKILLS_REPO` needed).

Example (output to `.cursor/`):

```bash
mkdir -p .cursor
node scripts/url/fetch.js --connect-chrome --links --links-limit 15 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact https://example.com/doc
```

(From another repo, the installed skill will use the baked-in path to this script.)

### Partial context storage (`.cursor/`)

Research skills use **`.cursor/`** for ephemeral output (readable by Cursor, not part of the repo; add `.cursor/` to `.gitignore`). **Only context-add** may change the context file; **context-plan** only reads it and writes the plan file; **context-execute** only reads the plan and changes the repo. **context-clear** clears the context and visited set.

- **`.cursor/research-context.json`** — Written **only by context-add**. Holds pages that reached expected destinations (or explicit blockers logged as terminal states). **context-plan** reads this (read-only).
- **`.cursor/research-context.txt`** — Human-readable export. Generated via `node scripts/context/write-readable.js` for quick review.
- **`.cursor/research-visited.txt`** — Updated by **append-result.js** when a result is merged (one URL per line). Fetch uses it to skip already-visited URLs.
- **`.cursor/research-plan.md`** — Written by **context-plan** (implementation plan with file paths). **context-execute** reads this and applies the plan to the repo. Plan does not modify the context file.

When running the fetcher manually: `--out .cursor/research-context.json` (and `--append` to add to existing), `--visited-file .cursor/research-visited.txt` to skip already-visited URLs; create `.cursor/` with `mkdir -p .cursor` if needed.

### Research skills ↔ url scripts

| Skill | Scripts / behavior |
|-------|--------------------|
| **context-add** | Open URL tabs, monitor each tab as pages change, classify blockers vs destination, and call **append-result.js** once the page is at the expected destination (or terminal blocker). Only done pages go into `.cursor/research-context.json`. |
| **context-plan** | Does **not** run url scripts. Reads `.cursor/research-context.json` (read-only) and the repo (read-only). Writes `.cursor/research-plan.md` only. |
| **context-execute** | Does **not** run url scripts. Reads `.cursor/research-plan.md` and applies the plan to the repo (edits source/config). |
| **context-show** | Read-only. Show current context summary (count, lastFetched, URLs). Use after context-add. Can run `node scripts/context/show.js` (or set `CURSOR_ROOT`). |
| **context-clear** | Clears `.cursor/research-context.json` and `.cursor/research-visited.txt`. Can run `node scripts/context/clear.js` (or set `CURSOR_ROOT`). |

- **context/clear.js** — Clear `.cursor/research-context.json` and `.cursor/research-visited.txt`. Used by **context-clear** skill.
- **context/append-result.js** — Merge one or more "done" results into research-context.json (and append URLs to research-visited.txt). Only call when result is final (success or terminal blocker). stdin or `--file`.
- **context/show.js** — Print summary of current context (count, lastFetched, URLs). `CURSOR_ROOT` env. Used by **context-show** skill. Integration tests in `context/test/context.test.js` cover clear → append → show → clear and visited scenarios.
- **fetch.js** — List of URLs → open one by one → collect title + text (+ optional links with `--links`) → JSON.
- **interactive.js** — Single start URL → show top N same-site links → wait for input (1–N or q) → open chosen link; repeat. Defaults: **top 15**, **1 iteration**. Optional `--out` writes visited pages when done.
**Visited set (avoid re-visiting):** fetch and interactive support **`--visited-file <path>`**. The file stores one URL per line (LLM-friendly: plain text, easy to grep or feed to a model). On start, the script loads this set and skips any URL already in it; after each **successful** visit it adds the URL; when the run finishes it writes the full set back to the file. Use the same path across runs to accumulate a growing “already seen” list and avoid re-fetching the same page.

**Retries and failed URLs:** Fetch supports **`--retries <n>`** (default 3). On 404 or other non-OK response, the script retries the URL (2s apart). If it still fails after retries, the URL is **not** added to the visited set and is appended to **`--failed-file <path>`** (e.g. `.cursor/research-failed.txt`). So you can log in and re-run; those URLs will be tried again. Use **`--failed-file .cursor/research-failed.txt`** when running context-add.

**Link filtering (content-only links):** When extracting links, the scripts drop **images**, **static assets**, and **out-of-scope** URLs so you get content pages only (better for research and LLMs). Filtered out:

- **Auth / session:** `login`, `signin`, `signout`, `register`, `auth`, `oauth`, `share`, `embed`
- **Image and binary extensions:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.ico`, `.pdf`, `.mp4`, etc.
- **Asset path segments:** `/img/`, `/images/`, `/image/`, `/assets/`, `/static/`, `/media/`, `/cdn/`, `/_next/static/`, `/dist/`
- **Ad and tracking:** doubleclick, googlesyndication, googleadservices, `/ads/`, adserver, etc.

So **fetch** (with `--links`) puts all raw links in `links.all` and the filtered list in `links.best`; **interactive** shows filtered links for the user to choose. The tests include example website responses (content + login + images + assets) and assert what is kept vs filtered.

### Chrome: script launches it by default

**Default:** Run the script without `--connect-chrome`. The script launches Chrome with the debug profile (`~/.chrome-debug-profile`), fetches, appends results to your `--out` / `--visited-file`, then closes Chrome. No separate launcher or manual Chrome step.

**Optional — log in once:** To use a logged-in profile (e.g. GitHub, internal docs), create the profile once: start Chrome with that user-data dir, log in, then close. After that, when the script launches Chrome with the same profile, you stay logged in.
   ```bash
   # One-time: create profile and log in (macOS)
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --user-data-dir="$HOME/.chrome-debug-profile"
   ```
   Log in to the sites you need, then close Chrome. Next runs of fetch will use this profile.

**Optional — attach to existing Chrome:** If you already have Chrome open with remote debugging on port 9222, pass **`--connect-chrome`** and the script will attach to it instead of launching a new one.

### Commands (from repo root or `scripts/`)

```bash
# Script launches Chrome, fetches, appends to .cursor/research-context.json, closes Chrome
node scripts/url/fetch.js --wait-after-load 2000 --delay-between-pages 3000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --compact --append URL1 URL2
# With existing Chrome on 9222:
node scripts/url/fetch.js --connect-chrome --links --links-limit 15 --out pages.json --compact url1 url2
```

```bash
# Monitor blocker states (login/SSO/permission prompts) while staying attached to the same tabs
node scripts/url/fetch.js --connect-chrome --observe --observe-ms 0 --observe-interval 2000 URL1 [URL2 ...]

# Optional: keep long-running observer and auto-close destination tabs for this session
node scripts/url/fetch.js --observe --observe-ms 120000 --observe-close-on-destination --observe-match-threshold 2 URL1 [URL2 ...]
```

**Page load and pacing:** Use **`--wait-after-load 2000`** and **`--delay-between-pages 3000`** to let SPAs render and avoid hammering sites.

### Output format (agent-friendly)

All scripts emit **JSON** that is easy for tools and agents to consume.

- **Where:** With no `--out`, JSON is printed to **stdout**. With `--out <path>`, it is written to that file. Usage/errors go to stderr.
- **Shape:** Each source is one object in an array:
  - **fetch.js:** `{ fetched, results }` — `results` is an array of page objects.
  - **interactive.js** (with `--out`): `{ pages, totalVisited }` — `pages` is an array of page objects.
- **fetch.js with `--observe`:** streaming snapshot objects `{ tab, originalUrl, currentUrl, title, text, at, event, error? }`. `event` is usually `snapshot`; skipped URLs emit `event: "skipped"`.

Each **page object** has:

| Field   | Type    | Description |
|--------|---------|-------------|
| `url`  | string  | Page URL. |
| `title`| string  | Document title. |
| `text` | string  | Main text (e.g. from `body` or `--selector`). |
| `ok`   | boolean | HTTP success. |
| `error`| string  | Set only on failure. |
| `links`| array   | Optional: follow-up URLs (fetch: `links.best` when `--links`; interactive: `links`). |

- **Single-line JSON (for piping / agents):** Use `--compact`. One line per run, no pretty-print.
- **Appending runs:** Use `--out <file>` and `--append`. New results are merged into the existing file’s `results` array so you can accumulate multiple runs reliably.

Examples:

```bash
# Stdout, pretty-printed (default)
node scripts/url/fetch.js --connect-chrome https://a.com https://b.com

# File, compact (one line) – good for agents
node scripts/url/fetch.js --connect-chrome --out out.json --compact https://a.com

# Append more URLs to an existing file
node scripts/url/fetch.js --connect-chrome --out out.json --append https://c.com https://d.com
```

### Options summary

| Script         | Main options |
|----------------|---------------|
| **fetch.js**   | `--connect-chrome [url]`, `--urls-file <path>`, `--out <path>`, `--compact`, `--append`, `--visited-file <path>`, `--failed-file <path>`, `--retries <n>`, `--wait-until`, `--wait-after-load <ms>`, `--delay-between-pages <ms>`, `--confirm-each-page`, `--selector`, `--timeout`, `--links`, `--links-limit`, `--links-same-site` / `--no-links-same-site`, `--observe`, `--observe-ms`, `--observe-interval`, `--observe-text-limit`, `--observe-close-on-destination`, `--observe-match-threshold`. |
| **interactive.js** | `<start-url>`, `--top <n>`, `--iterations <n>`, `--out <path>`, `--compact`, `--visited-file <path>`, `--connect-chrome [url]`, `--timeout`. |

Used by the **context-add** (research) skill.

---

## 3. Tests and coverage

All tests use **mocks only**: no real Chromium, no real readline, no network. Url tests inject a fake page and (when needed) fake `existsSync` / `readFileSync` / `writeFile` so behavior is deterministic and fast.

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

- **test** — Runs all tests (skills sync + url).
- **test:coverage** — Same with line/branch/function coverage (Node 22+).
- **test:coverage:check** — Exits with error if line coverage is below threshold (90%).

Run a subset:

- **Skills only:** `npm run test:skills --prefix scripts` (or `npm run test:skills` from `scripts/`).
- **Url only:** `npm run test:url --prefix scripts` (or `npm run test:url` from `scripts/`).

### What the tests cover

| Area | Covered |
|------|--------|
| **fetch.js** | `parseArgs` (URLs, `--out`, `--compact`, `--append`, `--links`, `--visited-file`, `--wait-after-load`, `--delay-between-pages`, `--connect-chrome`, etc.); `fetchUrl` (success, goto failure, `res.ok()` false, null response, links extraction and throw); link filtering (example website response: content vs login/images/assets); `run` with **getBrowser** mocks, output shape (`fetched`, `results`), `--compact` single-line JSON, `--append` merge, `--visited-file`. |
| **interactive.js** | `parseInteractiveArgs` (defaults, `--top`, `--iterations`, `--out`, `--compact`, `--visited-file`, pass-through); `pageEntry` (normalized page object, with/without `links`, with `error`); `runInteractive` with **getBrowser**/askFn mocks (quit, follow link, invalid input, max depth, child fetch error, Enter = link 1, `--out` and writeFile mock, multi-page output, valid JSON). |
| **link-filter.js** | `isNoiseUrl`: filters auth paths (login, signin, oauth, etc.), image/asset extensions (jpg, png, gif, svg, pdf, mp4, etc.), asset path segments (/img/, /images/, /static/, /assets/, etc.); allows content pages. |
| **visited.js** | `normalizeVisitedUrl` (strip hash, http(s) only); `loadVisitedSet` (one URL per line, empty when missing); `saveVisitedSet` (sorted, one per line). |
| **context/clear.js, show.js** | `clearContext` / `readContextSummary` (empty context, append/fetch, append again, show, clear, no file, invalid JSON); CLI spawn with `CURSOR_ROOT`; `lastFetched` in summary. **Context-add flow:** fetch with skill-style args (`--wait-after-load`, `--visited-file`, `--out`, `--compact`) write to context and show sees it. |
| **skills/sync.js** | Path names, finding SKILL.md files, install/copy in and out with temp dirs; **install locally** e2e: `run(['in', '-y'])` with temp `CURSOR_DIR`, install from repo `skills/`, assert context-add skill has `{{base:...}}` resolved. |

Tests include **example website responses**: mock pages with a mix of content links, login, images (e.g. `.png`, `/images/`), and static assets; tests assert that `links.best` (fetch) contains only content URLs and that login/image/asset URLs are filtered out.

Everything is exercised without starting Chrome or reading real stdin.
