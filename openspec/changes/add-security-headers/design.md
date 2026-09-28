## Context

`website/_headers:14-32` defines cache rules only. Its generated copy adds adapter-owned cache rules for `/_app/*` (`website/.svelte-kit/cloudflare/_headers:34-41`). `website/src/routes/+page.server.ts:17,42-46` renders the home page through the Worker; `website/src/routes/+layout.ts:1-4` prerenders the other pages. Cloudflare serves matching assets before the Worker (`website/wrangler.toml:15-22`; `website/.svelte-kit/cloudflare/_worker.js:83-101`).

The template contains a theme script and style (`website/src/app.html:16-46`), an analytics beacon (`:51-55`), and an inline body style (`:50`). SvelteKit adds a hydration script. JSON-LD appears through `{@html}` (`website/src/lib/components/JsonLd.svelte:17-18`, `Breadcrumb.svelte:85-87`). Game tooltip HTML and component styles use inline styles (`ItemTooltip.svelte:20-33`). The apex directory links to this site with an image preview, not an iframe (`~/src/github.com/glockyco/compendiums.org/public/index.html:54-78`). No iframe or other embedder appears in the inspected apex repository. The phrase “for embeds” on `website/src/routes/+layout.svelte:25` does not prove an embedder exists.

## Goals / Non-Goals

**Goals:** Enforce a restrictive script policy on every HTML response. Apply frame restrictions as HTTP headers on both delivery paths. Preserve current page rendering and the cache policy.

**Non-Goals:** Add an embedding feature or allow a parent origin based only on a comment. Change Cloudflare's challenge handling or the apex directory site.

## Decisions

### Let SvelteKit hash generated scripts; use HTTP headers for frame restrictions

Choose `kit.csp.mode: 'hash'` in `website/svelte.config.js`. Kit computes hashes for its generated hydration and component scripts. Prerendered responses receive a CSP meta element; Worker-rendered HTML receives a CSP header. A nonce cannot be fixed in a prerendered page (`website/node_modules/@sveltejs/kit/src/runtime/server/page/render.js:70-77`). Kit does not hash arbitrary markup in `app.html`: move the small theme script into an external first-party script or explicitly pin its exact hash. Keep the existing early theme application. Test the inline CSS, no-script CSS, and JSON-LD separately; Kit-generated script hashes do not prove that a raw `{@html}` script is permitted. If a restrictive policy blocks JSON-LD, add exact per-response hashes through a supported rendering boundary or change its emission without losing structured data. Do not permit arbitrary inline JavaScript to conceal a failure.

Reject a full CSP in static `website/_headers`. Its fixed hash list cannot cover SvelteKit's route-dependent hydration code and rendered JSON-LD without a generated, per-page policy. Allowing all inline scripts would undo the main protection. Also reject Kit-only CSP: prerendered CSP is a meta element, which cannot enforce `frame-ancestors` (SvelteKit configuration documentation, `https://svelte.dev/docs/kit/configuration#csp`).

Use a static `/*` rule in `website/_headers` for `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` disabling unused features. Preserve the cache overrides and adapter-owned `/_app/*` block. For Worker responses, add equivalent headers at the existing response boundary; append `frame-ancestors 'none'` to Kit's generated CSP instead of replacing its script hashes. Verify static rules actually apply to asset HTML and that Worker headers survive the home page's `setHeaders` cache control. Browser enforcement of separate CSP policies is cumulative, not an override.

### Restrict origins while preserving inline game styles

Start from `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`, `script-src 'self' https://static.cloudflareinsights.com` plus the hashes Kit supplies, `script-src-attr 'none'`, `worker-src 'self'`, `connect-src 'self' https://cloudflareinsights.com`, and `img-src 'self' data:`. Allow inline style attributes and style elements where the template, tooltip HTML, component output, or Svelte transitions require them. Do not extend this allowance to scripts. Inspect actual browser violations before adding any origin or capability. The beacon source is in `website/src/app.html:51-55`; the map and search load first-party workers and data (`website/src/lib/db.ts:20-28`). Choose only feature-policy directives verified unused by these pages.

### Deny framing until a real embedder exists

The allowed parent-origin set is empty. `frame-ancestors 'none'` and `X-Frame-Options: DENY` agree. The apex image preview is a link, not a parent frame. `?theme=` remains a harmless theme override for unframed visits; it does not grant framing. If a future embedder appears, review its exact origin and revisit both framing headers before deployment; do not add `compendiums.org` as a speculative exception.

## Risks / Trade-offs

- [Kit hashes omit manually authored scripts or raw JSON-LD] → Account for every emitted script and verify structured data plus CSP violations in the browser.
- [A static rule does not affect Worker responses] → Inspect headers from home, 404, and static documents independently, and add Worker headers at the response boundary.
- [Style restrictions remove game-tooltip colors or break transitions] → Permit only the required inline-style forms and test tooltip rendering, theme, and map interactions.
- [Global `/*` headers affect non-HTML assets] → Keep resource restrictions on HTML only and use appropriate common headers on assets; inspect generated `_headers` precedence.

## Migration Plan

Add both policy paths in one deployment. Check the built prerendered documents, Worker responses, and browser behavior before releasing. Roll back the deployment if search, JSON-LD, theme, or map behavior breaks; do not leave a permissive temporary policy in production.
