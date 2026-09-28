## 1. Prove runtime source availability

- [ ] 1.1 In a current world-state game session, inspect `UIProfessions.singleton` and all 13 `UIProfessionSlot.Image.sprite` slots from `mods/DataExporter/Exporters/ProfessionExporter.cs:184-235`; repeat after opening the profession panel. Record each slot's sprite or exact missing source.
- [ ] 1.2 Export the same game build and UI state twice. Compare profession manifest identities, source names, source dimensions, and PNG content hashes; prove either stable real output or the precise absence of each unavailable sprite.
- [ ] 1.3 Inspect `helm_of_the_twilight` in the live item and `FantasyHeroes` icon collection. Compare its direct sprite, `Basic/BanditArmor2` lookup, and default icon; record the result and reproduce any exporter gap before changing code.

## 2. Publish only verified profession images

- [ ] 2.1 If task 1 proves real profession icons available, correct `ProfessionExporter.TryUpdateIconsFromUI` to export every readable slot through the existing registry; if none exist, retain glyphs and record the runtime reason. Verify two same-state exports and the count and source identity of each exported icon.
- [ ] 2.2 If task 1.3 finds a non-default helm sprite, fix `ItemExporter` discovery without changing behavior for truly absent art. Verify the helm gains an `item/icon` row and the 21 surviving armor-bonus-set augments and four `random_*` items remain without invented icons. If the icon is only the default, record that fact and do not add an image.
- [ ] 2.3 After verified profession icons enter `visual_assets`, join their recorded paths and dimensions in `website/src/routes/professions/+page.server.ts` and each applicable guide loader; show them in overview cards and guide headers without a second path formatter. Verify real-icon and missing-icon pages in prerendered output. If no profession icons are available, keep the existing glyphs and record why adoption did not occur.

## 3. Adopt existing contextual artwork

- [ ] 3.1 Join `zone/thumbnail` by zone identifier in `website/src/routes/zones/[id]/+page.server.ts` and display it by the introduction in `+page.svelte` with recorded width and height. Verify a zone with art and the one without art keep their existing text and links.
- [ ] 3.2 Load `item/treasure_map` in `website/src/routes/items/[id]/+page.server.ts` and show it in the existing treasure-location card in `+page.svelte`. Verify a map item with art and a missing-art case preserve the card's location and reward information.
- [ ] 3.3 Run targeted, observable regression checks for the actual new loaders and conditional artwork behavior. Retain a test only if a plausible broken join or absent-art branch makes it fail; otherwise use a focused smoke script and remove it afterward.

## 4. Verify published output and surfaces

- [ ] 4.1 Build twice from identical exported and curated inputs. Compare artwork manifest keys, public paths, recorded dimensions, source hashes, and published WebP hashes; report any difference.
- [ ] 4.2 Run the full publication gate and assert each surviving `visual_assets` row has a surviving entity and file, every path follows the shared rule, keys are unique, and no redacted entity retains art.
- [ ] 4.3 Measure final published artwork bytes against the pre-change output and record any increase from actual new files.
- [ ] 4.4 Inspect profession overview and affected guides when icons exist, a zone with and without a thumbnail, and a treasure-map item with and without map art. Verify the rendered site in a browser at 1440×900 and 390×844 for image quality, fallback, dimensions, and readability.
