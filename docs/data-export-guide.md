# Data Export Guide

DataExporter output must come from authoritative runtime game data. Prefer direct fields, explicit runtime references, and IL2CPP type checks over guesses.

## Rules

- Export direct game object fields and explicit references.
- Use IL2CPP runtime type checks (`TryCast<T>()`) when subtype identity matters.
- Follow each field's model and exporter contract for absence. Use `null` for missing references, `""` for missing text, and a declared default for value types only when the contract defines it. Use `"unknown"` only when the domain contract explicitly defines it, such as an unresolved zone. Do not invent values.
- Document derivations that are not direct fields, such as spatial zone containment.
- Keep JSON property names snake_case.

## Visual Assets

The published `visual_assets` table contains these domain/kind pairs in the current database:

| Domain/kind | Source |
|---|---|
| `achievement/icon` | Steam achievement icon downloaded during export |
| `chest/primary` | `GatherItem.readySprite` |
| `class/icon` | `Player.classIcon` |
| `gathering_resource/icon` | `GatherItem.journalIcon` |
| `item/icon` | `ScriptableItem.image`, or the runtime `FantasyHeroes` icon collection for a missing item sprite |
| `item/pet` | The creature prefab of a friendly pet follower item |
| `item/treasure_map` | `TreasureMapItem.imageLocation` |
| `monster/primary` | Root `SpriteRenderer`, or a body composite under `Monster.gameObject/Front` |
| `npc/primary` | Root `SpriteRenderer`, or a body composite under `Npc.gameObject/Front` |
| `pet/icon` | `Pet.portraitIcon` |
| `pet/primary` | The pet's root renderer or `Front` body composite |
| `skill/icon` | `ScriptableSkill.image` |
| `zone/thumbnail` | A crop of the stitched world screenshot based on zone bounds |

The profession exporter also requests `profession/icon` when a runtime icon exists. The current
database has no rows for that pair. DataExporter writes source PNGs and relative paths in
`visual_assets.json`. `compendium build` records them in SQLite and publishes WebP images at paths
such as `images/monsters/zarothak_the_tormentor/primary.webp`. The original `export_path` stays
in the database for provenance.

Do not map entities by static Unity sprite names or use UnityPy images as fallback artwork.
The runtime item icon collection is different: it resolves an explicit game item path to a loaded
sprite. Do not replace missing runtime art with a plausible-looking asset from an inventory.

### Selection evidence and omissions

The Ancient Cyclops exposes a root `SpriteRenderer` (`Cyclops_1`). Humanoid monsters such as the
Dracolyte Praetor and Scalebound Hierarch instead expose body sprites under `Front`.
The composite excludes health bars, hit bars, labels, minimap controls, speech bubbles, shadows,
and other UI renderers. These are not part of the creature. NPC composites use the same exclusion.

Some monsters expose `Monster.imageBossBestiary` or `Monster.portraitBoss`. These may look like useful
portraits, but the compendium uses the in-world monster image instead. Skill effect objects and
prefabs are not skill icons. Pet equipment and auxiliary renderers are not part of the pet body.

Runtime inspection found 4,669 monster objects, all with an `Animator`, 4,664 with a controller,
and 188 distinct controllers. Ancient Cyclops clips contain idle, walking, attack, death, and
special-attack sprite swaps at 12 FPS. The selected primary image is one pose, not an animation.
If animations become a product, sample clips on cloned runtime objects and export separate frames;
do not infer frames from static spritesheet names.

When an entity has multiple rows for the same `(domain, entity_id, kind)`, review the ambiguity.
Do not guess a preferred source.

## Runtime Requirements

Runtime visual exports are meaningful only after the game enters `World` and
`Il2CppMirror.NetworkClient.localPlayer != null`. The `compendium.export` HotRepl command
enters that state before calling `DataExporter.ExportAllData()`. Under CrossOver/Wine, file writes
to macOS paths use Wine's `Z:` mapping. Manifest paths remain relative to `exported-data/`.

## BetterBestiary Skill Summaries

The BetterBestiary mod computes each skill's effect summary **at runtime**, in C#, via `SkillEffectFormatter` — a port of the website's `formatSkillEffect`. This lets the in-game panel summarize skills from **unreleased/dev game versions** that appear in no data export. The TypeScript `formatSkillEffect` stays the single source of truth; the port is held string-identical by a golden parity test over every exported skill.

That test runs against `tests/BetterBestiary.Tests/Fixtures/skill-effect-parity.json` — a corpus of `{ skill_id, input, expected }` baked from `compendium.db` (skill-intrinsic). After a game-data refresh (re-export + `compendium build`) or any change to `formatSkillEffect`, regenerate it:

```bash
pnpm --filter website gen:skill-effect-parity
```

Then run the C# parity test; if it fails, port the formatter change to `mods/BetterBestiary/Skills/SkillEffectFormatter.cs` until it is green:

```bash
dotnet test tests/BetterBestiary.Tests/BetterBestiary.Tests.csproj
```

A lefthook pre-commit guard re-runs the bake and fails the commit if the corpus is stale relative to the formatter, the shared skills helpers, or the bake script.
