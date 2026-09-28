## 1. Preserve existing altar outputs

- [ ] 1.1 Capture current overview and detail page-data for a forgotten altar and an avatar altar from a fixed SQLite fixture. Verify order, null values, final-wave bosses, reward rates, and description before migration.

## 2. Migrate server-only reads

- [ ] 2.1 Create `$lib/queries/altars.server.ts` with typed overview, detail, and entry functions. Move SQL, JSON parsing, boolean conversion, reward joins, and page-data projection out of both altar routes. Verify focused output comparisons against the captured fixture.
- [ ] 2.2 Make `routes/altars/+page.server.ts` and `routes/altars/[id]/+page.server.ts` thin adapters. Keep 404 handling, prerender entries, existing URL paths, and meta-description. Verify missing IDs return 404 and a thrown read still closes its database connection.
- [ ] 2.3 Add focused website architecture checks for normal entity route reachability, declared search/sitemap capability coverage, and server-only database import boundaries. Verify an omitted manifest entry or browser import of `better-sqlite3` fails while map-only routes remain valid.

## 3. Verify the public surface

- [ ] 3.1 Prerender the altar overview and both altar details, then inspect them in a browser at 1440×900 and 390×844. Verify links, visible boss/reward details, page-data shape, and generated URLs match the pre-migration behavior.
