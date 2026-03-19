import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pathToName, findSkillFiles, doInstall, cmdIn, cmdOut, processContent, usage, run } from '../sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('skill-sync processContent', () => {
  test('replaces {{base:path}} with absolute path', () => {
    const repo = tmpdir() + '/sync-repo';
    mkdirSync(repo, { recursive: true });
    const out = processContent('Run {{base:scripts/url}}/fetch.js', repo);
    assert.ok(out.includes('fetch.js'));
    assert.ok(out.includes('scripts'));
    assert.ok(out.includes('url'));
    assert.ok(!out.includes('{{base:'));
  });
  test('replaces {{embed:path}} with file content', () => {
    const repo = mkdtempSync(join(tmpdir(), 'embed-'));
    const f = join(repo, 'snippet.txt');
    writeFileSync(f, 'hello world', 'utf8');
    const out = processContent('Text: {{embed:snippet.txt}}', repo);
    assert.strictEqual(out.trim(), 'Text: hello world');
    rmSync(repo, { recursive: true });
  });

  test('replaces {{embed:path}} with empty string when file missing', () => {
    const repo = mkdtempSync(join(tmpdir(), 'embed-miss-'));
    const origWarn = console.warn;
    let warned = false;
    console.warn = () => { warned = true; };
    try {
      const out = processContent('Before {{embed:nonexistent.txt}} after', repo);
      assert.strictEqual(out.trim(), 'Before  after');
      assert.strictEqual(warned, true);
    } finally {
      console.warn = origWarn;
      rmSync(repo, { recursive: true });
    }
  });

  test('doInstall resolves {{base:path}} in installed skill', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-base-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-base-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'with-placeholder'), { recursive: true });
      writeFileSync(
        join(skillsDir, 'with-placeholder', 'SKILL.md'),
        'Path: {{base:scripts/url}}\n',
        'utf8'
      );
      doInstall();
      const installed = readFileSync(join(cursorDir, 'skills-cursor', 'with-placeholder', 'SKILL.md'), 'utf8');
      assert.ok(installed.includes('scripts'));
      assert.ok(installed.includes('url'));
      assert.ok(!installed.includes('{{base:'));
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

describe('skill-sync usage', () => {
  test('usage calls process.exit(1)', () => {
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error('exit');
    };
    try {
      usage();
    } catch (e) {
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = exit;
    }
  });
});

describe('skill-sync run', () => {
  test('run(["out"]) runs cmdOut and syncs back', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-run-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-run-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'x'), { recursive: true });
      writeFileSync(join(skillsDir, 'x', 'SKILL.md'), '# original');
      doInstall();
      writeFileSync(join(cursorDir, 'skills-cursor', 'x', 'SKILL.md'), '# updated');
      run(['out']);
      assert.strictEqual(readFileSync(join(skillsDir, 'x', 'SKILL.md'), 'utf8').trim(), '# updated');
    } finally {
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });

  test('cmdOut copies only when dest file exists (skip when missing)', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-cmdout-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-cmdout-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'a'), { recursive: true });
      mkdirSync(join(skillsDir, 'b'), { recursive: true });
      writeFileSync(join(skillsDir, 'a', 'SKILL.md'), '# a');
      writeFileSync(join(skillsDir, 'b', 'SKILL.md'), '# b');
      doInstall();
      const destA = join(cursorDir, 'skills-cursor', 'a', 'SKILL.md');
      const destB = join(cursorDir, 'skills-cursor', 'b', 'SKILL.md');
      writeFileSync(destA, '# a-updated');
      rmSync(destB, { force: true });
      cmdOut();
      assert.strictEqual(readFileSync(join(skillsDir, 'a', 'SKILL.md'), 'utf8').trim(), '# a-updated');
      assert.strictEqual(readFileSync(join(skillsDir, 'b', 'SKILL.md'), 'utf8').trim(), '# b');
    } finally {
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });

  test('run(["unknown"]) calls usage', () => {
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error('exit');
    };
    try {
      run(['unknown']);
    } catch (e) {
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = exit;
    }
  });

  test('run(["-h"]) and run(["--help"]) call usage', () => {
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error('exit');
    };
    for (const arg of ['-h', '--help']) {
      exitCode = undefined;
      try {
        run([arg]);
      } catch (e) {
        assert.strictEqual(exitCode, 1, arg);
      }
    }
    process.exit = exit;
  });
});

describe('skill-sync cmdOut', () => {
  test('cmdOut exits 1 when DEST does not exist', () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-out-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-out-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error('exit');
    };
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'x'), { recursive: true });
      writeFileSync(join(skillsDir, 'x', 'SKILL.md'), '# x');
      cmdOut();
      assert.fail('expected process.exit');
    } catch (e) {
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = exit;
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });
});

describe('skill-sync cmdIn prompt path', () => {
  test('cmdIn when dest exists and no -y uses prompt then doInstall (mock answer n)', async () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-p-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-p-'));
    const destDir = join(cursorDir, 'skills-cursor', 'one');
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'one'), { recursive: true });
      writeFileSync(join(skillsDir, 'one', 'SKILL.md'), '# one');
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'SKILL.md'), '# old');
      const mockRL = {
        question: (_prompt, cb) => { setImmediate(() => cb('n')); },
        close: () => {},
      };
      const p = cmdIn([], { createInterface: () => mockRL });
      await p;
      assert.strictEqual(readFileSync(join(destDir, 'SKILL.md'), 'utf8').trim(), '# one');
    } finally {
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(skillsDir, { recursive: true });
      rmSync(cursorDir, { recursive: true });
    }
  });

  test('cmdIn when dest exists and no -y with answer y clears then doInstall', async () => {
    const skillsDir = mkdtempSync(join(tmpdir(), 'skills-py-'));
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-py-'));
    const destDir = join(cursorDir, 'skills-cursor', 'one');
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.SKILLS_SOURCE_DIR = skillsDir;
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(join(skillsDir, 'one'), { recursive: true });
      writeFileSync(join(skillsDir, 'one', 'SKILL.md'), '# one');
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'SKILL.md'), '# old');
      const mockRL = {
        question: (_prompt, cb) => { setImmediate(() => cb('y')); },
        close: () => {},
      };
      const p = cmdIn([], { createInterface: () => mockRL });
      await p;
      assert.strictEqual(readFileSync(join(destDir, 'SKILL.md'), 'utf8').trim(), '# one');
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

describe('skill-sync cmdIn', () => {
  test('cmdIn exits 1 when skills dir does not exist', () => {
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-in-'));
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error('exit');
    };
    try {
      process.env.SKILLS_SOURCE_DIR = join(tmpdir(), 'nonexistent-skills-dir-12345');
      process.env.CURSOR_DIR = cursorDir;
      cmdIn([]);
      assert.fail('expected process.exit');
    } catch (e) {
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = exit;
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(cursorDir, { recursive: true });
    }
  });
});

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

  test('cmdOut exits 1 when skills dir does not exist', () => {
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-out-'));
    const destDir = join(cursorDir, 'skills-cursor', 'x');
    const orig = process.env.SKILLS_SOURCE_DIR;
    const origCursor = process.env.CURSOR_DIR;
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error('exit');
    };
    try {
      process.env.SKILLS_SOURCE_DIR = join(tmpdir(), 'nonexistent-skills-out-12345');
      process.env.CURSOR_DIR = cursorDir;
      mkdirSync(destDir, { recursive: true });
      writeFileSync(join(destDir, 'SKILL.md'), '# x');
      cmdOut();
      assert.fail('expected process.exit');
    } catch (e) {
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = exit;
      if (orig !== undefined) process.env.SKILLS_SOURCE_DIR = orig;
      else delete process.env.SKILLS_SOURCE_DIR;
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(cursorDir, { recursive: true });
    }
  });
});

describe('skill-sync CLI (spawn)', () => {
  test('sync.js with invalid command exits 1 and prints usage', () => {
    const script = join(__dirname, '..', 'sync.js');
    const result = spawnSync(process.execPath, [script, 'invalid'], {
      cwd: join(__dirname, '..', '..', '..'),
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.strictEqual(result.status, 1);
    assert.ok(result.stderr && result.stderr.includes('Usage:'));
  });
});

describe('skill-sync run in rejection', () => {
  test('run in when cmdIn rejects calls console.error and process.exit(1)', async () => {
    const exit = process.exit;
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
    };
    const origErr = console.error;
    let errMsg = null;
    console.error = (msg) => {
      errMsg = msg;
    };
    try {
      run(['in'], {
        cmdIn: () => Promise.reject(new Error('install failed')),
      });
      await new Promise((r) => setImmediate(r));
      assert.strictEqual(exitCode, 1);
      assert.ok(errMsg && (errMsg.message === 'install failed' || String(errMsg).includes('install failed')));
    } finally {
      process.exit = exit;
      console.error = origErr;
    }
  });
});

describe('skill-sync install locally (run in -y)', () => {
  test('run in -y installs repo skills to dest and resolves {{base:path}}', () => {
    const cursorDir = mkdtempSync(join(tmpdir(), 'cursor-install-e2e-'));
    const origCursor = process.env.CURSOR_DIR;
    try {
      process.env.CURSOR_DIR = cursorDir;
      run(['in', '-y']);
      const dest = join(cursorDir, 'skills-cursor');
      const names = readdirSync(dest);
      assert.ok(names.length >= 1, 'at least one skill installed');
      assert.ok(names.includes('context-add'), 'context-add skill installed');
      const addPath = join(dest, 'context-add', 'SKILL.md');
      assert.ok(existsSync(addPath), 'context-add/SKILL.md exists');
      const addContent = readFileSync(addPath, 'utf8');
      assert.ok(!addContent.includes('{{base:'), '{{base:...}} placeholders resolved');
      assert.ok(addContent.includes('scripts') && addContent.includes('url'), 'context-add contains resolved scripts/url path');
    } finally {
      if (origCursor !== undefined) process.env.CURSOR_DIR = origCursor;
      else delete process.env.CURSOR_DIR;
      rmSync(cursorDir, { recursive: true });
    }
  });
});
