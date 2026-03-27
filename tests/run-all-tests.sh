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
if [ -f "$SCRIPT_DIR/run-integration-tests.sh" ]; then
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
