#!/bin/bash
# tests/setup-test-repo.sh

cd "$(dirname "$0")"
mkdir -p test-repo
cd test-repo

# Initialize git
git init
git config user.name "Test User"
git config user.email "test@example.com"
git config commit.gpgsign false

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

# Initial commit on main
git checkout -b main 2>/dev/null || git checkout main
git add .
git commit -m "Initial commit"

# Create a mock origin
cd ..
git init --bare test-repo-remote.git
cd test-repo
git remote add origin ../test-repo-remote.git
git push -u origin main

echo "✅ Test repository setup complete"