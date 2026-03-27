#!/usr/bin/env bash
# install.sh - Install markdown Cursor skills locally

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/skills"
TARGET_DIR="${1:-$HOME/.cursor/skills-cursor}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

need_cmd mkdir
need_cmd cp
need_cmd rm

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: skills directory not found at $SOURCE_DIR" >&2
  exit 1
fi

echo "Installing skills from: $SOURCE_DIR"
echo "Target directory: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

# Keep install deterministic by replacing prior contents.
rm -rf "$TARGET_DIR"/*
cp -R "$SOURCE_DIR"/. "$TARGET_DIR"/

echo "Installation complete."
