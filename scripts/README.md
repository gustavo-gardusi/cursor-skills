# Scripts

Runnable **helpers** for this repository: **skill sync**, **url** (Chrome-driven fetch), and **context** utilities. One `package.json` in `scripts/`; no per-folder READMEs. **Unit tests** exercise those scripts (mostly mocked—fast, no real browser). **Integration:** a **skill installer** test runs the same install path as `sync in`, writes every skill under a Cursor-style tree, and asserts each file matches committed expected output (see [Install integration (skill installer)](#install-integration-skill-installer)).

## Contents

1. [Skills vs scripts](#skills-vs-scripts)
2. [What lives in `scripts/`](#what-lives-in-scripts)
3. [Install (dependencies)](#install)
4. [Run from repo root](#run-from-repo-root)
5. [Skills sync](#skills-sync)
6. [Url scripts](#url-scripts)
7. [Tests and coverage](#tests-and-coverage)
8. [CI and repository automation](#ci-and-repository-automation)

---

## Skills vs scripts

**Skills are not copies of `scripts/`.** Each skill is a **`SKILL.md`** in the repo’s **`skills/`** tree (instructions for the Cursor agent). **`scripts/`** holds **programs** the agent or you run from the shell.

- **`gh-*` skills** are **markdown only** at runtime. They do not need Node or this repo’s `scripts/` on the machine beyond what **`gh`** and **git** provide.
- **Context skills** (**`context-add`**, etc.) call into **`scripts/url/`** and **`scripts/context/`**. In repo sources, paths appear as placeholders such as **`{{base:scripts/url}}`**. They are **not** inlined as full script source.

**Install (`sync in`):** The sync tool copies each skill into **`~/.cursor/skills-cursor/<skill-name>/SKILL.md`** (one folder per skill) and **rewrites** **`{{base:…}}`** to the **absolute path** to **this** clone (e.g. `{{base:scripts/url}}` → `/…/cursor-skills/scripts/url`). So:

- Keep the **cursor-skills** clone **on disk** where you want those paths to point; move the folder → **re-run `sync in`**.
- On that clone, run **`npm install --prefix scripts`** once so **`fetch.js`**, Playwright, and tests work. **Context** skills then work from **any** Cursor workspace the agent opens.

Optional **`{{embed:…}}`** can paste small file fragments at install time; the usual pattern is **`{{base:…}}`** → path under **`scripts/`**.

---

## What lives in `scripts/`

- **`skills/`**
  - Sync skills **into** / **out of** **`~/.cursor/skills-cursor/`**; validate **`SKILL.md`** files; **installer integration test** (see [Tests and coverage](#tests-and-coverage)).
- **`url/`**
  - Chrome-driven fetch (retry, link filter, observe mode, interactive crawl).
- **`context/`**
  - Merge/clear/show research context files under a workspace’s **`.cursor/`**.

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

All of these can be run from the **repository root** (each item: what → command):

- **Sync skills into Cursor**  
  - `node scripts/skills/sync.js in`
- **Sync skills, clear first**  
  - `node scripts/skills/sync.js in -y`
- **Copy Cursor skills back to repo**  
  - `node scripts/skills/sync.js out`
- **Run fetch (url)**  
  - `node scripts/url/fetch.js [options] url1 [url2 ...]`
- **Run fetch interactive**  
  - `node scripts/url/interactive.js [options] <start-url>`
- **Clear research context**  
  - `node scripts/context/clear.js` (optional: `CURSOR_ROOT`)
- **Show context summary**  
  - `node scripts/context/show.js` (optional: `CURSOR_ROOT`)
- **Run all tests**  
  - `npm test --prefix scripts`
- **Install integration test** (`doInstall` vs fixtures)  
  - `npm run test:install --prefix scripts`
- **Regenerate install fixtures**  
  - `npm run regen:install-fixtures --prefix scripts`
- **Run context integration tests**  
  - `npm run test:context --prefix scripts`
- **Run tests with coverage**  
  - `npm run test:coverage --prefix scripts`
- **Check coverage threshold**  
  - `npm run test:coverage:check --prefix scripts`

**Same via `package.json` aliases** (from repo root):

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

## Skills sync

Syncs **skills/** ↔ **~/.cursor/skills-cursor** so Cursor Agent can use them.

- **`node scripts/skills/sync.js in`** — Copy repo skills into Cursor (add/overwrite).
- **`node scripts/skills/sync.js in -y`** — Same, but clear existing skills first (no prompt).
- **`node scripts/skills/sync.js out`** — Copy from Cursor back into **skills/**.

**Env (optional):** `SKILLS_SOURCE_DIR` and `CURSOR_DIR` override source and destination (used in tests).

**Placeholders (sync in only):** When installing, sync replaces `{{base:path}}` with the absolute path into **this** clone (e.g. `{{base:scripts/url}}` → `…/cursor-skills/scripts/url`), and `{{embed:path}}` with the file content. Details: [Skills vs scripts](#skills-vs-scripts).

**Validate install output:** Run **`npm run test:install`** (from repo root: **`npm run test:install --prefix scripts`**) — same code path as a real install, see [Install integration (skill installer)](#install-integration-skill-installer).

---

## Url scripts

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

- **context-add**
  - Open URL tabs, monitor each tab as pages change, classify blockers vs destination, and call **`append-result.js`** once the page is at the expected destination (or terminal blocker).
  - Only done pages go into **`.cursor/research-context.json`**.
- **context-plan**
  - Does **not** run url scripts.
  - Reads **`.cursor/research-context.json`** (read-only) and the repo (read-only). Writes **`.cursor/research-plan.md`** only.
- **context-execute**
  - Does **not** run url scripts.
  - Reads **`.cursor/research-plan.md`** and applies the plan to the repo (edits source/config).
- **context-show**
  - Read-only. Show current context summary (count, `lastFetched`, URLs). Use after context-add.
  - Can run `node scripts/context/show.js` (or set **`CURSOR_ROOT`**).
- **context-clear**
  - Clears **`.cursor/research-context.json`** and **`.cursor/research-visited.txt`**.
  - Can run `node scripts/context/clear.js` (or set **`CURSOR_ROOT`**).

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

To use a different browser binary/icon while keeping the same profile, set `--browser-channel chromium|chrome|firefox` (or `BROWSER_CHANNEL=...`). Example:
```bash
BROWSER_CHANNEL=chromium node scripts/url/fetch.js --out pages.json --compact URL
```

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
# Monitor blocker states (login/SSO/permission prompts) while staying attached to dedicated tabs
node scripts/url/fetch.js --observe --observe-close-on-destination --observe-ms 0 --observe-max-ms 600000 --observe-interval 2000 URL1 [URL2 ...]

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

- **`url`** (string) — Page URL.
- **`title`** (string) — Document title.
- **`text`** (string) — Main text (e.g. from `body` or `--selector`).
- **`ok`** (boolean) — HTTP success.
- **`error`** (string) — Set only on failure.
- **`links`** (array) — Optional follow-up URLs (fetch: **`links.best`** when **`--links`**; interactive: **`links`**).

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

- **`fetch.js`** — Main flags include: `--connect-chrome [url]`, `--browser-channel <chrome|chromium|firefox>`, `--urls-file <path>`, `--out <path>`, `--compact`, `--append`, `--visited-file <path>`, `--failed-file <path>`, `--retries <n>`, `--wait-until`, `--wait-after-load <ms>`, `--delay-between-pages <ms>`, `--confirm-each-page`, `--selector`, `--timeout`, `--links`, `--links-limit`, `--links-same-site` / `--no-links-same-site`, `--observe`, `--observe-ms`, `--observe-max-ms`, `--observe-interval`, `--observe-text-limit`, `--observe-close-on-destination`, `--observe-match-threshold`.
- **`interactive.js`** — `<start-url>`, `--top <n>`, `--iterations <n>`, `--out <path>`, `--compact`, `--visited-file <path>`, `--connect-chrome [url]`, `--timeout`.

Used by the **context-add** (research) skill.

---

## Tests and coverage

**Model:** **`scripts/`** are **helpers** (sync, fetch, context). **Unit-style tests** check that logic with **mocks** where possible—fast, deterministic, no real Chrome or network for most suites. **One integration test** is the **skill installer**: it runs the **same `doInstall` path** as **`node skills/sync.js in`**, writes **every** skill into a **Cursor-style** directory tree, and **compares** each generated **`SKILL.md`** to a **committed expected file**. That proves “install locally → output matches what we expect” without touching your real **`~/.cursor`**.

### Unit tests (and fast integration)

These run under **`npm test`** together with the installer test:

- **`skills/test/sync.test.js`** — `processContent`, `{{base:…}}`, link rewrite, **`cmdIn` / `cmdOut`** behavior (temp dirs).
- **`skills/test/skills-validate.test.js`** — Every repo **`skills/**/SKILL.md`** has valid frontmatter and required mentions where applicable.
- **`url/test/*.test.js`** — `fetch`, `interactive`, `link-filter`, `visited` with **mocked** browser and filesystem.
- **`context/test/context.test.js`** — Clear → append → show → clear; visited file; no real Chrome.

**Coverage run (`npm run test:coverage`):** Uses Node’s experimental coverage over the suites listed in **`package.json`** (today: **does not** include **`install-integration.test.js`**). Use **`npm test`** for the **full** picture including the installer.

### Install integration (skill installer)

**Script:** `skills/test/install-integration.test.js`  
**Command:** `npm run test:install` (or `npm run test:install --prefix scripts` from repo root).

**What it does:**

1. Sets **`CURSOR_DIR`** to a **temporary** directory (your real **`~/.cursor`** is **not** modified).
2. Runs **`doInstall()`** from **`skills/sync.js`** — the **same** routine **`sync in`** uses — so skills are written to **`<temp>/skills-cursor/<name>/SKILL.md`** (mirroring **`~/.cursor/skills-cursor/`** on your machine).
3. For each skill under repo **`skills/`**, reads the installed file, normalizes the clone path to **`__REPO_ROOT__`**, and **`assert.strictEqual`** against **`skills/test/fixtures/install-expected/<name>.md`**.

So: **installer runs locally (in CI too) → every skill’s installed markdown must match the expected snapshot.** If you change **`skills/`** or **`sync.js`** on purpose, refresh snapshots: **`npm run regen:install-fixtures`** from **`scripts/`**, review the git diff, commit **`fixtures/install-expected/`**.

### Running integration tests

From the **repository root**:

```bash
npm run test:install --prefix scripts    # skill installer only (doInstall vs install-expected/*.md)
npm run test:context --prefix scripts    # context clear → append → show flows (no real Chrome)
npm test --prefix scripts                # full suite: unit + url (mocked) + context + skill installer
```

From **`scripts/`**:

```bash
npm run test:install
npm run test:context
npm test
```

**Skill installer:** Uses a **temp** `CURSOR_DIR`—your real **`~/.cursor`** is untouched. Fails if installed **`SKILL.md`** output drifts from **`fixtures/install-expected/`**; after intentional **`skills/`** or **`sync.js`** changes, run **`npm run regen:install-fixtures`** (from **`scripts/`**, or **`npm run regen:install-fixtures --prefix scripts`** from root), review the diff, then commit updated fixtures.

**Context:** Exercises **`context/*.js`** and CLI behavior with temp **`.cursor/`** dirs (still no browser).

### Fixture files (`install-expected/`)

Files under **`skills/test/fixtures/install-expected/*.md`** are **not** documentation for end users. They are **regression baselines** for the **installer** so link rewriting and **`{{base:…}}` / `{{embed:…}}`** cannot silently drift.

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

**`npm` scripts** (run with `--prefix scripts` from repo root, or from **`scripts/`** without the prefix):

- **`test`** — Unit suites + **skill installer** integration (`install-integration.test.js`) + url + context.
- **`test:install`** — **Skill installer only** — `doInstall` vs `fixtures/install-expected/*.md`.
- **`test:skills`** — Sync tests + skills-validate + **skill installer**.
- **`regen:install-fixtures`** — Regenerate `fixtures/install-expected/*.md` after intentional `skills/` or `sync.js` changes.
- **`test:url`** — Url tests only.
- **`test:context`** — Context integration only.
- **`test:coverage`** — Coverage over the suites in `package.json` (see note above).
- **`test:coverage:check`** — Fail if line coverage is below 90%.

### CI and repository automation

- **GitHub Actions** — Workflow **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)** runs on **push** and **pull requests** to **`main`** (and **workflow_dispatch**):
  1. Check out the repo.
  2. **Node LTS** with npm cache for **`scripts/package-lock.json`**.
  3. **`npm ci`** in **`scripts/`**.
  4. **`npm test`** — full suite (**sync**, **skills-validate**, **skill installer** integration, **url**, **context**).
  5. **`npm run test:coverage:check`** — fails if line coverage is below **90%**.
- **Dependabot** — Weekly npm updates for **`scripts/`**: **[`dependabot.yml`](../.github/dependabot.yml)** (repo root).

Badges on the main **[README](../README.md)** point here for **tests** and **coverage** status; the numbers (e.g. 149 tests) match whatever **`npm test`** runs today.
