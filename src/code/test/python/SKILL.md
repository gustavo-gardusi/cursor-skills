---
name: code-test-python
description: >-
  Run Python tests with pytest. Use when user wants to run tests in Python
  projects.
---

# Test Python

Run tests. Check for `pytest.ini`, `pyproject.toml` [tool.pytest], or `requirements*.txt`.

## On invoke

Run from project root. Activate venv if present; use `pytest` (or `python -m pytest`). Report failures and fix or note.

## Commands

- `pytest` or `python -m pytest`
- `pytest path/to/test_file.py` — specific file
- `pytest -k "test_name"` — match by name
- `pytest --cov` — with coverage (pytest-cov)
- `pytest -v` — verbose

## Detection

- pyproject.toml: `[tool.pytest.ini_options]`
- pytest.ini, setup.cfg
- Activate venv first if project has one

## Notes

- Run from project root
- Use project venv: `source .venv/bin/activate` or `source venv/bin/activate`
- Conftest.py for fixtures
