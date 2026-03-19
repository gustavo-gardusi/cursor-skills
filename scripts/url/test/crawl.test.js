import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parseArgs, isValidUrl, linksForNextRound, fetchPage, run } from '../crawl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function mockBrowserWithPage(mockPage) {
  return {
    contexts: () => [{ newPage: async () => mockPage }],
    close: async () => {},
  };
}

describe('crawl parseArgs', () => {
  test('parses seeds and rounds', () => {
    const opts = parseArgs(['--seeds', 'https://a.com https://b.com', '--rounds', '2']);
    assert.strictEqual(opts.seeds.length, 2);
    assert.strictEqual(opts.rounds, 2);
  });

  test('defaults rounds', () => {
    const opts = parseArgs(['--seeds', 'https://x.com']);
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

  test('parses --compact and --append', () => {
    const opts = parseArgs(['--seeds', 'https://x.com', '--out', 'crawl.json', '--compact', '--append']);
    assert.strictEqual(opts.compact, true);
    assert.strictEqual(opts.append, true);
    assert.strictEqual(opts.out, 'crawl.json');
  });

  test('parses --visited-file', () => {
    const opts = parseArgs(['--seeds', 'https://x.com', '--visited-file', 'visited.txt']);
    assert.strictEqual(opts.visitedFile, 'visited.txt');
  });

  test('parses --retries and --failed-file', () => {
    const opts = parseArgs(['--seeds', 'https://x.com', '--retries', '4', '--failed-file', 'failed.txt']);
    assert.strictEqual(opts.retries, 4);
    assert.strictEqual(opts.failedFile, 'failed.txt');
  });

  test('parses --confirm-each-page and defaults wait-after-load to 3000', () => {
    const opts = parseArgs(['--seeds', 'https://x.com', '--confirm-each-page']);
    assert.strictEqual(opts.confirmEachPage, true);
    assert.strictEqual(opts.waitAfterLoad, 3000);
  });

  test('parses --wait-after-load and --delay-between-pages', () => {
    const opts = parseArgs(['--seeds', 'https://x.com', '--wait-after-load', '1500', '--delay-between-pages', '2500']);
    assert.strictEqual(opts.waitAfterLoad, 1500);
    assert.strictEqual(opts.delayBetweenPages, 2500);
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

describe('crawl linksForNextRound', () => {
  test('returns all unique links not already fetched (no limit)', () => {
    const all = ['https://a.com', 'https://b.com', 'https://a.com', 'https://c.com'];
    const fetched = new Set(['https://a.com']);
    const out = linksForNextRound(all, fetched);
    assert.strictEqual(out.length, 2);
    assert.ok(out.includes('https://b.com'));
    assert.ok(out.includes('https://c.com'));
  });

  test('returns empty when all already fetched', () => {
    const all = ['https://a.com', 'https://b.com'];
    const fetched = new Set(['https://a.com', 'https://b.com']);
    const out = linksForNextRound(all, fetched);
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
    const result = await fetchPage(mockPage, 'http://bad.example', { waitUntil: 'load', timeout: 1000 });
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
    const result = await fetchPage(mockPage, 'http://mock.example', { waitUntil: 'load', timeout: 5000 });
    assert.strictEqual(result.url, 'http://mock.example');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.title, 'Crawl Mock');
    assert.ok(result.text && result.text.includes('Body'));
    assert.ok(Array.isArray(result.links));
    assert.ok(result.links.length >= 1);
  });

  test('fetchPage sets ok false when response is null', async () => {
    const mockPage = {
      goto: () => Promise.resolve(null),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const result = await fetchPage(mockPage, 'http://example.com', { waitUntil: 'load', timeout: 5000 });
    assert.strictEqual(result.ok, false);
  });

  test('fetchPage filters images and noise from links (example website response)', async () => {
    const mockAnchors = [
      { href: 'https://site.com/page-a' },
      { href: 'https://site.com/images/logo.png' },
      { href: 'https://site.com/login' },
      { href: 'https://site.com/page-b' },
      { href: 'https://site.com/static/bundle.js' },
    ];
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Site'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Body') }),
      $$eval: (_sel, fn, lim) => Promise.resolve(fn(mockAnchors, lim)),
    };
    const result = await fetchPage(mockPage, 'https://site.com/', { waitUntil: 'load', timeout: 5000 });
    assert.strictEqual(result.ok, true);
    assert.ok(Array.isArray(result.links));
    assert.ok(result.links.some((u) => u.includes('page-a')), 'links includes content');
    assert.ok(result.links.some((u) => u.includes('page-b')), 'links includes content');
    assert.ok(!result.links.some((u) => u.includes('login')), 'links excludes login');
    assert.ok(!result.links.some((u) => u.includes('.png') || u.includes('images/')), 'links excludes image');
    assert.ok(!result.links.some((u) => u.includes('static/')), 'links excludes static asset');
  });

  test('fetchPage with waitAfterLoad waits before extracting', async () => {
    const start = Date.now();
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Waited'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const result = await fetchPage(mockPage, 'https://w.example', {
      waitUntil: 'load',
      timeout: 5000,
      waitAfterLoad: 50,
    });
    assert.strictEqual(result.title, 'Waited');
    assert.ok(Date.now() - start >= 45, 'waitAfterLoad respected');
  });

  test('fetchPage sets text null when body selector throws', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Title'),
      $: () => Promise.reject(new Error('No body')),
      $$eval: () => Promise.resolve([]),
    };
    const result = await fetchPage(mockPage, 'https://example.com', {
      waitUntil: 'load',
      timeout: 5000,
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.text, null);
    assert.strictEqual(result.title, 'Title');
  });
});

describe('crawl run (regression)', () => {
  test('run with getBrowser mock returns rounds and results', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Crawl Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Content') }),
      $$eval: (_sel, fn) => Promise.resolve(fn([{ href: 'https://next.com' }])),
    };
    const opts = parseArgs(['--seeds', 'https://seed.com', '--rounds', '1']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    assert.strictEqual(out.rounds, 1);
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results.length, 1);
    assert.strictEqual(out.results[0].url, 'https://seed.com');
    assert.strictEqual(out.results[0].title, 'Crawl Page');
  });

  test('run with empty seeds throws when getBrowser provided', async () => {
    const mockPage = {};
    await assert.rejects(
      () =>
        run(
          { seeds: [], rounds: 2, waitUntil: 'load', timeout: 5000 },
          { getBrowser: async () => mockBrowserWithPage(mockPage) }
        ),
      /Usage:/
    );
  });

  test('run with empty seeds and no getBrowser exits 1 (spawn)', () => {
    const script = join(__dirname, '..', 'crawl.js');
    const result = spawnSync(process.execPath, [script], {
      cwd: join(__dirname, '..', '..'),
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.strictEqual(result.status, 1);
    assert.ok(result.stderr && result.stderr.includes('Usage:'));
  });

  test('run with getBrowser uses contexts()[0] when present', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Crawl context'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_s, fn, lim) => Promise.resolve(fn([], lim)),
    };
    const mockContext = { newPage: async () => mockPage };
    const mockBrowser = {
      contexts: () => [mockContext],
      close: async () => {},
    };
    const opts = parseArgs(['--seeds', 'https://ctx.org', '--rounds', '1']);
    const out = await run(opts, { getBrowser: async () => mockBrowser });
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results[0].title, 'Crawl context');
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

  test('run with --compact returns object suitable for single-line JSON', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Crawl'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://seed.com', '--rounds', '1', '--compact']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    const oneLine = JSON.stringify(out);
    assert.ok(!oneLine.includes('\n'));
    const parsed = JSON.parse(oneLine);
    assert.strictEqual(parsed.totalFetched, 1);
    assert.ok(Array.isArray(parsed.results));
  });

  test('run with --out and --append merges into existing file', async () => {
    const existing = {
      rounds: 1,
      totalFetched: 1,
      results: [{ url: 'https://first.com', title: 'First', text: 'x', ok: true, links: [] }],
    };
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Second'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('y') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://second.com', '--rounds', '1', '--out', '/any/crawl.json', '--append']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      existsSync: () => true,
      readFileSync: () => JSON.stringify(existing),
    });
    assert.strictEqual(out.totalFetched, 2);
    assert.strictEqual(out.results.length, 2);
    assert.strictEqual(out.results[0].url, 'https://first.com');
    assert.strictEqual(out.results[1].url, 'https://second.com');
  });

  test('run with --append but file does not exist returns current run only', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Only'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://only.com', '--rounds', '1', '--out', '/nonexistent.json', '--append']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage), existsSync: () => false });
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results[0].url, 'https://only.com');
  });

  test('run with --append and corrupt existing JSON overwrites with current run', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Only'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://only.com', '--rounds', '1', '--out', '/any.json', '--append']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      existsSync: () => true,
      readFileSync: () => 'not valid json {{{',
    });
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results[0].url, 'https://only.com');
  });

  test('run with two rounds fetches seeds then all next-round links', async () => {
    const urlsSeen = [];
    const mockPage = {
      goto: (url) => {
        urlsSeen.push(url);
        return Promise.resolve({ ok: () => true });
      },
      title: () => Promise.resolve('Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, lim) => {
        const last = urlsSeen[urlsSeen.length - 1];
        const links =
          last === 'https://seed1.com'
            ? ['https://child1.com', 'https://child2.com']
            : last === 'https://seed2.com'
              ? ['https://child3.com']
              : [];
        return Promise.resolve(fn(links.map((href) => ({ href })), lim));
      },
    };
    const opts = parseArgs(['--seeds', 'https://seed1.com https://seed2.com', '--rounds', '2']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    assert.strictEqual(out.rounds, 2);
    assert.strictEqual(out.totalFetched, 5);
    assert.strictEqual(out.results.length, 5);
    assert.strictEqual(out.results[0].url, 'https://seed1.com');
    assert.strictEqual(out.results[1].url, 'https://seed2.com');
  });

  test('run output is valid JSON when serialized', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('T'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://s.com', '--rounds', '1']);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    const str = JSON.stringify(out);
    assert.doesNotThrow(() => JSON.parse(str));
    const parsed = JSON.parse(str);
    assert.strictEqual(parsed.totalFetched, 1);
    assert.strictEqual(parsed.results[0].url, 'https://s.com');
  });

  test('run with confirmEachPage and askProceed false stops after first page', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('First'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://s1.com https://s2.com', '--rounds', '1', '--confirm-each-page']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      askProceed: async () => false,
    });
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results[0].url, 'https://s1.com');
  });

  test('run with delayBetweenPages waits between pages', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('P'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const start = Date.now();
    const opts = parseArgs([
      '--seeds', 'https://a.com https://b.com',
      '--rounds', '1',
      '--delay-between-pages', '50',
    ]);
    const out = await run(opts, { getBrowser: async () => mockBrowserWithPage(mockPage) });
    assert.strictEqual(out.totalFetched, 2);
    assert.ok(Date.now() - start >= 45, 'delayBetweenPages respected');
  });

  test('run with confirmEachPage and askProceed continues when user says yes', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('C'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    let askCount = 0;
    const opts = parseArgs(['--seeds', 'https://s1.com https://s2.com', '--rounds', '1', '--confirm-each-page']);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      askProceed: async () => {
        askCount++;
        return true;
      },
    });
    assert.strictEqual(out.totalFetched, 2);
    assert.ok(askCount >= 1);
  });

  test('run with writeOutput dep calls callback with serialized output', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('C'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs(['--seeds', 'https://s.com', '--rounds', '1', '--out', '/any.json']);
    let writtenStr = null;
    let writtenPath = null;
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      writeOutput: (str, path) => {
        writtenStr = str;
        writtenPath = path;
      },
    });
    assert.strictEqual(out.totalFetched, 1);
    assert.ok(writtenStr !== null);
    assert.strictEqual(writtenPath, '/any.json');
    const parsed = JSON.parse(writtenStr);
    assert.strictEqual(parsed.totalFetched, 1);
  });

  test('run with --visited-file loads set and writes at end', async () => {
    const written = {};
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const opts = parseArgs([
      '--seeds',
      'https://old.com https://new.com',
      '--rounds',
      '1',
      '--visited-file',
      '/v.txt',
    ]);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      existsSync: (p) => p === '/v.txt',
      readFileSync: (p) => (p === '/v.txt' ? 'https://old.com\n' : ''),
      writeFileSync: (p, data) => { written[p] = data; },
    });
    assert.strictEqual(out.totalFetched, 1);
    assert.strictEqual(out.results[0].url, 'https://new.com');
    assert.ok('/v.txt' in written);
    const lines = written['/v.txt'].trim().split('\n').sort();
    assert.ok(lines.some((u) => u.startsWith('https://old.com')), 'visited file should contain old.com');
    assert.ok(lines.some((u) => u.startsWith('https://new.com')), 'visited file should contain new.com');
  });

  test('run retries on non-OK and writes failed URLs to --failed-file', async () => {
    const mockPage = {
      goto: (url) => Promise.resolve({ ok: () => url === 'https://ok.com' }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: () => Promise.resolve([]),
    };
    const written = {};
    const opts = parseArgs([
      '--seeds', 'https://fail.com https://ok.com',
      '--rounds', '1', '--visited-file', '/v.txt', '--failed-file', '/f.txt', '--retries', '2',
    ]);
    const out = await run(opts, {
      getBrowser: async () => mockBrowserWithPage(mockPage),
      writeFileSync: (p, data) => { written[p] = data; },
    });
    assert.strictEqual(out.results.length, 2);
    assert.strictEqual(out.results[0].ok, false);
    assert.strictEqual(out.results[1].ok, true);
    assert.deepStrictEqual(out.failed, ['https://fail.com']);
    assert.strictEqual(written['/f.txt'].trim(), 'https://fail.com');
    assert.ok(written['/v.txt'].includes('https://ok.com'));
    assert.ok(!written['/v.txt'].includes('https://fail.com'));
  });
});
