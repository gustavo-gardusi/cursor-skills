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
 *   --connect-chrome [url]  Use existing Chrome at CDP (default localhost:9222). Without this, the script launches Chrome with the debug profile itself and closes it when done.
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
 *   --visited-file <path>   Load/save visited URLs (one per line); skip already visited, append and write at end
 *   --wait-after-load <ms>  After load event, wait this many ms before extracting (default: 0; use 3000 for SPAs). Should be > delay-between-pages.
 *   --delay-between-pages <ms>  Wait this many ms between each page (default: 0). Use 0 when using --confirm-each-page.
 *   --confirm-each-page    Prompt "Proceed to next page? (y/n)" before each page; uses 3000 ms wait-after-load if not set.
 */

import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { homedir } from 'os';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { loadVisitedSet, saveVisitedSet, normalizeVisitedUrl } from './visited.js';
import { isNoiseUrl } from './link-filter.js';
import { argv } from 'process';

const CDP_URL = 'http://localhost:9222';
const CHROME_DEBUG_PROFILE = join(homedir(), '.chrome-debug-profile');

export function isValidUrl(s) {
  if (typeof s !== 'string' || !s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Normalize for dedupe: absolute URL without hash. */
export function normalizeUrl(url, base) {
  try {
    const u = new URL(url, base);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

export function sameSite(a, b) {
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
    waitAfterLoad: 0,
    delayBetweenPages: 0,
    selector: null,
    timeout: 30_000,
    out: null,
    compact: false,
    append: false,
    urls: [],
    links: false,
    linksLimit: 50,
    linksSameSite: true,
    visitedFile: null,
    confirmEachPage: false,
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
      case '--visited-file':
        opts.visitedFile = args[++i];
        break;
      case '--wait-after-load':
        opts.waitAfterLoad = parseInt(args[++i], 10) || 0;
        break;
      case '--delay-between-pages':
        opts.delayBetweenPages = parseInt(args[++i], 10) || 0;
        break;
      case '--confirm-each-page':
        opts.confirmEachPage = true;
        break;
      default:
        if (!a.startsWith('--') && /^https?:\/\//i.test(a)) opts.urls.push(a);
    }
  }
  if (opts.urlsFile) {
    const lines = readFileSync(opts.urlsFile, 'utf8').split(/\r?\n/);
    opts.urls.push(...lines.map((l) => l.trim()).filter(Boolean));
  }
  if (opts.confirmEachPage && opts.waitAfterLoad === 0) {
    opts.waitAfterLoad = 3000;
  }
  return opts;
}

function getVisitedSet(opts, deps) {
  if (!opts.visitedFile) return null;
  const exists = deps.existsSync ?? existsSync;
  const read = deps.readFileSync ?? readFileSync;
  return loadVisitedSet(opts.visitedFile, { existsSync: exists, readFileSync: read });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchUrl(page, url, opts) {
  const result = { url, ok: false, title: null, text: null, error: null };
  try {
    const res = await page.goto(url, {
      waitUntil: opts.waitUntil,
      timeout: opts.timeout,
    });
    result.ok = !!(res && res.ok());
    const waitMs = opts.waitAfterLoad || 0;
    if (waitMs > 0) await delay(waitMs);
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
 * Run fetch: all requests use a browser (Chrome or injected getBrowser for tests).
 * @param {object} opts - Parsed options (urls, waitUntil, timeout, selector, out, etc.)
 * @param {{ getBrowser?: () => Promise<import('playwright').Browser> }} deps - Optional: getBrowser() for tests (no real Chrome).
 * @returns {{ fetched: number, results: Array }} Result object; caller may write to opts.out or stdout.
 */
export async function run(opts, deps = {}) {
  if (!opts.urls.length) {
    const msg = 'Usage: node fetch.js [--connect-chrome] [--urls-file FILE] [--out FILE] url1 [url2 ...]';
    if (deps.getBrowser) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  let browser;
  let page;
  if (deps.getBrowser) {
    browser = await deps.getBrowser();
    const context = browser.contexts?.()?.[0] || (await browser.newContext?.());
    page = await (context.newPage?.() ?? context);
  } else if (opts.connectChrome) {
    const cdp = opts.cdpUrl || CDP_URL;
    browser = await chromium.connectOverCDP(cdp);
    const context = browser.contexts()[0] || await browser.newContext();
    page = await context.newPage();
  } else {
    browser = await chromium.launchPersistentContext(CHROME_DEBUG_PROFILE, { channel: 'chrome', headless: false });
    page = browser.pages()[0] || await browser.newPage();
  }

  const visited = getVisitedSet(opts, deps);
  const results = [];
  const delayBetween = opts.delayBetweenPages || 0;
  const urlsToFetch = opts.urls.filter((url) => {
    const norm = normalizeVisitedUrl(url);
    return !visited || !norm || !visited.has(norm);
  });
  let askProceed = deps.askProceed;
  let confirmRl = null;
  if (opts.confirmEachPage && !askProceed && !deps.getBrowser) {
    confirmRl = createInterface({ input: process.stdin, output: process.stdout });
    askProceed = () =>
      new Promise((resolve) => {
        confirmRl.question('Proceed to next page? (y/n) ', (answer) => {
          resolve(/^[yY]/.test(answer?.trim()));
        });
      });
  }
  if (!askProceed) askProceed = () => Promise.resolve(true);
  for (let i = 0; i < urlsToFetch.length; i++) {
    const url = urlsToFetch[i];
    const norm = normalizeVisitedUrl(url);
    if (visited && norm && visited.has(norm)) continue;
    const result = await fetchUrl(page, url, opts);
    results.push(result);
    if (visited && norm) visited.add(norm);
    if (opts.confirmEachPage && i < urlsToFetch.length - 1) {
      const proceed = await askProceed(url, i + 1, urlsToFetch.length);
      if (!proceed) break;
    } else if (delayBetween > 0 && i < urlsToFetch.length - 1) {
      await delay(delayBetween);
    }
  }
  if (confirmRl) confirmRl.close();

  if (browser) await browser.close();

  if (visited && opts.visitedFile) {
    const write = deps.writeFileSync ?? writeFileSync;
    saveVisitedSet(opts.visitedFile, visited, { writeFileSync: write });
  }

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
  const str = opts.compact ? JSON.stringify(out) : JSON.stringify(out, null, 2);
  if (deps.writeOutput) {
    deps.writeOutput(str, opts.out);
  } else if (!deps.getBrowser) {
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
