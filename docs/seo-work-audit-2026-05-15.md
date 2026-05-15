# SEO Work Audit — 2026-05-15

Scope: commits `71d2a5d`, `d31bc14`, `4111f63`, `80a4c23`, `4500f6b`, `20fcdff`, `b4628a9`, `4cbed2f`, `4105146`, and `d4c44e2`.

## Findings

### P1 — JSON-LD serialization allows script-tag breakout

- Files: `website/src/lib/components/JsonLd.svelte:11-18`, `website/src/lib/components/Breadcrumb.svelte:85-88`
- Commits: `b4628a9`, `4105146`; same sink also exists in touched breadcrumb code from `d31bc14`

`JsonLd.svelte` and `Breadcrumb.svelte` inject raw `JSON.stringify(...)` output with `{@html}` inside a `<script type="application/ld+json">` tag. `JSON.stringify` does not escape `</script>` or `<!--`; a database-backed item, monster, NPC, quest, skill, zone, recipe, or breadcrumb label containing that sequence can close the script tag and inject markup.

Observed proof:

```bash
node -e 'const json = JSON.stringify({name:"x</script><img src=x onerror=alert(1)>"}); console.log(json)'
# {"name":"x</script><img src=x onerror=alert(1)>"}
```

Recommended fix: centralize JSON-LD serialization in a helper used by both components, and escape at least `<` as `\u003c` before injecting. Add a regression test with a `</script><script>` payload and update `Breadcrumb.svelte` to reuse the same serializer rather than carrying a second raw sink.

### P1 — Sitemap/IndexNow hashes do not track rendered HTML changes

- File: `website/scripts/build-sitemap-manifest.mjs:397-424`, `website/scripts/build-sitemap-manifest.mjs:436-498`, `website/scripts/build-sitemap-manifest.mjs:501-535`
- Commits: `4111f63`, exposed by `4105146` and shared-component SEO changes

The manifest hashes mostly model database payloads, not the files that render each URL. Detail URLs are hashed from DB payload only. Overview URLs are hashed from DB query results only. Mechanics/profession URLs include a small subset of route files, but not shared dependencies such as `Breadcrumb.svelte`, `Seo.svelte`, `JsonLd.svelte`, card components, or SEO helpers.

That means a template-only SEO change can alter page HTML without changing the manifest hash. The sitemap keeps the previous `<lastmod>`, and `indexnow-ping.mjs` will not submit the changed URL.

Observed evidence: after `4105146` added `CollectionPage` JSON-LD to overview pages, representative overview manifest entries still had identical hashes before and after the reviewed stack:

```text
/items       17b9db9411d9f55ba1102df7d0a9ee8fb94f3212876cfa96d641d36c72bc6c95
/monsters    31372ea016c042624167d728778e31006ac5a215fe46af827638b43f38340474
/professions 19b32da3f96dae286d5ed2717518292ed584504de2292d3e441320cc87866fbc
```

Recommended fix: do not try to hand-maintain a perfect source dependency graph. The lowest-maintenance design is a two-phase deploy artifact: build first, hash the generated HTML/XML files that will actually be uploaded, then publish the sitemap manifest derived from those hashes. If deploy ordering makes that awkward, use one coarse source fingerprint over shared rendering/SEO/layout code as an interim guardrail. The coarse fingerprint will over-bump some pages, but that failure mode is safe; the current DB-only hashes under-bump pages, which silently hides changed HTML from sitemap `<lastmod>` and IndexNow.

### P2 — IndexNow failures are logged but deploy still succeeds

- File: `website/scripts/indexnow-ping.mjs:64-81`
- Commit: `20fcdff`

`indexnow-ping.mjs` catches network failures and logs non-OK API responses, but then returns normally. Because `website/package.json:20` chains the script in `cf-deploy` with `&&`, a bad key, network failure, or IndexNow 4xx/5xx response still leaves deployment automation green even though no changed URLs were accepted.

Recommended fix: throw on fetch failure and on `!res.ok` after reading the response body, or set `process.exitCode = 1`. Add tests around the CLI path or extracted ping function so 4xx/5xx and rejected fetches are non-zero exits.

### P3 — Full CollectionPage ItemLists add large head payloads

- Files: `website/src/lib/seo/jsonld.ts:139-144`, overview pages changed in `4105146`
- Commit: `4105146`

Every overview page emits an `ItemList` entry for every entity in that collection. The largest pages now duplicate substantial route data in the document head. Approximate minified JSON-LD payload sizes from the current DB:

```text
/items:    1,570 entries, ~217 KB
/skills:     656 entries,  ~86 KB
/monsters:   359 entries,  ~47 KB
/npcs:       225 entries,  ~30 KB
/quests:     169 entries,  ~24 KB
```

This cuts against the existing no-JS guidance in `website/CLAUDE.md` that overview pages avoid bloat by rendering a paginated subset. It also increases SSR/hydration work because the large JSON-LD object is stringified again on the client.

Decision: this is intentional product behavior. Keep the full `CollectionPage` item lists unless payload size becomes a measured performance problem; if it does, revisit with real page-size and crawl data rather than trimming structured data preemptively.

## Checked without findings

- `website/src/lib/seo/jsonld.ts`: stable `@id` construction and schema node shapes are coherent.
- `website/src/routes/+layout.svelte`: site identity JSON-LD in layout is acceptable; repeated `WebSite`/`Organization`/`Person` nodes use stable IDs.
- `website/src/routes/sitemap.xml/+server.ts`: manifest consumption and `<lastmod>` emission are straightforward for the current canonical URL set.
- `website/static/b0384ee2818bf5cb2ce24f8699d2377f.txt` and `website/src/lib/seo/indexnow-key.ts`: key location matches the IndexNow payload.
- `website/svelte.config.js`: removing the inline style threshold override is not an SEO correctness issue in this stack.
