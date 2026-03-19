#!/usr/bin/env node
/**
 * Sync Cursor skills: repo skills/ ↔ ~/.cursor/skills-cursor
 *   node scripts/skills/sync.js in [--yes]   install repo skills → Cursor
 *   node scripts/skills/sync.js out           sync Cursor → repo skills/
 * Run from repo root.
 */

import { readdirSync, cpSync, mkdirSync, rmSync, existsSync, realpathSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
const REPO = join(__dirname, '..', '..');

function getSkillsDir() {
  return process.env.SKILLS_SOURCE_DIR || join(REPO, 'skills');
}
function getDest() {
  const base = process.env.CURSOR_DIR || join(process.env.HOME || '', '.cursor');
  return join(base, 'skills-cursor');
}

export function usage() {
  console.error('Usage: node scripts/skills/sync.js in [--yes] | out | -h');
  console.error('  in       install repo skills/ → ' + getDest());
  console.error('  in -y    same, clear existing first (no prompt)');
  console.error('  out      sync ' + getDest() + ' → repo skills/');
  process.exit(1);
}

export function* findSkillFiles(dir, base = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      yield* findSkillFiles(join(dir, e.name), rel);
    } else if (e.name === 'SKILL.md') {
      yield rel;
    }
  }
}

export function pathToName(relPath) {
  return relPath.replace(/\/SKILL\.md$/, '').replace(/\//g, '-');
}

/**
 * Replace placeholders in skill content when installing to local.
 * - {{base:path}} → absolute path to repo/path (e.g. {{base:scripts/url}} → /full/path/to/repo/scripts/url)
 * - {{embed:path}} → file content from repo/path (for embedding code or text into the skill)
 * @param {string} content - Raw SKILL.md content
 * @param {string} repoAbs - Absolute path to repo root
 * @returns {string}
 */
export function processContent(content, repoAbs) {
  let out = content;
  out = out.replace(/\{\{base:([^}]+)\}\}/g, (_, path) => {
    const full = join(repoAbs, path.replace(/^\//, '').trim());
    return full;
  });
  out = out.replace(/\{\{embed:([^}]+)\}\}/g, (_, path) => {
    const full = join(repoAbs, path.replace(/^\//, '').trim());
    try {
      return readFileSync(full, 'utf8');
    } catch (e) {
      console.warn('embed skip (not found): ' + full);
      return '';
    }
  });
  return out;
}

/**
 * @param {string[]} args
 * @param {{ createInterface?: typeof createInterface }} [deps] - Optional; for tests only.
 */
export function cmdIn(args, deps = {}) {
  const createRL = deps.createInterface ?? createInterface;
  const SKILLS_DIR = getSkillsDir();
  const DEST = getDest();
  if (!existsSync(SKILLS_DIR)) {
    console.error('skills/ not found');
    process.exit(1);
  }

  const clearFirst = args.includes('-y') || args.includes('--yes');
  const destExists = existsSync(DEST) && readdirSync(DEST).length > 0;

  if (destExists && !clearFirst) {
    return new Promise((resolve) => {
      const rl = createRL({ input: process.stdin, output: process.stdout });
      rl.question(`${DEST} already has skills. Clear and install fresh? (y/n) `, (answer) => {
        rl.close();
        if (/^[yY]/.test(answer)) {
          rmSync(DEST, { recursive: true });
          console.log('Cleared.');
        } else {
          console.log('Keeping existing; will add/overwrite.');
        }
        doInstall();
        resolve();
      });
    });
  }

  if (clearFirst && existsSync(DEST)) {
    rmSync(DEST, { recursive: true });
    console.log('Cleared.');
  }
  doInstall();
}

export function doInstall() {
  const SKILLS_DIR = getSkillsDir();
  const DEST = getDest();
  const repoAbs = realpathSync(REPO);
  mkdirSync(DEST, { recursive: true });
  for (const rel of findSkillFiles(SKILLS_DIR)) {
    const name = pathToName(rel);
    const srcPath = join(SKILLS_DIR, rel);
    const destDir = join(DEST, name);
    mkdirSync(destDir, { recursive: true });
    const raw = readFileSync(srcPath, 'utf8');
    const processed = processContent(raw, repoAbs);
    writeFileSync(join(destDir, 'SKILL.md'), processed);
    console.log('Installed: ' + name);
  }
  console.log('Done.');
}

export function cmdOut() {
  const SKILLS_DIR = getSkillsDir();
  const DEST = getDest();
  if (!existsSync(DEST)) {
    console.error(DEST + ' not found');
    process.exit(1);
  }
  if (!existsSync(SKILLS_DIR)) {
    console.error('skills/ not found');
    process.exit(1);
  }

  for (const rel of findSkillFiles(SKILLS_DIR)) {
    const name = pathToName(rel);
    const destFile = join(DEST, name, 'SKILL.md');
    const srcPath = join(SKILLS_DIR, rel);
    if (existsSync(destFile)) {
      cpSync(destFile, srcPath);
      console.log('Synced: ' + name + ' → skills/' + rel.replace(/\/SKILL\.md$/, '/'));
    }
  }
  console.log('Done.');
}

/**
 * Main entry (argv-based). Exported for tests.
 * @param {string[]} argv - e.g. process.argv slice; argv[0] is command (in | out | -h).
 * @param {{ cmdIn?: (args: string[]) => void | Promise<void> }} [deps] - Optional; for tests: override cmdIn to simulate rejection.
 */
export function run(argv, deps = {}) {
  const cmd = argv[0] || 'in';
  const rest = argv.slice(1);
  if (cmd === '-h' || cmd === '--help') usage();
  if (cmd === 'in') {
    const cmdInFn = deps.cmdIn ?? cmdIn;
    const p = cmdInFn(rest);
    if (p && p.then) p.catch((e) => { console.error(e); process.exit(1); });
  } else if (cmd === 'out') {
    cmdOut();
  } else {
    usage();
  }
}

if (isMain) {
  run(process.argv.slice(2));
}
