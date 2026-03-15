---
name: code-lint-rust
description: >-
  Lint Rust with clippy. Use when user wants to lint or check Rust code.
---

# Lint Rust

Run clippy. Check for `Cargo.toml`.

## Command

`cargo clippy`

## Options

- `cargo clippy --fix` — auto-fix where possible
- `cargo clippy -- -W clippy::all` — stricter
- `cargo clippy --no-deps` — skip dev deps

## Config

- `clippy.toml` or `[lints.clippy]` in Cargo.toml

## Notes

- Run from project root
- clippy is included with rustup: `rustup component add clippy`
