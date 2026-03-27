# Skills Testing Framework

## Overview

Since Cursor skills are markdown files that instruct an AI agent, we cannot use traditional unit testing. Instead, we validate:

1. **Structure** - Skills follow the expected format
2. **Contracts** - Dependencies and references are valid
3. **Behavior** - Skills work in realistic scenarios

---

## Test Categories

### 1. Contract Tests

Validate skill structure and metadata.

#### Checks:
- [ ] YAML frontmatter exists
- [ ] Required fields present: `name`, `description`
- [ ] Internal skills have `visibility: internal`
- [ ] File naming matches skill name
- [ ] All referenced skills exist

#### Implementation:

```bash
#!/bin/bash
# tests/validate-contracts.sh

echo "🔍 Validating skill contracts..."

failed=0

# Check all SKILL.md files
for skill in $(find skills -name "SKILL.md"); do
  echo "Checking $skill"
  
  # Extract frontmatter
  frontmatter=$(sed -n '/^---$/,/^---$/p' "$skill")
  
  # Check for name and description
  if ! echo "$frontmatter" | grep -q "^name:"; then
    echo "  ❌ Missing 'name' field"
    ((failed++))
  fi
  
  if ! echo "$frontmatter" | grep -q "^description:"; then
    echo "  ❌ Missing 'description' field"
    ((failed++))
  fi
  
  # Check internal skills have visibility marker
  if echo "$skill" | grep -q "internal/"; then
    if ! echo "$frontmatter" | grep -q "visibility: internal"; then
      echo "  ⚠️  Internal skill missing 'visibility: internal'"
    fi
  fi
done

if [ $failed -eq 0 ]; then
  echo "✅ All contract tests passed"
  exit 0
else
  echo "❌ $failed contract test(s) failed"
  exit 1
fi
```

---

### 2. Dependency Tests

Validate skill orchestration and references.

#### Checks:
- [ ] All `@skill-name` references point to existing skills
- [ ] All `Depends on:` references are valid
- [ ] No circular dependencies (public skills only)
- [ ] Internal skills only called by public skills (documented)

#### Implementation:

```bash
#!/bin/bash
# tests/validate-dependencies.sh

echo "🔗 Validating skill dependencies..."

failed=0

for skill in $(find skills -name "SKILL.md"); do
  # Extract skill name from frontmatter
  skill_name=$(grep "^name:" "$skill" | cut -d: -f2 | xargs)
  
  echo "Checking dependencies for @$skill_name"
  
  # Find all @skill-name references
  refs=$(grep -o '@[a-z-]*' "$skill" | sort -u)
  
  for ref in $refs; do
    ref_name=${ref#@}  # Remove @
    
    # Check if referenced skill exists
    if ! find skills -name "SKILL.md" -exec grep -l "^name: $ref_name\$" {} \; | grep -q .; then
      echo "  ❌ Referenced skill @$ref_name not found"
      ((failed++))
    fi
  done
done

if [ $failed -eq 0 ]; then
  echo "✅ All dependency tests passed"
  exit 0
else
  echo "❌ $failed dependency test(s) failed"
  exit 1
fi
```

---

### 3. Documentation Tests

Validate documentation completeness.

#### Checks:
- [ ] Each skill has either "Usage" or "Workflow" section
- [ ] Code blocks are properly formatted
- [ ] Links to other files are valid
- [ ] Examples are present where appropriate

#### Implementation:

```bash
#!/bin/bash
# tests/validate-documentation.sh

echo "📚 Validating documentation completeness..."

failed=0

for skill in $(find skills -name "SKILL.md"); do
  skill_name=$(grep "^name:" "$skill" | cut -d: -f2 | xargs)
  
  echo "Checking documentation for @$skill_name"
  
  # Check for usage or workflow section
  if ! grep -qi "## Usage\|## Workflow\|## How it works" "$skill"; then
    echo "  ⚠️  Missing usage/workflow section"
  fi
  
  # Check for unclosed code blocks
  code_blocks=$(grep -c '^```' "$skill")
  if [ $((code_blocks % 2)) -ne 0 ]; then
    echo "  ❌ Unclosed code block"
    ((failed++))
  fi
done

if [ $failed -eq 0 ]; then
  echo "✅ All documentation tests passed"
  exit 0
else
  echo "❌ $failed documentation test(s) failed"
  exit 1
fi
```

---

### 4. Integration Scenarios

Test end-to-end workflows in a controlled environment.

#### Scenarios:

##### A. GitHub Workflow: New Branch → PR
```
Setup: Fresh repo with clean main
Steps:
1. Run @gh-start with ticket "TEST-123"
2. Make a simple code change
3. Run @gh-check
4. Run @gh-push
5. Run @gh-pr

Validation:
- Branch "test-123" exists
- Branch pushed to remote
- PR created with proper title/body
- All checks passed
```

##### B. Context Research: Explore → Plan
```
Setup: Mock browser with sample pages
Steps:
1. Run @context-add with test URLs
2. Run @context-browse
3. Navigate to 2-3 pages
4. Run @context-show
5. Run @context-plan
6. Run @context-execute
7. Run @context-clear

Validation:
- research-queue.json populated
- research-context.json has entries
- research-plan.md created
- Files cleared after @context-clear
```

##### C. GitHub Workflow: Branch Sync
```
Setup: Branch behind main by 2 commits
Steps:
1. Run @gh-pull
2. Introduce merge conflict
3. Verify conflict resolution guidance

Validation:
- Branch updated with main
- Conflicts resolved correctly
- No loss of branch work
```

---

## Test Execution

### Running Tests Locally

```bash
# Run all tests
./tests/run-all-tests.sh

# Run specific category
./tests/validate-contracts.sh
./tests/validate-dependencies.sh
./tests/validate-documentation.sh

# Run integration scenarios (requires test repo setup)
./tests/run-integration-tests.sh
```

### Master Test Runner

Create `tests/run-all-tests.sh`:

```bash
#!/bin/bash
# Master test runner for Cursor Skills

set +e  # Don't exit on first failure, collect all results

echo "🧪 Cursor Skills Test Suite"
echo "============================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

total_failed=0

# Contract tests
echo "📋 Contract Tests"
echo "─────────────────"
if bash "$SCRIPT_DIR/validate-contracts.sh"; then
  contract_status="✅ PASSED"
else
  contract_status="❌ FAILED"
  ((total_failed++))
fi
echo ""

# Dependency tests
echo "🔗 Dependency Tests"
echo "───────────────────"
if bash "$SCRIPT_DIR/validate-dependencies.sh"; then
  dependency_status="✅ PASSED"
else
  dependency_status="❌ FAILED"
  ((total_failed++))
fi
echo ""

# Documentation tests
echo "📚 Documentation Tests"
echo "──────────────────────"
if bash "$SCRIPT_DIR/validate-documentation.sh"; then
  documentation_status="✅ PASSED"
else
  documentation_status="❌ FAILED"
  ((total_failed++))
fi
echo ""

# Integration tests (if configured)
if [ -d "$SCRIPT_DIR/test-repo" ] && [ -f "$SCRIPT_DIR/run-integration-tests.sh" ]; then
  echo "🔗 Integration Tests"
  echo "────────────────────"
  if bash "$SCRIPT_DIR/run-integration-tests.sh"; then
    integration_status="✅ PASSED"
  else
    integration_status="❌ FAILED"
    ((total_failed++))
  fi
  echo ""
else
  integration_status="⏭️  SKIPPED (not configured)"
fi

# Summary
echo "============================"
echo "Test Summary"
echo "============================"
echo "Contract Tests:       $contract_status"
echo "Dependency Tests:     $dependency_status"
echo "Documentation Tests:  $documentation_status"
echo "Integration Tests:    $integration_status"
echo ""

if [ $total_failed -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ $total_failed test suite(s) failed"
  exit 1
fi
```

---

## CI/CD Integration

### GitHub Actions Workflow

We use a GitHub Actions workflow located at `.github/workflows/test.yml`:

```yaml
name: Test Skills

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Make scripts executable
      run: chmod +x tests/*.sh
    
    - name: Run all tests
      run: ./tests/run-all-tests.sh
```

---

## Test Fixtures

### Test Repository Setup

For integration tests, create a minimal test repository:

```bash
tests/test-repo/
├── README.md           # Minimal README
├── package.json        # Node project
├── src/
│   └── index.js        # Simple code
└── .git/               # Git repo
```

Setup script:

```bash
#!/bin/bash
# tests/setup-test-repo.sh

cd tests
mkdir -p test-repo
cd test-repo

# Initialize git
git init
git config user.name "Test User"
git config user.email "test@example.com"

# Create minimal Node project
cat > package.json <<EOF
{
  "name": "test-project",
  "version": "1.0.0",
  "scripts": {
    "test": "echo 'Tests passed'",
    "lint": "echo 'Linting passed'"
  }
}
EOF

# Create minimal code
mkdir -p src
echo "console.log('Hello');" > src/index.js

# Create README
cat > README.md <<EOF
# Test Project

## Setup
\`\`\`bash
npm install
\`\`\`

## Tests
\`\`\`bash
npm test
\`\`\`
EOF

# Initial commit
git add .
git commit -m "Initial commit"

echo "✅ Test repository setup complete"
```

---

## Manual Testing Checklist

For scenarios that can't be easily automated:

### Before Each Release

- [ ] Test `@context-browse` with real GitHub PR
- [ ] Test `@gh-start` with Jira ticket
- [ ] Test `@gh-pr` creates proper description
- [ ] Test `@gh-check` discovers stack correctly
- [ ] Test `@context-plan` Q&A flow
- [ ] Test `@gh-pull` conflict resolution

### After Skill Changes

- [ ] Run contract tests
- [ ] Run dependency tests
- [ ] Test changed skill in real scenario

---

## Continuous Improvement

### Metrics to Track

1. **Skill Quality**
   - Contract test pass rate
   - Documentation completeness score
   - Dependency validity

2. **Usage Patterns**
   - Which skills are used together
   - Common error patterns
   - Feature requests

3. **Integration Health**
   - Scenario success rate
   - Time to complete workflows
   - Failure points

### Test Maintenance

- Review test coverage quarterly
- Add new scenarios as skills evolve
- Update fixtures when platforms change
- Document common failure modes

---

## Future Enhancements

1. **Property-Based Testing**
   - Generate random skill invocations
   - Validate state transitions

2. **Performance Testing**
   - Measure skill execution time
   - Identify bottlenecks in orchestration

3. **Chaos Testing**
   - Simulate network failures
   - Test error recovery paths

4. **Snapshot Testing**
   - Capture expected outputs
   - Detect unintended changes
