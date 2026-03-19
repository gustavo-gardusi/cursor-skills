#!/usr/bin/env node
/**
 * Clear research context and visited set so the next context-add starts fresh.
 * Removes or truncates .cursor/research-context.json, .cursor/research-context.txt (if present), and .cursor/research-visited.txt.
 *
 * Usage: node clear.js
 * Env:   CURSOR_ROOT — directory containing .cursor/ (default: process.cwd())
 */

import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CURSOR_ROOT = process.env.CURSOR_ROOT || process.cwd();
const CURSOR_DIR = join(CURSOR_ROOT, '.cursor');
const CONTEXT_FILE = join(CURSOR_DIR, 'research-context.json');
const VISITED_FILE = join(CURSOR_DIR, 'research-visited.txt');

const EMPTY_CONTEXT = { results: [], lastFetched: null };

/**
 * @param {string} [root] - Directory containing the context dir (default CURSOR_ROOT)
 * @param {{ contextDir?: string }} [opts] - contextDir: name of subdir (default '.cursor'); use e.g. 'test-context' in tests to avoid creating .cursor
 */
export function clearContext(root = CURSOR_ROOT, opts = {}) {
  const contextDir = opts.contextDir ?? '.cursor';
  const dir = join(root, contextDir);
  const contextPath = join(dir, 'research-context.json');
  const contextTxtPath = join(dir, 'research-context.txt');
  const visitedPath = join(dir, 'research-visited.txt');
  mkdirSync(dir, { recursive: true });
  writeFileSync(contextPath, JSON.stringify(EMPTY_CONTEXT), 'utf8');
  writeFileSync(visitedPath, '', 'utf8');
  if (existsSync(contextTxtPath)) unlinkSync(contextTxtPath);
  return { cleared: true, contextPath, visitedPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = clearContext();
  console.log('Cleared:', out.contextPath, out.visitedPath);
}
