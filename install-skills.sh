#!/bin/bash
# Copy src/ to ~/.cursor/skills-cursor
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURSOR="$HOME/.cursor"

[ -d "$REPO/src" ] || { echo "src/ not found"; exit 1; }

find "$REPO/src" -name SKILL.md -type f | while read -r f; do
  rel="${f#$REPO/src/}"
  skill_dir="${rel%/SKILL.md}"
  mkdir -p "$CURSOR/skills-cursor/$skill_dir"
  cp "$f" "$CURSOR/skills-cursor/$skill_dir/SKILL.md"
  echo "Installed: $skill_dir"
done

echo "Done."
