## 1. Generate deterministic cards

- [ ] 1.1 Use the built `items`, `monsters`, and `visual_assets` associations with pipeline-owned image paths to render all 1,719 item and 361 monster cards; verify counts against the current database and fail on a missing registered artwork file.
- [ ] 1.2 Build item and monster templates with accurate type, quality, level/classification, artwork scaling, and text-only variants; visually verify an art-bearing monster, light weapon, missing-art item, and same-name pair at 1200 × 630.
- [ ] 1.3 Escape database text in SVG, bundle a fixed licensed font, disable system-font loading, and wrap long names; verify markup-like names, punctuation, accented glyphs, and longest names remain legible and same inputs render the same bytes across hosts.

## 2. Publish complete image sets

- [ ] 2.1 Give each PNG a content-hashed path under a generator-owned `static/og/{item,monster}/` directory and create an identity-to-path-and-alt lookup; verify changed artwork/font bytes change its URL.
- [ ] 2.2 Stage the complete card set and lookup, then validate count, PNG signatures, dimensions, file existence, and stale-owned-output removal before replacing published output; verify a renderer failure leaves no partial publishable set.
- [ ] 2.3 Integrate generation before prerender and pass the server-only lookup through item and monster loaders to optional `Seo` image props; verify all supported pages use matching absolute Open Graph/Twitter image URLs and alt text, while unsupported routes retain `/og-default.png`.

## 3. Measure and inspect deployment

- [ ] 3.1 Run the full build and measure generated PNG storage, per-file sizes, total Worker files, and added full-build time; verify the 100,000-file and 25 MiB-per-file limits and confirm or revise the provisional 100 MB and 60-second project budgets from measurement.
- [ ] 3.2 Inspect representative item, monster, and default-card pages in a browser at 1440 × 900 and 390 × 844, plus their fetched PNGs; verify metadata, alt text, and displayed card content agree.
- [ ] 3.3 Run focused output checks for missing registered art, valid absent art, hostile text, long names, failure rollback, and content-hash changes; verify generated metadata references only existing PNG files.
