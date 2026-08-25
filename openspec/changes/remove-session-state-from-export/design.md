## Context

See `proposal.md` for motivation and the measured differences. This section records what the code does today and what the runtime offers instead. Every anchor below was read; `server-scripts/` is the decompiled 0.9.31.0 assembly.

**The tooltip.** `ItemExporter.cs:61-67` writes `tooltip = scriptableItem.ToolTip(false, false) ?? ""`. The two booleans are `compareEquipment` and `showPrice` (`ScriptableItem.cs:423-425`); neither governs player-conditional markup. `UsableItem.cs:62-73` wraps `{MINLEVEL}` in `<color=red>` when `minLevel > 1 && GameManager.isLocalPlayerActive && Player.localPlayer.level.current < minLevel`. `EquipmentItem.cs:347-355` and `:520-522` wrap the required class the same way when `Player.localPlayer.className` cannot use the item. `ScriptableItem.cs:64-68` and `:178-196` resolve the template through `LocalizationSettings.SelectedLocale`, and `:212-229` lets the locale choose the culture that formats numbers. The game exposes no player-independent rendering: the raw `toolTip` field is protected-internal (`ScriptableItem.cs:42-44`) and `LocalizedToolTipTemplate()` is protected.

**The spawn position.** `MonsterExporter.cs:282` derives the zone from `monster.transform.position` and `:289-293` writes the position from the same live transform; `NpcExporter.cs:313` and `:320-324` do likewise. The runtime keeps the placed point: `Monster.cs:99` declares `startPosition`, `:545-546` captures it in `Awake`, and the movement and respawn code reads it without assigning it (`:1570`, `:1633`, `:1660-1669`, `:2816`, `:3000-3035`). `Npc.cs:110` and `:305-306` do the same in `Start`. `Entity.cs` has no such field, so this is specific to the two types that move.

`startPosition` is private in the game source, and that does not matter: Il2CppInterop regenerates it as `public unsafe Vector2 startPosition` on `Il2Cpp.Monster` (interop assembly line 1847, field pointer at `:3942`), because interop ignores source accessibility. The mod can read it directly.

**The gather item name.** `GatherItemExporter.cs:41-63` builds the identifier from `gatherItem.name` and the exported name from `gatherItem.nameGatherItem`, falling back to `gatherItem.name`. `GatherItem.cs:118-156` has `Start` assign `nameGatherItem = base.name`. The exporter enumerates objects through `Resources.FindObjectsOfTypeAll`, which returns objects whose `Start` has not run. The two exports agreed on every identifier and differed on 14 names, which is exactly the authored value against the object name.

**The visual asset.** `NpcExporter.cs:279-289` selects composite renderers and calls `ExportComposite`; `:290-302` falls back to the root `SpriteRenderer` only when that returned `null`. `VisualAssetRegistry.cs:132-137` returns `null` when no renderer has a non-null `sprite`. `VisualAssetRendererSelector.cs:21` collects renderers including inactive ones, then filters on `sprite != null`. So the branch is decided by whether a sprite has been assigned at the moment the export runs, and the observed row flipped between `Npc.gameObject.SpriteRenderer` and a `Front.SpriteRenderers` composite reporting `1 renderers`, with a different published image file.

## Goals / Non-Goals

**Goals:**

- Remove each dependency at its read, rather than stabilising the session the export runs in.
- Make a dependency that cannot be removed fail the build instead of changing the data.

**Non-Goals:**

- Publishing per-language data. The compendium publishes English; the locale is asserted, not exported over.
- Changing any identifier. Identifiers were identical across both exports, and the redaction ledger and the citation lockfile depend on them.
- Improving the gather item display names beyond removing the instability. `GetInteractionText` returns the literal `"Chest"` for chests (`GatherItem.cs:243-248`), which suggests the scene name is not the player-facing label, but choosing what to publish there is a content decision and not this change.

## Decisions

### The tooltip is rendered, then the character's answer is removed

The export keeps calling `ToolTip`, then removes the two decorations that describe the exporting character: the emphasis on a required level and the emphasis on a required class. Both are `<color=red>` wrappers applied at known sites, so each removal is the inverse of a transformation the game code states.

Alternative: render under a fixed character. Rejected on the evidence: the class emphasis depends on `Player.localPlayer.className`, and no class can use every item, so no character exists for which the rendering is correct. A max-level character would fix the level emphasis and leave the class emphasis wrong for most of the catalogue.

Alternative: rebuild the tooltip from the raw template. Rejected because it duplicates the game's whole tooltip pipeline - placeholder substitution, stat lines, set bonuses, prices - in our code, where it would drift from the game silently. The mechanics pages already carry that cost deliberately for the damage pipeline, and they have a snapshot gate to hold them to it; a tooltip has no such contract.

The required level and required class are already exported as their own fields, so removing the emphasis loses nothing a consumer cannot reconstruct.

### The locale is declared and checked, not corrected

The export records the selected locale in its manifest, and the pipeline fails when it is not the locale the published data assumes.

Alternative: force the locale before exporting. Rejected because it mutates the operator's client settings, and because `GetLocalizedText` falls back to the raw template when localization is unavailable (`ScriptableItem.cs:178-196`): a switch that half-succeeded would publish a different string shape rather than fail. A declaration cannot half-succeed.

This is the one dependency the export cannot remove, because a localized string has to be in some language. Making it visible is the whole point: nothing today would report an export taken in Japanese.

### A spawn publishes the point the game placed it at

The exporter reads `startPosition` for a monster and an NPC, and derives the row's zone from that same point. Zone and position must come from one point, or a monster that wandered across a boundary would get a row whose zone and coordinates disagree.

Alternative: `originFollowPosition`. Rejected: `Monster.cs:639-642` assigns it from `startPosition` only when it is zero, so an authored follow origin is a different point, and the value would silently mean one thing for most monsters and another for those that follow.

This is also a correctness improvement rather than only a determinism one. The published map currently plots where twelve actors were standing when the export ran.

### A read never resolves through a lifecycle method

The gather item name comes from the field `Start` does not assign. `gatherItem.name` is that field, and the identifiers prove it was stable across both exports.

The parenthesised suffix stays. `Chest RF Interiors (10)` is what the object is called, some rows already publish it, and removing it is the content decision this change excludes. The requirement is that the value stops depending on when the exporter ran.

### The visual asset source is chosen by structure

The capture decides between the composite and the root renderer by whether a `Front` child exists, not by whether sprites are currently populated. When the structure selects the composite and no renderer under it has a sprite, the export fails and names the entity instead of quietly publishing a different image from a different source.

Alternative: keep the fallback and accept whichever source has sprites. Rejected: that is the current behaviour, and it published two different images for one NPC across two exports of one build.

## Risks / Trade-offs

- Failing on an empty composite could stop an export that previously produced an image → count how many entities take each branch, and how many would fail, before changing the rule. If entities legitimately have a spriteless `Front` rig, the structural test needs a narrower condition than "a `Front` child exists".
- Removing markup by pattern could remove emphasis the game applies for a reason unrelated to the player → remove it only at the two decorations identified, and add a test that an item whose requirement the character meets and one whose requirement it does not produce the same exported tooltip.
- A third player-conditional decoration may exist that neither export exposed, because both ran as one character → enumerate the conditional markup in the tooltip pipeline as part of the work, rather than inferring the set from the observed diff.
- `startPosition` is captured in `Awake` and `Start`, so an export taken before those run would read a zero vector → the export already requires a spawned local player, and the value must be rejected when it is zero rather than published.
- Correcting a position moves a placement, and the redaction ledger keys a removed placement by its position → none of the twelve is in an excluded zone, so no recorded key changes. A corrected position inside an excluded zone would rekey that entry, which the ledger reports as one line.

## Migration Plan

One export, one build, one publication. The corrected values are a single diff in the generated database, the search index, the map and one image file. Nothing is versioned, so there is no rollback beyond reverting the mod change and re-exporting.

The verification is a second export of the same build, compared file by file. That requires launching the game twice and cannot run in CI, so it belongs to the release procedure rather than to a gate.

## Open Questions

- Whether any exporter outside the four identified reads session state that both exports happened to agree on. The comparison can only find a dependency that differed between two runs by one operator on one machine. Answering it does not change this design; it would add work of the same shape.
