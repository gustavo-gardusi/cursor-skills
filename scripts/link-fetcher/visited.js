/**
 * Visited-URL set: load/save from a file (one URL per line) for link-fetcher scripts.
 * Format is LLM-friendly: plain text, one URL per line, easy to grep or feed to a model.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

function isValidUrl(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Normalize for dedupe: absolute http(s) URL without hash; null for invalid or non-http(s). */
export function normalizeVisitedUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Load a set of visited URLs from a file (one URL per line).
 * @param {string} path - File path
 * @param {{ readFileSync?: typeof readFileSync, existsSync?: typeof existsSync }} [deps]
 * @returns {Set<string>}
 */
export function loadVisitedSet(path, deps = {}) {
  const read = deps.readFileSync ?? readFileSync;
  const exists = deps.existsSync ?? existsSync;
  const set = new Set();
  if (!path || !exists(path)) return set;
  try {
    const text = read(path, 'utf8');
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const norm = normalizeVisitedUrl(line);
      if (norm) set.add(norm);
    }
  } catch {
    /* ignore; return empty set */
  }
  return set;
}

/**
 * Write visited set to file (one URL per line, sorted for stable output and LLM readability).
 * @param {string} path - File path
 * @param {Set<string>} set - URLs to write
 * @param {{ writeFileSync?: typeof writeFileSync }} [deps]
 */
export function saveVisitedSet(path, set, deps = {}) {
  if (!path || !set.size) return;
  const write = deps.writeFileSync ?? writeFileSync;
  const lines = [...set].sort();
  write(path, lines.join('\n') + '\n', 'utf8');
}
