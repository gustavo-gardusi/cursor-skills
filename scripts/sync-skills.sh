#!/bin/bash
# Copy ~/.cursor/skills and ~/.cursor/skills-cursor into repo.
# Supports nested structure: gh/pr/, code/format/js/, etc.
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURSOR="$HOME/.cursor"

sync_skills() {
  local from="$1"
  local to="$2"
  [ -d "$from" ] || { echo "Skipping (not found): $from"; return; }
  find "$from" -name SKILL.md -type f | while read -r f; do
    rel="${f#$from/}"
    skill_dir="${rel%/SKILL.md}"
    mkdir -p "$to/$skill_dir"
    cp "$f" "$to/$skill_dir/SKILL.md"
    echo "Synced: $skill_dir"
  done
}

sync_skills "$CURSOR/skills" "$REPO/skills"
sync_skills "$CURSOR/skills-cursor" "$REPO/skills-cursor"
echo "Done."
