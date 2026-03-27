#!/bin/bash
# Validate skill contracts and structure

echo "🔍 Validating skill contracts..."
echo ""

failed=0
warnings=0

# Check all SKILL.md files
for skill in $(find skills -name "SKILL.md" | sort); do
  skill_dir=$(dirname "$skill")
  leaf=$(basename "$skill_dir")
  parent=$(basename $(dirname "$skill_dir"))
  grandparent=$(basename $(dirname $(dirname "$skill_dir")))
  if [ "$grandparent" = "internal" ]; then
    expected_dir_name="$leaf"
  elif [ "$parent" = "gh" ] || [ "$parent" = "context" ]; then
    expected_dir_name="${parent}-${leaf}"
  else
    expected_dir_name="$leaf"
  fi
  echo "Checking $skill"
  
  # Extract frontmatter (lines between first and second ---)
  frontmatter=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill")
  
  if [ -z "$frontmatter" ]; then
    echo "  ❌ Missing YAML frontmatter"
    ((failed++))
    continue
  fi
  
  # Check for required fields
  if ! echo "$frontmatter" | grep -q "^name:"; then
    echo "  ❌ Missing 'name' field in frontmatter"
    ((failed++))
  fi
  
  if ! echo "$frontmatter" | grep -q "^description:"; then
    echo "  ❌ Missing 'description' field in frontmatter"
    ((failed++))
  fi
  
  # Check internal skills have visibility marker
  if echo "$skill" | grep -q "skills/internal/"; then
    if ! echo "$frontmatter" | grep -q "visibility: internal"; then
      echo "  ⚠️  Internal skill should have 'visibility: internal'"
      ((warnings++))
    fi
  fi
  
  # Validate naming consistency
    frontmatter_name=$(echo "$frontmatter" | grep "^name:" | cut -d: -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  if [ -n "$frontmatter_name" ]; then
    # Remove @ prefix if present and compare
    clean_name=$(echo "$frontmatter_name" | sed 's/^@//')
    if [ "$clean_name" != "$expected_dir_name" ]; then
      echo "  ⚠️  Name '$clean_name' doesn't match expected directory name '$expected_dir_name'"
      ((warnings++))
    fi
  fi
  
  # Check for basic structure
  if ! grep -qi "## .*\(usage\|workflow\|purpose\|how it works\)" "$skill"; then
    echo "  ⚠️  Missing usage/workflow section"
    ((warnings++))
  fi
  
  echo "  ✓ Contract valid"
done

echo ""
echo "=================================="
if [ $failed -eq 0 ]; then
  echo "✅ All contract tests passed"
  if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings warning(s) found"
  fi
  exit 0
else
  echo "❌ $failed contract test(s) failed"
  if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings warning(s) found"
  fi
  exit 1
fi
