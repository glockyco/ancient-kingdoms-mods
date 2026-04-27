# Visual Asset Audit via Runtime Probe

**Date:** 2026-04-26
**Status:** Design

## Goal

Build a comprehensive, evidence-based understanding of the visual assets that Ancient Kingdoms exposes, mapped to compendium entities, so that future website features (monster portraits, item icons, equipment renders, skill effects, treasure maps, NPC portraits, class/profession icons, pet imagery) can be prioritized from real coverage data rather than guesses.

The audit must produce three complementary truths:

1. **Asset corpus truth** — what visual assets exist in the client files.
2. **Runtime relationship truth** — which game entities reference which visuals, established from authoritative game fields.
3. **Rendered visual truth** — what the running game actually draws for each entity.

## Why this exists

The compendium currently ships text and stats only. It has no monster portraits, no item icons, no equipment renders, no spell effects. Adding visuals is the next major feature, but the project has no shared understanding of what visuals exist, which entities own them, or how to extract them reliably.

Earlier exploration showed that name-based static matching (UnityPy assets vs. database IDs) is unreliable beyond a handful of well-named entities. AssetRipper alone produces a project reconstruction but does not prove which compendium entity uses which asset. Server scripts confirm that authoritative visual references exist on game objects (e.g. `Monster.imageBossBestiary`, `ScriptableSkill.castEffect`, `ScriptableItem.image`, `ItemParams.Path`, `SpriteCollection` groups) but those references can only be resolved correctly at runtime.

The right primary source of truth for entity-to-visual mappings is therefore the running game. That requires a runtime probe, which in turn requires HotRepl support for MelonLoader/IL2CPP.

## Scope

In scope:

- Audit pipeline producing factual coverage data per compendium domain.
- Static asset corpus extraction via UnityPy.
- Runtime relationship probe driven from HotRepl scripts.
- Runtime visual capture pipeline producing rendered samples.
- Manifest schemas for raw assets, runtime relationships, rendered outputs, and curated selections.
- Coverage report and unmatched-entity diagnostics.
- Validation against a representative sample per domain.

Out of scope:

- Designing or implementing the website visual UI.
- Choosing which compendium pages get visuals first.
- Deciding the final image format (raster, sprite sheet, animation) before audit data is available.
- Bulk-extracting every asset; only entities relevant to compendium domains are audited.
- Any modification of website ingestion or runtime database schema beyond what is needed to consume manifests later (deferred to a separate spec).

## Non-goals

- This audit does not commit to building a "compendium visual feature" yet. The audit's outputs justify and shape that downstream decision; the decision itself is made afterward.
- This audit does not attempt full Unity project reconstruction.
- This audit does not produce game-modifying mods. Runtime probes are read-only.

## Dependencies

This spec depends on the HotRepl multi-host/multi-evaluator architecture spec. Specifically the runtime relationship probe and runtime visual capture require:

- HotRepl with the Roslyn evaluator running under MelonLoader.
- `HotRepl.Helpers.Unity` and `HotRepl.Helpers.Il2Cpp` exposed in eval sessions.
- HotRepl operational against the Ancient Kingdoms CrossOver install on macOS.

Until the HotRepl prerequisite ships, this spec's static corpus pipeline can run independently, but the runtime relationship and rendered visual pipelines cannot.

The audit also depends on:

- `.steam-download/ancientkingdoms_Data` (produced by `scripts/update-server-scripts.sh`) for static UnityPy extraction.
- The CrossOver Ancient Kingdoms install (already configured in `Local.props`) for runtime probes.
- Existing `mods/MapScreenshotter/MapScreenshotter.cs` patterns for `RenderTexture` → PNG capture, adapted for entity-scale captures.
- Existing `DataExporter` patterns (`Resources.FindObjectsOfTypeAll`, prefab vs. scene-instance distinction, IL2CPP `TryCast`) used inside HotRepl probe scripts.

## Architecture overview

Three pipelines feed one selection layer.

```
            ┌────────────────────────────────────┐
            │  .steam-download/ancientkingdoms_Data │
            │  (static client assets)               │
            └──────────────────┬─────────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ UnityPy static extractor │  pipeline 1
                  │  → raw asset manifest    │
                  │  → extracted images      │
                  └──────────────────────────┘
                               │
            ┌─────────────────────────────────────┐
            │  Running Ancient Kingdoms (MelonLoader) │
            │  reachable via HotRepl/Roslyn          │
            └──────────────────┬─────────────────┘
                               │
        ┌──────────────────────┴────────────────────────┐
        ▼                                               ▼
┌────────────────────────────┐                ┌──────────────────────────┐
│ HotRepl runtime relationship│  pipeline 2   │ HotRepl runtime renderer │  pipeline 3
│  probe scripts              │                │ RenderTexture → PNG      │
│  → runtime mapping manifest │                │ → rendered visual mfst   │
└────────────────────────────┘                └──────────────────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │  Selection layer          │
                  │  → curated visual mfst    │
                  │  → coverage report        │
                  └──────────────────────────┘
```

Pipeline 1 answers "what exists?". Pipeline 2 answers "which entity owns which reference?". Pipeline 3 answers "what does the game actually draw?". The selection layer combines them, prefers pipeline 3 when available, falls back to pipeline 2, and uses pipeline 1 only when neither has a result. Coverage is reported with explicit confidence per entry.

## Components

**UnityPy static extractor** (Python, `build-pipeline/`):

- Indexes `.steam-download/ancientkingdoms_Data` (`sharedassets0.assets`, `sharedassets1.assets`, `resources.assets`, `globalgamemanagers.assets`).
- Enumerates extractable assets (Sprite, Texture2D, AnimationClip, GameObject, Material, AnimatorController, AnimatorOverrideController) and writes a raw manifest plus extracted images.
- Reuses the project's existing `unitypy` dependency (`build-pipeline/pyproject.toml`).
- Produces no semantic mappings; only existence and metadata.

**HotRepl runtime probe scripts** (C#, `tools/visual-audit/probes/`):

- One probe per compendium domain (monsters, items, skills, pets, NPCs, classes, treasure maps).
- Each probe queries `Resources.FindObjectsOfTypeAll(Il2CppType.Of<...>())`, walks authoritative fields documented in `server-scripts/`, and writes a relationship manifest to `exported-data/visual-audit/`.
- Probes use only `HotRepl.Helpers.Unity`, `HotRepl.Helpers.Il2Cpp`, and `Il2Cpp.*` wrappers. They do not write to game state.
- Probes are reproducible; running them twice on the same game state must yield equivalent manifests modulo ordering.

**HotRepl runtime renderer** (C#, `tools/visual-audit/render/`):

- Adapted from `mods/MapScreenshotter/MapScreenshotter.cs` patterns: dedicated `Camera`, `RenderTexture`, `EncodeToPNG`, controlled lighting and background.
- Drives entity isolation: instantiate or expose a single subject (monster prefab, equipped reference character, skill effect prefab), render front/idle frames or short animation snippets, write PNG/WebP outputs and metadata.
- Same reproducibility requirement as probes.

**Selection layer** (Python, `build-pipeline/src/compendium/visual_audit/`):

- Reads raw, runtime, and rendered manifests.
- Resolves per-entity visual candidates with explicit precedence (rendered > runtime relationship > raw) and confidence labels (high, medium, low, missing).
- Emits the curated visual manifest and the coverage report.

**Audit consumer** (deferred):

- The compendium consumer of curated outputs is intentionally not in scope. The selection manifest is the contract; downstream features in a later spec choose how to use it.

## Data flow

1. `update-server-scripts.sh` populates `.steam-download/ancientkingdoms_Data`.
2. UnityPy extractor produces `exported-data/visual-audit/raw/manifest.json` plus extracted images under `exported-data/visual-audit/raw/images/`.
3. The user deploys and starts Ancient Kingdoms for HotRepl with `dotnet run --project build-tool hotrepl` or the split `hotrepl-deploy`, `hotrepl-launch --wait`, and `hotrepl-smoke` commands. This uses `Local.props` and the CrossOver Steam bottle install; it does not pass `--export-data`.

Use `dotnet run --project build-tool hotrepl-smoke --world` only after a character/world is loaded. The default `hotrepl-smoke` command is main-menu safe and verifies connection, evaluator metadata, arithmetic eval, and `UnityEngine.Application.version`.
4. The user runs the HotRepl probe driver (Python) which sends per-domain probe scripts to the running game and writes `exported-data/visual-audit/runtime/<domain>.json`.
5. The user runs the renderer driver, which drives in-game capture and writes `exported-data/visual-audit/rendered/<domain>/<entity>/<frame>.png` plus `rendered/<domain>/manifest.json`.
6. The selection layer reads all three sources and writes `exported-data/visual-audit/selection.json` and `exported-data/visual-audit/coverage.md`.

`exported-data/` is gitignored. Manifests are reproducible artifacts, not committed.

## Manifest schemas

Manifests are typed and explicit. No free-form fields.

**Raw asset manifest** (`raw/manifest.json`) — entries:

```json
{
  "asset_id": "sharedassets1.assets:123456",
  "source_file": "sharedassets1.assets",
  "type": "Sprite",
  "name": "image_sabretooth",
  "width": 512,
  "height": 512,
  "extract_status": "ok",
  "output_path": "raw/images/sprites/image_sabretooth.png",
  "notes": []
}
```

**Runtime relationship manifest** (`runtime/<domain>.json`) — entries scoped to the domain. Monster example:

```json
{
  "entity_type": "monster",
  "entity_id": "sabretooth",
  "display_name": "Sabretooth",
  "runtime_object_name": "Sabretooth",
  "classification": {
    "type_monster": "Beast",
    "is_boss": false,
    "is_elite": false,
    "is_fabled": false,
    "is_hunt": false
  },
  "visual_refs": {
    "bestiary_sprite": "image_sabretooth",
    "portrait_sprite": null,
    "sprite_renderers": ["body_idle_0", "shadow"],
    "animator_clips": ["Idle", "Walk", "Attack", "Death"],
    "materials": ["AllInOneSabretooth"]
  },
  "provenance": [
    "runtime:Monster",
    "server-scripts/Monster.cs:74 imageBossBestiary",
    "server-scripts/Monster.cs:76 portraitBoss"
  ]
}
```

Item example (note that for equipment/weapons, the visual is composed via HeroEditor sprite groups, not a single icon):

```json
{
  "entity_type": "item",
  "entity_id": "iron_sword",
  "display_name": "Iron Sword",
  "item_type": "weapon",
  "icon_path": "Basic/IronSword",
  "hero_editor_path": "Weapons/Swords/IronSword",
  "visual_refs": {
    "icon_sprite": "Basic/IronSword",
    "equipment_sprite_group": "Weapons/Swords/IronSword",
    "renderable_on_reference_character": true
  },
  "provenance": [
    "runtime:ScriptableItem",
    "runtime:WeaponItem",
    "server-scripts/uMMORPG.Scripts.ScriptableItems/TreasureMapItem.cs:10 imageLocation",
    "server-scripts/Assets.HeroEditor4D.FantasyInventory.Scripts.Data/ItemParams.cs"
  ]
}
```

Skill example:

```json
{
  "entity_type": "skill",
  "entity_id": "fireball",
  "display_name": "Fireball",
  "skill_type": "target_projectile",
  "visual_refs": {
    "icon_sprite": "skills/fireball",
    "cast_effect_prefab": "FireballCast",
    "projectile_prefab": "FireballProjectile",
    "target_effect_prefab": "FireballImpact"
  },
  "provenance": [
    "runtime:TargetProjectileSkill",
    "server-scripts/ScriptableSkill.cs castEffect",
    "server-scripts/TargetProjectileSkill.cs projectile"
  ]
}
```

**Rendered output manifest** (`rendered/<domain>/manifest.json`) — entries:

```json
{
  "entity_type": "monster",
  "entity_id": "sabretooth",
  "render_kind": "idle_front",
  "output_path": "rendered/monster/sabretooth/idle_front.png",
  "source_refs": ["runtime_object:Sabretooth", "animator_clip:Idle"],
  "capture_status": "ok",
  "confidence": "high"
}
```

**Curated selection manifest** (`selection.json`) — entries:

```json
{
  "entity_type": "monster",
  "entity_id": "sabretooth",
  "primary_visual": {
    "kind": "rendered_runtime",
    "path": "rendered/monster/sabretooth/idle_front.png",
    "confidence": "high"
  },
  "fallback_visuals": [
    {
      "kind": "runtime_sprite",
      "path": "raw/images/sprites/image_sabretooth.png",
      "confidence": "medium",
      "source": "Monster.imageBossBestiary"
    }
  ],
  "missing_or_blocked": []
}
```

Confidence levels are defined and rule-based, not free-form. Entries that derive only from name matches are flagged as such.

## Domain coverage targets

The audit targets these compendium domains with explicit per-domain success criteria:

- **Monsters**: every non-dummy monster has a runtime relationship entry; bosses, elites, fabled, and hunts have either a rendered output or a confirmed `imageBossBestiary` / `portraitBoss` sprite; unmatched entities are listed in the coverage report.
- **Items (icons)**: every item with a non-blank `icon_path` has a runtime entry tying it to its `ScriptableItem.image` and (where applicable) `ItemParams.Path`.
- **Equipment / weapons / armor (composed)**: every equipment/weapon item with a HeroEditor `Path` has a confirmed `SpriteCollection` group; rendered samples on reference characters exist for at least one item per `category` value.
- **Skills / spells**: every skill has its icon resolved; skills with `castEffect`, `projectile`, `targetEffect`, or `objectSkillEffectPrefab` have those references captured; rendered samples for at least one representative skill per skill_type.
- **Pets / familiars / mercenaries**: every pet has its `portraitIcon` resolved; mercenary class icons resolved from `UIShortcuts` fields.
- **NPCs**: NPCs with unique appearance get runtime entries; shared-appearance NPCs are explicitly tagged as such with their appearance source documented.
- **Classes / professions**: class and profession icons resolved from authoritative UI singleton fields.
- **Treasure maps**: every `TreasureMapItem.imageLocation` has an extracted image and a runtime confirmation.

A coverage report enumerates entities per domain that fall into: `mapped_with_render`, `mapped_runtime_only`, `static_only`, and `unmapped`.

## Validation

Audit outputs are validated at three levels.

**Per-pipeline self-checks**:

- UnityPy extractor reports counts by type and a list of read errors.
- Runtime probes report per-domain entity counts and skipped/failed entities with reasons.
- Renderer reports per-entity capture status and any failed renders.

**Cross-manifest consistency**:

- Every runtime `visual_refs` entry whose name appears in the raw manifest is confirmed against the raw extraction.
- Every rendered output references an entity present in the runtime manifest.
- Every selection entry has a path that exists on disk.

**Sampled human review**:

- A representative sample per domain (e.g. 5 monsters spanning beast/undead/elemental/humanoid; 5 items spanning weapon/armor/helmet/shield; 3 skills per skill_type) is visually inspected against the in-game appearance to confirm the audit selected the right asset.

The audit is considered valid when self-checks pass, cross-manifest consistency holds, and sampled review finds no incorrect mappings flagged at `high` confidence.

## Risks

- **Addressables and unloaded prefabs**: some entity prefabs may not be loaded in memory until the relevant scene activates. Probes must run with the player in-game (post-login, in a scene) and must skip + report entities whose prefabs are not currently loadable rather than fabricating data.
- **IL2CPP wrapper resolution**: probe scripts depend on generated wrappers under `MelonLoader/Il2CppAssemblies`. Wrapper changes between game versions can break probes; probe failures must be surfaced clearly.
- **Composed visuals (equipment, NPCs)**: weapons, armor, helmets, shields, and many NPCs are composed from `SpriteCollection` groups via `CharacterInventorySetup`. Static extraction yields atlas fragments, not website-ready icons. The renderer must produce the composed visual; static manifest alone is not enough.
- **Animation vs. still**: some entities are visually meaningful only when animated. The audit must record this distinction and choose between still frames and short loops at the rendered manifest level, not silently pick one.
- **macOS/CrossOver**: the runtime pipelines run inside the CrossOver-hosted game. Renderer must write to a host-accessible path; existing `MapScreenshotter` shows this works.
- **Reproducibility across game versions**: a new patch can change asset names, prefab structures, and scene ownership. The audit pipeline must be re-runnable per version with no manual fixups; coverage diff between versions is part of the deliverable.

## Implementation roadmap

This spec depends on the HotRepl architecture spec. Phasing reflects that.

1. **Static corpus pipeline** (independent of HotRepl):
   - Build the UnityPy extractor.
   - Produce raw manifest and extracted images.
   - Validate via per-type counts and read-error report.
2. **HotRepl prerequisite**: HotRepl multi-host/multi-evaluator architecture ships and is operational under MelonLoader against Ancient Kingdoms. Tracked in the HotRepl spec.
3. **Runtime relationship probes**, one domain at a time, in this order: monsters → skills → items → pets → NPCs → classes/professions → treasure maps.
4. **Runtime renderer**: build the entity-isolation capture system on top of `MapScreenshotter` patterns; integrate per-domain capture rules.
5. **Selection layer**: combine manifests, produce the curated selection manifest and coverage report.
6. **Audit report and review**: generate the human-readable coverage report; sample-review per domain; iterate until coverage is acceptable.
7. **Compendium consumer**: a separate downstream spec uses the curated selection manifest. Not part of this work.

## Acceptance criteria

The audit is considered delivered when all of the following hold:

- The UnityPy static corpus extractor runs from `build-pipeline` and produces a raw manifest covering all main asset files.
- HotRepl-driven runtime relationship probes exist for every compendium domain listed under "Domain coverage targets" and complete without uncaught errors against a representative play session.
- The runtime renderer produces rendered samples for the required representative entities per domain.
- A curated selection manifest exists with explicit per-entity precedence and confidence labels, validated against cross-manifest consistency rules.
- A coverage report exists, lists matched / unmatched / blocked entities per domain, and is human-reviewed against the sample set with no `high`-confidence mismatches.
- The pipeline is reproducible: re-running it on the same game version produces equivalent outputs modulo ordering.
- No name-based heuristic appears in the curated manifest unless explicitly flagged with `confidence: low` and a `name_match_only: true` marker.
