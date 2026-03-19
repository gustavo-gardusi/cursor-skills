#!/usr/bin/env node
/**
 * Run tests with coverage and fail if line coverage is below threshold.
 * Default 90%; pass a number to override (e.g. node check-coverage.js 87).
 * Usage: node check-coverage.js [min%]
 */

import { spawnSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIN_LINE = parseInt(process.argv[2] || '90', 10);

const result = spawnSync(
  process.execPath,
  [
    '--experimental-test-coverage',
    '--test',
    'skills/test/sync.test.js',
    'skills/test/skills-validate.test.js',
    'url/test/visited.test.js',
    'url/test/link-filter.test.js',
    'url/test/fetch.test.js',
    'url/test/crawl.test.js',
    'url/test/interactive.test.js',
    'context/test/context.test.js',
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
