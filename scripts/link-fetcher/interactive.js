#!/usr/bin/env node
/**
 * Interactive link explorer: start from one URL, get filtered "next" links,
 * pause for user input before opening each follow link. Shows context:
 * started URL, depth, and "Nth link at this level".
 *
 * Usage:
 *   node interactive.js [options] <start-url>
 *
 * Options:
 *   --top <n>         Max links to show per page (default: 15)
 *   --iterations <n>  Max depth (0 = start page only; 1 = start + one level) (default: 1)
 *   --connect-chrome [url]  Use existing Chrome at CDP (default localhost:9222)
 *   --timeout <ms>    Per-page timeout (default: 30000)
 *   --out <path>      Write visited pages as JSON when done (same format as fetch/crawl)
 *   --compact         With --out: single-line JSON
 *
 * Flow: fetch start URL → show "Started: <url>, depth 0", list top N links →
 * prompt (Enter = open 1, 1–N = open that link, q = quit) → if open: fetch that
 * page, show "depth 1, link N/total", list its top N links → repeat until
 * max depth or user quits.
 */

import { createInterface } from 'readline';
import { argv } from 'process';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
import { parseArgs, fetchUrl } from './fetch.js';

const CDP_URL = 'http://localhost:9222';

function parseInteractiveArgs(args) {
  const rest = [];
  let startUrl = null;
  let top = 15;
  let iterations = 1;
  let out = null;
  let compact = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') {
      out = args[++i];
      continue;
    }
    if (a === '--compact') {
      compact = true;
      continue;
    }
    if (a === '--top') {
      top = parseInt(args[++i], 10) || 15;
      continue;
    }
    if (a === '--iterations') {
      iterations = parseInt(args[++i], 10) ?? 1;
      continue;
    }
    if (a === '--connect-chrome') {
      rest.push(a);
      const next = args[i + 1];
      if (next && !next.startsWith('--') && /^https?:\/\//i.test(next)) {
        rest.push(next);
        i++;
      }
      continue;
    }
    if (!a.startsWith('--') && /^https?:\/\//i.test(a) && !startUrl) {
      startUrl = a;
      continue;
    }
    rest.push(a);
  }
  const fetchOpts = parseArgs(rest);
  fetchOpts.links = true;
  fetchOpts.linksLimit = top;
  fetchOpts.linksSameSite = true;
  return { startUrl, top, iterations, out, compact, fetchOpts };
}

function ask(rl, message) {
  return new Promise((resolve) => rl.question(message, resolve));
}

function printContext(startUrl, depth, linkIndex, totalAtLevel, currentUrl) {
  const parts = [`Started: ${startUrl}`, `Depth: ${depth}`];
  if (depth > 0 && totalAtLevel != null) {
    parts.push(`Link ${linkIndex}/${totalAtLevel} at this level`);
  }
  if (currentUrl) parts.push(`Current: ${currentUrl}`);
  console.log('\n---');
  console.log(parts.join(' | '));
}

function printLinks(links, top) {
  const list = (links || []).slice(0, top);
  if (list.length === 0) {
    console.log('(no links to follow)');
    return list;
  }
  console.log(`Top ${list.length} links:`);
  list.forEach((href, i) => console.log(`  ${i + 1}. ${href}`));
  return list;
}

/**
 * Run interactive loop. Uses argv when no args/deps provided.
 * @param {string[]} [args] - CLI args (default: argv.slice(2))
 * @param {{ getPage?: () => Promise<import('playwright').Page>, askFn?: (message: string) => Promise<string> }} [deps] - Optional: getPage and askFn for tests (no Chrome/readline)
 */
function pageEntry(result) {
  const entry = {
    url: result.url,
    title: result.title,
    text: result.text,
    ok: result.ok,
    error: result.error ?? null,
  };
  if (result.links && result.links.best) entry.links = result.links.best;
  return entry;
}

async function runInteractive(args = argv.slice(2), deps = {}) {
  const { startUrl, top, iterations, out: outPath, compact, fetchOpts } = parseInteractiveArgs(args);
  if (!startUrl) {
    const msg = 'Usage: node interactive.js [--top N] [--iterations N] [--connect-chrome] <start-url>';
    if (deps.getPage) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  let browser;
  let page;
  let rl;
  if (deps.getPage) {
    page = await deps.getPage();
  } else {
    if (fetchOpts.connectChrome) {
      browser = await chromium.connectOverCDP(fetchOpts.cdpUrl || CDP_URL);
    } else {
      browser = await chromium.launch({ channel: 'chrome', headless: false });
    }
    const context = browser.contexts?.[0] || (await browser.newContext());
    page = await context.newPage();
  }

  const prompt = deps.askFn
    ? (msg) => deps.askFn(msg)
    : () => {
        if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout });
        return ask(rl, `\nOpen next: [1-${top}] or Enter for 1, q to quit: `);
      };

  const pages = [];
  try {
    let depth = 0;
    let currentUrl = startUrl;
    let linkIndexAtLevel = 0;
    let totalAtLevel = 0;
    let best = [];

    // Fetch start page
    printContext(startUrl, depth, null, null, currentUrl);
    const result = await fetchUrl(page, currentUrl, fetchOpts);
    if (result.error) {
      if (deps.getPage) throw new Error(result.error);
      console.error('Error:', result.error);
      if (rl) rl.close();
      if (browser) await browser.close();
      process.exit(1);
    }
    pages.push(pageEntry(result));
    best = (result.links && result.links.best) || [];
    totalAtLevel = best.length;
    printLinks(best, top);

    while (true) {
      const input = (await prompt()).trim().toLowerCase();
      if (input === 'q' || input === 'quit') break;

      let choice = 1;
      if (input !== '') {
        const n = parseInt(input, 10);
        if (Number.isNaN(n) || n < 1 || n > best.length) {
          console.log('Enter a number 1–' + best.length + ' or q to quit.');
          continue;
        }
        choice = n;
      }

      const nextUrl = best[choice - 1];
      if (!nextUrl) {
        console.log('No link at that index.');
        continue;
      }

      if (depth >= iterations) {
        console.log(`Max depth (${iterations}) reached. q to quit.`);
        continue;
      }

      linkIndexAtLevel = choice;
      depth += 1;
      currentUrl = nextUrl;

      printContext(startUrl, depth, linkIndexAtLevel, totalAtLevel, currentUrl);
      const nextResult = await fetchUrl(page, currentUrl, fetchOpts);
      if (nextResult.error) {
        console.error('Error:', nextResult.error);
        depth -= 1;
        continue;
      }
      pages.push(pageEntry(nextResult));
      best = (nextResult.links && nextResult.links.best) || [];
      totalAtLevel = best.length;
      printLinks(best, top);

      if (depth >= iterations) {
        console.log(`\nMax depth (${iterations}) reached. q to quit.`);
      }
    }
  } finally {
    if (rl) rl.close();
    if (browser) await browser.close();
    if (outPath && pages.length > 0) {
      const payload = { pages, totalVisited: pages.length };
      const str = compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
      if (deps.writeFile) deps.writeFile(outPath, str);
      else writeFileSync(outPath, str);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runInteractive(undefined, undefined).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { parseInteractiveArgs, runInteractive, pageEntry };
