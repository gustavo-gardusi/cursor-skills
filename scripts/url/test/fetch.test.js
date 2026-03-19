import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseArgs, fetchUrl, run, isValidUrl, normalizeUrl, sameSite } from '../fetch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Returns a mock browser (for tests) that yields the given page from contexts()[0].newPage(). */
function mockBrowserWithPage(mockPage) {
  return {
    contexts: () => [{ newPage: async () => mockPage }],
    close: async () => {},
  };
}

describe('fetch isValidUrl, normalizeUrl, sameSite', () => {
  test('isValidUrl returns false for non-string or empty', () => {
    assert.strictEqual(isValidUrl(null), false);
    assert.strictEqual(isValidUrl(undefined), false);
    assert.strictEqual(isValidUrl(''), false);
    assert.strictEqual(isValidUrl(42), false);
  });

  test('isValidUrl returns false for invalid URL (catch)', () => {
    assert.strictEqual(isValidUrl('not-a-url'), false);
    assert.strictEqual(isValidUrl('http://['), false);
  });

  test('isValidUrl returns true for http/https', () => {
    assert.strictEqual(isValidUrl('http://a.com'), true);
    assert.strictEqual(isValidUrl('https://b.com'), true);
  });

  test('normalizeUrl returns null for invalid base (catch)', () => {
    assert.strictEqual(normalizeUrl('http://example.com', 'not-a-valid-base'), null);
  });

  test('normalizeUrl strips hash and returns href', () => {
    assert.strictEqual(normalizeUrl('https://a.com/p#x', 'https://a.com'), 'https://a.com/p');
  });

  test('sameSite returns false for invalid URL (catch)', () => {
    assert.strictEqual(sameSite('http://a.com', 'not-url'), false);
    assert.strictEqual(sameSite('x', 'http://b.com'), false);
  });

  test('sameSite returns true for same origin', () => {
    assert.strictEqual(sameSite('http://a.com/1', 'http://a.com/2'), true);
  });
});

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

  test('parses --visited-file', () => {
    const opts = parseArgs(['--visited-file', '/path/visited.txt', 'https://x.com']);
    assert.strictEqual(opts.visitedFile, '/path/visited.txt');
  });

  test('parses --confirm-each-page and defaults wait-after-load to 3000', () => {
    const opts = parseArgs(['--confirm-each-page', 'https://x.com']);
    assert.strictEqual(opts.confirmEachPage, true);
    assert.strictEqual(opts.waitAfterLoad, 3000);
  });

  test('parses --confirm-each-page with explicit wait-after-load', () => {
    const opts = parseArgs(['--confirm-each-page', '--wait-after-load', '5000', 'https://x.com']);
    assert.strictEqual(opts.waitAfterLoad, 5000);
  });

  test('parses --wait-after-load and --delay-between-pages', () => {
    const opts = parseArgs(['--wait-after-load', '2000', '--delay-between-pages', '3000', 'https://x.com']);
    assert.strictEqual(opts.waitAfterLoad, 2000);
    assert.strictEqual(opts.delayBetweenPages, 3000);
  });

  test('parses --retries and --failed-file', () => {
    const opts = parseArgs(['--retries', '5', '--failed-file', '/f.txt', 'https://x.com']);
    assert.strictEqual(opts.retries, 5);
    assert.strictEqual(opts.failedFile, '/f.txt');
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

  test('fetchUrl with opts.links filters images and out-of-scope from best (example website response)', async () => {
    const pageUrl = 'https://docs.example.com/';
    const mockAnchors = [
      { href: 'https://docs.example.com/getting-started' },
      { href: 'https://docs.example.com/api/reference' },
      { href: 'https://docs.example.com/login' },
      { href: 'https://docs.example.com/images/hero.png' },
      { href: 'https://docs.example.com/static/logo.svg' },
      { href: 'https://docs.example.com/img/banner.jpg' },
      { href: 'https://docs.example.com/assets/style.css' },
      { href: 'https://docs.example.com/blog/post-1' },
    ];
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Docs'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Welcome') }),
      $$eval: (_sel, fn, base) => Promise.resolve(fn(mockAnchors, base)),
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
    const best = result.links.best;
    assert.ok(best.some((u) => u.includes('getting-started')), 'best includes content page');
    assert.ok(best.some((u) => u.includes('api/reference')), 'best includes content page');
    assert.ok(best.some((u) => u.includes('blog/post-1')), 'best includes content page');
    assert.ok(!best.some((u) => u.includes('login')), 'best excludes login');
    assert.ok(!best.some((u) => u.includes('.png') || u.includes('images/')), 'best excludes image URL');
    assert.ok(!best.some((u) => u.includes('static/') || u.includes('logo.svg')), 'best excludes static asset');
    assert.ok(!best.some((u) => u.includes('img/') || u.includes('.jpg')), 'best excludes img path');
    assert.ok(!best.some((u) => u.includes('assets/')), 'best excludes assets path');
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

  test('fetchUrl with opts.links and invalid base yields empty normalized links', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) => Promise.resolve(fn([{ href: 'http://example.com/page' }], base)),
    };
    const result = await fetchUrl(mockPage, 'invalid-base', {
      waitUntil: 'load',
      timeout: 5000,
      links: true,
      linksLimit: 10,
      linksSameSite: true,
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.links, { all: [], best: [] });
  });

  test('fetchUrl with opts.links and $$eval throw uses empty links (catch path)', async () => {
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
  test('run with getBrowser mock returns fetched results for each URL', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Page Title'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
    };
    const opts = parseArgs(['https://u1.com', 'https://u2.com']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    assert.strictEqual(out.fetched, 2);
    assert.strictEqual(out.results.length, 2);
    assert.strictEqual(out.results[0].url, 'https://u1.com');
    assert.strictEqual(out.results[0].title, 'Page Title');
    assert.strictEqual(out.results[1].url, 'https://u2.com');
  });

  test('run with empty urls throws when getBrowser provided', async () => {
    const mockPage = {};
    await assert.rejects(
      () => run({ urls: [], waitUntil: 'load', timeout: 5000 }, { getBrowser: async () => mockBrowserWithPage(mockPage) }),
      /Usage:/
    );
  });

  test('run with empty urls and no getBrowser exits 1 (spawn)', () => {
    const script = join(__dirname, '..', 'fetch.js');
    const result = spawnSync(process.execPath, [script], {
      cwd: join(__dirname, '..', '..'),
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.strictEqual(result.status, 1);
    assert.ok(result.stderr && result.stderr.includes('Usage:'));
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

  test('run with getBrowser uses contexts()[0] when present', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('From context'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const mockContext = { newPage: async () => mockPage };
    const mockBrowser = {
      contexts: () => [mockContext],
      close: async () => {},
    };
    const opts = parseArgs(['https://ctx.org']);
    const out = await run(opts, { getBrowser: async () => mockBrowser });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results[0].title, 'From context');
  });

  test('run with --append and corrupt existing JSON overwrites with current run', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Only'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['--out', '/any/out.json', '--append', 'https://only.com']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      existsSync: () => true,
      readFileSync: () => 'not valid json {{{',
    });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results.length, 1);
    assert.strictEqual(out.results[0].url, 'https://only.com');
  });

  test('fetchUrl with waitAfterLoad waits before extracting', async () => {
    const start = Date.now();
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Title'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
    };
    const result = await fetchUrl(mockPage, 'https://w.com', {
      waitUntil: 'load',
      timeout: 5000,
      waitAfterLoad: 50,
    });
    assert.strictEqual(result.title, 'Title');
    assert.strictEqual(result.text, 'Body');
    assert.ok(Date.now() - start >= 45, 'waitAfterLoad respected');
  });

  test('run output shape: fetched and results array with url, title, text, ok', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Page Title'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
    };
    const opts = parseArgs(['https://u.com']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
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
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
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
      getBrowser: async () => mockBrowserWithPage(mockPage),
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
      getBrowser: async () => mockBrowserWithPage(mockPage),
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
      getBrowser: async () => mockBrowserWithPage(mockPage),
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
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    const str = JSON.stringify(out);
    assert.doesNotThrow(() => JSON.parse(str));
    const parsed = JSON.parse(str);
    assert.strictEqual(parsed.fetched, 1);
    assert.strictEqual(parsed.results[0].url, 'https://j.com');
  });

  test('run with confirmEachPage and askProceed false stops after first page', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('First'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['--confirm-each-page', 'https://a.com', 'https://b.com']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      askProceed: async () => false,
    });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results[0].url, 'https://a.com');
  });

  test('run with delayBetweenPages waits between URLs when not confirming', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('P'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const start = Date.now();
    const opts = parseArgs(['https://x.com', 'https://y.com', '--delay-between-pages', '50']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    assert.strictEqual(out.fetched, 2);
    assert.ok(Date.now() - start >= 45, 'delayBetweenPages respected');
  });

  test('run with confirmEachPage and askProceed continues when user says yes', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('P1'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    let askCount = 0;
    const opts = parseArgs(['--confirm-each-page', 'https://a.com', 'https://b.com']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      askProceed: async () => {
        askCount++;
        return true;
      },
    });
    assert.strictEqual(out.fetched, 2);
    assert.strictEqual(askCount, 1);
  });

  test('run with writeOutput dep calls callback with serialized output', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('T'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const opts = parseArgs(['https://out.com', '--out', '/path/out.json', '--compact']);
    let writtenStr = null;
    let writtenPath = null;
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      writeOutput: (str, path) => {
        writtenStr = str;
        writtenPath = path;
      },
    });
    assert.strictEqual(out.fetched, 1);
    assert.ok(writtenStr !== null);
    assert.strictEqual(writtenPath, '/path/out.json');
    const parsed = JSON.parse(writtenStr);
    assert.strictEqual(parsed.fetched, 1);
    assert.strictEqual(parsed.results[0].url, 'https://out.com');
  });

  test('run with --visited-file skips URLs in file and writes set at end', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const written = {};
    const opts = parseArgs(['--visited-file', '/v.txt', 'https://already.com', 'https://new.com']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      existsSync: (p) => p === '/v.txt',
      readFileSync: (p) => (p === '/v.txt' ? 'https://already.com\n' : ''),
      writeFileSync: (p, data) => { written[p] = data; },
    });
    assert.strictEqual(out.fetched, 1);
    assert.strictEqual(out.results[0].url, 'https://new.com');
    assert.ok('/v.txt' in written);
    const lines = written['/v.txt'].trim().split('\n').sort();
    assert.ok(lines.some((u) => u.startsWith('https://already.com')), 'visited file should contain already.com');
    assert.ok(lines.some((u) => u.startsWith('https://new.com')), 'visited file should contain new.com');
  });

  test('run retries on non-OK response and writes failed URLs to --failed-file', async () => {
    const mockPage = {
      goto: (url) => Promise.resolve({ ok: () => url === 'https://good.com' }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
    };
    const written = {};
    const opts = parseArgs([
      '--visited-file', '/v.txt', '--failed-file', '/f.txt', '--retries', '2',
      'https://bad.com', 'https://good.com',
    ]);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      writeFileSync: (p, data) => { written[p] = data; },
    });
    assert.strictEqual(out.results.length, 2);
    assert.strictEqual(out.results[0].ok, false);
    assert.strictEqual(out.results[1].ok, true);
    assert.deepStrictEqual(out.failed, ['https://bad.com']);
    assert.strictEqual(written['/f.txt'].trim(), 'https://bad.com');
    assert.ok(written['/v.txt'].includes('https://good.com'));
    assert.ok(!written['/v.txt'].includes('https://bad.com'));
  });
});
