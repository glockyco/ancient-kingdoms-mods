## 1. Error recovery interface

- [ ] 1.1 Implement `website/src/routes/+error.svelte` using the shared layout and the existing search-palette state. Distinguish 404 from 5xx, add safe title/noindex metadata, and render links to home, items, monsters, zones, and map. Verify server-rendered HTML for each status and keyboard activation of search.
- [ ] 1.2 Keep direct links readable at 1440×900 and 390×844 without JavaScript, and hide the inactive search trigger. Verify dark/light themes, heading hierarchy, focus states, and responsive overflow in Chromium.

## 2. Delivery and status

- [ ] 2.1 Build the Cloudflare adapter output and inspect `website/wrangler.toml`, its asset manifest, and Worker routing. Request a never-existing path and a previously valid but now absent HTML path. Verify each serves the root error interface with HTTP 404 after the asset miss, without forcing all assets through the Worker.
- [ ] 2.2 Exercise a controlled Worker-rendered 500 and confirm its safe message and original status. Verify missing JS and image assets remain resource 404s, not HTML documents.
- [ ] 2.3 Add a focused regression check for the observable 404/500 response and no-JavaScript navigation. Run only that check, then verify the unknown-path HTTP response on the deployed custom domain before closing the change.
