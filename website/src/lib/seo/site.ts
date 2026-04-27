/**
 * Canonical site identity for SEO.
 *
 * Values are deliberately hardcoded: the deploy target is the Cloudflare
 * Workers preview URL and there is no custom domain. Updating either constant
 * here updates every <Seo> head, the sitemap, and OG/Twitter URLs in lockstep.
 */

export const SITE_URL =
  "https://ancient-kingdoms-compendium.wowmuch1.workers.dev";

export const SITE_NAME = "Ancient Kingdoms Compendium";

/** Default Open Graph / Twitter image (1200x630). Generated at build time. */
export const OG_IMAGE_PATH = "/og-default.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = `${SITE_NAME} logo and title card`;
export const OG_LOCALE = "en_US";

/**
 * Compute the absolute canonical URL for a page path.
 *
 * Accepts both "/foo" and "foo"; normalizes the trailing slash so the home
 * page is always "${SITE_URL}/" and other paths have no trailing slash.
 */
export function canonicalUrl(path: string): string {
  if (path === "/" || path === "") return `${SITE_URL}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized.replace(/\/$/, "")}`;
}

export function ogImageUrl(): string {
  return `${SITE_URL}${OG_IMAGE_PATH}`;
}
