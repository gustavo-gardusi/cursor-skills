---
name: setup-go
description: >-
  Set up Go dev environment. Use when user wants to install Go or prepare
  first-time local environment for Go projects.
---

# Setup Go

First-time setup for Go development.

## macOS (Homebrew)

```bash
# Go
brew install go
```

## Environment (optional)

```bash
# Add to ~/.zshrc if needed
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

## Project setup

```bash
cd project
go mod download
go build .
```

## Verify

```bash
go version
go env GOPATH
```

## Notes

- Go 1.16+ uses modules by default; no GOPATH required for most projects
- `go mod init` for new projects
- Tools: `go install golang.org/x/tools/gopls@latest` (LSP)
- staticcheck: `go install honnef.co/go/tools/cmd/staticcheck@latest`
