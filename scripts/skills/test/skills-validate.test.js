/**
 * Validates skill files (SKILL.md): frontmatter and optional per-skill checks.
 * Run from scripts/: node --test skills/test/skills-validate.test.js
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { findSkillFiles, pathToName } from '../sync.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(__dirname, '..', '..', '..');
const SKILLS_DIR = process.env.SKILLS_SOURCE_DIR || join(REPO, 'skills');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return out;
}

describe('skills-validate', () => {
  test('skills dir exists', () => {
    assert.ok(existsSync(SKILLS_DIR), `skills dir should exist: ${SKILLS_DIR}`);
  });

  test('each skill has SKILL.md with valid frontmatter', () => {
    const skillPaths = [...findSkillFiles(SKILLS_DIR)];
    assert.ok(skillPaths.length >= 1, 'at least one skill file');
    for (const rel of skillPaths) {
      const skillFile = join(SKILLS_DIR, rel);
      const content = readFileSync(skillFile, 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${rel}: SKILL.md must have YAML frontmatter (--- ... ---)`);
      assert.ok(fm.name, `${rel}: frontmatter must have 'name'`);
      assert.ok(fm.description, `${rel}: frontmatter must have 'description'`);
      const expectedName = pathToName(rel);
      assert.strictEqual(
        fm.name,
        expectedName,
        `${rel}: frontmatter name '${fm.name}' should match path-derived name '${expectedName}'`
      );
    }
  });

  test('research-related skills mention research-context.json', () => {
    const researchNames = ['context-add', 'context-plan', 'context-clear', 'context-show'];
    const skillPaths = [...findSkillFiles(SKILLS_DIR)];
    for (const rel of skillPaths) {
      const name = pathToName(rel);
      if (!researchNames.includes(name)) continue;
      const skillFile = join(SKILLS_DIR, rel);
      const content = readFileSync(skillFile, 'utf8');
      assert.ok(
        content.includes('research-context.json'),
        `${name}: should mention research-context.json (output or context file)`
      );
    }
  });
});
