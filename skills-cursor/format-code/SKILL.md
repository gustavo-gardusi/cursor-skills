---
name: format-code
description: >-
  Format the project's code using the appropriate formatter. Use when the user
  wants to format code, run formatter, or fix formatting.
---

# Format code

Format the project's code using the appropriate formatter for each file type.

## Steps

1. **Detect formatters** – Check for:
   - `prettier` in package.json or `.prettierrc` → JS/TS/CSS/JSON
   - `rustfmt.toml` or Cargo → Rust (rustfmt)
   - `black`, `ruff` in pyproject.toml → Python
   - `gofmt` / `go fmt` for Go
   - `.editorconfig` for hints
2. **Format** – Run the appropriate command:
   - Prettier: `npx prettier --write .` or `pnpm exec prettier --write .`
   - Rust: `cargo fmt`
   - Python: `black .` or `ruff format .`
   - Go: `go fmt ./...`
3. **Scope** – If user specified files/dirs, format only those. Otherwise format the whole project.

## Notes

- Run from project root
- Prefer project-local formatters over global
- For Prettier, use `--write` to apply changes
- If no formatter is configured, suggest adding one rather than guessing
