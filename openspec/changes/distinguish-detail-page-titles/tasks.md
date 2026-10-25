## 1. Verified armor-set display identity

- [ ] 1.1 Confirm the game-facing armor-set name before the cutover. Trace `EquipmentItem.ToolTip`, `ScriptableItem.LocalizedName`/`GetLocalizedText`, localization entries and other player-visible uses of the set augment. Establish whether the internal `... Armor Bonus Set` name appears on any supported player-facing path rather than assuming `nameArmorSet` is what the game renders. Use HotRepl to inspect actual English-client set-piece tooltips for Cinderchant and Cobalt, compare the internal and localized names, and record the in-game result before proceeding.
- [ ] 1.2 Normalize set-metadata augment `name` to the verified nonempty `augment_armor_set_name` in one pipeline location after original-name armor-piece association and before downstream name lookup/search generation. Preserve stable IDs, routes, member links, ordinary augment names and set-piece names. Keep `Armor Set` as the shared display type at the existing type-label owner. Add a focused pipeline regression proving member propagation survives the rename and repeat execution.
- [ ] 1.3 Regenerate the database and search index. Verify every published set-metadata entry has the set's name, including all 24 current entries, and inspect Cinderchant Regalia and Cobalt's Battlegear across the heading, breadcrumb, document title, search and item list. Verify member-piece tooltips and links retain the same set membership and no local name substitution is needed.

## 2. Shared title policy

- [ ] 2.1 Replace the item-only title method with reviewed family-aware builders in `website/src/lib/server/meta-description.ts`. Verify an item/skill name collision, the `Drakespear` light-weapon case and a normalized armor-set name with the `Armor Set` descriptor.
- [ ] 2.2 Add deterministic collision resolution using verified detail, then placement position, then canonical identity. Verify two chests with the same zone, one shared-position edge and a collision involving a renamed set entry produce different truthful titles.
- [ ] 2.3 Enforce the 60/70-character budget without truncating names or the brand. Verify long recipe names, a punctuated set name and the irreducible-length exception with focused input cases.

## 3. Route adoption

- [ ] 3.1 Migrate item, monster, NPC, quest, zone and skill detail loaders/pages to generated titles. Verify their prerendered `<title>` values against their visible identity and loaded fields, using the pipeline's canonical name for set entries rather than a route-specific override.
- [ ] 3.2 Migrate the shared summon/mercenary pet loader and renderer, altar, gathering-resource and chest routes. Verify canonical fishing variants have distinct titles, aliases keep their first variant's canonical URL, and all chests in Everfrost are distinct.
- [ ] 3.3 Review faction, class, recipe and profession detail routes and all static/overview titles. Migrate any collision or unsupported label and verify at least one prerendered page per family.

## 4. Output and interface verification

- [ ] 4.1 Add a post-prerender title check that compares decoded HTML titles across every indexable canonical page, including every renamed armor-set entry. Verify a deliberate cross-family duplicate and a renamed-set collision each fail with both URLs reported.
- [ ] 4.2 Run the complete prerender with the title check. Verify zero duplicate or empty titles, correct brand suffixes and a justified report for any title above 70 characters. Confirm every renamed armor-set page participates and retains its canonical URL.
- [ ] 4.3 Inspect representative item, armor-set, chest, fishing, skill and quest pages in the browser at 1440x900 and 390x844. Verify the browser tab title matches a truthful page subject and the visible content, and that set headings, breadcrumbs, search and lists agree on the pipeline-produced name.
