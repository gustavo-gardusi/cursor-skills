#!/usr/bin/env node
/**
 * Depth crawl: start from seed URLs, fetch each page, extract all links that
 * pass the filter (valid http(s), no images/assets/ads), then fetch those;
 * repeat Y rounds. No top-X limit—downstream (e.g. cursor skill) can filter further.
 * Output: consolidated JSON of all fetched pages.
 *
 * Usage:
 *   node crawl.js --seeds "https://a.com" --rounds 2
 *   node crawl.js --seeds-file seeds.txt --rounds 2 --connect-chrome --out crawl.json
 *
 *   --wait-after-load <ms>  After load, wait this many ms before extracting (default: 0; use 3000 for SPAs).
 *   --delay-between-pages <ms>  Wait between pages (default: 0). Use 0 with --confirm-each-page.
 *   --confirm-each-page    Prompt "Proceed to next page? (y/n)" before each page; uses 3000 ms wait-after-load if not set.
 */

import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { homedir } from 'os';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { argv } from 'process';
import { loadVisitedSet, saveVisitedSet, normalizeVisitedUrl } from './visited.js';
import { isNoiseUrl } from './link-filter.js';

const CDP_URL = 'http://localhost:9222';
const CHROME_DEBUG_PROFILE = join(homedir(), '.chrome-debug-profile');
const RETRY_DELAY_MS = 2000;

export function parseArgs(args = argv.slice(2)) {
  const opts = {
    seeds: [],
    seedsFile: null,
    rounds: 2,
    connectChrome: false,
    cdpUrl: CDP_URL,
    timeout: 30_000,
    waitUntil: 'load',
    waitAfterLoad: 0,
    delayBetweenPages: 0,
    out: null,
    compact: false,
    append: false,
    visitedFile: null,
    confirmEachPage: false,
    retries: 3,
    failedFile: null,
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
      case '--wait-after-load':
        opts.waitAfterLoad = parseInt(args[++i], 10) || 0;
        break;
      case '--delay-between-pages':
        opts.delayBetweenPages = parseInt(args[++i], 10) || 0;
        break;
      case '--confirm-each-page':
        opts.confirmEachPage = true;
        break;
      case '--retries':
        opts.retries = Math.max(0, parseInt(args[++i], 10) ?? 3);
        break;
      case '--failed-file':
        opts.failedFile = args[++i];
        break;
    }
  }
  if (opts.confirmEachPage && opts.waitAfterLoad === 0) {
    opts.waitAfterLoad = 3000;
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

/** Extract all links from page that pass filter (valid http(s), no images/assets/ads). */
async function extractLinks(page) {
  const links = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.href).filter((href) => href.startsWith('http'))
  );
  return links.filter(isValidUrl).filter((href) => !isNoiseUrl(href));
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPage(page, url, opts) {
  const result = { url, ok: false, title: null, text: null, links: [], error: null };
  try {
    const res = await page.goto(url, { waitUntil: opts.waitUntil, timeout: opts.timeout });
    result.ok = !!(res && res.ok());
    const waitMs = opts.waitAfterLoad || 0;
    if (waitMs > 0) await delay(waitMs);
    result.title = await page.title();
    try {
      const el = await page.$('body');
      result.text = el ? await el.innerText() : null;
    } catch {
      result.text = null;
    }
    result.links = await extractLinks(page);
  } catch (e) {
    result.error = e.message || String(e);
  }
  return result;
}

/** Return unique links not yet in alreadyFetched (no limit; downstream can filter). */
export function linksForNextRound(allLinks, alreadyFetched, normalize = (u) => u) {
  const seen = new Set(alreadyFetched);
  return [...new Set(allLinks)].filter((u) => !seen.has(normalize(u) || u));
}

/**
 * Run crawl: all requests use a browser (Chrome or injected getBrowser for tests).
 * @param {object} opts - Parsed options (seeds, perPage, top, rounds, etc.)
 * @param {{ getBrowser?: () => Promise<import('playwright').Browser> }} deps - Optional: getBrowser() for tests (no real Chrome).
 * @returns {{ rounds, totalFetched, results }} Result object; caller may write to opts.out or stdout.
 */
export async function run(opts, deps = {}) {
  if (!opts.seeds.length) {
    const msg = 'Usage: node crawl.js --seeds "url1 url2" [--seeds-file FILE] --rounds 2';
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
    browser = await chromium.connectOverCDP(opts.cdpUrl || CDP_URL);
    const context = browser.contexts()[0] || await browser.newContext();
    page = await context.newPage();
  } else {
    browser = await chromium.launchPersistentContext(CHROME_DEBUG_PROFILE, { channel: 'chrome', headless: false });
    page = browser.pages()[0] || await browser.newPage();
  }

  const allResults = [];
  const exists = deps.existsSync ?? existsSync;
  const read = deps.readFileSync ?? readFileSync;
  const fetchedUrls = opts.visitedFile
    ? loadVisitedSet(opts.visitedFile, { existsSync: exists, readFileSync: read })
    : new Set();
  let currentRoundUrls = [...opts.seeds];

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

  const delayBetween = opts.delayBetweenPages || 0;
  const retries = Math.max(0, opts.retries ?? 3);
  const failed = [];
  let stoppedByUser = false;
  for (let round = 0; round < opts.rounds && !stoppedByUser; round++) {
    const allLinksThisRound = [];
    const urlsThisRound = [...currentRoundUrls];
    for (let i = 0; i < urlsThisRound.length; i++) {
      const url = urlsThisRound[i];
      const norm = normalizeVisitedUrl(url) || url;
      if (fetchedUrls.has(norm)) continue;
      let data = await fetchPage(page, url, opts);
      let attempts = 1;
      while (!data.ok && attempts < retries) {
        await delay(RETRY_DELAY_MS);
        data = await fetchPage(page, url, opts);
        attempts++;
      }
      if (data.ok) fetchedUrls.add(norm);
      else failed.push(url);
      allResults.push(data);
      allLinksThisRound.push(...(data.links || []));
      if (opts.confirmEachPage && (i < urlsThisRound.length - 1 || round < opts.rounds - 1)) {
        const proceed = await askProceed(url, allResults.length, 0);
        if (!proceed) {
          stoppedByUser = true;
          break;
        }
      } else if (delayBetween > 0 && i < urlsThisRound.length - 1) {
        await delay(delayBetween);
      }
    }
    if (round === opts.rounds - 1 || stoppedByUser) break;
    currentRoundUrls = linksForNextRound(allLinksThisRound, fetchedUrls, (u) => normalizeVisitedUrl(u) || u);
    if (!currentRoundUrls.length) break;
  }
  if (confirmRl) confirmRl.close();

  if (browser) await browser.close();

  if (opts.visitedFile && fetchedUrls.size) {
    const write = deps.writeFileSync ?? writeFileSync;
    saveVisitedSet(opts.visitedFile, fetchedUrls, { writeFileSync: write });
  }

  if (opts.failedFile && failed.length) {
    const write = deps.writeFileSync ?? writeFileSync;
    const sorted = [...new Set(failed)].sort();
    write(opts.failedFile, sorted.join('\n') + '\n');
    if (!deps.getBrowser) {
      console.error(`Failed to fetch (${failed.length} URL(s)); wrote to ${opts.failedFile}. Consider logging in and re-running.`);
    }
  }

  let out = {
    rounds: opts.rounds,
    totalFetched: allResults.length,
    results: allResults,
    failed,
  };
  if (opts.append && opts.out && exists(opts.out)) {
    try {
      const existing = JSON.parse(read(opts.out, 'utf8'));
      const prev = existing.results || [];
      out = {
        rounds: opts.rounds,
        totalFetched: prev.length + allResults.length,
        results: [...prev, ...allResults],
        failed: out.failed,
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
