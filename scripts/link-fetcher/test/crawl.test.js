import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseArgs, isValidUrl, pickTopX, fetchPage, run } from '../crawl.js';

describe('crawl parseArgs', () => {
  test('parses seeds and depth options', () => {
    const opts = parseArgs(['--seeds', 'https://a.com https://b.com', '--per-page', '5', '--top', '10', '--rounds', '2']);
    assert.strictEqual(opts.seeds.length, 2);
    assert.strictEqual(opts.perPage, 5);
    assert.strictEqual(opts.top, 10);
    assert.strictEqual(opts.rounds, 2);
  });

  test('defaults perPage, top, rounds', () => {
    const opts = parseArgs(['--seeds', 'https://x.com']);
    assert.strictEqual(opts.perPage, 10);
    assert.strictEqual(opts.top, 20);
    assert.strictEqual(opts.rounds, 2);
  });

  test('parses --seeds-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crawl-'));
    const file = join(dir, 'seeds.txt');
    writeFileSync(file, 'https://seed1.com\nhttps://seed2.com\n');
    try {
      const opts = parseArgs(['--seeds-file', file]);
      assert.strictEqual(opts.seeds.length, 2);
      assert.strictEqual(opts.seeds[0], 'https://seed1.com');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('parses --connect-chrome, --timeout, --wait-until, --out', () => {
    const opts = parseArgs([
      '--connect-chrome',
      'http://localhost:9333',
      '--timeout',
      '15000',
      '--wait-until',
      'networkidle',
      '--out',
      'out.json',
      '--seeds',
      'https://s.com',
    ]);
    assert.strictEqual(opts.connectChrome, true);
    assert.strictEqual(opts.cdpUrl, 'http://localhost:9333');
    assert.strictEqual(opts.timeout, 15_000);
    assert.strictEqual(opts.waitUntil, 'networkidle');
    assert.strictEqual(opts.out, 'out.json');
    assert.strictEqual(opts.seeds[0], 'https://s.com');
  });
});

describe('crawl isValidUrl', () => {
  test('accepts http and https', () => {
    assert.strictEqual(isValidUrl('https://example.com'), true);
    assert.strictEqual(isValidUrl('http://example.com/path'), true);
  });

  test('rejects non-http', () => {
    assert.strictEqual(isValidUrl('ftp://x.com'), false);
    assert.strictEqual(isValidUrl('file:///tmp/x'), false);
    assert.strictEqual(isValidUrl('not-a-url'), false);
  });
});

describe('crawl pickTopX', () => {
  test('returns first X unique not already fetched', () => {
    const all = ['https://a.com', 'https://b.com', 'https://a.com', 'https://c.com'];
    const fetched = new Set(['https://a.com']);
    const out = pickTopX(all, fetched, 2);
    assert.strictEqual(out.length, 2);
    assert.strictEqual(out[0], 'https://b.com');
    assert.strictEqual(out[1], 'https://c.com');
  });

  test('returns fewer than X when not enough new', () => {
    const all = ['https://a.com', 'https://b.com'];
    const fetched = new Set(['https://a.com', 'https://b.com']);
    const out = pickTopX(all, fetched, 5);
    assert.strictEqual(out.length, 0);
  });
});

describe('crawl fetchPage', () => {
  test('fetchPage sets error when goto fails', async () => {
    const mockPage = {
      goto: () => Promise.reject(new Error('Crawl nav failed')),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve(null),
    };
    const result = await fetchPage(mockPage, 'http://bad.example', { waitUntil: 'load', timeout: 1000, perPage: 5 });
    assert.strictEqual(result.error, 'Crawl nav failed');
    assert.strictEqual(result.links.length, 0);
  });

  test('fetchPage success path with mock page', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Crawl Mock'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
      $$eval: (_sel, fn, lim) => Promise.resolve(fn([{ href: 'https://example.com' }, { href: 'http://other.org' }], lim)),
    };
    const result = await fetchPage(mockPage, 'http://mock.example', { waitUntil: 'load', timeout: 5000, perPage: 10 });
    assert.strictEqual(result.url, 'http://mock.example');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.title, 'Crawl Mock');
    assert.ok(result.text && result.text.includes('Body'));
    assert.ok(Array.isArray(result.links));
    assert.ok(result.links.length >= 1);
  });
});

describe('crawl run (regression)', () => {
  test('run with getPage mock returns rounds and results', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Crawl Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Content') }),
      $$eval: (_sel, fn, lim) => Promise.resolve(fn([{ href: 'https://next.com' }], lim)),
    };
    const opts = parseArgs(['--seeds', 'https://seed.com', '--rounds', '1', '--per-page', '5', '--top', '10']);
    const out = await run(opts, { getPage: async () => mockPage });
    assert.strictEqual(out.rounds, 1);
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results.length, 1);
    assert.strictEqual(out.results[0].url, 'https://seed.com');
    assert.strictEqual(out.results[0].title, 'Crawl Page');
  });

  test('run with empty seeds throws when getPage provided', async () => {
    const mockPage = {};
    await assert.rejects(
      () =>
        run(
          { seeds: [], perPage: 10, top: 20, rounds: 2, waitUntil: 'load', timeout: 5000 },
          { getPage: async () => mockPage }
        ),
      /Usage:/
    );
  });

  test('run with getBrowser mock returns results (no real Chromium)', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Crawl getBrowser'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('C') }),
      $$eval: (_s, fn, lim) => Promise.resolve(fn([], lim)),
    };
    const mockBrowser = {
      contexts: () => [],
      newContext: async () => ({ newPage: async () => mockPage }),
      close: async () => {},
    };
    const opts = parseArgs(['--seeds', 'https://s.org', '--rounds', '1']);
    const out = await run(opts, { getBrowser: async () => mockBrowser });
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results[0].title, 'Crawl getBrowser');
  });
});
