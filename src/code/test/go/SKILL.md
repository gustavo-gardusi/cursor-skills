---
name: code-test-go
description: >-
  Run Go tests. Use when user wants to run tests in Go projects.
---

# Test Go

Run tests. Check for `go.mod`.

## Command

`go test ./...`

## Options

- `go test -v ./...` — verbose
- `go test ./path/to/pkg` — specific package
- `go test -run TestName` — run specific test
- `go test -count=1 ./...` — disable cache
- `go test -race ./...` — race detector

## Notes

- Run from project root
- Tests in `*_test.go` files
- Benchmark: `go test -bench=. ./...`
