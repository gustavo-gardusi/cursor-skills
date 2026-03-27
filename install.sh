#!/bin/bash
# install.sh - Installs Cursor Skills locally

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-}"

echo "📦 Installing scripts dependencies..."
cd "$SCRIPT_DIR/scripts"
npm install --no-fund

echo ""
echo "⚙️  Building and embedding scripts into skills..."
if [ -n "$TARGET_DIR" ]; then
  node build.js "$TARGET_DIR"
else
  node build.js
fi
