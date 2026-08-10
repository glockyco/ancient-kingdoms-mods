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

**Defect C — redaction does not reach artwork.** `divine_essence`,
`steel_of_ancient_dragons` and `valaark_ancient_coin` have `visual_assets` rows and
published icons but no `items` row. An earlier draft of this document called them orphans
and proposed failing the build. That was wrong, and the correct explanation matters more
than the symptom.

All three are real game items. They carry `ignore_journal: true` in
`exported-data/items.json` (`:123647-123656`, `:126297-126306`, `:126456-126465`), and
`redactions.toml:3-4` sets `exclude_ignore_journal = true` because, in that file's own
words, they are "internal/meta items that shouldn't appear in the compendium". The
deletion happens in `denormalizers/__init__.py:97-155`.

The leak is one of ordering. `commands/build.py:72-80` publishes visual assets, `:81`
loads items, and `:108-109` runs the denormalizers that delete them. Artwork is published
before the redaction that removes its subject, and nothing reconciles afterwards. So the
compendium currently serves `/images/items/divine_essence/icon.png` and a `visual_assets`
row naming an item it deliberately hides.

That is a redaction defect, not an integrity defect, and it changes the fix: reconcile
artwork against the database *after* denormalisation rather than fail on a condition the
pipeline intentionally creates. Separately, 23 items have no icon at all, of which 18 are
`*_armor_bonus_set` pseudo-entities.

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

### 3.4 Artwork reconciles with redaction, then the invariants hold

Redaction decides what exists. Artwork follows that decision rather than racing it.

**Add a reconciliation step after denormalisation** — the same place `denormalizers/__init__.py`
already deletes redacted rows. For every `visual_assets` row, if the referenced entity is
no longer in its domain table, delete the row and unlink the published file. Today that
prunes exactly 3 icons. The step is idempotent and needs no exclusion list of its own,
which is the point: it inherits every current and future redaction rule for free rather
than duplicating `redactions.toml` in a second place.

`build.py` keeps its current order. Publishing assets early is fine as long as something
reconciles late.

**Then these become true invariants, and the build fails on them:**

1. A manifest row references a file that does not exist.
2. After reconciliation, a `visual_assets` row references an entity that does not exist.
3. Two rows share `(domain, entity_id, kind)` — 0 today, worth keeping at 0.
4. An `entity_id` violates the slug charset.

Invariant 2 is only assertable *because* reconciliation runs first. Asserting it against
the current pipeline would fail on deliberate behaviour, which is why the earlier draft's
version of this gate was wrong.

**One related question this exposes.** `redactions.toml:12-21` lists all three ids under
`[items.hide_crafting]` as well, a rule that hides crafting information for items that stay
visible. For these three the item is not visible at all, so those entries may be dead
configuration — but `hide_crafting` also strips `used_in_recipes` entries on the *materials*
side (`items/usages.py:34-99`), so the entries may still be load-bearing. Determine which
before touching that file, and delete only what is provably inert.

---

## 4. Art that exists and is not exported

Read from the decompiled scripts and the raw exports, not guessed.

| Family | Art in the game data | Evidence | Work |
| --- | --- | --- | --- |
| Boss monsters | Yes, and entirely unexported | `Monster.cs:74-76` `imageBossBestiary` and `portraitBoss`, both static serialized sprites | new kinds `bestiary` and `portrait` alongside the existing `primary` |
| Treasure maps | Yes, and we keep only its name | `TreasureMapItem.cs:5-15` `Sprite imageLocation`, shown by `UITreasureMap.cs:40-47`; `ItemExporter.cs:495-507` serialises `imageLocation.name` and nothing else | new kind `treasure_map` on the item domain |
| Pets and mercenaries | Yes, but as a UI icon, not a portrait — see §4.1 | `Pet.cs:17-20` `portraitIcon`, read by `UIPartyHUD.cs:328-334` and `UIPetStatus.cs:51-59`; `PetExporter.cs:97-99` already reads its name | new kind `icon` for all 11 rows, from the sprite the exporter already holds |
| Professions | Yes, 13 | `ProfessionExporter.cs:204-207` already holds `image.sprite` when it records `icon_path` | one export call at the same line |
| Classes | Yes, 6 | `Player.cs:97-100` `classIcon` and `classIconCombat`; `ClassExporter.cs:42-56` already iterates the `Player` objects that carry them | one export call in the existing loop |
| Chests | Yes | `ChestHouse.cs:13-19` `chestClosed` and `chestOpen`, swapped at runtime `:40-44` | new export call |
| Gathering resources | Yes, the journal icon only | `GatherItem.cs:19-26` `journalIcon`, rendered by `UIJournal.cs:148-150` | new export call |
| Zones | No sprite, but derivable | stitched `world.png` at 46,704,849 B, and 24 of 26 zones have `bounds_*` columns | crop and downscale in the pipeline, Pillow is already there |
| Recipes | No own art | `result_item_id` in each recipe table | reuse the produced item's icon, no export |
| Quests | Only a generic marker | `NpcQuests.cs:13-20` is the floating `!` shared by every quest | skip |
| Factions | No art field | no icon key in `exported-data/factions*.json`, no sprite field found | skip |
| Traps, portals, crafting stations, altars, houses | No static sprite | `Trap.cs:8-19` FX prefab only, `ARPGFXPortalScript.cs:8-12` prefabs, `CraftingStation.cs:6-25` material only | skip until evidence appears |

### 4.1 Mercenaries have no portrait, and that is the correct answer

The earlier draft claimed six exportable mercenary portraits. That was wrong, and the
evidence is unambiguous: a mercenary's appearance is assembled at runtime.
`Pet.cs:747-752` calls `ReSkinMercenary`, which at `:3951-4070` sets race, gender, hair,
beard, eyes and colours from per-hire SyncVars and then calls
`MercenaryEquipment.RefreshEquipment` (`:166-318`), which layers helmet, armour, legs,
gloves, bow, weapon and shield sprites from whatever that mercenary currently has
equipped, onto the `Character4D` rig assembled in `Character.cs:198-240`. `Player.cs:9628-9703`
sets all of it per hire. There is no single sprite to export, and
`PetExporter.cs:132-138` already says so in a comment before skipping them.

What *does* exist is `Pet.portraitIcon`, a static serialized sprite that the game itself
displays for a mercenary in the party HUD and the pet status panel. For the six
mercenaries its names are `Emblems - ranger`, `- druid`, `- rogue`, `- wizard`, `- cleric`
and `- warrior`; for the five fixed pets they are names like `wolf_pet_portrait`.
`PetExporter.cs:97-99` already reads that sprite to record `icon_path`, so exporting the
asset is a one-line change on a reference we already hold.

So the honest model is two kinds, not one:

- `pet/primary` — the in-world creature sprite. Legitimate for the 5 fixed pets, impossible
  for the 6 mercenaries. Unchanged.
- `pet/icon` — the portrait icon the game shows in UI. Legitimate for all 11.

**A verifiable prediction, not a claim.** The six emblem names match the six class ids
exactly, and `Player.cs:97-100` declares a `classIcon` on the same `Player` objects
`ClassExporter` iterates. If `classIcon.name` for the Ranger player equals
`Emblems - ranger`, mercenary icons and class icons are the same assets and should share
one export rather than being duplicated per domain. No source evidence proves that today —
there is no `Emblems` literal anywhere in `server-scripts/` — so check it during the export
run before deciding.

### 4.2 Two dead ends, recorded so nobody chases them twice

**`GatherItem.spriteIconIndex` is not an asset.** Its only use, `GatherItem.cs:420`, builds
a TextMeshPro `<sprite index=…>` tag, so it addresses a glyph in a TMP sprite asset rather
than an exportable sprite. The exportable art for gathering is `journalIcon`.

**`IconCollection` is not an atlas, and it explains the one real item miss.**
`IconCollection.cs:24-49` loads a ScriptableObject and resolves `Basic/LeatherVest` by exact
match over a serialized list, falling back to `DefaultItemIcon` with a warning.
`ItemExporter.cs:101-115` exports `ScriptableItem.image` and nothing else, which is why
`helm_of_the_twilight` records `icon_path` `Basic/BanditArmor2` yet produced no asset — its
`image` is empty. Falling back to `IconCollection.GetIcon(icon_path)` when `image` is null
uses the game's own resolution path and is the correct fix. It must not fall back to
`DefaultItemIcon`: publishing a placeholder as if it were real art is worse than publishing
nothing, because the website already has a placeholder of its own.

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

## 5. Where the art belongs

Exporting art nobody renders is how we arrived at 689 skill icons that appear on zero
pages. This section decides the consuming side, because "which surfaces" is a design
question, not a follow-up.

### 5.1 What the site does today

Entity references have four unrelated treatments and one art surface:

| Treatment | Where | Art |
| --- | --- | --- |
| Plain route anchor | most detail-page relation lists, e.g. `items/[id]/+page.svelte:723-1349`, `factions/[id]/+page.svelte:249-505` | none |
| `ItemLink.svelte:13-94` | ~40 call sites across professions, monsters, NPCs, factions, classes, chests | name only, art only in the desktop hover tooltip |
| `MapLink.svelte:26-48`, `SearchResultItem.svelte:134-153` | map chips and search rows | a 14–16 px Lucide category glyph |
| `ItemTooltip.svelte:19-27` | hover only | the one real art surface, 40 × 40 |

Three consequences fall straight out of that table. Skill icons render nowhere. NPC
portraits render on the NPC detail page but not in the map popup, while monster sprites
render in both (`EntityPopup.svelte:399-408`). And an item's icon is reachable only by
hovering, on desktop, when tooltip HTML happens to exist.

### 5.2 The rule

**An entity reference should look the same everywhere it appears, and carry the game's own
art wherever the game has art for that entity.** One component owns the treatment: art or
family glyph, name, optional badges. Not four.

Adopt it in three places:

1. **Name cells of entity lists.** The DataTable already supports per-cell renderers
   (`ui/data-table/data-table.svelte:51-54`) and pages ~20 rows, so a 24 px icon column
   costs about twenty lazily fetched requests of roughly 1 KB each.
2. **Detail-page relation lists.** Drops, sources and usages, vendor inventories, recipe
   ingredients and results, pack contents, merges, armour sets, class skill tables, quest
   rewards. This is the largest surface and the one where recognition actually helps.
3. **Search results and map popups.** The palette per
   `2026-08-09-map-marker-and-search-registry` §3.2(g), and the NPC popup that currently
   omits what the monster popup shows.

**Where art is the wrong answer**, and the family glyph stays: compact map chips at 14–16
px, where the semantic category is the useful signal; mechanics and formula tables, which
reference concepts rather than objects; and dense spawn matrices, where a per-row image
adds noise without adding identification.

### 5.3 Coverage decides eligibility

A family gets art in lists only when nearly every row has it, otherwise the column reads as
broken. Measured coverage: monsters 362/362, NPCs 234/234, achievements 38/38, skills
689/692, items 1,651/1,671. After the export work in §4: pets 11/11, classes 6/6,
professions 13/13, recipes 155/155 by reusing the produced item's icon, zones 24/26.
Factions, quests, traps, portals, altars, houses and crafting stations have no art and keep
their glyph. That is a decision, not a gap.

### 5.4 Publish nothing that nothing renders

Locked achievement art is 38 files and 821,316 B, published today and rendered nowhere —
`achievements/+page.svelte:109-115` and `:237-248` both use the unlocked variant. A
compendium shows what an achievement *is*, so the locked art has no obvious use. Either
render it deliberately or stop exporting it. Shipping it unused is the same defect as
exporting skill icons nobody displays, and this document should not create a second
instance of the problem it opens with.

---

## 6. Migration

Split by what can be verified without launching the game, because that boundary is real:
new art requires a full export run, everything else does not.

**Phase A — consolidate, reconcile, re-encode. No game session required.**
Fold achievements into `visual_assets`, add the post-denormalisation reconciliation step
from §3.4, switch the loader to WebP, use the entity id verbatim, add the four invariants
and the path-derivation test, delete `achievements.*_icon_path`, and replace
`ItemTooltip.svelte:13` with the shared helper. Ends with a full `compendium build`, a
check that the three redacted icons are gone, and a visual check of an achievement page, an
item tooltip and a monster page.

**Phase B — derived art. No game session required.**
Zone thumbnails cropped from the stitched world map, and recipe results reusing their
produced item's icon through `result_item_id`.

**Phase C — the shared entity reference. No game session required.**
The component and adoption rules from §5, against the art that already exists: item,
monster, NPC and skill surfaces. This is the phase that turns 689 unrendered skill icons
into something a visitor sees, and it does not wait on Phase D.

**Phase D — new exports. Requires a game export run.**
Pet and mercenary `icon` from `portraitIcon`, class icons, profession icons, boss
`bestiary` and `portrait` sprites, treasure-map images, chest sprites, gathering journal
icons, and the `IconCollection` fallback for items whose `image` is empty. Each is one call
against a reference the exporter already holds, so the cost is the session, not the code.
While the game is running, verify the §4.1 prediction that `classIcon.name` matches the
mercenary emblem names, and collapse the two exports into one if it does.

**Phase E — consume the new art.** Class, profession, mercenary, zone, recipe, boss and
treasure-map surfaces, plus search results per
[2026-08-09-map-marker-and-search-registry](2026-08-09-map-marker-and-search-registry.md)
§3.2(g). The item, NPC and skill surfaces specified by
[2026-07-31-entity-image-surfacing](2026-07-31-entity-image-surfacing.md) are covered by
Phase C and not re-planned here.

Phases A through C are independent of the search work and can ship first. Phase E depends
on the entity registry from that document.

---

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| WebP quality regression on pixel art | lossless for every sprite family, so the pixels are identical; only the 76 photographic achievement files are lossy |
| Achievement re-encode is generation loss on top of JPEG | quality 80 measured at −54%; if a spot check shows artefacts, quality 85 costs 1,110,810 B and is still −47% |
| Using the id verbatim breaks an existing URL | the charset is validated and 0 ids violate it today; the 3 hyphenated ids currently resolve through a duplicated sanitiser, which is the defect being removed |
| New exports drift from the manifest contract | every new family goes through `VisualAssetRegistry`, and the invariants fail the build rather than shipping a hole |
| Zone thumbnails look wrong for excluded zones | those zones are already hidden from the map, so they stay imageless by the same rule |
| Exporting art that nothing renders, again | §5 decides the consuming surface for every new kind before Phase D exports it, and §5.4 removes the one instance that already exists |
| A mercenary emblem is mistaken for a portrait | §4.1 records that the character rig is runtime-composed, and the exported kind is named `icon` rather than `primary` so the distinction is in the data, not in a comment |
| The `IconCollection` fallback publishes placeholders | fall back only to a real resolved icon and never to `DefaultItemIcon`; the website already has its own placeholder |

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
