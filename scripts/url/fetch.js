#!/usr/bin/env node
/**
 * Link fetcher: open a list of URLs (in current Chrome or launched browser),
 * wait for each page to load, collect data, output JSON.
 * Read-only: only loads pages and extracts title, text, and links; does not click or interact.
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
 *   --observe               Open each input URL in its own tab and stream page-change snapshots (good for manual login/SSO/manual interaction).
 *   --observe-ms <ms>       How long to keep observer tabs open (default: 120000).
 *                          If 0, it keeps running unless --observe-close-on-destination is set.
 *   --observe-interval <ms>  Poll for updates and emit periodic snapshots (default: 2000).
 *   --observe-text-limit <n> Max text size in monitor snapshots (default: 1600).
 *   --observe-close-on-destination Close tab automatically when destination signal is detected for that URL.
 *   --observe-max-ms <ms> Maximum runtime when `--observe-ms 0` is set. Defaults to 600000 (10m). Set to 0 for no hard limit.
 *   --observe-match-threshold <n> Number of destination signals that must match before tab is considered done (default: 1).
 *   --visited-file <path>   Load/save visited URLs (one per line); skip already visited, append and write at end
 *   --wait-after-load <ms>  After load event, wait this many ms before extracting (default: 0; use 3000 for SPAs). Should be > delay-between-pages.
 *   --delay-between-pages <ms>  Wait this many ms between each page (default: 0). Use 0 when using --confirm-each-page.
 *   --confirm-each-page    Prompt "Proceed to next page? (y/n)" before each page; uses 3000 ms wait-after-load if not set.
 *   --retries <n>          Retry each URL up to n times on non-OK response (404, 5xx); default 3.
 *   --browser-channel <name>  Browser channel for launched sessions when --connect-chrome is not used.
 *                           Supported values: chrome, chromium, firefox. Defaults to chrome.
 *   --failed-file <path>   Write URLs that still failed after retries (one per line); e.g. .cursor/research-failed.txt. Do not add them to visited so user can log in and re-run.
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
const RETRY_DELAY_MS = 2000;
const DEFAULT_BROWSER_CHANNEL = process.env.BROWSER_CHANNEL || 'chrome';
const VALID_BROWSER_CHANNELS = new Set(['chrome', 'chromium', 'firefox']);

function emitArgWarning(message) {
  if (typeof process.emitWarning === 'function') {
    process.emitWarning(message, {
      code: 'CURSOR_SCRIPT_WARNING',
      type: 'FetchArgWarning',
    });
  }
}

function parseIntegerArg(rawValue, fallback, opts = {}) {
  const { allowZero = false, name = 'value', min = 1 } = opts;
  const parsed = parseInt(rawValue, 10);
  const effectiveMin = allowZero ? 0 : min;
  if (!Number.isFinite(parsed) || parsed < effectiveMin) {
    emitArgWarning(`Invalid value for ${name}: "${rawValue}". Falling back to ${fallback}.`);
    return fallback;
  }
  return parsed;
}

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

function summarizeText(text, limit = 1800) {
  if (!text) return null;
  const collapsed = String(text).replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  return collapsed.length <= limit ? collapsed : `${collapsed.slice(0, limit)}...`;
}

function destinationSignalsForUrl(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('/pull/')) {
    return ['pull', 'conversation', 'review', 'files changed', 'checks', 'merge'];
  }
  if (u.includes('/actions/runs/') || u.includes('/job/')) {
    return ['run', 'workflow', 'job', 'summary', 'checks', 'succeeded', 'failed'];
  }
  if (u.includes('/browse/')) {
    return ['description', 'assignee', 'comments', 'details', 'acceptance', 'key'];
  }
  if (u.includes('/archives/') && /\/p\d+/i.test(u)) {
    return ['thread', 'replies', 'reply', 'view thread', 'parent'];
  }
  if (u.includes('/archives/')) {
    return ['channel', 'messages', 'message', 'workspace', 'threads'];
  }
  return [];
}

function isDestinationReached(snapshot, url, threshold = 1) {
  const signals = destinationSignalsForUrl(url);
  if (!signals.length) return false;
  const haystack = `${snapshot.title || ''} ${snapshot.text || ''}`.toLowerCase();
  const matches = signals.filter((signal) => haystack.includes(signal));
  return matches.length >= threshold;
}

/**
 * Capture a concise page snapshot for monitoring.
 */
async function capturePageSnapshot(page, tabIndex, originalUrl, opts) {
  const snapshot = {
    tab: tabIndex + 1,
    originalUrl,
    currentUrl: null,
    title: null,
    text: null,
    error: null,
    at: new Date().toISOString(),
    event: 'snapshot',
  };
  try {
    snapshot.currentUrl = page.url();
  } catch {
    snapshot.currentUrl = originalUrl;
  }
  try {
    snapshot.title = await page.title();
  } catch (err) {
    snapshot.error = err.message || 'Unable to read page title';
  }
  try {
    const sel = opts.selector || 'body';
    const el = await page.$(sel);
    const raw = el ? await el.innerText() : '';
    snapshot.text = summarizeText(raw, opts.observeTextLimit ?? 1600);
  } catch (err) {
    snapshot.error = snapshot.error || err.message || 'Unable to read page text';
  }
  return snapshot;
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
    retries: 3,
    failedFile: null,
    observe: false,
    observeMs: 120000,
  observeMaxMs: 600000,
    observeInterval: 2000,
    observeTextLimit: 1600,
    observeCloseOnDestination: false,
    observeMatchThreshold: 1,
    browserChannel: DEFAULT_BROWSER_CHANNEL,
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
        opts.timeout = parseIntegerArg(args[++i], 30_000, { name: '--timeout', min: 1 });
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
        opts.linksLimit = parseIntegerArg(args[++i], 50, { name: '--links-limit', min: 1 });
        break;
      case '--links-same-site':
        opts.linksSameSite = true;
        break;
      case '--no-links-same-site':
        opts.linksSameSite = false;
        break;
      case '--observe':
        opts.observe = true;
        if (args[i + 1] && !args[i + 1].startsWith('--') && !Number.isNaN(parseInt(args[i + 1], 10))) {
          opts.observeMs = parseInt(args[i + 1], 10);
          i += 1;
        }
        break;
      case '--observe-ms':
        {
          const rawObserveMs = parseInt(args[++i], 10);
          if (Number.isFinite(rawObserveMs)) {
            opts.observeMs = rawObserveMs;
            break;
          }
          emitArgWarning(`Invalid value for --observe-ms: "${rawObserveMs}". Falling back to 120000.`);
          opts.observeMs = 120000;
        }
        break;
      case '--observe-interval':
        opts.observeInterval = parseIntegerArg(args[++i], 2000, { name: '--observe-interval', min: 1 });
        break;
      case '--observe-text-limit':
        opts.observeTextLimit = parseIntegerArg(args[++i], 1600, { name: '--observe-text-limit', min: 1 });
        break;
      case '--observe-close-on-destination':
        opts.observeCloseOnDestination = true;
        break;
      case '--observe-max-ms':
        opts.observeMaxMs = parseIntegerArg(args[++i], 600000, { allowZero: true, name: '--observe-max-ms' });
        break;
      case '--observe-match-threshold':
        opts.observeMatchThreshold = parseIntegerArg(args[++i], 1, { name: '--observe-match-threshold', min: 1 });
        break;
      case '--browser-channel':
        opts.browserChannel = args[++i] || DEFAULT_BROWSER_CHANNEL;
        break;
      case '--visited-file':
        opts.visitedFile = args[++i];
        break;
      case '--wait-after-load':
        opts.waitAfterLoad = parseIntegerArg(args[++i], 0, { allowZero: true, name: '--wait-after-load' });
        break;
      case '--delay-between-pages':
        opts.delayBetweenPages = parseIntegerArg(args[++i], 0, { allowZero: true, name: '--delay-between-pages' });
        break;
      case '--confirm-each-page':
        opts.confirmEachPage = true;
        break;
      case '--retries':
        opts.retries = parseIntegerArg(args[++i], 3, { allowZero: true, name: '--retries' });
        break;
      case '--failed-file':
        opts.failedFile = args[++i];
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
  if (!opts.browserChannel) {
    opts.browserChannel = DEFAULT_BROWSER_CHANNEL;
  } else if (!VALID_BROWSER_CHANNELS.has(opts.browserChannel)) {
    emitArgWarning(`Unsupported browser channel "${opts.browserChannel}". Falling back to "${DEFAULT_BROWSER_CHANNEL}".`);
    opts.browserChannel = DEFAULT_BROWSER_CHANNEL;
  }
  return opts;
}

function getBrowserChannel(opts) {
  return (opts && opts.browserChannel) || DEFAULT_BROWSER_CHANNEL;
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

async function runObserveMode(opts, deps = {}) {
  const timeout = opts.timeout || 30_000;
  const waitUntil = opts.waitUntil || 'load';
  const writeFile = deps.writeFileSync ?? writeFileSync;
  const write = deps.writeOutput ?? ((str, path) => {
    if (path) {
      writeFile(path, str);
    } else {
      console.log(str);
    }
  });

  let browser;
  let context;
  const chromiumClient = deps.chromium || chromium;
  if (deps.getBrowser) {
    browser = await deps.getBrowser();
    const ctx = browser.contexts?.()?.[0] || (await browser.newContext?.());
    context = ctx;
  } else if (opts.connectChrome) {
    const cdp = opts.cdpUrl || CDP_URL;
    browser = await chromiumClient.connectOverCDP(cdp);
    context = browser.contexts()[0] || await browser.newContext();
  } else {
    const channel = getBrowserChannel(opts);
    browser = await chromiumClient.launchPersistentContext(CHROME_DEBUG_PROFILE, {
      channel,
      headless: false,
    });
    context = browser;
  }

  const durationMs = opts.observeMs ?? 120000;
  const maxObserveMs = Number.isFinite(opts.observeMaxMs) ? opts.observeMaxMs : 600000;
  const pollMs = opts.observeInterval || 2000;
  const observed = [];
  const seen = new Map();
  const pages = [];
  const doneTabs = new Set();
  const visited = getVisitedSet(opts, deps);
  const threshold = Math.max(1, opts.observeMatchThreshold || 1);

  const emit = (entry) => {
    if (!entry) return;
    if (entry.tab == null || entry.currentUrl == null) return;
    const key = `${entry.tab}|${entry.currentUrl}|${entry.title || ''}|${entry.text || ''}`;
    const last = seen.get(entry.tab);
    if (last === key) return;
    seen.set(entry.tab, key);
    observed.push(entry);
    if (!deps.getBrowser) {
      // Keep one-line events in compact mode for easy consumption while monitoring.
      console.log(opts.compact ? JSON.stringify(entry) : JSON.stringify(entry, null, 2));
    }
  };

  const maybeCloseTab = async (tabIndex, page, originalUrl, done) => {
    if (!done || doneTabs.has(tabIndex)) return;
    doneTabs.add(tabIndex);
    if (visited) {
      const normalized = normalizeVisitedUrl(originalUrl);
      if (normalized) visited.add(normalized);
    }
    if (!opts.observeCloseOnDestination) return;
    try {
      await page.close?.();
    } catch {
      /* best effort */
    }
  };

  const schedule = (page, tabIndex, originalUrl) => {
    let queued = false;
    return async () => {
      if (queued) return;
      queued = true;
      await delay(pollMs);
      try {
        const entry = await capturePageSnapshot(page, tabIndex, originalUrl, opts);
        const isDestination = isDestinationReached(entry, originalUrl, threshold);
        if (isDestination) {
          void maybeCloseTab(tabIndex, page, originalUrl, true);
        }
        emit(entry);
      } finally {
        queued = false;
      }
    };
  };

  try {
    for (let i = 0; i < opts.urls.length; i++) {
      const originalUrl = opts.urls[i];
      const normalized = normalizeVisitedUrl(originalUrl);
      if (visited && normalized && visited.has(normalized)) {
        emit({
          tab: i + 1,
          originalUrl,
          currentUrl: originalUrl,
          title: null,
          text: null,
          event: 'skipped',
          at: new Date().toISOString(),
          error: 'already visited',
        });
        continue;
      }
      const page = await context.newPage();
      pages.push(page);

      const pushSnapshot = schedule(page, i, originalUrl);
      page.on('framenavigated', () => {
        void pushSnapshot();
      });
      page.on('load', () => {
        void pushSnapshot();
      });

      try {
        await page.goto(originalUrl, { waitUntil, timeout });
        if (opts.waitAfterLoad > 0) await delay(opts.waitAfterLoad);
        const snap = await capturePageSnapshot(page, i, originalUrl, opts);
        emit(snap);
        const isDestination = isDestinationReached(snap, originalUrl, threshold);
        if (isDestination) {
          void maybeCloseTab(i, page, originalUrl, true);
        }
      } catch (err) {
        emit({
          tab: i + 1,
          originalUrl,
          currentUrl: originalUrl,
          title: null,
          text: null,
          error: err.message || String(err),
          at: new Date().toISOString(),
          event: 'snapshot',
        });
      }
    }

    if (durationMs === 0) {
      if (opts.observeCloseOnDestination) {
        const start = Date.now();
        while (doneTabs.size < pages.length && pages.length > 0) {
          if (maxObserveMs > 0 && Date.now() - start >= maxObserveMs) break;
          await delay(pollMs);
        }
      } else {
        await new Promise(() => {});
      }
    }
    if (durationMs > 0) {
      await delay(durationMs);
    }
  } finally {
    if (!opts.connectChrome) {
      for (const page of pages) {
        try {
          await page.close?.();
        } catch {
          /* best effort */
        }
      }
    }
    if (browser && !opts.connectChrome) await browser.close();
  }

  if (visited && opts.visitedFile) {
    const write = deps.writeFileSync ?? writeFileSync;
    saveVisitedSet(opts.visitedFile, visited, { writeFileSync: write });
  }

  const out = {
    observed: observed.length,
    tabs: pages.length,
    events: observed,
    tabsDone: doneTabs.size,
  };

  const payload = opts.out ? (opts.compact ? JSON.stringify(out) : JSON.stringify({ ...out, generatedAt: new Date().toISOString() }, null, 2)) : null;
  if (opts.out) write(payload, opts.out);

  return out;
}

/**
 * Run fetch: all requests use a browser (Chrome or injected getBrowser for tests).
 * @param {object} opts - Parsed options (urls, waitUntil, timeout, selector, out, etc.)
 * @param {{ getBrowser?: () => Promise<import('playwright').Browser> }} deps - Optional: getBrowser() for tests (no real Chrome).
 * @returns {{ fetched: number, results: Array }} Result object; caller may write to opts.out or stdout.
 */
export async function run(opts, deps = {}) {
  if (opts.observe) {
    return runObserveMode(opts, deps);
  }

  if (!opts.urls.length) {
    const msg = 'Usage: node fetch.js [--connect-chrome] [--urls-file FILE] [--out FILE] url1 [url2 ...]';
    if (deps.getBrowser) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  let browser;
  let page;
  const chromiumClient = deps.chromium || chromium;
  if (deps.getBrowser) {
    browser = await deps.getBrowser();
    const context = browser.contexts?.()?.[0] || (await browser.newContext?.());
    page = await (context.newPage?.() ?? context);
  } else if (opts.connectChrome) {
    const cdp = opts.cdpUrl || CDP_URL;
    browser = await chromiumClient.connectOverCDP(cdp);
    const context = browser.contexts()[0] || await browser.newContext();
    // Use the tab the user already sees so the browser opens on the target page and stays there
    page = context.pages()[0] || await context.newPage();
  } else {
    const channel = getBrowserChannel(opts);
    browser = await chromiumClient.launchPersistentContext(CHROME_DEBUG_PROFILE, {
      channel,
      headless: false,
    });
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
  const failed = [];
  const retries = Math.max(0, opts.retries ?? 3);
  for (let i = 0; i < urlsToFetch.length; i++) {
    const url = urlsToFetch[i];
    const norm = normalizeVisitedUrl(url);
    if (visited && norm && visited.has(norm)) continue;
    let result = await fetchUrl(page, url, opts);
    let attempts = 1;
    while (!result.ok && attempts < retries) {
      await delay(RETRY_DELAY_MS);
      result = await fetchUrl(page, url, opts);
      attempts++;
    }
    results.push(result);
    if (result.ok && visited && norm) visited.add(norm);
    if (!result.ok) failed.push(url);
    if (opts.confirmEachPage && i < urlsToFetch.length - 1) {
      const proceed = await askProceed(url, i + 1, urlsToFetch.length);
      if (!proceed) break;
    } else if (delayBetween > 0 && i < urlsToFetch.length - 1) {
      await delay(delayBetween);
    }
  }
  if (confirmRl) confirmRl.close();

  // When attaching to existing Chrome, leave it open on the last page; only close if we launched it
  if (browser && !opts.connectChrome) await browser.close();

  if (visited && opts.visitedFile) {
    const write = deps.writeFileSync ?? writeFileSync;
    saveVisitedSet(opts.visitedFile, visited, { writeFileSync: write });
  }

  if (opts.failedFile && failed.length) {
    const write = deps.writeFileSync ?? writeFileSync;
    const sorted = [...new Set(failed)].sort();
    write(opts.failedFile, sorted.join('\n') + '\n');
    if (!deps.getBrowser) {
      console.error(`Failed to fetch (${failed.length} URL(s)); wrote to ${opts.failedFile}. Consider logging in and re-running.`);
    }
  }

  const lastFetched = new Date().toISOString();
  let out = { results, lastFetched, failed, fetched: results.length };
  const exists = deps.existsSync ?? existsSync;
  const readFile = deps.readFileSync ?? readFileSync;
  if (opts.append && opts.out && exists(opts.out)) {
    try {
      const existing = JSON.parse(readFile(opts.out, 'utf8'));
      const prev = existing.results || [];
      // Dedupe by normalized URL so we keep a single canonical entry per URL (last wins)
      const byUrl = new Map();
      for (const r of prev) {
        const n = normalizeUrl(r.url, r.url);
        if (n) byUrl.set(n, r);
      }
      for (const r of results) {
        const n = normalizeUrl(r.url, r.url);
        if (n) byUrl.set(n, r);
      }
      const merged = [...byUrl.values()];
      out = {
        results: merged,
        lastFetched,
        failed: out.failed,
        fetched: merged.length,
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
