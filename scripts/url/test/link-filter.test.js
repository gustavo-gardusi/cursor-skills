import { describe, test } from 'node:test';
import assert from 'node:assert';
import { isNoiseUrl } from '../link-filter.js';

describe('link-filter isNoiseUrl', () => {
  test('filters auth and session paths', () => {
    assert.strictEqual(isNoiseUrl('https://example.com/login'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/signin'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/auth/oauth'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/register'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/page?redirect=login'), true);
  });

  test('filters image and binary asset URLs', () => {
    assert.strictEqual(isNoiseUrl('https://example.com/photo.jpg'), true);
    assert.strictEqual(isNoiseUrl('https://cdn.example.com/logo.png'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/banner.gif'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/icon.svg'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/favicon.ico'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/doc.pdf'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/video.mp4'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/image.webp?size=large'), true);
  });

  test('filters asset path segments', () => {
    assert.strictEqual(isNoiseUrl('https://example.com/img/hero.jpg'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/images/logo.png'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/assets/script.js'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/static/style.css'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/media/clip.mp4'), true);
  });

  test('filters ad and tracking URLs', () => {
    assert.strictEqual(isNoiseUrl('https://doubleclick.net/track'), true);
    assert.strictEqual(isNoiseUrl('https://pagead2.googlesyndication.com/pagead/img'), true);
    assert.strictEqual(isNoiseUrl('https://googleadservices.com/page/conversion'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/ads/banner'), true);
    assert.strictEqual(isNoiseUrl('https://adserver.example.com/click'), true);
    assert.strictEqual(isNoiseUrl('https://example.com/ad/123'), true);
  });

  test('allows content pages', () => {
    assert.strictEqual(isNoiseUrl('https://example.com/'), false);
    assert.strictEqual(isNoiseUrl('https://example.com/about'), false);
    assert.strictEqual(isNoiseUrl('https://example.com/docs/getting-started'), false);
    assert.strictEqual(isNoiseUrl('https://example.com/blog/post-1'), false);
    assert.strictEqual(isNoiseUrl('https://example.com/page?q=hello'), false);
  });

  test('rejects non-http(s)', () => {
    assert.strictEqual(isNoiseUrl('javascript:void(0)'), true);
    assert.strictEqual(isNoiseUrl('mailto:hi@example.com'), true);
    assert.strictEqual(isNoiseUrl('data:image/png;base64,abc'), true);
  });

  test('returns true for invalid or malformed URL (catch)', () => {
    assert.strictEqual(isNoiseUrl(''), true);
    assert.strictEqual(isNoiseUrl('not-a-url'), true);
    assert.strictEqual(isNoiseUrl('://missing-protocol.com'), true);
  });
});
