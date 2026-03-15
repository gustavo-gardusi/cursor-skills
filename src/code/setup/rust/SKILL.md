---
name: code-setup-rust
description: >-
  Set up Rust dev environment. Use when user wants to install Rust, cargo,
  or prepare first-time local environment for Rust projects.
---

# Setup Rust

First-time setup for Rust development.

## macOS (Homebrew)

```bash
# Rust (includes rustc, cargo, rustfmt, clippy)
brew install rustup-init
rustup-init -y

# Or direct
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

## Components

```bash
rustup component add rustfmt clippy
```

## Project setup

```bash
cd project
cargo build
```

## Verify

```bash
rustc -V
cargo -V
```

## Notes

- rustup manages toolchains; use `rustup default stable`
- Add to PATH: `~/.cargo/bin` (rustup adds automatically)
- For wasm: `rustup target add wasm32-unknown-unknown`
