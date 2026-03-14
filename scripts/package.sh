#!/bin/bash
# Create zip of repo (excludes .git)
set -e
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(basename "$REPO")"
cd "$REPO/.."
zip -r "$REPO/${NAME}.zip" "$NAME" -x "${NAME}/.git/*" -x "${NAME}/*.zip"
echo "Created $REPO/${NAME}.zip"
