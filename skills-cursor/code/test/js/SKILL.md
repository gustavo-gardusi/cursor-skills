---
name: test-js
description: >-
  Run JS/Node test suite. Use when user wants to run tests in npm, yarn,
  pnpm, or Node projects.
---

# Test JS/Node

Run tests. Check package.json for `test` script.

## Commands

- `npm test` or `npm run test`
- `pnpm test` (prefer if pnpm-lock.yaml exists)
- `yarn test`
- `npx vitest` (Vitest)
- `npx jest` (Jest)
- `npx playwright test` (e2e)

## Detection

- package.json: `"test"` script
- Prefer lockfile: pnpm-lock.yaml → pnpm, else npm

## Notes

- Run from project root
- Monorepo: run at root unless user specifies package
- Watch: `npm test -- --watch` if supported
