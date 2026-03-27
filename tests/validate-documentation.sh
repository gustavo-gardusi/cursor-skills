#!/bin/bash
# Validate documentation completeness and quality

echo "📚 Validating documentation completeness..."
echo ""

failed=0
warnings=0

for skill in $(find skills -name "SKILL.md" | sort); do
  skill_name=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill" | grep "^name:" | cut -d: -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  
  if [ -z "$skill_name" ]; then
    skill_name="unknown"
  fi
  
  echo "Checking documentation for $skill_name"
  
  # Check for usage or workflow section
  if ! grep -qi "## .*\(usage\|workflow\|how it works\|execution\)" "$skill"; then
    echo "  ⚠️  Missing usage/workflow section"
    ((warnings++))
  fi
  
  # Check for unclosed code blocks
  code_blocks=$(grep -c '^```' "$skill")
  if [ $((code_blocks % 2)) -ne 0 ]; then
    echo "  ❌ Unclosed code block (found $code_blocks backtick lines)"
    ((failed++))
  fi
  
  # Check for broken internal links (links to other SKILL.md files)
  broken_links=$(grep -o '\[.*\](.*\.md)' "$skill" | grep -v '^http' | while read -r link; do
    # Extract path from markdown link
    path=$(echo "$link" | sed 's/.*(\(.*\))/\1/')
    
    # Resolve relative to skill directory
    skill_dir=$(dirname "$skill")
    resolved_path="$skill_dir/$path"
    
    if [ ! -f "$resolved_path" ]; then
      echo "$path"
    fi
  done)
  
  if [ -n "$broken_links" ]; then
    echo "  ⚠️  Potentially broken links found"
    ((warnings++))
  fi
  
  # Check for description length (should be meaningful)
  description=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill" | awk '/^description:/{flag=1; next} /^[-a-zA-Z0-9_]+:/{flag=0} flag' | paste -sd " " -)
  if [ -z "$description" ]; then
    # Fallback if it's on the same line
    description=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill" | grep "^description:" | cut -d: -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  fi
  if [ "$description" = ">-" ] || [ "$description" = ">" ] || [ "$description" = "|" ]; then
    description=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill" | awk '/^description:/{flag=1; next} /^[a-z]/{flag=0} flag' | paste -sd " " -)
  fi
  if [ -n "$description" ]; then
    desc_length=${#description}
    if [ $desc_length -lt 20 ]; then
      echo "  ⚠️  Description is very short ($desc_length chars)"
      ((warnings++))
    fi
  fi
  
  echo "  ✓ Documentation structure valid"
done

echo ""
echo "=================================="
if [ $failed -eq 0 ]; then
  echo "✅ All documentation tests passed"
  if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings warning(s) found"
  fi
  exit 0
else
  echo "❌ $failed documentation test(s) failed"
  if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings warning(s) found"
  fi
  exit 1
fi
