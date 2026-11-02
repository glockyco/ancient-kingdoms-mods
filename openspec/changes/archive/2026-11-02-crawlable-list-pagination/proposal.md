## Why

The top-level lists show 20 rows and switch pages with buttons, so search engines reach only each list's first page through links. Most entries are linked only from the sitemap, and Search Console reports most of them as discovered but not crawled.

## What Changes

- Each list whose HTML shows only its first page gets prerendered pages for its default order. The list's path is page 1, and `/<list>/page/2` to `/<list>/page/<last>` follow.
- In the default view, the page controls are links to those pages and look as before. A plain click still changes the rows without loading a new document.
- Search, filters and other sorts keep paging with buttons and query parameters, so crawlers never see filter combinations.
- Each numbered page names itself as canonical and is in the sitemap. Its title and description stay those of the list's first page.
- The item list ships only the requested page's rows and loads the full list after first paint, as its first page already did.
- The collection JSON-LD, which describes the list at its first page's URL, stays on the first page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-metadata`: numbered list pages, their links, canonical URLs and sitemap entries, and collection JSON-LD on the first page only.

## Impact

`website/src/lib/components/ui/data-table/`, the pagination components, the list routes with their new `page/[page]` routes, `Seo.svelte`, the sitemap route, `svelte.config.js` and the deploy check in `website/scripts/`. No data, schema or README change.
