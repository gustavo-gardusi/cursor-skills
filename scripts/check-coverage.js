#!/usr/bin/env node
/**
 * Run tests with coverage and fail if line coverage is below 80%.
 * Usage: node check-coverage.js [min%]
 */

import { spawnSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIN_LINE = parseInt(process.argv[2] || '80', 10);

const result = spawnSync(
  process.execPath,
  [
    '--experimental-test-coverage',
    '--test',
    'skills/test/sync.test.js',
    'link-fetcher/test/visited.test.js',
    'link-fetcher/test/link-filter.test.js',
    'link-fetcher/test/fetch.test.js',
    'link-fetcher/test/crawl.test.js',
    'link-fetcher/test/interactive.test.js',
  ],
  {
    cwd: __dirname,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    timeout: 90_000,
  }
);

const out = (result.stdout || '') + (result.stderr || '');
const match = out.match(/all files\s*\|\s*([\d.]+)/);
const linePct = match ? parseFloat(match[1]) : 0;

if (result.status !== 0) {
  process.stderr.write(out);
  process.exit(result.status);
}

if (linePct < MIN_LINE) {
  process.stderr.write(`Line coverage ${linePct.toFixed(2)}% is below ${MIN_LINE}%. Run: npm run test:coverage\n`);
  process.exit(1);
}

process.stdout.write(`Line coverage ${linePct.toFixed(2)}% >= ${MIN_LINE}%\n`);
process.exit(0);
