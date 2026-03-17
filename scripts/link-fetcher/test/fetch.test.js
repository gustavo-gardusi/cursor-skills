import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseArgs, fetchUrl, run } from '../fetch.js';

describe('fetch parseArgs', () => {
  test('parses URLs and options', () => {
    const opts = parseArgs(['https://a.com', 'https://b.com']);
    assert.strictEqual(opts.urls.length, 2);
    assert.strictEqual(opts.urls[0], 'https://a.com');
    assert.strictEqual(opts.waitUntil, 'load');
    assert.strictEqual(opts.timeout, 30_000);
  });

  test('parses --timeout and --selector', () => {
    const opts = parseArgs(['--timeout', '5000', '--selector', 'main', 'https://x.com']);
    assert.strictEqual(opts.timeout, 5000);
    assert.strictEqual(opts.selector, 'main');
    assert.strictEqual(opts.urls[0], 'https://x.com');
  });

  test('parses --urls-file and loads URLs from file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lf-'));
    const file = join(dir, 'urls.txt');
    writeFileSync(file, 'https://one.com\nhttps://two.com\n');
    try {
      const opts = parseArgs(['--urls-file', file]);
      assert.strictEqual(opts.urlsFile, file);
      assert.strictEqual(opts.urls.length, 2);
      assert.strictEqual(opts.urls[0], 'https://one.com');
      assert.strictEqual(opts.urls[1], 'https://two.com');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('ignores non-URL args', () => {
    const opts = parseArgs(['--timeout', '100', 'foo', 'https://u.com']);
    assert.strictEqual(opts.urls.length, 1);
    assert.strictEqual(opts.urls[0], 'https://u.com');
  });

  test('parses --connect-chrome and optional URL', () => {
    const opts = parseArgs(['--connect-chrome', 'https://a.com', 'https://b.com']);
    assert.strictEqual(opts.connectChrome, true);
    assert.strictEqual(opts.cdpUrl, 'https://a.com');
    assert.strictEqual(opts.urls.length, 1);
    assert.strictEqual(opts.urls[0], 'https://b.com');
  });

  test('parses --out', () => {
    const opts = parseArgs(['--out', '/tmp/out.json', 'https://x.com']);
    assert.strictEqual(opts.out, '/tmp/out.json');
    assert.strictEqual(opts.urls[0], 'https://x.com');
  });

  test('parses --connect-chrome without following URL', () => {
    const opts = parseArgs(['--connect-chrome', 'https://only-url.com']);
    assert.strictEqual(opts.connectChrome, true);
    assert.strictEqual(opts.cdpUrl, 'https://only-url.com');
    assert.strictEqual(opts.urls.length, 0);
  });

  test('parses --connect-chrome with no next arg (cdpUrl undefined)', () => {
    const opts = parseArgs(['--connect-chrome']);
    assert.strictEqual(opts.connectChrome, true);
    assert.strictEqual(opts.cdpUrl, undefined);
  });
});

describe('fetch fetchUrl', () => {
  test('fetchUrl sets error when page.goto fails', async () => {
    const mockPage = {
      goto: () => Promise.reject(new Error('Navigation failed')),
      title: () => Promise.resolve(''),
    };
    const result = await fetchUrl(mockPage, 'http://invalid.example', { waitUntil: 'load', timeout: 1000 });
    assert.strictEqual(result.url, 'http://invalid.example');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error, 'Navigation failed');
  });

  test('fetchUrl success path with mock page', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Mock Title'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Mock body text') }),
    };
    const result = await fetchUrl(mockPage, 'http://mock.example', { waitUntil: 'load', timeout: 5000, selector: 'body' });
    assert.strictEqual(result.url, 'http://mock.example');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.title, 'Mock Title');
    assert.strictEqual(result.text, 'Mock body text');
    assert.strictEqual(result.error, null);
  });

  test('fetchUrl selector throws uses null text', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.reject(new Error('No selector')),
    };
    const result = await fetchUrl(mockPage, 'http://mock.example', { waitUntil: 'load', timeout: 5000, selector: 'main' });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.text, null);
  });
});

describe('fetch run (regression)', () => {
  test('run with getPage mock returns fetched results for each URL', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Page Title'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
    };
    const opts = parseArgs(['https://u1.com', 'https://u2.com']);
    const out = await run(opts, { getPage: async () => mockPage });
    assert.strictEqual(out.fetched, 2);
    assert.strictEqual(out.results.length, 2);
    assert.strictEqual(out.results[0].url, 'https://u1.com');
    assert.strictEqual(out.results[0].title, 'Page Title');
    assert.strictEqual(out.results[1].url, 'https://u2.com');
  });

  test('run with empty urls throws when getPage provided', async () => {
    const mockPage = {};
    await assert.rejects(
      () => run({ urls: [], waitUntil: 'load', timeout: 5000 }, { getPage: async () => mockPage }),
      /Usage:/
    );
  });

  test('run with getBrowser mock returns results (no real Chromium)', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('From getBrowser'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Text') }),
    };
    const mockBrowser = {
      contexts: () => [],
      newContext: async () => ({ newPage: async () => mockPage }),
      close: async () => {},
    };
    const opts = parseArgs(['https://one.org']);
    const out = await run(opts, { getBrowser: async () => mockBrowser });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results[0].title, 'From getBrowser');
  });
});
