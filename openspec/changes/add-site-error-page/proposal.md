## Why

Unknown compendium paths return HTTP 404 but show SvelteKit's plain default error view without navigation. Visitors who follow an outdated link cannot find the relevant section from that page.

## What Changes

- Replace the default error view with a readable compendium page that distinguishes missing pages from server failures.
- Give visitors a way to open global search and direct links to the main indexes, including a useful path without JavaScript.
- Keep the correct HTTP status and serve the same recovery interface for missing document paths after static-asset lookup and for Worker-rendered errors.

## Capabilities

### New Capabilities

- `site-error-recovery`: Error-page content, navigation, and response behavior.

### Modified Capabilities

None.

## Impact

`website/src/routes/+error.svelte`, the shared layout and search interface, and the Cloudflare adapter's static-asset/Worker boundary. Changes to Wrangler routing are needed only if a built and deployed error-path check shows that document misses do not reach SvelteKit.
