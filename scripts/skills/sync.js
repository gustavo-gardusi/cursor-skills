#!/usr/bin/env node
/**
 * Sync Cursor skills: repo skills/ ↔ ~/.cursor/skills-cursor
 *   node scripts/skills/sync.js in [--yes]   install repo skills → Cursor
 *   node scripts/skills/sync.js out           sync Cursor → repo skills/
 * Run from repo root.
 */

import { readdirSync, cpSync, mkdirSync, rmSync, existsSync } from 'fs';
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

function usage() {
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

export function cmdIn(args) {
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
      const rl = createInterface({ input: process.stdin, output: process.stdout });
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
  mkdirSync(DEST, { recursive: true });
  for (const rel of findSkillFiles(SKILLS_DIR)) {
    const name = pathToName(rel);
    const srcPath = join(SKILLS_DIR, rel);
    const destDir = join(DEST, name);
    mkdirSync(destDir, { recursive: true });
    cpSync(srcPath, join(destDir, 'SKILL.md'));
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

if (isMain) {
  const cmd = process.argv[2] || 'in';
  const rest = process.argv.slice(3);
  if (cmd === '-h' || cmd === '--help') usage();
  if (cmd === 'in') {
    const p = cmdIn(rest);
    if (p && p.then) p.catch((e) => { console.error(e); process.exit(1); });
  } else if (cmd === 'out') {
    cmdOut();
  } else {
    usage();
  }
}
