#!/bin/bash
# Copy skills/ and skills-cursor/ to ~/.cursor/
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURSOR="$HOME/.cursor"

copy_dir() {
  local from="$1"
  local to="$2"
  [ -d "$from" ] || return
  mkdir -p "$to"
  for dir in "$from"/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    [ -f "$dir/SKILL.md" ] || continue
    mkdir -p "$to/$name"
    cp "$dir/SKILL.md" "$to/$name/SKILL.md"
    echo "Installed: $name"
  done
}

copy_dir "$REPO/skills" "$CURSOR/skills"
copy_dir "$REPO/skills-cursor" "$CURSOR/skills-cursor"
echo "Done."
