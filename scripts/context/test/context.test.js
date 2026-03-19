/**
 * Integration tests for the context lifecycle: clear → append → show → append → show → clear → confirm.
 * Uses a temp directory as CURSOR_ROOT and the real fetch.run() with a mocked page.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { clearContext } from '../clear.js';
import { readContextSummary } from '../show.js';
import { parseArgs, run as fetchRun } from '../../url/fetch.js';
import { parseArgs as crawlParseArgs, run as crawlRun } from '../../url/crawl.js';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, '..', '..');
const TEST_TMP_BASE = join(__dirname, '..', '.tmp');
const TEST_CONTEXT_DIR = 'test-context'; // avoid creating .cursor in sandbox

function mockPage(overrides = {}) {
  return {
    goto: () => Promise.resolve({ ok: () => true }),
    title: () => Promise.resolve(overrides.title ?? 'Test Page'),
    $: () => Promise.resolve({ innerText: () => Promise.resolve(overrides.text ?? '') }),
    $$eval: () => Promise.resolve([]),
    ...overrides,
  };
}

function mockBrowserWithPage(mockPage) {
  return {
    contexts: () => [{ newPage: async () => mockPage }],
    close: async () => {},
  };
}

describe('context integration', () => {
  test('clear creates .cursor and empty context and visited files', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    try {
      const out = clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      assert.strictEqual(out.cleared, true);
      assert.ok(out.contextPath.endsWith('research-context.json'));
      assert.ok(out.visitedPath.endsWith('research-visited.txt'));

      const contextPath = join(root, TEST_CONTEXT_DIR, 'research-context.json');
      const visitedPath = join(root, TEST_CONTEXT_DIR, 'research-visited.txt');
      assert.ok(existsSync(contextPath));
      assert.ok(existsSync(visitedPath));

      const context = JSON.parse(readFileSync(contextPath, 'utf8'));
      assert.deepStrictEqual(context.results, []);
      assert.strictEqual(context.lastFetched, null);
      assert.strictEqual(readFileSync(visitedPath, 'utf8'), '');
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('clear → append (fetch) → show: one page in context', async () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, TEST_CONTEXT_DIR);
    const contextPath = join(cursorDir, 'research-context.json');
    const visitedPath = join(cursorDir, 'research-visited.txt');

    try {
      clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      const opts = parseArgs([
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact',
        'https://example.com/doc',
      ]);
      const mock = mockPage({ title: 'Doc Page', text: 'Hello' });
      await fetchRun(opts, {
        getBrowser: async () => mockBrowserWithPage(mock),
        writeOutput: (str, path) => writeFileSync(path, str),
      });

      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary);
      assert.strictEqual(summary.count, 1);
      assert.strictEqual(summary.urls[0], 'https://example.com/doc');
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('context-add flow (fetch): skill-style args write to context then show sees it', async () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, TEST_CONTEXT_DIR);
    const contextPath = join(cursorDir, 'research-context.json');
    const visitedPath = join(cursorDir, 'research-visited.txt');

    try {
      clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      const opts = parseArgs([
        '--wait-after-load', '10',
        '--delay-between-pages', '0',
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact',
        'https://doc.example.com/page',
      ]);
      const mock = mockPage({ title: 'Skill-style Fetch', text: 'Content from Chrome script' });
      await fetchRun(opts, {
        getBrowser: async () => mockBrowserWithPage(mock),
        writeOutput: (str, path) => writeFileSync(path, str),
      });
      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary);
      assert.strictEqual(summary.count, 1);
      assert.strictEqual(summary.urls[0], 'https://doc.example.com/page');
      const raw = JSON.parse(readFileSync(contextPath, 'utf8'));
      assert.ok(Array.isArray(raw.results));
      assert.strictEqual(raw.results.length, 1);
      assert.strictEqual(raw.results[0].url, 'https://doc.example.com/page');
      assert.strictEqual(raw.results[0].ok, true);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('context-add flow (crawl): skill-style args write to context then show sees it', async () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, TEST_CONTEXT_DIR);
    const contextPath = join(cursorDir, 'research-context.json');
    const visitedPath = join(cursorDir, 'research-visited.txt');

    try {
      clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      const opts = crawlParseArgs([
        '--wait-after-load', '10',
        '--delay-between-pages', '0',
        '--seeds', 'https://seed-a.com https://seed-b.com',
        '--rounds', '1',
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact',
      ]);
      const mock = mockPage({ title: 'Crawl Page', text: 'BFS content' });
      await crawlRun(opts, {
        getBrowser: async () => mockBrowserWithPage(mock),
        writeOutput: (str, path) => writeFileSync(path, str),
      });
      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary);
      assert.strictEqual(summary.count, 2);
      assert.ok(summary.urls.includes('https://seed-a.com'));
      assert.ok(summary.urls.includes('https://seed-b.com'));
      const raw = JSON.parse(readFileSync(contextPath, 'utf8'));
      assert.ok(Array.isArray(raw.results));
      assert.strictEqual(raw.results.length, 2);
      assert.strictEqual(raw.results[0].ok, true);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('clear → append → append → show: two pages, then clear → show empty', async () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, TEST_CONTEXT_DIR);
    const contextPath = join(cursorDir, 'research-context.json');
    const visitedPath = join(cursorDir, 'research-visited.txt');

    try {
      clearContext(root, { contextDir: TEST_CONTEXT_DIR });

      const writeOut = (str, path) => writeFileSync(path, str);
      const opts1 = parseArgs([
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact',
        'https://a.com',
      ]);
      await fetchRun(opts1, { getBrowser: async () => mockBrowserWithPage(mockPage({ title: 'A' })), writeOutput: writeOut });
      let summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary, 'context file should exist after first append');
      assert.strictEqual(summary.count, 1);
      assert.strictEqual(summary.urls[0], 'https://a.com');

      const opts2 = parseArgs([
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact', '--append',
        'https://b.com',
      ]);
      await fetchRun(opts2, { getBrowser: async () => mockBrowserWithPage(mockPage({ title: 'B' })), writeOutput: writeOut });
      summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.strictEqual(summary.count, 2);
      assert.strictEqual(summary.urls[0], 'https://a.com');
      assert.strictEqual(summary.urls[1], 'https://b.com');

      clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary);
      assert.strictEqual(summary.count, 0);
      assert.strictEqual(summary.urls.length, 0);
      assert.strictEqual(readFileSync(visitedPath, 'utf8'), '');
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('show with no context file returns null', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    try {
      const summary = readContextSummary(root);
      assert.strictEqual(summary, null);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('clear → crawl (seeds) → show: multiple pages from BFS run', async () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const contextPath = join(root, TEST_CONTEXT_DIR, 'research-context.json');
    const visitedPath = join(root, TEST_CONTEXT_DIR, 'research-visited.txt');

    try {
      clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      const opts = crawlParseArgs([
        '--seeds', 'https://seed1.com https://seed2.com',
        '--rounds', '1',
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact',
      ]);
      const mock = mockPage({ title: 'Crawl Page', text: 'Content' });
      await crawlRun(opts, {
        getBrowser: async () => mockBrowserWithPage(mock),
        writeOutput: (str, path) => writeFileSync(path, str),
      });

      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary);
      assert.strictEqual(summary.count, 2);
      assert.ok(summary.urls.includes('https://seed1.com'));
      assert.ok(summary.urls.includes('https://seed2.com'));
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('visited file: second fetch with same URL skipped when using --visited-file', async () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const contextPath = join(root, TEST_CONTEXT_DIR, 'research-context.json');
    const visitedPath = join(root, TEST_CONTEXT_DIR, 'research-visited.txt');

    try {
      clearContext(root, { contextDir: TEST_CONTEXT_DIR });
      const writeOut = (str, path) => writeFileSync(path, str);
      const opts1 = parseArgs([
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact',
        'https://once.com',
      ]);
      await fetchRun(opts1, { getBrowser: async () => mockBrowserWithPage(mockPage({ title: 'Once' })), writeOutput: writeOut });
      assert.strictEqual(readContextSummary(root, { contextDir: TEST_CONTEXT_DIR }).count, 1);

      const opts2 = parseArgs([
        '--out', contextPath,
        '--visited-file', visitedPath,
        '--compact', '--append',
        'https://once.com',
        'https://new.com',
      ]);
      await fetchRun(opts2, { getBrowser: async () => mockBrowserWithPage(mockPage({ title: 'New' })), writeOutput: writeOut });
      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.strictEqual(summary.count, 2, 'only new URL added; visited skipped');
      assert.strictEqual(summary.urls[1], 'https://new.com');
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('show with invalid JSON returns null', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, TEST_CONTEXT_DIR);
    const contextPath = join(cursorDir, 'research-context.json');
    try {
      mkdirSync(cursorDir, { recursive: true });
      writeFileSync(contextPath, 'not json', 'utf8');
      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.strictEqual(summary, null);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('show returns lastFetched when present in context file', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, TEST_CONTEXT_DIR);
    const contextPath = join(cursorDir, 'research-context.json');
    try {
      mkdirSync(cursorDir, { recursive: true });
      const lastFetched = '2025-01-15T12:00:00.000Z';
      writeFileSync(
        contextPath,
        JSON.stringify({
          results: [{ url: 'https://example.com', title: 'Example', text: '', ok: true }],
          lastFetched,
        }),
        'utf8'
      );
      const summary = readContextSummary(root, { contextDir: TEST_CONTEXT_DIR });
      assert.ok(summary);
      assert.strictEqual(summary.lastFetched, lastFetched);
      assert.strictEqual(summary.count, 1);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('clear CLI with CURSOR_ROOT prints cleared paths', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    try {
      clearContext(root, { contextDir: '.cursor' });
    } catch (err) {
      if (err.code === 'EPERM') {
        return; // skip in sandbox when .cursor cannot be created
      }
      throw err;
    }
    try {
      const script = join(SCRIPTS_DIR, 'context', 'clear.js');
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, CURSOR_ROOT: root },
        cwd: SCRIPTS_DIR,
        encoding: 'utf8',
        timeout: 5000,
      });
      assert.strictEqual(result.status, 0);
      assert.ok(result.stdout.includes('Cleared:'));
      assert.ok(result.stdout.includes('research-context.json'));
      assert.ok(result.stdout.includes('research-visited.txt'));
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('show CLI with CURSOR_ROOT prints summary', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    const cursorDir = join(root, '.cursor');
    try {
      mkdirSync(cursorDir, { recursive: true });
    } catch (err) {
      if (err.code === 'EPERM') {
        return; // skip in sandbox when .cursor cannot be created
      }
      throw err;
    }
    try {
      const contextPath = join(cursorDir, 'research-context.json');
      writeFileSync(
        contextPath,
        JSON.stringify({
          results: [{ url: 'https://cli.example.com', title: 'CLI', text: '', ok: true }],
          lastFetched: '2025-02-01T00:00:00.000Z',
        }),
        'utf8'
      );
      const script = join(SCRIPTS_DIR, 'context', 'show.js');
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, CURSOR_ROOT: root },
        cwd: SCRIPTS_DIR,
        encoding: 'utf8',
        timeout: 5000,
      });
      assert.strictEqual(result.status, 0);
      assert.ok(result.stdout.includes('Context: 1 page(s)'));
      assert.ok(result.stdout.includes('Last fetched:'));
      assert.ok(result.stdout.includes('cli.example.com'));
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test('show CLI with no context file prints no-context message', () => {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
    const root = mkdtempSync(join(TEST_TMP_BASE, 'context-int-'));
    try {
      const script = join(SCRIPTS_DIR, 'context', 'show.js');
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, CURSOR_ROOT: root },
        cwd: SCRIPTS_DIR,
        encoding: 'utf8',
        timeout: 5000,
      });
      assert.strictEqual(result.status, 0);
      assert.ok(result.stdout.includes('No context file') || result.stdout.includes('invalid'));
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
