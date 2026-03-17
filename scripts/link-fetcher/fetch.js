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
 *   --compact               Single-line JSON (for agents / piping)
 *   --append                With --out: merge new results into existing file (requires --out)
 *   --links                 Extract links from each page; output includes links.all and links.best
 *   --links-limit <n>       Max "best" links per page (default: 50)
 *   --links-same-site       Keep only same-site links in "best" (default: true when --links)
 */

import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { argv } from 'process';

const CDP_URL = 'http://localhost:9222';

function isValidUrl(s) {
  if (typeof s !== 'string' || !s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Normalize for dedupe: absolute URL without hash. */
function normalizeUrl(url, base) {
  try {
    const u = new URL(url, base);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

/** Path segments or query that usually mean non-content / noise. */
const NOISE_PATHS = /\/?(login|signin|signout|logout|register|signup|auth|oauth|share|embed|javascript:)/i;

function isNoiseUrl(href) {
  try {
    const u = new URL(href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
    return NOISE_PATHS.test(u.pathname) || NOISE_PATHS.test(u.search);
  } catch {
    return true;
  }
}

function sameSite(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.origin === ub.origin;
  } catch {
    return false;
  }
}

function sameOrigin(a, b) {
  return sameSite(a, b);
}

/**
 * Extract links from page and return { all, best }.
 * all: valid http(s) links, normalized (no hash), deduped.
 * best: same-site (if opts.linksSameSite), exclude noise, same-origin first, then limited.
 */
async function extractLinksFromPage(page, pageUrl, opts) {
  const limit = opts.linksLimit ?? 50;
  const sameSiteOnly = opts.linksSameSite !== false;
  const raw = await page.$$eval('a[href]', (anchors, base) => {
    return anchors.map((a) => {
      try {
        return new URL(a.href, base).href;
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, pageUrl);
  const normalized = raw
    .map((href) => normalizeUrl(href, pageUrl))
    .filter(Boolean);
  const all = [...new Set(normalized)].filter(isValidUrl);
  let best = all.filter((href) => !isNoiseUrl(href));
  if (sameSiteOnly) best = best.filter((href) => sameSite(href, pageUrl));
  best.sort((a, b) => {
    const aOrigin = sameOrigin(a, pageUrl) ? 1 : 0;
    const bOrigin = sameOrigin(b, pageUrl) ? 1 : 0;
    if (bOrigin !== aOrigin) return bOrigin - aOrigin;
    return a.localeCompare(b);
  });
  best = best.slice(0, limit);
  return { all, best };
}

export function parseArgs(args = argv.slice(2)) {
  const opts = {
    connectChrome: false,
    urlsFile: null,
    waitUntil: 'load',
    selector: null,
    timeout: 30_000,
    out: null,
    compact: false,
    append: false,
    urls: [],
    links: false,
    linksLimit: 50,
    linksSameSite: true,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--connect-chrome':
        opts.connectChrome = true;
        const next = args[i + 1];
        if (next && !next.startsWith('--') && /^https?:\/\//i.test(next)) opts.cdpUrl = args[++i];
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
      case '--compact':
        opts.compact = true;
        break;
      case '--append':
        opts.append = true;
        break;
      case '--links':
        opts.links = true;
        break;
      case '--links-limit':
        opts.linksLimit = parseInt(args[++i], 10) || 50;
        break;
      case '--links-same-site':
        opts.linksSameSite = true;
        break;
      case '--no-links-same-site':
        opts.linksSameSite = false;
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
    result.ok = !!(res && res.ok());
    result.title = await page.title();
    const sel = opts.selector || 'body';
    try {
      const el = await page.$(sel);
      result.text = el ? await el.innerText() : null;
    } catch {
      result.text = null;
    }
    if (opts.links && page.$$eval) {
      try {
        result.links = await extractLinksFromPage(page, url, opts);
      } catch {
        result.links = { all: [], best: [] };
      }
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

  let out = { fetched: results.length, results };
  const exists = deps.existsSync ?? existsSync;
  const readFile = deps.readFileSync ?? readFileSync;
  if (opts.append && opts.out && exists(opts.out)) {
    try {
      const existing = JSON.parse(readFile(opts.out, 'utf8'));
      const prev = existing.results || [];
      out = {
        fetched: prev.length + results.length,
        results: [...prev, ...results],
      };
    } catch {
      /* ignore parse errors; overwrite with current run */
    }
  }
  if (!deps.getPage && !deps.getBrowser) {
    const str = opts.compact ? JSON.stringify(out) : JSON.stringify(out, null, 2);
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
