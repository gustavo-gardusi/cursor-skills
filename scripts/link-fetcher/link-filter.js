/**
 * Link filtering for fetch/crawl: drop noise, images, and out-of-scope URLs
 * so "best" links are content pages only (LLM- and research-friendly).
 */

/** Path segments that usually mean non-content / auth / noise. */
const NOISE_PATHS = /\/?(login|signin|signout|logout|register|signup|auth|oauth|share|embed|javascript:)/i;

/** File extensions for images and common binary assets (dropped from best). */
const IMAGE_OR_ASSET_EXT = /\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|avif|woff2?|ttf|eot|mp4|webm|pdf)(\?|$|\/)/i;

/** Path segments that usually point to static assets, not content pages. */
const ASSET_PATH = /\/(img|images|image|assets|static|media|cdn|_next\/static|dist)\//i;

/**
 * Returns true if the URL should be filtered out (noise, image, or out-of-scope).
 * Used to build links.best from links.all; only http(s) URLs are passed.
 * @param {string} href - Absolute URL
 * @returns {boolean}
 */
export function isNoiseUrl(href) {
  try {
    const u = new URL(href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
    if (NOISE_PATHS.test(u.pathname) || NOISE_PATHS.test(u.search)) return true;
    if (IMAGE_OR_ASSET_EXT.test(u.pathname) || IMAGE_OR_ASSET_EXT.test(u.search)) return true;
    if (ASSET_PATH.test(u.pathname)) return true;
    return false;
  } catch {
    return true;
  }
}
