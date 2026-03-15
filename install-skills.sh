#!/bin/bash
# Copy src/ to ~/.cursor/skills-cursor
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURSOR="$HOME/.cursor"

[ -d "$REPO/src" ] || { echo "src/ not found"; exit 1; }

CLEAR=0
if [ "$1" = "-y" ] || [ "$1" = "--yes" ]; then
  CLEAR=1
elif [ -d "$CURSOR/skills-cursor" ] && [ -n "$(ls -A "$CURSOR/skills-cursor" 2>/dev/null)" ]; then
  echo "~/.cursor/skills-cursor already has skills."
  echo -n "Clear existing and install fresh? (y/n) "
  read -r answer
  case "$answer" in
    [yY]|[yY][eE][sS]) CLEAR=1 ;;
    *) echo "Keeping existing. Will add/overwrite from repo." ;;
  esac
fi

if [ "$CLEAR" = 1 ]; then
  rm -rf "$CURSOR/skills-cursor"
  echo "Cleared."
fi

mkdir -p "$CURSOR/skills-cursor"

find "$REPO/src" -name SKILL.md -type f | while read -r f; do
  rel="${f#$REPO/src/}"
  skill_dir="${rel%/SKILL.md}"
  skill_name="${skill_dir//\//-}"
  mkdir -p "$CURSOR/skills-cursor/$skill_name"
  cp "$f" "$CURSOR/skills-cursor/$skill_name/SKILL.md"
  echo "Installed: $skill_name"
done

echo "Done."
