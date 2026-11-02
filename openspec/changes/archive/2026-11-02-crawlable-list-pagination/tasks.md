## 1. Numbered pages

- [x] 1.1 Add `crawlable-pagination.ts` with the default-view check and the slashless page URLs, and `list-pagination.ts` with the shared page count, entries and 404s.
- [x] 1.2 Add `page/[page]` routes that reuse their list's loader and view for altars, chests, gather-items, items, monsters, npcs, quests, recipes, skills, summons and traps, and let unseen numbered routes of one-page lists through in `svelte.config.js`.
- [x] 1.3 Ship exactly the requested page of items, sorted with the overview's table factory, initial sort and fixed name comparator from `item-list.ts`.

## 2. Links and metadata

- [x] 2.1 Render the page controls as anchors in the default view, change the page in place on plain clicks and keep buttons with query parameters in every other view.
- [x] 2.2 Give numbered pages their own canonical URL, keep the first page's title and description, add them to the sitemap with the first page's date and keep the collection JSON-LD on the first page.

## 3. Checks

- [x] 3.1 Test the default-view check, the page URLs, the URL transitions between path and query, the page count and 404s, and the item page selection with natural name order across page boundaries.
- [x] 3.2 Walk every numbered list in the built assets in the deploy check, and check that every item is on exactly one page.
- [x] 3.3 Run strict OpenSpec validation, the website checks and tests, and a production build.
- [x] 3.4 Check `/items`, `/items/page/2` and `/monsters/page/2` in the browser at 1440 and 390 pixels wide: rows, unchanged controls, in-place paging with the address bar, the return to page 1, and buttons after a search or a sort. Column filters are covered by the default-view tests.
