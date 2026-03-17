#!/usr/bin/env node
/**
 * Depth crawl: start from seed URLs, fetch each page, extract up to N links
 * per page, keep top X unique links, fetch those; repeat Y rounds.
 * Output: consolidated JSON of all fetched pages for downstream use.
 *
 * Usage:
 *   node crawl.js --seeds "https://a.com" --per-page 10 --top 20 --rounds 2
 *   node crawl.js --seeds-file seeds.txt --per-page 10 --top 20 --rounds 2 --connect-chrome --out crawl.json
 */

import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { argv } from 'process';
import { loadVisitedSet, saveVisitedSet, normalizeVisitedUrl } from './visited.js';
import { isNoiseUrl } from './link-filter.js';

const CDP_URL = 'http://localhost:9222';

export function parseArgs(args = argv.slice(2)) {
  const opts = {
    seeds: [],
    seedsFile: null,
    perPage: 10,
    top: 20,
    rounds: 2,
    connectChrome: false,
    cdpUrl: CDP_URL,
    timeout: 30_000,
    waitUntil: 'load',
    out: null,
    compact: false,
    append: false,
    visitedFile: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--seeds':
        opts.seeds = (args[++i] || '').split(/\s+/).filter(Boolean);
        break;
      case '--seeds-file':
        opts.seedsFile = args[++i];
        break;
      case '--per-page':
        opts.perPage = parseInt(args[++i], 10) || 10;
        break;
      case '--top':
        opts.top = parseInt(args[++i], 10) || 20;
        break;
      case '--rounds':
        opts.rounds = parseInt(args[++i], 10) || 2;
        break;
      case '--connect-chrome':
        opts.connectChrome = true;
        if (args[i + 1] && !args[i + 1].startsWith('--')) opts.cdpUrl = args[++i];
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i], 10) || 30_000;
        break;
      case '--wait-until':
        opts.waitUntil = args[++i] || 'load';
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
      case '--visited-file':
        opts.visitedFile = args[++i];
        break;
    }
  }
  if (opts.seedsFile) {
    const lines = readFileSync(opts.seedsFile, 'utf8').split(/\r?\n/);
    opts.seeds.push(...lines.map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)));
  }
  return opts;
}

export function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function extractLinks(page, limit) {
  const links = await page.$$eval('a[href]', (anchors, lim) => {
    return anchors
      .map((a) => a.href)
      .filter((href) => href.startsWith('http'))
      .slice(0, lim);
  }, limit);
  return links.filter(isValidUrl).filter((href) => !isNoiseUrl(href));
}

export async function fetchPage(page, url, opts) {
  const result = { url, ok: false, title: null, text: null, links: [], error: null };
  try {
    const res = await page.goto(url, { waitUntil: opts.waitUntil, timeout: opts.timeout });
    result.ok = !!(res && res.ok());
    result.title = await page.title();
    try {
      const el = await page.$('body');
      result.text = el ? await el.innerText() : null;
    } catch {
      result.text = null;
    }
    result.links = await extractLinks(page, opts.perPage);
  } catch (e) {
    result.error = e.message || String(e);
  }
  return result;
}

export function pickTopX(allLinks, alreadyFetched, X, normalize = (u) => u) {
  const seen = new Set(alreadyFetched);
  const unique = [...new Set(allLinks)].filter((u) => !seen.has(normalize(u) || u));
  return unique.slice(0, X);
}

/**
 * Run crawl: optionally use an injected getPage() to avoid real browser (for tests).
 * @param {object} opts - Parsed options (seeds, perPage, top, rounds, etc.)
 * @param {{ getPage?: () => Promise<import('playwright').Page> }} deps - Optional: getPage() returns a page (mocked in tests).
 * @returns {{ rounds, perPage, top, totalFetched, results }} Result object; caller may write to opts.out or stdout.
 */
export async function run(opts, deps = {}) {
  if (!opts.seeds.length) {
    const msg = 'Usage: node crawl.js --seeds "url1 url2" [--seeds-file FILE] --per-page 10 --top 20 --rounds 2';
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
      browser = await chromium.connectOverCDP(opts.cdpUrl);
    } else {
      browser = await chromium.launch({ channel: 'chrome', headless: false });
    }
    const context = browser.contexts()[0] || await browser.newContext();
    page = await context.newPage();
  }

  const allResults = [];
  const exists = deps.existsSync ?? existsSync;
  const read = deps.readFileSync ?? readFileSync;
  const fetchedUrls = opts.visitedFile
    ? loadVisitedSet(opts.visitedFile, { existsSync: exists, readFileSync: read })
    : new Set();
  let currentRoundUrls = [...opts.seeds];

  for (let round = 0; round < opts.rounds; round++) {
    const allLinksThisRound = [];
    for (const url of currentRoundUrls) {
      const norm = normalizeVisitedUrl(url) || url;
      if (fetchedUrls.has(norm)) continue;
      fetchedUrls.add(norm);
      const data = await fetchPage(page, url, opts);
      allResults.push(data);
      allLinksThisRound.push(...(data.links || []));
    }
    if (round === opts.rounds - 1) break;
    currentRoundUrls = pickTopX(allLinksThisRound, fetchedUrls, opts.top, (u) => normalizeVisitedUrl(u) || u);
    if (!currentRoundUrls.length) break;
  }

  if (browser) await browser.close();

  if (opts.visitedFile && fetchedUrls.size) {
    const write = deps.writeFileSync ?? writeFileSync;
    saveVisitedSet(opts.visitedFile, fetchedUrls, { writeFileSync: write });
  }

  let out = {
    rounds: opts.rounds,
    perPage: opts.perPage,
    top: opts.top,
    totalFetched: allResults.length,
    results: allResults,
  };
  if (opts.append && opts.out && exists(opts.out)) {
    try {
      const existing = JSON.parse(read(opts.out, 'utf8'));
      const prev = existing.results || [];
      out = {
        rounds: opts.rounds,
        perPage: opts.perPage,
        top: opts.top,
        totalFetched: prev.length + allResults.length,
        results: [...prev, ...allResults],
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
