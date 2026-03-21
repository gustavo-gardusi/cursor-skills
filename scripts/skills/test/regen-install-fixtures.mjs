#!/usr/bin/env node
/**
 * Regenerate install-integration baselines (fixtures/install-expected/*.md).
 * Contributor workflow — see repo README "Golden fixtures (contributors)".
 * Run: npm run regen:install-fixtures --prefix scripts
 *
 * Writes __REPO_ROOT__ in place of the absolute clone path ({{base:...}} and path matches).
 */
import { writeFileSync, mkdirSync, readFileSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { findSkillFiles, processContent, pathToName } from '../sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = realpathSync(join(__dirname, '..', '..', '..'));
const SKILLS = join(REPO, 'skills');
const skillsAbs = realpathSync(SKILLS);
const OUT = join(__dirname, 'fixtures', 'install-expected');

function normalizeForFixture(content, repoRoot) {
  return content.split(repoRoot).join('__REPO_ROOT__');
}

mkdirSync(OUT, { recursive: true });
for (const rel of findSkillFiles(SKILLS)) {
  const raw = readFileSync(join(SKILLS, rel), 'utf8');
  const processed = processContent(raw, REPO, rel, skillsAbs);
  const name = pathToName(rel);
  writeFileSync(join(OUT, `${name}.md`), normalizeForFixture(processed, REPO), 'utf8');
  console.log('wrote', `${name}.md`);
}
console.log('Done. Commit updated files under fixtures/install-expected/.');
