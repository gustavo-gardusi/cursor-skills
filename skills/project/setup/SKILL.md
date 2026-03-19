---
name: project-setup
description: >-
  Inspect repository usage documentation, then run install/build/test validation
  commands to confirm local setup and execution health without relying on git
  operations.
---

# Project setup and validation

**Responsibility:** Read the repo’s README and inferred project conventions, then
run commands needed to install, build, and validate the project locally.
Does not modify git branches or push changes.

## On invoke

Run as a local onboarding or health-check workflow. The goal is to discover and
run the commands that make the project usable on this machine.

## Workflow

### 1. Detect project type

From repo root, check for:
- `package.json`
- `requirements.txt` / `pyproject.toml`
- `Cargo.toml`
- `go.mod`
- `README.md`

### 2. Read README usage sections first

`README.md` takes priority because it reflects the intended local workflow.

- Scan sections/commands for "Install", "Setup", "Build", "Run", "Test",
  "Validation", "Contributing", "Onboard", or similar.
- Before executing anything destructive (e.g. clean/install), read command intent
  in-context.

If README lists explicit commands for install/build/test, run those in that order.

### 3. Install dependencies

If README does not define explicit steps, use standard project defaults:

- Node:
  - Prefer lockfile-specific install (if available in project root):
    - `npm ci` (with `package-lock.json`)
    - `yarn install --frozen-lockfile` (with `yarn.lock`)
    - `pnpm install --frozen-lockfile` (with `pnpm-lock.yaml`)
  - Fallback: `npm install`
- Python:
  - `python -m pip install -r requirements.txt` (if present)
  - `pip install -r requirements.txt` fallback
- Rust:
  - `cargo build`
- Go:
  - `go mod download`

### 4. Build if configured

Prefer README build command if present. Otherwise run common defaults based on files:

- `npm run build`
- `npm run build --workspace .` for workspaces if needed
- `cargo build`
- `go build ./...`

### 5. Validate locally

Run tests and validation commands that are documented in README first; then fallback:

- `npm run test`
- `npm run test:coverage --if-present`
- `cargo test`
- `go test ./...`
- `python -m pytest` (if tests exist and not heavy)

### 6. Report outcome

Capture and summarize:
- install/install-like commands run
- build/test outputs or failures
- commands not run because they were absent or clearly incompatible

If validation fails:
- capture the first failing command
- rerun with the minimum required flags that are already documented by README

## Verification

- [ ] README usage was checked before fallback heuristics.
- [ ] Local install/build/test commands executed (or explicitly skipped with reason).
- [ ] Current run state is reproducible (commands and outputs are listed).

## Notes

- Be conservative: do not invent dependency-management tooling when another command
  is explicitly stated in README.
- Do not assume monorepo layout; check nested READMEs only when a sub-project command
  appears in root README.
- If both README and project files disagree, prefer the README command order as source
  of truth and report the mismatch.
