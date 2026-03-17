---
name: code-lint-python
description: >-
  Lint Python with ruff or pylint. Use when user wants to lint Python code.
---

# Lint Python

Run ruff or pylint. Check `pyproject.toml` for `[tool.ruff]` or `[tool.pylint]`.

## On invoke

Run from project root. Prefer `ruff check .`; use `--fix` if user wants auto-fix. Report failures and fix or note.

## Commands

- `ruff check .` (prefer ruff—fast, comprehensive)
- `ruff check . --fix` — auto-fix
- `pylint src/` (if ruff not configured)

## Detection

- pyproject.toml: `[tool.ruff]` or `[tool.pylint]`
- Prefer ruff; it replaces flake8, isort, and more

## Notes

- Run from project root
- ruff check + ruff format cover most needs
- Use `--fix` for auto-fixable issues
