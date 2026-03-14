#!/bin/bash
# Copy ~/.cursor/skills and ~/.cursor/skills-cursor into repo.
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURSOR="$HOME/.cursor"

sync_dir() {
  local from="$1"
  local to="$2"
  [ -d "$from" ] || { echo "Skipping (not found): $from"; return; }
  mkdir -p "$to"
  for dir in "$from"/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    [ -f "$dir/SKILL.md" ] || continue
    mkdir -p "$to/$name"
    cp "$dir/SKILL.md" "$to/$name/SKILL.md"
    echo "Synced: $name"
  done
}

sync_dir "$CURSOR/skills" "$REPO/skills"
sync_dir "$CURSOR/skills-cursor" "$REPO/skills-cursor"
echo "Done."
