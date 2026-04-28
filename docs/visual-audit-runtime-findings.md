# Visual Audit Runtime Findings

Runtime probes are the authority for compendium visual mappings. UnityPy/static asset indexing is only useful as corpus inventory and must not select or backfill entity images.

## Runtime prerequisites

- Visual probes must run after the game is in the `World` scene with `Il2CppMirror.NetworkClient.localPlayer != null`; menu/start-scene output is not trustworthy for visual mapping.
- When the game runs under CrossOver/Wine, C# file writes to macOS paths must use Wine's `Z:` mapping internally. Probe JSON should still return portable macOS-style paths such as `/Users/.../exported-data/...`.

## Monster visuals

### Selected for compendium use

- Use one runtime-extracted image from the primary `SpriteRenderer` attached directly to `Monster.gameObject`.
- This is the image represented by the Ancient Cyclops sample `current_main_renderer`: `Cyclops_1`, written as `Monster.gameObject.SpriteRenderer.Ancient_Cyclops_154356_Cyclops_1.png`.
- The runtime probe deduplicates repeated world instances by `entity_id` plus sprite instance. If the same monster id/name appears with genuinely different primary sprites, reconciliation should mark it ambiguous instead of guessing.

### Observed but not selected

- `Monster.imageBossBestiary` exists for some monsters. It appears to be a bestiary/boss image, but it is not selected for the compendium mapping.
- `Monster.portraitBoss` exists for some monsters and is often a more standardized portrait-style image. It is not selected for the current mapping.
- Child `SpriteRenderer` objects under the monster GameObject include UI/auxiliary sprites such as health bars, hit bars, background/grid bars, level labels, minimap knobs, speech bubbles, and shadows. These are not useful as monster images and should not be selected.
- Monsters have `Animator` components and runtime animator controllers. A runtime sample observed `4669` monster objects, `4669` with an `Animator`, `4664` with a controller, and `188` distinct controllers.
- Monster animation clips are sprite-swap animations. Ancient Cyclops, for example, has `idle_*`, `walk_*`, `attack_*`, `dead_down`, and `special_attack_down` clips at 12 FPS. The current primary renderer image is just one pose/frame from those clips.

### Future animation extraction path

If animation frames become useful, keep extraction runtime-first:

1. Clone the monster GameObject in memory.
2. Disable non-primary child renderers so UI/auxiliary sprites are not captured.
3. Sample each `AnimationClip` with `AnimationClip.SampleAnimation` at its runtime frame rate.
4. Export the primary renderer sprite at each unique frame.
5. Store animation frames as a separate visual product from the single compendium still image.

Do not use static spritesheet/name matching as the authoritative animation mapping.

## Other visual domains

- Items: `ScriptableItem.image` is the runtime icon sprite. `ScriptableItem.image_name` is a string reference. `TreasureMapItem.imageLocation` is a runtime treasure-map image. Equipment paths are string paths from HeroEditor item collections, not extracted images.
- Skills: `ScriptableSkill.image` is the runtime icon sprite. Skill cast/projectile/target effect objects and prefabs exist, but they are not selected as current compendium images.
- Pets: `Pet.portraitIcon` is the runtime icon sprite. Pet child renderers can include the body plus equipment, weapons, remains, and auxiliary sprites; renderer output needs the same kind of review/filtering as monsters before being treated as a single canonical pet image.
- NPCs: NPC renderer sprites and animator components exist. Treat animation metadata as future work unless a compendium use case needs it.

## Current selection contract

- Runtime-extracted images are required for selected visuals.
- Static Unity assets are never used as mapping fallbacks.
- Monster selections use only the primary runtime renderer image.
- Boss/bestiary portraits, monster animation frames, child UI renderers, and effect/prefab references are documented for future use but excluded from current selection.
