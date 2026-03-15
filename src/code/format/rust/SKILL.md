---
name: format-rust
description: >-
  Format Rust with rustfmt. Use when user wants to format Rust code or run
  cargo fmt.
---

# Format Rust

Format with rustfmt. Check for `Cargo.toml`.

## Command

`cargo fmt`

## Options

- `cargo fmt -- --check` — check only, no write
- `cargo fmt -- path/to/file.rs` — specific path

## Config

- `rustfmt.toml` or `[rustfmt]` in Cargo.toml for options

## Notes

- Run from project root
- rustfmt is included with rustup
