#!/usr/bin/env node
/**
 * Write a human-readable .txt from .cursor/research-context.json.
 * One block per page with clear spacing; includes URL, title, text, and links.
 * Skills reuse the JSON; this file is for review.
 *
 * Usage: node write-readable.js
 * Env:   CURSOR_ROOT — directory containing .cursor/ (default: process.cwd())
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CURSOR_ROOT = process.env.CURSOR_ROOT || process.cwd();
const CURSOR_DIR = join(CURSOR_ROOT, '.cursor');
const CONTEXT_JSON = join(CURSOR_DIR, 'research-context.json');
const CONTEXT_TXT = join(CURSOR_DIR, 'research-context.txt');

const SEP = '\n\n' + '─'.repeat(60) + '\n\n';

/**
 * @param {string} [root]
 * @param {{ contextDir?: string }} [opts]
 * @returns {{ wrote: boolean, path: string } | null}
 */
export function writeReadableContext(root = CURSOR_ROOT, opts = {}) {
  const contextDir = opts.contextDir ?? '.cursor';
  const jsonPath = join(root, contextDir, 'research-context.json');
  const txtPath = join(root, contextDir, 'research-context.txt');
  if (!existsSync(jsonPath)) return null;
  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch {
    return null;
  }
  const results = data.results || [];
  const lines = [
    `lastFetched: ${data.lastFetched ?? '—'}`,
    `fetched: ${results.length}`,
    '',
  ];
  for (const r of results) {
    lines.push('URL:', r.url || '—', '');
    lines.push('TITLE:', r.title ?? '—', '');
    lines.push('TEXT:');
    lines.push((r.text || '').trim() || '(no text)');
    lines.push('');
    const links = r.links?.best;
    if (links && links.length) {
      lines.push('LINKS:');
      links.forEach((u) => lines.push('  - ' + u));
      lines.push('');
    } else {
      lines.push('LINKS: (none)', '');
    }
    lines.push(SEP.trim());
    lines.push('');
  }
  mkdirSync(join(root, contextDir), { recursive: true });
  writeFileSync(txtPath, lines.join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');
  return { wrote: true, path: txtPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = writeReadableContext();
  if (out) console.log('Wrote:', out.path);
  else console.error('No research-context.json or invalid JSON.');
}
