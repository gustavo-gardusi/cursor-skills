---
name: format-go
description: >-
  Format Go with gofmt. Use when user wants to format Go code or run go fmt.
---

# Format Go

Format with gofmt. Check for `go.mod`.

## Command

`go fmt ./...`

## Alternatives

- `gofumpt` — stricter, if in tools: `go run mvdan.cc/gofumpt -w .`
- `goimports` — adds/removes imports: `go run golang.org/x/tools/cmd/goimports -w .`

## Notes

- Run from project root
- gofmt is built into Go toolchain
- `./...` recurses all packages
