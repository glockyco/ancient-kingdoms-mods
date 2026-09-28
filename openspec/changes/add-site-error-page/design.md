## Context

There is no `website/src/routes/+error.svelte`. The current shared layout renders `SearchPalette` before `<main>` (`website/src/routes/+layout.svelte:74-85`), but the default error view has no direct navigation. `website/src/lib/components/HomeSearch.svelte:7-21` opens that palette only when JavaScript runs. The existing search contract requires hiding inactive controls without JavaScript (`openspec/specs/global-search/spec.md:22-25`).

`website/src/routes/+layout.ts:1-4` prerenders ordinary routes, while `website/src/routes/+page.server.ts:17` opts the home page into Worker rendering. Wrangler defines an assets binding without `not_found_handling` or `run_worker_first` (`website/wrangler.toml:20-22`). The adapter's generated Worker checks the asset manifest and prerendered paths, then calls SvelteKit for an unknown path (`website/.svelte-kit/cloudflare/_worker.js:83-101`). A live `curl -sI https://ancient-kingdoms.compendiums.org/does-not-exist` returned HTTP 404, `content-type: text/html`, and `x-sveltekit-page: true`. The HTML contains `error: {message:"Not Found"}, status: 404`, and the framework's plain view. No `404.html` exists in the current generated asset bundle.

## Goals / Non-Goals

**Goals:** Keep the correct status across direct navigation, in-app navigation, and Worker failures. Give users immediate recovery without requiring JavaScript. Make the current assets-first HTML miss flow render the same error page.

**Non-Goals:** Turn missing JS/images/database files into HTML documents. Change search ranking or build a second search service. Change the apex directory site's 404 policy.

## Decisions

### Use the shared root error component and layout

Add `website/src/routes/+error.svelte`. Read the status from the SvelteKit page state; distinguish 404 from 5xx without printing raw exception messages. Render a heading, short explanation, and links to `/`, `/items`, `/monsters`, `/zones`, `/map`, and other important overview pages where useful. Use the existing design tokens and responsive spacing. Open the existing `SearchPalette` through its state on a button with `js-only`; keep navigation anchors in the server-rendered markup. The shared layout already includes the palette and shortcut, so no duplicate search input or index is needed. Set a suitable page title and noindex metadata for error documents without relying on the home route's `Seo` props.

### Preserve the assets-first routing boundary

A missing HTML path currently falls through Cloudflare Static Assets to the Worker, which invokes SvelteKit and returns HTTP 404. Therefore the error component handles both a static document miss and a Worker page error without a custom `404.html` or Wrangler `not_found_handling: '404-page'`. That setting belongs to an asset-only site, not this Worker: using it can intercept a request for `/`, which intentionally has no static HTML asset. Keep CSS, JS, and image misses as resource 404s; do not return HTML under their MIME types. Check the deployed behavior after building, since the generated manifest and asset-router settings are part of the contract.

Reject a static-only `404.html`: it does not cover thrown Worker errors and risks a different recovery page. Reject a blanket Worker-first asset configuration: it would route thousands of prerendered pages and images through the Worker when the asset layer already handles them.

## Risks / Trade-offs

- [Some deployment routes might bypass the Worker after an asset miss] → Check both a never-existing URL and a URL removed from a previous prerendered deployment against the built Cloudflare bundle and live deployment. Fix the routing boundary if either bypasses the root error component.
- [A Worker failure can affect shared layout or the search index] → Keep links and explanation in SSR HTML, hide inactive search controls without JavaScript, and avoid data-dependent rendering in the error component.
- [A generic 500 message can hide useful diagnostic detail] → Keep details in server logs; expose only safe recovery text to visitors.

## Migration Plan

Build the adapter output and verify direct 404 responses before deployment. After deployment, request an unknown URL and exercise a controlled Worker-error path. If the asset layer bypasses SvelteKit, fix that boundary before claiming that static document misses have the new page. Roll back the deployment if failure responses lose their status or direct navigation.
