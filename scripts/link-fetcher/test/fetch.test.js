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

  test('parses --links, --links-limit, --links-same-site', () => {
    const opts = parseArgs(['--links', 'https://a.com']);
    assert.strictEqual(opts.links, true);
    assert.strictEqual(opts.linksLimit, 50);
    assert.strictEqual(opts.linksSameSite, true);
  });

  test('parses --links-limit and --no-links-same-site', () => {
    const opts = parseArgs(['--links', '--links-limit', '20', '--no-links-same-site', 'https://b.com']);
    assert.strictEqual(opts.linksLimit, 20);
    assert.strictEqual(opts.linksSameSite, false);
  });

  test('parses --compact and --append', () => {
    const opts = parseArgs(['--compact', '--append', '--out', 'out.json', 'https://x.com']);
    assert.strictEqual(opts.compact, true);
    assert.strictEqual(opts.append, true);
    assert.strictEqual(opts.out, 'out.json');
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

  test('fetchUrl with opts.links extracts links.all and links.best', async () => {
    const pageUrl = 'https://example.com/';
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Example'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Hello') }),
      $$eval: (sel, fn, base) =>
        Promise.resolve(
          fn(
            [
              { href: 'https://example.com/foo' },
              { href: 'https://example.com/bar' },
              { href: 'https://other.com/baz' },
              { href: 'https://example.com/login' },
            ],
            base
          )
        ),
    };
    const result = await fetchUrl(mockPage, pageUrl, {
      waitUntil: 'load',
      timeout: 5000,
      links: true,
      linksLimit: 50,
      linksSameSite: true,
    });
    assert.strictEqual(result.ok, true);
    assert.ok(Array.isArray(result.links.all));
    assert.ok(Array.isArray(result.links.best));
    assert.ok(result.links.all.length >= 3);
    assert.ok(result.links.best.length <= result.links.all.length);
    assert.ok(result.links.all.includes('https://example.com/foo'));
    assert.ok(result.links.all.includes('https://example.com/bar'));
    assert.ok(result.links.all.includes('https://other.com/baz'));
    assert.ok(result.links.best.every((u) => u.startsWith('https://example.com/')));
    assert.ok(!result.links.best.some((u) => u.includes('login')));
  });

  test('fetchUrl without opts.links does not set result.links', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('No Links'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const result = await fetchUrl(mockPage, 'http://mock.example', { waitUntil: 'load', timeout: 5000 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual('links' in result, false);
  });

  test('fetchUrl sets ok false when response is not ok (e.g. 404)', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => false }),
      title: () => Promise.resolve('Not Found'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('404') }),
    };
    const result = await fetchUrl(mockPage, 'http://example.com/missing', { waitUntil: 'load', timeout: 5000 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.title, 'Not Found');
    assert.strictEqual(result.text, '404');
    assert.strictEqual(result.error, null);
  });

  test('fetchUrl sets ok false when goto returns null', async () => {
    const mockPage = {
      goto: () => Promise.resolve(null),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const result = await fetchUrl(mockPage, 'http://example.com', { waitUntil: 'load', timeout: 5000 });
    assert.strictEqual(result.ok, false);
  });

  test('fetchUrl with opts.links and $$eval throw uses empty links', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.reject(new Error('No anchors')),
    };
    const result = await fetchUrl(mockPage, 'https://example.com/', {
      waitUntil: 'load',
      timeout: 5000,
      links: true,
      linksLimit: 10,
      linksSameSite: true,
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.links, { all: [], best: [] });
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

  test('run output shape: fetched and results array with url, title, text, ok', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Page Title'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
    };
    const opts = parseArgs(['https://u.com']);
    const out = await run(opts, { getPage: async () => mockPage });
    assert.strictEqual(typeof out.fetched, 'number');
    assert.strictEqual(out.fetched, 1);
    assert.ok(Array.isArray(out.results));
    assert.strictEqual(out.results[0].url, 'https://u.com');
    assert.strictEqual(out.results[0].title, 'Page Title');
    assert.strictEqual(out.results[0].text, 'Body');
    assert.strictEqual(out.results[0].ok, true);
    assert.strictEqual(out.results[0].error, null);
  });

  test('run with --compact returns object suitable for single-line JSON', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('T'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['https://c.com', '--compact']);
    const out = await run(opts, { getPage: async () => mockPage });
    const oneLine = JSON.stringify(out);
    assert.ok(!oneLine.includes('\n'));
    const parsed = JSON.parse(oneLine);
    assert.strictEqual(parsed.fetched, 1);
    assert.strictEqual(parsed.results[0].url, 'https://c.com');
  });

  test('run with --out and --append merges into existing file', async () => {
    const existing = { fetched: 1, results: [{ url: 'https://first.com', title: 'First', text: 'x', ok: true, error: null }] };
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Second'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('y') }),
    };
    const opts = parseArgs(['--out', '/any/path/out.json', '--append', 'https://second.com']);
    const out = await run(opts, {
      getPage: async () => mockPage,
      existsSync: () => true,
      readFileSync: () => JSON.stringify(existing),
    });
    assert.strictEqual(out.fetched, 2);
    assert.strictEqual(out.results.length, 2);
    assert.strictEqual(out.results[0].url, 'https://first.com');
    assert.strictEqual(out.results[1].url, 'https://second.com');
  });

  test('run with --append but file does not exist returns current run only', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Only'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['--out', '/nonexistent.json', '--append', 'https://only.com']);
    const out = await run(opts, {
      getPage: async () => mockPage,
      existsSync: () => false,
    });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results[0].url, 'https://only.com');
  });

  test('run with --append and invalid existing JSON overwrites with current run', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('New'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['--out', '/any.json', '--append', 'https://new.com']);
    const out = await run(opts, {
      getPage: async () => mockPage,
      existsSync: () => true,
      readFileSync: () => 'not valid json',
    });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results[0].url, 'https://new.com');
  });

  test('run output is valid JSON when serialized', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('T'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['https://j.com']);
    const out = await run(opts, { getPage: async () => mockPage });
    const str = JSON.stringify(out);
    assert.doesNotThrow(() => JSON.parse(str));
    const parsed = JSON.parse(str);
    assert.strictEqual(parsed.fetched, 1);
    assert.strictEqual(parsed.results[0].url, 'https://j.com');
  });
});
