## 1. Shared title policy

- [ ] 1.1 Replace the item-only title method with reviewed family-aware builders in `website/src/lib/server/meta-description.ts`; verify with an item/skill name collision and the `Drakespear` light-weapon case.
- [ ] 1.2 Add deterministic collision resolution using verified detail, then placement position, then canonical identity; verify two chests with the same zone and one shared-position edge produce different truthful titles.
- [ ] 1.3 Enforce the 60/70-character budget without truncating names or the brand; verify long recipe names and the irreducible-length exception with focused input cases.

## 2. Route adoption

- [ ] 2.1 Migrate item, monster, NPC, quest, zone, and skill detail loaders/pages to generated titles; verify their prerendered `<title>` values against their visible identity and loaded fields.
- [ ] 2.2 Migrate the shared summon/mercenary pet loader and renderer, altar, gathering-resource, and chest routes; verify canonical fishing variants have distinct titles, aliases keep their first variant's canonical URL, and all chests in Everfrost are distinct.
- [ ] 2.3 Review faction, class, recipe, and profession detail routes and all static/overview titles; migrate any collision or unsupported label and verify at least one prerendered page per family.

## 3. Output and interface verification

- [ ] 3.1 Add a post-prerender title check that compares decoded HTML titles across every indexable canonical page; verify a deliberate cross-family duplicate fails with both URLs reported.
- [ ] 3.2 Run the complete prerender with the title check; verify zero duplicate or empty titles, correct brand suffixes, and a justified report for any title above 70 characters.
- [ ] 3.3 Inspect representative item, chest, fishing, skill, and quest pages in the browser at 1440 × 900 and 390 × 844; verify the browser tab title matches a truthful page subject and the visible content.
