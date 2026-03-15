---
name: setup-js
description: >-
  Set up JS/Node dev environment. Use when user wants to install Node, pnpm,
  or prepare first-time local environment for JS/TS projects.
---

# Setup JS/Node

First-time setup for Node/JS development.

## macOS (Homebrew)

```bash
# Node (includes npm)
brew install node

# pnpm (faster, preferred)
brew install pnpm

# yarn (optional)
brew install yarn

# nvm (alternative: manage multiple Node versions)
brew install nvm
# Add to shell: mkdir -p ~/.nvm && echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc && echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
```

## Project setup

```bash
cd project
pnpm install   # or npm install / yarn
```

## Verify

```bash
node -v
pnpm -v   # or npm -v
```

## Notes

- Prefer pnpm for speed and disk usage
- Use nvm if project requires specific Node version
- Corepack: `corepack enable` for pnpm/yarn without separate install
