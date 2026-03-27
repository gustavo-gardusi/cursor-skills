#!/bin/bash
# Validate skill dependencies and references

echo "🔗 Validating skill dependencies..."
echo ""

failed=0
warnings=0

# Build list of all skill names
all_skills=()
for skill in $(find skills -name "SKILL.md"); do
  skill_name=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill" | grep "^name:" | cut -d: -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | sed 's/^@//')
  if [ -n "$skill_name" ]; then
    all_skills+=("$skill_name")
  fi
done

echo "Found ${#all_skills[@]} skills"
echo ""

# Check each skill for valid references
for skill in $(find skills -name "SKILL.md" | sort); do
  skill_name=$(awk '/^---$/{if(++n==2) exit; next} n==1' "$skill" | grep "^name:" | cut -d: -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | sed 's/^@//')
  
  if [ -z "$skill_name" ]; then
    continue
  fi
  
  echo "Checking dependencies for @$skill_name"
  
  # Find all @skill-name references in the content
  refs=$(grep -o '@[a-z][a-z-]*' "$skill" | sed 's/^@//' | sort -u)
  
  if [ -z "$refs" ]; then
    echo "  ✓ No dependencies"
    continue
  fi
  
  has_error=false
  for ref in $refs; do
    # Skip self-references
    if [ "$ref" = "$skill_name" ]; then
      continue
    fi
    
    # Check if referenced skill exists
    found=false
    for existing in "${all_skills[@]}"; do
      if [ "$existing" = "$ref" ]; then
        found=true
        break
      fi
    done
    
    if [ "$found" = false ]; then
      echo "  ❌ Referenced skill @$ref not found"
      ((failed++))
      has_error=true
    fi
  done
  
  if [ "$has_error" = false ]; then
    echo "  ✓ All dependencies valid"
  fi
done

echo ""
echo "=================================="
if [ $failed -eq 0 ]; then
  echo "✅ All dependency tests passed"
  if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings warning(s) found"
  fi
  exit 0
else
  echo "❌ $failed dependency test(s) failed"
  if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings warning(s) found"
  fi
  exit 1
fi
