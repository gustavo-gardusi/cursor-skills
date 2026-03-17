---
name: code-lint-go
description: >-
  Lint Go with go vet or staticcheck. Use when user wants to lint or vet Go code.
---

# Lint Go

Run go vet or staticcheck. Check for `go.mod`.

## On invoke

Run from project root. Prefer golangci-lint if `.golangci.yml` exists; else `go vet ./...`. Report failures and fix or note.

## Commands

- `go vet ./...` (built-in)
- `staticcheck ./...` (if installed: `go install honnef.co/go/tools/cmd/staticcheck@latest`)
- `golangci-lint run` (if configured—aggregates many linters)

## Detection

- `.golangci.yml` or `.golangci.yaml` → use golangci-lint
- Else use `go vet ./...`

## Notes

- Run from project root
- go vet catches common bugs
- staticcheck adds more checks
