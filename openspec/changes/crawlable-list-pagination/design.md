## Context

`website/src/lib/components/ui/data-table/data-table.svelte` sorts, filters and pages the lists with TanStack and keeps its state in `{urlKey}.*` query parameters. Eleven top-level lists set `paginateStaticHtml`, so their HTML shows only the first page. Zones and mercenaries render every row in their HTML, so all their entries are linked already. The slayer table under professions lists monsters, which the monster list's pages link. The item list sends its first page with the HTML and fetches `items/list.json`, 1.9 MB, after first paint.

## Goals / Non-Goals

### Goals

- Every entry of a list is reachable through `<a href>` links between prerendered list pages.
- Players see no change.

### Non-Goals

- Crawlable search, filter or sort combinations.
- Page numbers in titles or descriptions, which would be new visible text.
- Lighter pages for the lists that ship their full data with every page.

## Decisions

### URLs without a trailing slash

Page 1 is the list's path, such as `/items`, and later pages are `/items/page/2`. The site serves its pages without a trailing slash and redirects `/items/` to `/items`, so links with a slash would point at redirects.

### Lists that show one page in their HTML

Altars, chests, gather-items, items, monsters, npcs, quests, recipes, skills, summons and traps get numbered pages. Zones and mercenaries keep their single page, because numbered pages would only repeat their full HTML. Each list's `_pagination` helper from `website/src/lib/server/list-pagination.ts` counts the pages for the list's loader, its `page/[page]` entries and the sitemap, so the three agree. A requested page outside 2 to the last page is a 404.

A list that fits on one page, such as altars today, has no numbered entries, which SvelteKit reports as an unseen route. `website/svelte.config.js` lets unseen `/<list>/page/[page]` routes through and fails on any other unseen route. Because the page links and the entries come from the same count, no page links to a route this lets through.

### Links in the default view, buttons otherwise

DataTable takes an optional `crawlable` prop with the list's path, page, total and page size. In the default view, with no search, no active filter and the initial sort and page size, the page number, previous and next controls are anchors with the classes the buttons had. Column visibility doesn't count, because it doesn't change the rows. A plain click changes the page in place and replaces the URL with the page's path. Modified clicks and clicks before the full data has arrived follow the link. Any other view uses buttons, with the page in the query on the list's first path. The URL is replaced with `history.replaceState`, as DataTable already did for its query parameters. A numbered page ignores the table state saved in local storage, because its path names the page.

### Items ship exactly their page

The item loader sorts the full list with the overview's table factory, `createSvelteTable`, and its initial sort, and ships the requested page's 20 rows with their records. `website/src/lib/utils/item-list.ts` holds the initial sort and the name comparator for the loader and the overview. The comparator is fixed to `alphanumeric`, which TanStack infers from the full list today, because TanStack infers the comparator from the rows it holds and one page can infer another. Shipping every row through the requested page instead would average 1.1 MB per page and reach the whole list on the last pages, because 770 items share level 0.

### Metadata

Each numbered page is its own canonical and Open Graph URL and keeps the first page's title and description. The sitemap lists the numbered pages with the first page's date. The collection JSON-LD names the list's first page as its URL, so numbered pages leave it out, and the item loader sends the collection only for page 1.

## Risks / Trade-offs

- The lists other than items ship their full data with every numbered page, as their first page does, between 100 KB and 1.5 MB per page.
- `history.replaceState` changes the path without SvelteKit's router knowing. A later navigation reads the URL from the browser, as it already did for the query parameters.

## Verification

The deploy check in `website/scripts/check-deployment-assets.mjs` walks each list with a numbered page in the sitemap through its next-page links in the built assets. It fails when a page shows another page's rows, names another URL as canonical or is missing from the sitemap, when the sitemap lists a page no page links to, or when the item list has no numbered pages. For items it also checks that every item in `list.json` is on exactly one page.
