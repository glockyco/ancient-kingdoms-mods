## Context

The unsuffixed fishing routes are rendered from the first selected variant (`website/src/routes/gather-items/[id]/+page.server.ts:17-32,94-103,133-143`). Their `Seo` path uses the selected resource ID (`website/src/routes/gather-items/[id]/+page.svelte:516-520`). Four alias URLs therefore canonicalize to four suffixed placements. The home page is served dynamically, while detail pages prerender.

## Goals / Non-Goals

**Goals:** Record the canonical choice that determines which existing routes belong in the sitemap.

**Non-Goals:** Change canonical tags or turn fishing aliases into separate indexable pages.

## Decisions

Keep the first variant as each unsuffixed fishing URL's canonical target. The alias displays that variant's details, so a separate index entry would present duplicate content as a distinct page. The sitemap includes only self-canonical prerendered pages and the canonical home URL. The four aliases stay navigable, but the manifest omits them. The generated manifest has 3,679 URLs: 3,678 self-canonical prerendered HTML pages plus the home page. This preserves discovery without duplicating an entity's canonical identity.

Keep unchanged content hashes' earlier `lastmod` and omit `lastmod` for pages without a reliable content hash (`website/scripts/build-sitemap-manifest.mjs:71-92,492-505`). The post-deployment IndexNow comparison pings only changed or removed hashed URLs (`website/scripts/indexnow-ping.mjs:11-29,63-97`). An absent live baseline skips a ping rather than treating every URL as new. Do not assign an invented modification date to the home, map, or simulator URLs.

**Alternative rejected:** Make the alias self-canonical only to increase sitemap coverage. That would index the same selected spot under two identities.

## Risks / Trade-offs

- [A route starts showing a real aggregate view rather than the first variant] → Revisit its canonical URL and sitemap inclusion together.
- [The manifest gains a noncanonical alias after a new route is added] → Compare each prerendered page's canonical URL against its route path during sitemap verification.
