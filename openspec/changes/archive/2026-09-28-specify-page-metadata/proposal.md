## Why

The website already emits metadata, a sitemap, and shared JSON-LD. Their shipped behavior has no dedicated OpenSpec contract, which leaves later metadata changes without a verified baseline.

## What Changes

- Specify the shipped title, description, canonical URL, Open Graph, and Twitter metadata behavior.
- Specify crawl rules, the sitemap manifest, and the IndexNow change ping.
- Specify shared, collection, and breadcrumb JSON-LD nodes. This change makes no website code changes.

## Capabilities

### New Capabilities

- `page-metadata`: The metadata and discovery output emitted by the current website.

### Modified Capabilities

None.

## Impact

This documentation-only change describes `website/src/lib/components/Seo.svelte`, `website/src/lib/seo/`, `website/src/lib/server/meta-description.ts`, the sitemap and IndexNow scripts, and `website/static/robots.txt`. The sitemap coverage contract includes every prerendered, indexable page as the concurrent sitemap fix lands.
