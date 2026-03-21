#!/usr/bin/env node
/**
 * Merge one or more "done" results into .cursor/research-context.json.
 * Only call this when a page is finished (success or permanent failure like 404).
 * Dedupes by URL (last wins). Updates lastFetched.
 *
 * Usage:
 *   node append-result.js                    # read JSON from stdin
 *   node append-result.js --file <path>      # read JSON from file
 * Input: single result object or { results: [ ... ] }
 *
 * Env: CURSOR_ROOT — directory containing .cursor/ (default: process.cwd())
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CURSOR_ROOT = process.env.CURSOR_ROOT || process.cwd();
const CURSOR_DIR = join(CURSOR_ROOT, '.cursor');
const CONTEXT_JSON = join(CURSOR_DIR, 'research-context.json');
const VISITED_FILE = join(CURSOR_DIR, 'research-visited.txt');

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

/**
 * @param {object | object[]} input - Single result or { results: [...] }
 * @param {string} [root]
 * @param {{ contextDir?: string }} [opts]
 * @returns {{ merged: number, path: string } | null}
 */
export function appendResult(input, root = CURSOR_ROOT, opts = {}) {
  const contextDir = opts.contextDir ?? '.cursor';
  const jsonPath = join(root, contextDir, 'research-context.json');
  const toAdd = Array.isArray(input) ? input : (input.results || [input]);
  if (toAdd.length === 0) return null;

  let existing = { results: [], lastFetched: null };
  if (existsSync(jsonPath)) {
    try {
      existing = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch {
      /* use empty */
    }
  }
  const byUrl = new Map();
  for (const r of existing.results || []) {
    const n = normalizeUrl(r.url);
    if (n) byUrl.set(n, r);
  }
  const lastFetched = new Date().toISOString();
  for (const r of toAdd) {
    const n = normalizeUrl(r.url);
    if (n) byUrl.set(n, { ...r });
  }
  const results = [...byUrl.values()];
  mkdirSync(join(root, contextDir), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify({ results, lastFetched }, null, 2), 'utf8');

  // Append merged URLs to visited file so they are skipped by fetch if ever re-requested
  const visitedPath = join(root, contextDir, 'research-visited.txt');
  const existingVisited = existsSync(visitedPath) ? readFileSync(visitedPath, 'utf8').trim().split(/\r?\n/).filter(Boolean) : [];
  const visitedSet = new Set(existingVisited);
  for (const r of toAdd) {
    const n = normalizeUrl(r.url);
    if (n) visitedSet.add(n);
  }
  writeFileSync(visitedPath, [...visitedSet].sort().join('\n') + (visitedSet.size ? '\n' : ''), 'utf8');

  return { merged: toAdd.length, path: jsonPath };
}

function main() {
  let input;
  const args = process.argv.slice(2);
  if (args[0] === '--file' && args[1]) {
    input = JSON.parse(readFileSync(args[1], 'utf8'));
  } else {
    const str = readFileSync(0, 'utf8').trim();
    if (!str) {
      console.error('No JSON on stdin. Use --file <path> or pipe JSON.');
      process.exit(1);
    }
    input = JSON.parse(str);
  }
  const out = appendResult(input);
  if (out) console.log('Merged', out.merged, 'result(s) into', out.path);
  else console.error('No results to merge.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
