---
title: "Entity Artwork: One Pipeline, One Path Rule, One Format"
type: spec
status: draft
created: 2026-08-10
parent: 2026-07-31-ancient-kingdoms-overview
supersedes:
superseded_by:
archived:
---

# Entity Artwork: One Pipeline, One Path Rule, One Format

**Status:** Draft. Nothing implemented.
**Scope:** `mods/DataExporter`, `build-pipeline` image loading, `website/static/images`, and
every website consumer of entity art.
**Why now:** [2026-08-09-map-marker-and-search-registry](2026-08-09-map-marker-and-search-registry.md)
§3.2(g) puts artwork in search results. That surfaced three problems worth fixing at the
source rather than working around in the palette.

Every number below was measured on 2026-08-10 against the working tree. Commands are in
Appendix A.

**Relationship to [2026-07-31-entity-image-surfacing](2026-07-31-entity-image-surfacing.md).**
That document owns the consumer side: rendering item, NPC and skill art that is already
exported but never displayed. It stays the plan of record for those surfaces. This document
owns the layer beneath it — how art is exported, named, encoded and validated — and adds
the families that have no art at all. The two agree on the important rule, with one
refinement recorded in §3.2: existence and intrinsic dimensions are read from
`visual_assets` and never guessed, while URL construction gets exactly one shared
implementation instead of the per-component string building that rule was written against.

---

## 1. What exists today

Two independent image systems, three formats, and a path rule that is almost — but not
quite — a function of the entity id.

**System one: runtime art.** `mods/DataExporter/Exporters/VisualAssetRegistry.cs:45-109`
reads a Unity `Sprite`, blits `sprite.textureRect` through a `RenderTexture`, and writes
PNG to `images/{domain}/{entity_id}/{kind}/{file}.png` plus a manifest row. Composites
(`:125-246`) render child `SpriteRenderer`s at 48 pixels per unit and downscale only past
512 px. `build-pipeline/src/compendium/loaders/core.py:109-169` reads the manifest,
alpha-trims with Pillow (`:92-107`), writes `website/static/images/...`, and inserts
`visual_assets` rows.

**System two: achievements.** `mods/DataExporter/Exporters/AchievementExporter.cs:54-62`
downloads Steam artwork as JPEG. `loaders/core.py:300-371` copies it unchanged and stores
an absolute URL in `achievements.unlocked_icon_path` / `locked_icon_path`. It never enters
`visual_assets`, and `DataExporter.cs:156-164` constructs that exporter without the shared
registry, which is why.

Measured inventory of `website/static/images` — 3,028 files, 7,723,611 B, all gitignored
(`website/.gitignore:15`), so this is a delivery-payload question, not a repository-size
one:

| Family | Files | Bytes | Format | Median dimensions |
| --- | ---: | ---: | --- | --- |
| achievements | 76 | 2,095,031 | JPEG | 256 × 256, every file |
| items | 1,662 | 1,589,513 | PNG | 27 × 28 |
| monsters | 362 | 1,546,635 | PNG | 96 × 116 |
| npcs | 234 | 1,284,304 | PNG | 55 × 85 |
| skills | 689 | 1,201,905 | PNG | 32 × 32, every file |
| pets | 5 | 6,223 | PNG | 45 × 57 |

### 1.1 Three defects

**Defect A — the path rule is not a function.** C# `SafeSegment`
(`VisualAssetRegistry.cs:288-294`) and `SanitizeId` (`BaseExporter.cs:87-100`) both preserve
hyphens. Python `_safe_public_segment` (`loaders/core.py:50-58`) replaces every
non-alphanumeric character with `_`. Three ids diverge today: `drake-eye_covenant`,
`scent-soaked_boots`, `two-handed_mastery`. The consequence is visible in the website:
`ItemTooltip.svelte:12-14` hardcodes `replaceAll("-", "_")` to reconstruct a URL, so the
sanitiser now has a third implementation, in a component.

**Defect B — format is inherited, not chosen.** `loaders/core.py:83-85` reuses the source
suffix, so PNG in means PNG out and Steam JPEG stays JPEG. Meanwhile the tile pipeline
already chose WebP deliberately (`tiles.py:525-528`) and the service worker already caches
it (`service-worker.ts:129-130`). Entity art never got that decision.

**Defect C — no integrity gate.** Measured: 3 `visual_assets` rows point at items that do
not exist (`divine_essence`, `steel_of_ancient_dragons`, `valaark_ancient_coin`), and 23
items have no icon row while the count difference reads as 20. Nothing fails.

### 1.2 What the pixels actually need

Largest rendered size per family, from the website census:

| Family | Largest display | Source today | Verdict |
| --- | --- | --- | --- |
| Monster, NPC, pet detail | 256 CSS px at `md` | median 96 × 116 | already upscaled on purpose, `[image-rendering:pixelated]` |
| Map monster popup | 112 CSS px | same | fine |
| Item tooltip | 40 CSS px | median 27 × 28 | fine |
| Achievement list | 64 CSS px | 256 × 256 | fine |
| Achievement showcase | ~116 CSS px fluid | 256 × 256 | correct for 2× DPR, which needs 232 |

**So downscaling is the wrong lever.** These are pixel-art sprites deliberately shown
larger than their source, and the one photographic family is already sized for retina. The
waste is encoding, not dimensions.

---

## 2. Measured: what re-encoding actually saves

Every file re-encoded with Pillow, lossless WebP for sprites and quality 80 for the
photographic achievement art:

| Family | Current | WebP | Change |
| --- | ---: | ---: | ---: |
| achievements | 2,095,031 | 954,584 | −54% |
| items | 1,589,513 | 833,324 | −48% |
| monsters | 1,546,635 | 720,434 | −53% |
| npcs | 1,284,304 | 988,018 | −23% |
| skills | 1,201,905 | 680,762 | −43% |
| pets | 6,223 | 2,568 | −59% |
| **Total** | **7,723,611** | **≈4,179,690** | **−46%** |

Two results worth recording because they contradict the obvious guesses:

- **PNG optimisation is not the lever.** Pillow's `optimize=True` made items *larger*
  (1,632,929 B) and skills larger (1,283,892 B). Only the format change pays.
- **Downscaling achievements is unnecessary.** At 256 px, quality 80 already gives −54%.
  Dropping to 128 px would give −84% but would soften the showcase at 2× DPR, trading
  visible quality for bytes nobody is waiting on, since these load lazily and per page.

Lossless WebP is pixel-exact, so `[image-rendering:pixelated]` renders identically.

---

## 3. Target design

### 3.1 One image system

Achievements move into `visual_assets` as `domain = "achievement"`, `kind = "unlocked" |
"locked"`. `AchievementExporter` takes the shared `VisualAssetRegistry` the way every other
exporter already does. `achievements.unlocked_icon_path` and `locked_icon_path` are
deleted, along with the bespoke copy path at `loaders/core.py:300-371`. One manifest, one
loader, one table, one URL rule. Clean cutover, no compatibility column.

### 3.2 One path rule, enforced

```text
images/{domain_plural}/{entity_id}/{kind}.webp
```

`entity_id` is used **verbatim**. Python stops rewriting it and instead validates it
against `^[a-z0-9._-]+$`, failing the build on violation. Measured: 0 of the current 2,952
ids violate that charset, and the 3 hyphenated ids are exactly the ones that break
derivation today. Entity ids are already URL path segments on the website, so anything
unsafe in a path is already a bug elsewhere.

This turns the URL into a pure function, which buys three things: `ItemTooltip.svelte:13`
loses its private sanitiser, the search index builder can resolve a path without a join,
and a missing image becomes a missing file rather than a wrong file.

`public_path` stays in `visual_assets` because the table remains the source of truth for
**existence** and **intrinsic dimensions**, which detail pages need to reserve layout. A
pipeline test asserts `public_path == derive(domain, entity_id, kind)` for every row, so
the stored value and the function cannot drift.

**The division of labour, stated once.** Existence and dimensions are queried, never
inferred — an entity with no row renders the placeholder, exactly as
`2026-07-31-entity-image-surfacing` requires. URL construction has one implementation, the
shared helper, used by the loader when it writes `public_path`, by the search index builder,
and by consumers that render into a fixed box and therefore need no intrinsic size. What is
prohibited is what `ItemTooltip.svelte:12-14` does today: a component inventing its own
sanitiser and its own extension. Fixed-box consumers include the search palette at 24 px and
the item tooltip at 40 px; intrinsic-size consumers such as the monster, NPC and pet detail
pages must read the row.

**On denormalisation.** Baking a derivable path into a generated artifact — the search
index, the sitemap — is fine. The rule this project enforces is one *authored* source, not
zero redundancy in build outputs.

### 3.3 One format, chosen in the pipeline

WebP for all entity art: lossless for sprites, quality 80 for photographic achievement art.
The conversion belongs in `_copy_public_visual_asset`, not in the mod. The mod stays a
faithful extractor emitting lossless PNG, and delivery format becomes a pipeline decision
that can change without a game session. That seam already exists — the loader re-encodes
today when it alpha-trims.

Add one guard the current code lacks: a maximum published dimension, so a future export
cannot silently ship a 4K sprite. The largest today is the `gold` item icon at 704 × 672
and 6,366 B, which is an outlier but harmless.

### 3.4 Integrity gates

The loader fails the build when:

1. A manifest row references a file that does not exist.
2. A `visual_assets` row references an entity that does not exist — 3 rows today.
3. Two rows share `(domain, entity_id, kind)` — 0 today, and worth keeping at 0.
4. An `entity_id` violates the slug charset.

---

## 4. Art that exists and is not exported

Read from the decompiled scripts and the raw exports, not guessed.

| Family | Art in the game data | Evidence | Work |
| --- | --- | --- | --- |
| Mercenaries | Yes, 6 missing sprites | `Pet.cs:17-20` `portraitIcon`; `pets.json` `icon_path` values `Emblems - ranger` and five more | `PetExporter.cs:137` only exports fixed pets, so extend it |
| Professions | Yes, 13 | `professions.json` carries `icon_path` such as `profession_alchemy`; the UI override reads `image.sprite.name` (`ProfessionExporter:207-208`) | new export call through `VisualAssetRegistry` |
| Classes | Yes, 6 | `Player.cs:98-100` `classIcon` and `classIconCombat` | new export call, `classes.json` has no art key today |
| Chests | Yes | `ChestHouse.cs:5-15` `chestClosed` and `chestOpen` | new export call |
| Gathering resources | Yes | `GatherItem.cs:26` `journalIcon`, `:76` `spriteIconIndex` | new export call |
| Zones | No sprite, but derivable | stitched `world.png` exists at 46,704,849 B, and 24 of 26 zones have `bounds_*` columns | crop and downscale in the pipeline, Pillow is already there |
| Recipes | No own art | `alchemy_recipes.result_item_id`, same in the other recipe tables | reuse the produced item's icon, no export |
| Quests | Only a generic marker | `NpcQuests.cs:13-20` is the floating `!` | skip |
| Traps, portals, crafting stations, altars, houses | No sprite field found | `Trap.cs:8-19` FX prefab only, `Portal.cs:5-18` no art, `CraftingStation.cs:6-25` material only | skip until evidence appears |

Known gaps that are **not** export bugs: 3 skills have an empty `icon_path` upstream
(`blazefury`, `frostbite`, `primal_roar`), and 18 of the 23 iconless items are
`*_armor_bonus_set` pseudo-items that represent set bonuses rather than objects. One real
miss is worth chasing: `helm_of_the_twilight` carries `icon_path` `Basic/BanditArmor2` yet
produced no asset.

**Zone thumbnails are viable.** Blanking only covers `EXCLUDED_ZONE_IDS` and specific
excluded triggers (`tiles.py:593-600`), not dungeons generally, so cropping the stitched
world by zone bounds yields real imagery for 24 zones. The two excluded zones stay
imageless by the same decision that hides them from the map.

---

## 5. Migration

Split by what can be verified without launching the game, because that boundary is real:
new art requires a full export run, everything else does not.

**Phase A — consolidate and re-encode. No game session required.**
Fold achievements into `visual_assets`, switch the loader to WebP, use the entity id
verbatim, add the four integrity gates and the path-derivation test, delete
`achievements.*_icon_path`, and replace `ItemTooltip.svelte:13` with the shared helper.
Ends with a full `compendium build` and a visual check of an achievement page, an item
tooltip, and a monster page.

**Phase B — derived art. No game session required.**
Zone thumbnails cropped from the stitched world map, and recipe results reusing their item
icon through `result_item_id`.

**Phase C — new exports. Requires a game export run.**
Mercenary portraits, profession icons, class icons, chest sprites, gathering journal icons.
Each is one call into the existing `VisualAssetRegistry`, so the cost is the session, not
the code.

**Phase D — consume it.** Item, NPC and skill surfaces are already specified by
[2026-07-31-entity-image-surfacing](2026-07-31-entity-image-surfacing.md) and are not
re-planned here. What this document adds to that queue is the newly available art: class,
profession, mercenary, zone and recipe surfaces, plus search results per
[2026-08-09-map-marker-and-search-registry](2026-08-09-map-marker-and-search-registry.md)
§3.2(g).

Phases A and B are independent of the search work and can ship first. Phase D depends on
the entity registry from that document.

---

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| WebP quality regression on pixel art | lossless for every sprite family, so the pixels are identical; only the 76 photographic achievement files are lossy |
| Achievement re-encode is generation loss on top of JPEG | quality 80 measured at −54%; if a spot check shows artefacts, quality 85 costs 1,110,810 B and is still −47% |
| Using the id verbatim breaks an existing URL | the charset is validated and 0 ids violate it today; the 3 hyphenated ids currently resolve through a duplicated sanitiser, which is the defect being removed |
| New exports drift from the manifest contract | every new family goes through `VisualAssetRegistry`, and the integrity gates fail the build rather than shipping a hole |
| Zone thumbnails look wrong for excluded zones | those zones are already hidden from the map, so they stay imageless by the same rule |

---

## Appendix A — measurement commands

```sh
# Inventory, dimensions, and per-family byte totals
python3 - <<'PY'
import os, struct, statistics, collections
# walk website/static/images, parse PNG IHDR and JPEG SOF headers
PY

# Re-encoding sweep, run inside build-pipeline so Pillow resolves
cd build-pipeline && uv run python - <<'PY'
from PIL import Image
# lossless WebP for PNG sources, quality sweep 80/85 at 96/128/160/256 for achievements
PY

# Integrity checks
python3 -c "
import sqlite3
c=sqlite3.connect('file:website/static/compendium.db?mode=ro',uri=True)
print(c.execute('SELECT count(*) FROM visual_assets v LEFT JOIN items i ON i.id=v.entity_id WHERE v.domain=\"item\" AND i.id IS NULL').fetchone())
"
```

Achievement sweep results, for the record: 96 px quality 80 is 209,750 B, 128 px is
325,320 B, 160 px is 452,350 B, 256 px is 954,584 B, and 256 px quality 85 is 1,110,810 B.
