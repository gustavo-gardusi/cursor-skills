#!/usr/bin/env node
/**
 * Show a short summary of the current research context (read-only).
 * Reads .cursor/research-context.json and prints count, lastFetched, and URLs.
 * Use after context-add to confirm what was stored.
 *
 * Usage: node show.js
 * Env:   CURSOR_ROOT — directory containing .cursor/ (default: process.cwd())
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CURSOR_ROOT = process.env.CURSOR_ROOT || process.cwd();
const CONTEXT_FILE = join(CURSOR_ROOT, '.cursor', 'research-context.json');

/**
 * @param {string} [root] - Repo root (contains context dir)
 * @param {{ contextDir?: string }} [opts] - contextDir: name of subdir (default '.cursor')
 * @returns {{ count: number, lastFetched: string | null, urls: string[] } | null}
 */
export function readContextSummary(root = CURSOR_ROOT, opts = {}) {
  const contextDir = opts.contextDir ?? '.cursor';
  const path = join(root, contextDir, 'research-context.json');
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw);
    const results = data.results || [];
    return {
      count: results.length,
      lastFetched: data.lastFetched ?? null,
      urls: results.map((r) => r.url).filter(Boolean),
    };
  } catch {
    return null;
  }
}

function formatSummary(summary) {
  if (!summary) return 'No context file or invalid JSON.';
  const lines = [
    `Context: ${summary.count} page(s)`,
    summary.lastFetched ? `Last fetched: ${summary.lastFetched}` : null,
    ...summary.urls.slice(0, 20).map((u, i) => `  ${i + 1}. ${u}`),
    summary.urls.length > 20 ? `  ... and ${summary.urls.length - 20} more` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const summary = readContextSummary();
  console.log(formatSummary(summary));
}
