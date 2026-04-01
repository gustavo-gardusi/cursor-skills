#!/usr/bin/env bash
# install.sh - Install markdown Cursor skills locally

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/skills"
DEFAULT_TARGET_DIR="$HOME/.cursor/skills-cursor"
TARGET_DIR="$DEFAULT_TARGET_DIR"
DO_CLEAN=0

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

need_cmd mkdir
need_cmd rm
need_cmd find
need_cmd sort
need_cmd awk

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: skills directory not found at $SOURCE_DIR" >&2
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --clean|clean|--reset|reset)
      DO_CLEAN=1
      ;;
    *)
      if [ "$TARGET_DIR" = "$DEFAULT_TARGET_DIR" ]; then
        TARGET_DIR="$arg"
      else
        echo "Usage: $0 [target_dir] [--clean|clean|--reset|reset]" >&2
        exit 1
      fi
      ;;
  esac
done

echo "Installing skills from: $SOURCE_DIR"
echo "Target directory: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

clean_installed_skills() {
  local skill_dir
  while IFS= read -r skill_dir; do
    rm -rf "$skill_dir"
  done < <(find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -type d -exec test -f "{}/SKILL.md" ';' -print | sort)
}

if [ "$DO_CLEAN" -eq 1 ]; then
  echo "Cleaning installed skills in: $TARGET_DIR"
  clean_installed_skills
fi

rewrite_skill_name() {
  local source_file="$1"
  local output_file="$2"
  local generated_name="$3"

  awk -v generated_name="$generated_name" '
    BEGIN {
      frontmatter_delimiters = 0
      in_frontmatter = 0
      replaced_name = 0
    }
    /^---$/ {
      frontmatter_delimiters++
      if (frontmatter_delimiters == 1) {
        in_frontmatter = 1
      } else if (frontmatter_delimiters == 2) {
        in_frontmatter = 0
      }
      print
      next
    }
    in_frontmatter && /^name:[[:space:]]*/ && replaced_name == 0 {
      print "name: " generated_name
      replaced_name = 1
      next
    }
    { print }
  ' "$source_file" >"$output_file"
}

while IFS= read -r skill_file; do
  relative_path="${skill_file#$SOURCE_DIR/}"
  relative_dir="${relative_path%/SKILL.md}"
  generated_name="${relative_dir//\//-}"

  install_dir="$TARGET_DIR/$generated_name"
  mkdir -p "$install_dir"
  rewrite_skill_name "$skill_file" "$install_dir/SKILL.md" "$generated_name"
done < <(find "$SOURCE_DIR" -type f -name "SKILL.md" | sort)

echo "Installation complete."
