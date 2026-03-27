#!/bin/bash
# tests/run-integration-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔗 Running Integration Tests..."

# 1. Setup fresh repo
rm -rf test-repo test-repo-remote.git
bash setup-test-repo.sh
cd test-repo

failed=0

echo "▶️ Testing Scenario A: Clean Tree on Main -> New Branch"
git checkout main
# simulate @gh-start TIS-123
git pull origin main --rebase
git checkout -b tis-123
if [ "$(git branch --show-current)" != "tis-123" ]; then
  echo "❌ Scenario A failed"
  ((failed++))
else
  echo "✅ Scenario A passed"
fi

echo "▶️ Testing Scenario B: Dirty Tree on Main -> New Branch"
git checkout main
echo "console.log('Dirty work');" > src/index.js
# simulate @gh-start TIS-124
git stash -m "gh-start auto-stash"
git pull origin main --rebase
git checkout -b tis-124
git stash pop
if ! grep -q "Dirty work" src/index.js; then
  echo "❌ Scenario B failed (dirty work not preserved)"
  ((failed++))
else
  echo "✅ Scenario B passed"
fi
# clean up for next tests
git checkout .
git clean -fd

echo "▶️ Testing Scenario C: @gh-pull on feature branch"
git checkout main
echo "console.log('Upstream work');" > src/upstream.js
git add . && git commit -m "Upstream" && git push origin main
git checkout tis-124
# simulate @gh-pull
git fetch origin
git merge origin/main -m "Merge upstream"
if ! [ -f src/upstream.js ]; then
  echo "❌ Scenario C failed (upstream file not merged)"
  ((failed++))
else
  echo "✅ Scenario C passed"
fi

if [ $failed -eq 0 ]; then
  echo "🎉 All integration tests passed!"
  exit 0
else
  echo "💥 $failed integration test(s) failed."
  exit 1
fi