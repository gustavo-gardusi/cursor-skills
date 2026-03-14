---
name: run-tests
description: >-
  Run the project's test suite. Use when the user wants to run tests, execute
  tests, or check if tests pass.
---

# Run tests

Run the project's test suite using the appropriate runner for the project type.

## Steps

1. **Detect project type** – Check for:
   - `package.json` → npm/yarn/pnpm
   - `Cargo.toml` → Rust (cargo test)
   - `pytest.ini` / `pyproject.toml` / `requirements.txt` → Python (pytest)
   - `go.mod` → Go (go test)
   - `Makefile` → make test
2. **Run tests** – Use the appropriate command:
   - Node: `npm test` or `yarn test` or `pnpm test`
   - Rust: `cargo test`
   - Python: `pytest` or `python -m pytest`
   - Go: `go test ./...`
   - Make: `make test`
3. **Report** – Summarize pass/fail and any failures

## Notes

- Run from project root
- If multiple package managers exist, prefer the lockfile present (package-lock.json, yarn.lock, pnpm-lock.yaml)
- For monorepos, run tests at the root unless the user specifies a package
