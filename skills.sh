#!/usr/bin/env bash
# Sync Cursor skills: repo src/ ↔ ~/.cursor/skills-cursor
#   skills.sh in [--yes]   retrieve repo skills and install into Cursor
#   skills.sh out          sync local Cursor skills back into repo src/
# Run from repo root.
set -e

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURSOR="${CURSOR_DIR:-$HOME/.cursor}"
SRC="$REPO/src"
DEST="$CURSOR/skills-cursor"

usage() {
  echo "Usage: $0 in [--yes] | out | -h" >&2
  echo "  in       install repo src/ → $DEST (default)" >&2
  echo "  in -y    same, clear existing first (no prompt)" >&2
  echo "  out      sync $DEST → repo src/ (overwrites existing only)" >&2
  exit 1
}

# --- in: repo src/ → Cursor (retrieve + install)
cmd_in() {
  [[ -d "$SRC" ]] || { echo "src/ not found"; exit 1; }

  local clear=0
  if [[ "$1" == "-y" || "$1" == "--yes" ]]; then
    clear=1
  elif [[ -d "$DEST" ]] && [[ -n "$(ls -A "$DEST" 2>/dev/null)" ]]; then
    echo -n "$DEST already has skills. Clear and install fresh? (y/n) "
    read -r answer
    [[ "$answer" =~ ^[yY] ]] && clear=1 || echo "Keeping existing; will add/overwrite."
  fi

  if (( clear )); then
    rm -rf "$DEST"
    echo "Cleared."
  fi
  mkdir -p "$DEST"

  while IFS= read -r -d '' f; do
    rel="${f#$SRC/}"
    path="${rel%/SKILL.md}"
    name="${path//\//-}"
    mkdir -p "$DEST/$name"
    cp "$f" "$DEST/$name/SKILL.md"
    echo "Installed: $name"
  done < <(find "$SRC" -name SKILL.md -type f -print0)

  echo "Done."
}

# --- out: Cursor → repo src/ (overwrite existing paths only)
cmd_out() {
  [[ -d "$DEST" ]] || { echo "$DEST not found"; exit 1; }
  [[ -d "$SRC" ]]  || { echo "src/ not found"; exit 1; }

  while IFS= read -r -d '' f; do
    rel="${f#$SRC/}"
    path="${rel%/SKILL.md}"
    name="${path//\//-}"
    src_file="$DEST/$name/SKILL.md"
    if [[ -f "$src_file" ]]; then
      cp "$src_file" "$f"
      echo "Synced: $name → src/$path/"
    fi
  done < <(find "$SRC" -name SKILL.md -type f -print0)

  echo "Done."
}

# Dispatch
case "${1:-in}" in
  in)  shift; cmd_in "$@" ;;
  out) cmd_out ;;
  -h|--help) usage ;;
  *) usage ;;
esac
