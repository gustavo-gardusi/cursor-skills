import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadVisitedSet, saveVisitedSet, normalizeVisitedUrl } from '../visited.js';

describe('visited normalizeVisitedUrl', () => {
  test('strips hash', () => {
    assert.strictEqual(normalizeVisitedUrl('https://a.com/page#section'), 'https://a.com/page');
    assert.strictEqual(normalizeVisitedUrl('https://a.com#'), 'https://a.com/');
  });

  test('returns null for invalid or empty', () => {
    assert.strictEqual(normalizeVisitedUrl(''), null);
    assert.strictEqual(normalizeVisitedUrl('   '), null);
    assert.strictEqual(normalizeVisitedUrl('not-a-url'), null);
    assert.strictEqual(normalizeVisitedUrl('ftp://x.com'), null);
  });

  test('trims and returns https URL', () => {
    assert.strictEqual(normalizeVisitedUrl('  https://example.com  '), 'https://example.com/');
  });
});

describe('visited loadVisitedSet', () => {
  test('returns empty set when file does not exist', () => {
    const set = loadVisitedSet('/nonexistent/path', { existsSync: () => false });
    assert.strictEqual(set.size, 0);
  });

  test('loads one URL per line and normalizes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'visited-'));
    const file = join(dir, 'v.txt');
    writeFileSync(file, 'https://a.com\nhttps://b.com/page#hash\n  https://c.com  \n', 'utf8');
    try {
      const set = loadVisitedSet(file);
      assert.strictEqual(set.size, 3);
      assert.ok(set.has('https://a.com/'));
      assert.ok(set.has('https://b.com/page'));
      assert.ok(set.has('https://c.com/'));
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('uses custom deps when provided', () => {
    const set = loadVisitedSet('/any/path', { existsSync: () => false });
    assert.strictEqual(set.size, 0);
  });

  test('skips invalid lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'visited-'));
    const file = join(dir, 'v.txt');
    writeFileSync(file, 'https://ok.com\n\nftp://no.com\n  \nhttps://yes.com\n', 'utf8');
    try {
      const set = loadVisitedSet(file);
      assert.strictEqual(set.size, 2);
      assert.ok(set.has('https://ok.com/'));
      assert.ok(set.has('https://yes.com/'));
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('visited saveVisitedSet', () => {
  test('writes one URL per line sorted', () => {
    const dir = mkdtempSync(join(tmpdir(), 'visited-'));
    const file = join(dir, 'out.txt');
    const set = new Set(['https://z.com', 'https://a.com']);
    try {
      saveVisitedSet(file, set);
      const text = readFileSync(file, 'utf8');
      const lines = text.trim().split('\n');
      assert.strictEqual(lines.length, 2);
      assert.strictEqual(lines[0], 'https://a.com');
      assert.strictEqual(lines[1], 'https://z.com');
      assert.ok(text.endsWith('\n'));
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test('does nothing when path empty or set empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'visited-'));
    const file = join(dir, 'out.txt');
    saveVisitedSet('', new Set(['https://a.com']));
    saveVisitedSet(file, new Set());
    assert.ok(!existsSync(file));
    rmSync(dir, { recursive: true });
  });
});
