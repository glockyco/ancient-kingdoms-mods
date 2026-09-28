## 1. Script policy

- [ ] 1.1 Add hash-mode CSP directives to `website/svelte.config.js` for approved first-party resources and Cloudflare analytics. Verify the built prerendered item HTML contains a CSP meta element and a Worker-rendered home response contains a CSP header.
- [ ] 1.2 Account for `website/src/app.html:16-46`, generated hydration scripts, and JSON-LD from `JsonLd.svelte` and `Breadcrumb.svelte`. Preserve immediate theme selection and structured data without arbitrary inline script permission. Verify actual emitted scripts execute or remain accessible under the policy in Chromium.
- [ ] 1.3 Permit only the inline style forms needed by template CSS, tooltip HTML, Svelte components, and transitions. Verify colors, theme, and tooltip rendering on item and quest pages in Chromium.

## 2. Header coverage

- [ ] 2.1 Add frame, MIME sniffing, referrer, and limited browser-feature headers to `website/_headers`; keep its existing cache rules and generated `/_app/*` overrides. Inspect the built `_headers` and HTTP responses from a prerendered page and asset.
- [ ] 2.2 Add equivalent Worker headers at the response boundary, preserving Kit's generated script hashes and the home page's cache control. Verify headers on `/`, a 404 document, and a Worker 500 without duplicate or weaker policies.
- [ ] 2.3 Add focused checks for policy generation and both response paths, including `frame-ancestors 'none'`, `X-Frame-Options: DENY`, and rejection of an unapproved script and inline event handler. Run only the targeted checks and verify real browser enforcement.

## 3. Browser and release verification

- [ ] 3.1 Build the site and exercise home, item, tooltip, global search, map, and `?theme=light` at 1440×900 and 390×844 with Chromium. Inspect console CSP reports, beacon traffic, JSON-LD, database-worker loading, and denied framing.
- [ ] 3.2 Verify static HTML, assets, home, and unknown-path response headers on the deployed Cloudflare custom domain. Confirm status and cache behavior stay intact; do not release if policy restrictions disable site content.
