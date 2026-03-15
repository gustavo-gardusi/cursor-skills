---
name: test-rust
description: >-
  Run Rust tests with cargo. Use when user wants to run tests in Rust projects.
---

# Test Rust

Run tests. Check for `Cargo.toml`.

## Command

`cargo test`

## Options

- `cargo test test_name` — run specific test
- `cargo test --package pkg` — run package tests
- `cargo test --no-fail-fast` — run all even on failure
- `cargo test --release` — release build

## Notes

- Run from project root
- Tests in `#[cfg(test)]` or `tests/` dir
- Doc tests: `cargo test --doc`
