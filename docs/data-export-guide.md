# Data Export Guide

DataExporter output must come from authoritative runtime game data. Prefer direct fields, explicit runtime references, and IL2CPP type checks over guesses.

## Rules

- Export direct game object fields and explicit references.
- Use IL2CPP runtime type checks (`TryCast<T>()`) when subtype identity matters.
- Use `null` or `"unknown"` for missing data; do not invent values.
- Document derivations that are not direct fields, such as spatial zone containment.
- Keep JSON property names snake_case.

## Visual Assets

Selected compendium images are exported by DataExporter at runtime, not by UnityPy or static asset-name matching. Current selected visual kinds are:

- `monster/primary` from the direct `SpriteRenderer` on `Monster.gameObject`
- `npc/primary` from a runtime composite of body `SpriteRenderer` children under `Npc.gameObject/Front`; UI/auxiliary child renderers such as speech bubbles, bars, labels, minimap markers, and shadows are excluded
- `item/icon` from `ScriptableItem.image`
- `skill/icon` from `ScriptableSkill.image`


`compendium build` consumes `visual_assets.json`, stores the rows in SQLite, and copies files into `website/static/images/` using readable public paths such as `images/monsters/zarothak_the_tormentor/primary.png`. The original DataExporter `export_path` stays in the database for provenance.
Do not add fallback sources for missing selected sprites. Excluded sources include pets, treasure maps, monster boss/bestiary portraits, animation frames, NPC UI/auxiliary child renderers, skill effects, prefabs, and static Unity assets.

## Runtime Requirements

Runtime visual exports are meaningful only after the game is in the `World` scene and `Il2CppMirror.NetworkClient.localPlayer != null`. AutoExporter is responsible for reaching that state before calling `DataExporter.ExportAllData()`.
