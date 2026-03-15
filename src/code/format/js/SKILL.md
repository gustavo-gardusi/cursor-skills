---
name: format-js
description: >-
  Format JS/TS/CSS/JSON with Prettier. Use when user wants to format code in
  Node, JavaScript, TypeScript, or frontend projects.
---

# Format JS/TS

Format with Prettier. Check for `prettier` in package.json, `.prettierrc`, or `.prettierrc.json`.

## Commands

- `npx prettier --write .` (npm)
- `pnpm exec prettier --write .` (pnpm)
- `yarn prettier --write .` (yarn)
- For specific files: `npx prettier --write "src/**/*.{ts,tsx}"`

## Detection

- package.json: `"prettier"` in devDependencies or `"format"` script
- Config: `.prettierrc`, `.prettierrc.json`, `prettier.config.js`

## Notes

- Run from project root
- Use `--write` to apply; `--check` only validates
- Prefer project-local over global
