import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pathToName, findSkillFiles, doInstall, cmdIn, cmdOut } from '../sync.js';

describe('skill-sync pathToName', () => {
  test('converts path to hyphenated name', () => {
    assert.strictEqual(pathToName('gh/pr/SKILL.md'), 'gh-pr');
    assert.strictEqual(pathToName('code/format/js/SKILL.md'), 'code-format-js');
    assert.strictEqual(pathToName('research/SKILL.md'), 'research');
  });
});

describe('skill-sync findSkillFiles', () => {
  test('yields SKILL.md paths under dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skills-'));
    try {
      mkdirSync(join(dir, 'gh', 'pr'), { recursive: true });
      mkdirSync(join(dir, 'research'), { recursive: true });
      writeFileSync(join(dir, 'gh', 'pr', 'SKILL.md'), '# gh-pr');
      writeFileSync(join(dir, 'research', 'SKILL.md'), '# research');
      const paths = [...findSkillFiles(dir)];
      assert.strictEqual(paths.length, 2);
      assert.ok(paths.includes('gh/pr/SKILL.md'));
      assert.ok(paths.includes('research/SKILL.md'));
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('skill-sync doInstall and cmdOut', () => {
  test('doInstall copies SKILL.md files to dest; cmdOut copies back', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-src-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'a', 'b'), { recursive: true });
      writeFileSync(join(skillsDir, 'a', 'b', 'SKILL.md'), '# ab');
      doInstall();
      const destDir = join(cursorDir, 'skills-cursor', 'a-b');
      assert.ok(existsSync(join(destDir, 'SKILL.md')));
      assert.strictEqual(readFileSync(join(destDir, 'SKILL.md'), 'utf8'), '# ab');
      writeFileSync(join(destDir, 'SKILL.md'), '# ab-updated');
      cmdOut();
      assert.strictEqual(readFileSync(join(skillsDir, 'a', 'b', 'SKILL.md'), 'utf8'), '# ab-updated');
    } finally {
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });

  test('cmdIn -y installs from skills dir to dest', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-src2-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor2-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'x'), { recursive: true });
      writeFileSync(join(skillsDir, 'x', 'SKILL.md'), '# x');
      cmdIn(['-y']);
      assert.ok(existsSync(join(cursorDir, 'skills-cursor', 'x', 'SKILL.md')));
      assert.strictEqual(readFileSync(join(cursorDir, 'skills-cursor', 'x', 'SKILL.md'), 'utf8'), '# x');
    } finally {
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });

  test('cmdIn -y clears existing dest then installs', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-src3-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor3-'));
    const destDir = join(cursorDir, 'skills-cursor', 'old');
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'n'), { recursive: true });
      writeFileSync(join(skillsDir, 'n', 'SKILL.md'), '# new');
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'SKILL.md'), '# old-content');
      cmdIn(['-y']);
      assert.ok(existsSync(join(cursorDir, 'skills-cursor', 'n', 'SKILL.md')));
      assert.strictEqual(readFileSync(join(cursorDir, 'skills-cursor', 'n', 'SKILL.md'), 'utf8'), '# new');
    } finally {
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });
});
