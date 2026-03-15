---
name: code-setup-python
description: >-
  Set up Python dev environment. Use when user wants to install Python,
  create venv, or prepare first-time local environment for Python projects.
---

# Setup Python

First-time setup for Python development.

## macOS (Homebrew)

```bash
# Python
brew install python

# uv (fast package manager, optional)
brew install uv
```

## Virtual environment (venv)

```bash
cd project

# Create venv
python -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Install deps
pip install -r requirements.txt
# or with uv: uv pip install -r requirements.txt
```

## With uv (recommended)

```bash
cd project
uv venv
source .venv/bin/activate
uv pip install -e .
```

## Verify

```bash
python -V
pip -V
which python   # should point to .venv if activated
```

## Notes

- Always use venv for project isolation
- pyproject.toml: `uv pip install -e .` for editable install
- pip-tools: `pip install pip-tools` for requirements.in → requirements.txt
