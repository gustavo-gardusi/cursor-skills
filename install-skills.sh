#!/bin/bash
# Sync Cursor skills between repo src/ and ~/.cursor/skills-cursor
# Usage:
#   in  (default) — install repo skills into ~/.cursor/skills-cursor
#   out           — sync local ~/.cursor/skills-cursor back into repo src/
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURSOR="$HOME/.cursor"
SRC="$REPO/src"

cmd_usage() {
  echo "Usage: $0 [in|out] [-y]" >&2
  echo "  in  — install repo src/ into ~/.cursor/skills-cursor (default)" >&2
  echo "  out — sync ~/.cursor/skills-cursor into repo src/" >&2
  echo "  -y  — with 'in': clear existing skills without prompting" >&2
  exit 1
}

# --- in: repo src/ → ~/.cursor/skills-cursor
cmd_in() {
  [ -d "$SRC" ] || { echo "src/ not found"; exit 1; }

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

  find "$SRC" -name SKILL.md -type f | while read -r f; do
    rel="${f#$SRC/}"
    skill_dir="${rel%/SKILL.md}"
    skill_name="${skill_dir//\//-}"
    mkdir -p "$CURSOR/skills-cursor/$skill_name"
    cp "$f" "$CURSOR/skills-cursor/$skill_name/SKILL.md"
    echo "Installed: $skill_name"
  done

  echo "Done."
}

# --- out: ~/.cursor/skills-cursor → repo src/
# Only overwrites existing src/ paths (path → skill name: slashes to hyphens)
cmd_out() {
  [ -d "$CURSOR/skills-cursor" ] || { echo "~/.cursor/skills-cursor not found"; exit 1; }
  [ -d "$SRC" ] || { echo "src/ not found"; exit 1; }

  find "$SRC" -name SKILL.md -type f | while read -r f; do
    rel="${f#$SRC/}"
    path="${rel%/SKILL.md}"
    skill_name="${path//\//-}"
    local_skill="$CURSOR/skills-cursor/$skill_name/SKILL.md"
    if [ -f "$local_skill" ]; then
      cp "$local_skill" "$f"
      echo "Synced: $skill_name → src/$path/"
    fi
  done

  echo "Done."
}

# Dispatch
MODE="${1:-in}"
case "$MODE" in
  in)
    shift
    cmd_in "$@"
    ;;
  out)
    cmd_out
    ;;
  -y|--yes)
    cmd_in "-y"
    ;;
  -h|--help)
    cmd_usage
    ;;
  *)
    cmd_usage
    ;;
esac
