## Why

The site publishes HTML without a content security policy or browser security headers. A mistake in a tooltip or generated page could therefore run unexpected code, and another site could frame the compendium.

## What Changes

- Add a restrictive content security policy that permits the site's scripts, styles, images, data, and Cloudflare beacon without opening arbitrary script origins.
- Limit framing to verified embedders; block framing when none exist. Preserve the `?theme=` theme selection for ordinary visits.
- Apply framing, MIME sniffing, referrer, and browser-feature restrictions to both static assets and Worker responses.
- Check that structured data, tooltips, search, theme selection, and map rendering continue to work.

## Capabilities

### New Capabilities

- `site-security-policy`: Browser security policy for static pages, Worker pages, and assets.

### Modified Capabilities

None.

## Impact

`website/svelte.config.js`, `website/src/app.html`, `website/_headers`, the Worker response boundary, and security verification. The apex directory site is read-only evidence for frame permissions; it is not changed.
