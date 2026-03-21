---
name: gh-check
description: >-
  Sole gh skill for local repo health: discover stack from README/CI, prepare
  deps, then format, lint, test, build. Other gh-* skills hand off here (or via
  gh-push §1) for verification.
---

# Check (discover → prepare → evaluate)

**Cursor skill:** **`@gh-check`** — Invoked with **`@gh-check`** in Cursor. **Three phases:** (1) **Discover** what the **open workspace / git checkout** is and what its docs and config say to install and run. (2) **Prepare** (install/build). (3) **Evaluate** (format, lint, tests)—aligned with that project’s README and CI when possible. No **`git commit`**, no **`git push`**, no doc rewrites for publish—that is **`@gh-push`**.

**Responsibility (only this skill):** Owns **inventory of languages/tooling from docs + config**, **dependency install**, **build when needed**, and **all** commands that answer “does **this project** work locally?” (format, lint, test, umbrella **`make check`** / **`npm run check`**, etc.). **This file is the single source of truth** for those commands; other **`gh-*`** skills **link here** instead of listing tool commands.

**Who runs **`@gh-check`:** **`@gh-push`** §1 runs **this skill in full**. **`@gh-start`** reaches checks through **`@gh-push`**. **`@gh-pull`**, **`@gh-main`**, and **`@gh-pr`** focus on git / PR flow—when the tree should be **green**, hand off to **`@gh-check`** or **`@gh-push`**. For verify **without** push, run **`@gh-check`** alone.

**Not for:** git workflows (**`git fetch`**, merge, push, reset)—use **`@gh-pull`**, **`@gh-push`**, **`@gh-main`**, etc.

## On invoke

*`@gh-check`* — Run from the **repository root** (or the **root of the subproject** the user scoped, if they named a package path). **`git commit`** / **`git push`** are out of scope. Installing deps is in scope during **Prepare**.

---

## Workflow

### 1. Discover — read READMEs and configuration (before running installs)

*`@gh-check`* — Treat this as **evidence gathering**. Goal: know **which languages and tools apply** and **what the repo declares as required** to run checks “as the authors intend.”

#### 1a. Documentation (priority order)

Read what exists—**do not assume only `./README.md`**:

- **`README.md`** (root) — Install, Setup, Development, Build, Test, CI, Contributing, Prerequisites.
- **`README.rst`**, **`docs/`** entry READMEs, **`CONTRIBUTING.md`**, **`INSTALL.md`**, **`DEVELOPMENT.md`** when present.
- **Monorepos / workspaces** — If root README points to **`packages/*`**, **`apps/*`**, **`scripts/`**, or nested **`README.md`**, read those for **project-local** install and check commands.

Prefer **documented command order** over generic guesses.

#### 1b. Configuration files (infer languages and tooling)

Scan the repo (at least root; follow **workspace** / **monorepo** layout if obvious) for **signals**—use them to decide **which stacks are “present”** and **which linters/formatters/tests are configured**:

| Area | Example files / patterns |
|------|---------------------------|
| **Node / TS** | `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `.nvmrc`, `.node-version`, `tsconfig.json`, `eslint.config.*`, `.eslintrc*`, `prettier` in package.json or `.prettierrc*`, `vitest.config.*`, `jest.config.*` |
| **Python** | `pyproject.toml`, `requirements*.txt`, `Pipfile`, `poetry.lock`, `setup.cfg`, `tox.ini`, `ruff.toml` / `[tool.ruff]` in pyproject, `.flake8`, `.python-version`, `mypy.ini` / `[tool.mypy]` |
| **Rust** | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `clippy.toml` |
| **Go** | `go.mod`, `go.sum`, `.golangci.*` |
| **Ruby** | `Gemfile`, `Gemfile.lock` |
| **JVM** | `pom.xml`, `build.gradle`, `build.gradle.kts`, `gradle.properties` |
| **.NET** | `*.csproj`, `global.json`, `Directory.Build.props` |
| **Make / task runners** | `Makefile`, `justfile`, `Taskfile.yml` — often define **`check`**, **`test`**, **`lint`** |
| **CI (ground truth for “what must pass”)** | **`.github/workflows/*.yml`**, `.gitlab-ci.yml`, `azure-pipelines.yml`, `Jenkinsfile` — extract **install** and **check/test** steps when readable |

#### 1c. Build a short internal summary (for the agent; report briefly in §8)

- **Languages / stacks present** (e.g. Node + Python scripts only, or full Rust crate).
- **Required toolchain** (from README “Prerequisites”, `rust-toolchain.toml`, `.nvmrc`, etc.).
- **Authoritative check commands** — in order: README explicit steps → **CI workflow** commands → Makefile/`npm run` scripts from **`package.json`** / **`pyproject.toml`** scripts → defaults in later sections.

If **nothing** indicates a language (e.g. docs-only repo), **do not** invent a full Node/Python pipeline—report “no code checks applicable” and stop after sanity checks.

---

### 2. Map gaps (what is missing before prepare)

*`@gh-check`*

From §1, decide what is **missing or incomplete** so preparation is **targeted** (not a blind reinstall every time):

- Lockfile / vendor state vs documented install (e.g. no `node_modules`, Python env not created when README requires `venv`, `cargo` metadata stale).
- **CI expects** a step you have not run yet (e.g. `npm ci` vs `npm install`).

If README and CI **disagree**, prefer **README for local dev** but **call out** the mismatch; optionally note what CI runs for parity.

---

### 3. Prepare — install dependencies and build

*`@gh-check`*

Execute **in the order README documents**. If undocumented, use **minimal** defaults consistent with §1:

- **Node:** lockfile-first (`npm ci`, `yarn install --frozen-lockfile`, `pnpm install --frozen-lockfile`) else `npm install` / `yarn` / `pnpm` as appropriate; respect **workspaces** if `package.json` / pnpm-workspace says so.
- **Python:** `pip install -e .`, `uv sync`, `poetry install`, `pip install -r requirements.txt`, etc., per **`pyproject.toml` / README**.
- **Rust:** `cargo fetch` / `cargo build` as needed for **Clippy** and tests.
- **Go:** `go mod download`; `go build ./...` if tags/README require it.
- **Ruby / JVM / .NET:** follow README or standard project commands when those files exist.

**Before destructive steps** (clean, `rm -rf node_modules`, full venv wipe), confirm from README or with the user.

---

### 4. Evaluate — umbrella check (when the repo defines one)

*`@gh-check`*

After **Prepare**, if README or **CI** defines a **single** entry (e.g. `make check`, `npm run check`, `pnpm run validate`, `task check`), run it **first**:

- If it **passes** and clearly covers analysis + tests for **this project**, you may **skip §5–7** unless README/CI also requires **separate** format/lint steps for parity.
- If it **fails**, capture output; fix may be code, config, or incomplete **Prepare**—do not skip reporting the failing command.

---

### 5. Format (when §4 did not run or did not cover formatting)

*`@gh-check`* — Use **scripts and configs from §1** (Prettier, Ruff format, Black, `cargo fmt`, etc.):

- **Node:** `npm run format`, `npm run fmt`, `pnpm format`, `npx prettier --check .`, `npm run format:check` when present in `package.json`.
- **Rust:** `cargo fmt --check`
- **Python:** `ruff format --check`, `black --check` if configured
- **Go:** `gofmt -l .` or project-documented formatter

Skip only when **no** formatter is configured for that stack.

---

### 6. Lint (static analysis)

*`@gh-check`* — **Must** run stack-appropriate lint when that stack is **present** per §1:

- **Rust:** **`cargo clippy`** — prefer `cargo clippy -- -D warnings` unless README/Cargo/clippy config says otherwise.
- **Python:** Prefer **`ruff check`** when configured; else **`flake8`** when `.flake8` / `tox.ini` / README indicates it; **`pylint`** only if README mandates.
- **Node:** `npm run lint`, `eslint`, `pnpm lint` from `package.json` / eslint config.
- **Go:** `golangci-lint run` or `go vet ./...`

---

### 7. Test

*`@gh-check`*

- **Node:** `npm test`, `pnpm test`, or the **primary** test script from `package.json` / CI.
- **Rust:** `cargo test`
- **Python:** `pytest`, `python -m pytest` as documented
- **Go:** `go test ./...`

---

### 8. Report

*`@gh-check`* — Summarize:

- **What you inferred** from README + config + CI (languages, key files).
- **What you ran** for **Prepare** (install/build).
- **What you ran** for **Evaluate** (umbrella, format, lint, test) and **pass/fail**.

On success, **`@gh-push`** is next when the user wants docs + commit + publish.

---

## Verification

*`@gh-check`*

- [ ] **Read** root README and, if relevant, nested READMEs / CONTRIBUTING.
- [ ] **Scanned** config files enough to know **which languages** and **which tools** (not only “saw `package.json`”).
- [ ] **Checked CI workflows** when present for parity with local checks.
- [ ] **Prepared** before **Evaluate**; **Clippy** / **Ruff or Flake8** / tests ran when applicable.

## Notes

*`@gh-check`*
- If **system** toolchains are missing (`node`, `rustc`, `python3`, `go`), report clearly—the user installs those outside this skill.
- **`@gh-push`** §1 runs **this entire skill** in order; **`@gh-push`** must **not** add extra **`npm test`**, **`cargo clippy`**, etc. beyond this file.
- After **`@gh-pull`** or **`@gh-main`**, if the user asks “is it green?”, **run **`@gh-check`** or **`@gh-push`** next**.
- **`@gh-pr`** PR text **summarizes** verification for reviewers after **`@gh-push`** has run **`@gh-check`**.
