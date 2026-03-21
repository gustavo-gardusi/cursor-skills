/**
 * Install integration: doInstall → temp CURSOR_DIR; each installed SKILL.md must match
 * fixtures/install-expected/<name>.md (__REPO_ROOT__ = normalized clone path).
 *
 * These files are regression baselines for the installer, not end-user skill docs.
 * See scripts/README.md → "Install integration (skill installer)" and "Fixture files".
 *
 * After intentional skills/ or sync.js changes: npm run regen:install-fixtures --prefix scripts
 */
import { readFileSync, mkdirSync, rmSync, existsSync, realpathSync, mkdtempSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { findSkillFiles, pathToName, doInstall } from '../sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = realpathSync(join(__dirname, '..', '..', '..'));
const SKILLS = join(REPO, 'skills');
const FIXTURES = join(__dirname, 'fixtures', 'install-expected');

function normalizeInstalled(content, repoRoot) {
  return content.split(repoRoot).join('__REPO_ROOT__');
}

describe('skill install integration (fixtures)', () => {
  test('doInstall output matches fixtures/install-expected/*.md (normalized repo root)', () => {
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-skill-install-integration-'));
    const origSkills = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = SKILLS;
      process.env.CURSOR_DIR = cursorDir;
      doInstall();
      const dest = join(cursorDir, 'skills-cursor');
      const rels = [...findSkillFiles(SKILLS)];
      assert.ok(rels.length > 0, 'skills/ should contain at least one SKILL.md');
      for (const rel of rels) {
        const name = pathToName(rel);
        const installedPath = join(dest, name, 'SKILL.md');
        assert.ok(existsSync(installedPath), `expected installed file ${name}/SKILL.md`);
        const installed = readFileSync(installedPath, 'utf8');
        const fixturePath = join(FIXTURES, `${name}.md`);
        assert.ok(
          existsSync(fixturePath),
          `missing install fixture for "${name}". Run: npm run regen:install-fixtures --prefix scripts`
        );
        const expected = readFileSync(fixturePath, 'utf8');
        assert.strictEqual(
          normalizeInstalled(installed, REPO),
          expected,
          `install output for "${name}" does not match fixture; regen if skills/ or sync.js changed on purpose`
        );
      }
    } finally {
      if (origSkills !== undefined) process.env.SKILLS_SOURCE_DIR = origSkills;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(cursorDir, { recursive: true, force: true });
    }
  });
});
