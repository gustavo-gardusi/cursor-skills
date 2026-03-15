#!/bin/bash
# Copy skills/ and skills-cursor/ to ~/.cursor/
# Supports nested structure: gh/pr/, format/js/, etc.
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURSOR="$HOME/.cursor"

copy_skills() {
  local from="$1"
  local to="$2"
  [ -d "$from" ] || return
  find "$from" -name SKILL.md -type f | while read -r f; do
    rel="${f#$from/}"
    skill_dir="${rel%/SKILL.md}"
    mkdir -p "$to/$skill_dir"
    cp "$f" "$to/$skill_dir/SKILL.md"
    echo "Installed: $skill_dir"
  done
}

copy_skills "$REPO/skills" "$CURSOR/skills"
copy_skills "$REPO/skills-cursor" "$CURSOR/skills-cursor"
echo "Done."
