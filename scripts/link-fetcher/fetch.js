#!/usr/bin/env node
/**
 * Link fetcher: open a list of URLs (in current Chrome or launched browser),
 * wait for each page to load, collect data, output JSON.
 *
 * Usage:
 *   node fetch.js [options] [urls...]
 *   node fetch.js --urls-file urls.txt
 *   node fetch.js --connect-chrome  http://example.com https://...
 *
 * Options:
 *   --connect-chrome [url]  Use existing Chrome at CDP (default localhost:9222)
 *   --urls-file <path>      Read URLs from file (one per line)
 *   --wait-until <event>    Load condition: load | domcontentloaded | networkidle (default: load)
 *   --selector <css>        Optional: extract text from selector (default: body for main text)
 *   --timeout <ms>          Per-page timeout (default: 30000)
 *   --out <path>            Write JSON here (default: stdout)
 */

import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { argv } from 'process';

const CDP_URL = 'http://localhost:9222';

export function parseArgs(args = argv.slice(2)) {
  const opts = {
    connectChrome: false,
    urlsFile: null,
    waitUntil: 'load',
    selector: null,
    timeout: 30_000,
    out: null,
    urls: [],
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--connect-chrome':
        opts.connectChrome = true;
        if (args[i + 1] && !args[i + 1].startsWith('--')) opts.cdpUrl = args[++i];
        break;
      case '--urls-file':
        opts.urlsFile = args[++i];
        break;
      case '--wait-until':
        opts.waitUntil = args[++i] || 'load';
        break;
      case '--selector':
        opts.selector = args[++i];
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i], 10) || 30_000;
        break;
      case '--out':
        opts.out = args[++i];
        break;
      default:
        if (!a.startsWith('--') && /^https?:\/\//i.test(a)) opts.urls.push(a);
    }
  }
  if (opts.urlsFile) {
    const lines = readFileSync(opts.urlsFile, 'utf8').split(/\r?\n/);
    opts.urls.push(...lines.map((l) => l.trim()).filter(Boolean));
  }
  return opts;
}

export async function fetchUrl(page, url, opts) {
  const result = { url, ok: false, title: null, text: null, error: null };
  try {
    const res = await page.goto(url, {
      waitUntil: opts.waitUntil,
      timeout: opts.timeout,
    });
    result.ok = res && res.ok();
    result.title = await page.title();
    const sel = opts.selector || 'body';
    try {
      const el = await page.$(sel);
      result.text = el ? await el.innerText() : null;
    } catch {
      result.text = null;
    }
  } catch (e) {
    result.error = e.message || String(e);
  }
  return result;
}

/**
 * Run fetch: optionally use an injected getPage() to avoid real browser (for tests).
 * @param {object} opts - Parsed options (urls, waitUntil, timeout, selector, out, etc.)
 * @param {{ getPage?: () => Promise<import('playwright').Page> }} deps - Optional: getPage() returns a page (mocked in tests).
 * @returns {{ fetched: number, results: Array }} Result object; caller may write to opts.out or stdout.
 */
export async function run(opts, deps = {}) {
  if (!opts.urls.length) {
    const msg = 'Usage: node fetch.js [--connect-chrome] [--urls-file FILE] [--out FILE] url1 [url2 ...]';
    if (deps.getPage) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  let page;
  let browser;
  if (deps.getPage) {
    page = await deps.getPage();
  } else if (deps.getBrowser) {
    browser = await deps.getBrowser();
    const context = browser.contexts?.()?.[0] || (await browser.newContext?.());
    page = await (context.newPage?.() ?? context);
  } else {
    if (opts.connectChrome) {
      const cdp = opts.cdpUrl || CDP_URL;
      browser = await chromium.connectOverCDP(cdp);
    } else {
      browser = await chromium.launch({ channel: 'chrome', headless: false });
    }
    const context = browser.contexts()[0] || await browser.newContext();
    page = await context.newPage();
  }

  const results = [];
  for (const url of opts.urls) {
    results.push(await fetchUrl(page, url, opts));
  }

  if (browser) await browser.close();

  const out = { fetched: results.length, results };
  if (!deps.getPage && !deps.getBrowser) {
    const str = JSON.stringify(out, null, 2);
    if (opts.out) writeFileSync(opts.out, str);
    else console.log(str);
  }
  return out;
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  await run(opts);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
