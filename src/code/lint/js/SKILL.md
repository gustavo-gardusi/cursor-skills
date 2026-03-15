---
name: code-lint-js
description: >-
  Lint JS/TS with ESLint or Biome. Use when user wants to lint, check code
  quality, or run ESLint in Node/JS projects.
---

# Lint JS/TS

Run ESLint or Biome. Check package.json for `lint` script or `eslint`/`@biomejs/biome` dependency.

## Commands

- `npm run lint` or `pnpm lint` (prefer project script)
- `npx eslint .` (ESLint)
- `npx @biomejs/biome check .` (Biome)
- Fix: `npx eslint . --fix` or `npx @biomejs/biome check --write .`

## Detection

- package.json: `"lint"` script, `eslint`, `@biomejs/biome` in devDependencies
- Config: `.eslintrc.*`, `eslint.config.js`, `biome.json`

## Notes

- Run from project root
- Biome is faster; use if project has biome.json
