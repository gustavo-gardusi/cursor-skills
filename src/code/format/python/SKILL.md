---
name: code-format-python
description: >-
  Format Python with ruff or black. Use when user wants to format Python code.
---

# Format Python

Format with ruff or black. Check `pyproject.toml` for `[tool.ruff]` or `[tool.black]`.

## Commands

- `ruff format .` (prefer ruff—faster, includes lint)
- `black .` (if ruff not configured)
- For specific path: `ruff format path/` or `black path/`

## Detection

- pyproject.toml: `[tool.ruff]` or `[tool.black]`
- Prefer ruff if both present

## Notes

- Run from project root
- ruff format is black-compatible
- Use `--check` to validate without writing
