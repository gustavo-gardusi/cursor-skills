import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parseInteractiveArgs, runInteractive, pageEntry } from '../interactive.js';

describe('interactive parseInteractiveArgs', () => {
  test('defaults: top 15, iterations 1, startUrl from first URL', () => {
    const out = parseInteractiveArgs(['https://start.com']);
    assert.strictEqual(out.startUrl, 'https://start.com');
    assert.strictEqual(out.top, 15);
    assert.strictEqual(out.iterations, 1);
    assert.strictEqual(out.fetchOpts.links, true);
    assert.strictEqual(out.fetchOpts.linksLimit, 15);
    assert.strictEqual(out.fetchOpts.linksSameSite, true);
  });

  test('parses --top and --iterations', () => {
    const out = parseInteractiveArgs(['--top', '5', '--iterations', '2', 'https://a.com']);
    assert.strictEqual(out.top, 5);
    assert.strictEqual(out.iterations, 2);
    assert.strictEqual(out.fetchOpts.linksLimit, 5);
    assert.strictEqual(out.startUrl, 'https://a.com');
  });

  test('passes through --connect-chrome and --timeout to fetchOpts', () => {
    const out = parseInteractiveArgs([
      '--connect-chrome',
      'http://localhost:9333',
      '--timeout',
      '10000',
      'https://b.com',
    ]);
    assert.strictEqual(out.fetchOpts.connectChrome, true);
    assert.strictEqual(out.fetchOpts.cdpUrl, 'http://localhost:9333');
    assert.strictEqual(out.fetchOpts.timeout, 10_000);
    assert.strictEqual(out.startUrl, 'https://b.com');
  });

  test('no URL leaves startUrl null', () => {
    const out = parseInteractiveArgs(['--top', '10']);
    assert.strictEqual(out.startUrl, null);
    assert.strictEqual(out.top, 10);
  });

  test('--top with invalid number falls back to 15', () => {
    const out = parseInteractiveArgs(['--top', 'x', 'https://c.com']);
    assert.strictEqual(out.top, 15);
  });

  test('--iterations 0 is allowed', () => {
    const out = parseInteractiveArgs(['--iterations', '0', 'https://d.com']);
    assert.strictEqual(out.iterations, 0);
  });

  test('parses --out and --compact', () => {
    const out = parseInteractiveArgs(['--out', 'visited.json', '--compact', 'https://e.com']);
    assert.strictEqual(out.out, 'visited.json');
    assert.strictEqual(out.compact, true);
    assert.strictEqual(out.startUrl, 'https://e.com');
  });

  test('parses --visited-file', () => {
    const out = parseInteractiveArgs(['--visited-file', 'visited-urls.txt', 'https://e.com']);
    assert.strictEqual(out.visitedFile, 'visited-urls.txt');
    assert.strictEqual(out.startUrl, 'https://e.com');
  });
});

describe('interactive pageEntry', () => {
  test('normalizes fetch result to page object with url, title, text, ok, error', () => {
    const result = {
      url: 'https://example.com',
      title: 'Example',
      text: 'Hello',
      ok: true,
      error: null,
    };
    const entry = pageEntry(result);
    assert.strictEqual(entry.url, 'https://example.com');
    assert.strictEqual(entry.title, 'Example');
    assert.strictEqual(entry.text, 'Hello');
    assert.strictEqual(entry.ok, true);
    assert.strictEqual(entry.error, null);
    assert.strictEqual('links' in entry, false);
  });

  test('includes links.best when present', () => {
    const result = {
      url: 'https://example.com',
      title: 'Example',
      text: '',
      ok: true,
      error: null,
      links: { best: ['https://example.com/a', 'https://example.com/b'] },
    };
    const entry = pageEntry(result);
    assert.deepStrictEqual(entry.links, ['https://example.com/a', 'https://example.com/b']);
  });

  test('preserves error when result has error', () => {
    const result = {
      url: 'https://example.com',
      title: null,
      text: null,
      ok: false,
      error: 'Navigation failed',
    };
    const entry = pageEntry(result);
    assert.strictEqual(entry.error, 'Navigation failed');
    assert.strictEqual(entry.ok, false);
  });
});

describe('interactive runInteractive', () => {
  test('throws when no startUrl and getPage provided', async () => {
    await assert.rejects(
      () => runInteractive(['--top', '5'], { getPage: async () => ({}), askFn: async () => 'q' }),
      /Usage:.*start-url/
    );
  });

  test('fetch error on start page throws when getPage provided', async () => {
    const mockPage = {
      goto: () => Promise.reject(new Error('Nav failed')),
      title: () => Promise.resolve(''),
    };
    await assert.rejects(
      () =>
        runInteractive(['https://start.com'], {
          getPage: async () => mockPage,
          askFn: async () => 'q',
        }),
      /Nav failed/
    );
  });

  test('quits immediately when user sends q (mock page, no Chrome)', async () => {
    const linksBest = ['https://example.com/one', 'https://example.com/two'];
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Start'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) =>
        Promise.resolve(
          fn(
            linksBest.map((href) => ({ href })),
            base
          )
        ),
    };
    const inputs = ['q'];
    const askFn = async () => inputs.shift() || 'q';
    await runInteractive(['https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(inputs.length, 0);
  });

  test('follows link 1 then quits (depth 1, one iteration)', async () => {
    const startLinks = ['https://example.com/child', 'https://example.com/other'];
    const childLinks = ['https://example.com/grandchild'];
    let gotoCount = 0;
    const mockPage = {
      goto: (url) => {
        gotoCount++;
        return Promise.resolve({ ok: () => true });
      },
      title: () => Promise.resolve('Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) => {
        const urls = gotoCount === 1 ? startLinks : childLinks;
        return Promise.resolve(fn(urls.map((href) => ({ href })), base));
      },
    };
    const inputs = ['1', 'q'];
    const askFn = async () => inputs.shift() || 'q';
    await runInteractive(['--iterations', '2', 'https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(gotoCount, 2);
  });

  test('invalid number then q: prompts again then quits', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) =>
        Promise.resolve(fn([{ href: 'https://example.com/a' }], base)),
    };
    const inputs = ['99', 'q'];
    const askFn = async () => inputs.shift() || 'q';
    await runInteractive(['https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(inputs.length, 0);
  });

  test('max depth reached: log message then q quits', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) =>
        Promise.resolve(fn([{ href: 'https://example.com/next' }], base)),
    };
    const inputs = ['1', '5', 'q'];
    const askFn = async () => inputs.shift() || 'q';
    await runInteractive(['--iterations', '1', 'https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(inputs.length, 0);
  });

  test('follow link then fetch error on child: depth decremented, can quit', async () => {
    let gotoCount = 0;
    const mockPage = {
      goto: () => {
        gotoCount++;
        if (gotoCount === 2) return Promise.reject(new Error('Child load failed'));
        return Promise.resolve({ ok: () => true });
      },
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) =>
        Promise.resolve(fn([{ href: 'https://example.com/child' }], base)),
    };
    const inputs = ['1', 'q'];
    const askFn = async () => inputs.shift() || 'q';
    await runInteractive(['--iterations', '2', 'https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(gotoCount, 2);
  });

  test('Enter (empty input) chooses link 1', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) =>
        Promise.resolve(fn([{ href: 'https://example.com/first' }], base)),
    };
    const inputs = ['', 'q'];
    const askFn = async () => inputs.shift() ?? 'q';
    await runInteractive(['https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(inputs.length, 0);
  });

  test('quit with "quit" string', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve(''),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) => Promise.resolve(fn([], base)),
    };
    const inputs = ['quit'];
    const askFn = async () => inputs.shift() || 'q';
    await runInteractive(['https://example.com/'], {
      getPage: async () => mockPage,
      askFn,
    });
    assert.strictEqual(inputs.length, 0);
  });

  test('with --out writes pages JSON when session ends (writeFile mock)', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('Home'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('Content') }),
      $$eval: (_sel, fn, base) => Promise.resolve(fn([{ href: 'https://example.com/a' }], base)),
    };
    const inputs = ['q'];
    const written = [];
    const writeFile = (path, data) => {
      written.push({ path, data });
    };
    await runInteractive(['--out', 'visited.json', 'https://example.com/'], {
      getPage: async () => mockPage,
      askFn: async () => inputs.shift() || 'q',
      writeFile,
    });
    assert.strictEqual(written.length, 1);
    assert.strictEqual(written[0].path, 'visited.json');
    const payload = JSON.parse(written[0].data);
    assert.strictEqual(payload.totalVisited, 1);
    assert.ok(Array.isArray(payload.pages));
    assert.strictEqual(payload.pages.length, 1);
    assert.strictEqual(payload.pages[0].url, 'https://example.com/');
    assert.strictEqual(payload.pages[0].title, 'Home');
    assert.strictEqual(payload.pages[0].text, 'Content');
    assert.strictEqual(payload.pages[0].ok, true);
  });

  test('with --out after following one link writes two pages', async () => {
    const linksByGoto = [['https://example.com/child'], []];
    let gotoCount = 0;
    const mockPage = {
      goto: () => {
        gotoCount++;
        return Promise.resolve({ ok: () => true });
      },
      title: () => Promise.resolve('Page'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) =>
        Promise.resolve(
          fn(
            (linksByGoto[gotoCount - 1] || []).map((href) => ({ href })),
            base
          )
        ),
    };
    const inputs = ['1', 'q'];
    const written = [];
    const writeFile = (path, data) => written.push({ path, data });
    await runInteractive(['--out', 'out.json', '--iterations', '2', 'https://example.com/'], {
      getPage: async () => mockPage,
      askFn: async () => inputs.shift() || 'q',
      writeFile,
    });
    assert.strictEqual(written.length, 1);
    const payload = JSON.parse(written[0].data);
    assert.strictEqual(payload.totalVisited, 2);
    assert.strictEqual(payload.pages.length, 2);
    assert.strictEqual(payload.pages[0].url, 'https://example.com/');
    assert.strictEqual(payload.pages[1].url, 'https://example.com/child');
  });

  test('written pages payload is valid JSON', async () => {
    const mockPage = {
      goto: () => Promise.resolve({ ok: () => true }),
      title: () => Promise.resolve('T'),
      $: () => Promise.resolve({ innerText: () => Promise.resolve('') }),
      $$eval: (_sel, fn, base) => Promise.resolve(fn([], base)),
    };
    let captured = null;
    await runInteractive(['--out', 'x.json', 'https://example.com/'], {
      getPage: async () => mockPage,
      askFn: async () => 'q',
      writeFile: (_path, data) => {
        captured = data;
      },
    });
    assert.ok(captured);
    assert.doesNotThrow(() => JSON.parse(captured));
    const parsed = JSON.parse(captured);
    assert.strictEqual(parsed.totalVisited, 1);
    assert.strictEqual(parsed.pages.length, 1);
  });
});
