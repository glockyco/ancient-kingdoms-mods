## Context

See `proposal.md` for motivation and the measured differences. This section records what the code does today and what the runtime offers instead. Every anchor below was read; `server-scripts/` is the decompiled 0.9.31.0 assembly.

**The tooltip.** `ItemExporter.cs:61-67` writes `tooltip = scriptableItem.ToolTip(false, false) ?? ""`. The two booleans are `compareEquipment` and `showPrice` (`ScriptableItem.cs:423-425`); neither governs player-conditional markup. `UsableItem.cs:62-73` wraps `{MINLEVEL}` in `<color=red>` when `minLevel > 1 && GameManager.isLocalPlayerActive && Player.localPlayer.level.current < minLevel`. `EquipmentItem.cs:347-355` and `:520-522` wrap the required class the same way when `Player.localPlayer.className` cannot use the item. `ScriptableItem.cs:64-68` and `:178-196` resolve the template through `LocalizationSettings.SelectedLocale`, and `:212-229` lets the locale choose the culture that formats numbers. `TravelItem.ToolTip` adds one more player-dependent value after the base render: when the item targets `"Bind Point"`, it reads `Player.localPlayer.idZoneBindPoint` and replaces `[BINDPOINT]` with that zone's localized name (`TravelItem.cs:45-54`). Two verification runs therefore wrote `[Twilight Forest]` and `[Everfrost]` for the same Gate Scroll.

`FragmentItem.ToolTip` loops over `Player.localPlayer.inventory`, then renders the owned and required counts as red while incomplete or the required count twice in green when complete (`uMMORPG.Scripts.ScriptableItems/FragmentItem.cs:52-68`). Two runs therefore wrote `0 / 5` and `5 / 5` for Krom Razz Fatecharm Fragment. The item property is `amountNeeded`; the owned count belongs to one character.

The game exposes no player-independent rendering: the raw `toolTip` field is protected-internal (`ScriptableItem.cs:42-44`) and `LocalizedToolTipTemplate()` is protected.

**The spawn position.** `MonsterExporter.cs:282` derives the zone from `monster.transform.position` and `:289-293` writes the position from the same live transform; `NpcExporter.cs:313` and `:320-324` do likewise. The runtime keeps the placed point: `Monster.cs:99` declares `startPosition`, `:545-546` captures it in `Awake`, and the movement and respawn code reads it without assigning it (`:1570`, `:1633`, `:1660-1669`, `:2816`, `:3000-3035`). `Npc.cs:110` and `:305-306` do the same in `Start`. `Entity.cs` has no such field, so this is specific to the two types that move.

`startPosition` is private in the game source, and that does not matter: Il2CppInterop regenerates it as `public unsafe Vector2 startPosition` on `Il2Cpp.Monster` (interop assembly line 1847, field pointer at `:3942`), because interop ignores source accessibility. The mod can read it directly.

The two types differ in when they capture it, and it matters. `Monster` captures in `Awake`, so all 4572 instances hold a non-zero value. `Npc` captures in `Start`, which does not run while the object's zone is deactivated, so 219 of 236 held the zero vector from one position and a different set would from another.

Which branch an NPC takes therefore varies between exports, and the answer does not. An NPC whose `Start` ran holds its captured point, and one whose `Start` did not run has not moved, so its transform holds the same point. Both branches report where the game placed it.

The actors that stand away from that point are not drifting. They are doing what they are built to do, and the two behaviours differ in kind. 57 monsters are wandering: `Monster.cs:1660` navigates to `startPosition + Random.insideUnitCircle * moveDistance`, and every one of the 57 is within its own `moveDistance` of its start, the furthest 7.6 units. One monster is patrolling a route from `waypointsPatrol` and stands 356.8 units away.

So the exported position is not a corrupted spawn point; it is a correct reading of the wrong thing. For a wanderer it is a sample from a disc around the home point, and for a patroller it is a point on a route. Both are already described by fields the export publishes separately: `move_distance` and `is_patrolling` at `MonsterExporter.cs:304-306`, and the waypoints at `:310-317`. What is missing is the point the game places the actor at, which is what a spawn position means and what the map needs.

**The gather item name.** `GatherItemExporter.cs:41-63` builds the identifier from `gatherItem.name` and the exported name from `gatherItem.nameGatherItem`, falling back to `gatherItem.name`. `GatherItem.cs:118-156` has `Start` assign `nameGatherItem = base.name`. The exporter enumerates objects through `Resources.FindObjectsOfTypeAll`, which returns objects whose `Start` has not run. The two exports agreed on every identifier and differed on 14 names, which is exactly the authored value against the object name.

**The visual asset.** An entity's sprite comes from a root `SpriteRenderer` or from compositing the renderers under a `Front` child. The two are mutually exclusive in the data: of 4572 monster instances, 4364 carry a root renderer and 208 carry a `Front` child, and none carries both or neither; of 236 NPCs, 2 and 234. Structure already decides the branch.

The code decides it by runtime state instead, and does so differently in three places. `MonsterExporter.cs:243-254` takes the root renderer when its `sprite` is set and otherwise composites. `NpcExporter.cs:279-302` composites first and falls back to the root renderer only when `ExportComposite` returned `null`, which `VisualAssetRegistry.cs:132-137` does when no renderer survived selection. `BaseExporter.cs:45-81` documents a third order, root first, for the callers that share it.

The selector is what flips: `VisualAssetRendererSelector.cs:31-32` drops a renderer outside a `Front` subtree unless `renderer.gameObject.activeInHierarchy`.

Activation is not incidental. `ZoneInfo.ClearDynamicZones` collects the zone of every online player and activates a zone object only while a player stands in it (`ZoneInfo.cs:185-201`), and `ZoneTrigger.cs:114` does the same for the static environment. Activation therefore follows the exporting character, and one character leaves most of the world inactive: from zone 2, 219 of 236 NPCs and 4102 of 4572 monsters were inactive, and 451 of the 470 active monsters were in that zone. Which objects are inactive changes as the character moves, so the branch a root-only NPC takes depends on where the export was started from.

`Aelindis Gemweaver` is one of the two root-only NPCs, and it is the row that differed. Monsters never reach the filter, because their exporter tests the root component first, which is why only one asset differed in the original comparison.

The structural correction exposed a second visual dependency. `MonsterExporter` and `NpcExporter` prefer the first scene instance over the canonical template for the visual source. Two verification runs selected different live animation frames for Injured Werebear (`catbearmonster_55` and `catbearmonster_90`) and Orc Oracle (`icy_orc_oracle_1` and `icy_orc_oracle_38`). Both groups have a canonical template whose root renderer holds the controller's initial frame. Groups without a template still need their animator reset before capture.

The same timing affects composites. Two later runs captured Taelora Nightbloom's initialized `Front` subtree at heights 123 and 149. Replacing all scene sources with templates is not sound: it changed 58 layered images because their appearance is applied to the scene instance. The source must remain the initialized scene object, but its animator must be sampled at time zero before the composite reads the sprites.

The same filter also mislabels: a root-only NPC that passes it is recorded as `Npc.gameObject.Front.SpriteRenderers` with `1 renderers`, naming a `Front` child that does not exist.

## Goals / Non-Goals

**Goals:**

- Remove each dependency at its read, rather than stabilising the session the export runs in.
- Make a dependency that cannot be removed fail the build instead of changing the data.

**Non-Goals:**

- Publishing per-language data. The compendium publishes English; the locale is asserted, not exported over.
- Changing any identifier. Identifiers were identical across both exports, and the redaction ledger and the citation lockfile depend on them.
- Improving the gather item display names beyond removing the instability. `GetInteractionText` returns the literal `"Chest"` for chests (`GatherItem.cs:243-248`), which suggests the scene name is not the player-facing label, but choosing what to publish there is a content decision and not this change.

## Decisions

### The tooltip is rendered, then the character's answers are removed

The export keeps calling `ToolTip`, then removes four contributions from the exporting character: the emphasis on a required level, the emphasis on a required class, the character's bind-point zone, and the character's fragment inventory progress. The first two are `<color=red>` wrappers applied at known sites. The third is the localized zone that `TravelItem.ToolTip` substitutes for `[BINDPOINT]`. The fourth is the red or green owned-count markup that `FragmentItem.ToolTip` substitutes for `[FRAGMENTS]`; the export keeps only `amountNeeded`. Each removal is the inverse of a transformation the game code states; authored red text and fixed travel destinations stay unchanged.

Alternative: render under a fixed character. Rejected on the evidence: the class emphasis depends on `Player.localPlayer.className`, and no class can use every item, so no character exists for which the rendering is correct. A max-level character would fix the level emphasis and leave the class emphasis wrong for most of the catalogue.

Alternative: rebuild the tooltip from the raw template. Rejected because it duplicates the game's whole tooltip pipeline - placeholder substitution, stat lines, set bonuses, prices - in our code, where it would drift from the game silently. The mechanics pages already carry that cost deliberately for the damage pipeline, and they have a snapshot gate to hold them to it; a tooltip has no such contract.

The required level and required class are already exported as their own fields, so removing the emphasis loses nothing a consumer cannot reconstruct. The Gate Scroll always targets the character's bind point, not one fixed zone (`TravelItem.cs:22-29`), so the generic localized `Bind Point` label is the item property and a zone name is session data. A fragment's `amountNeeded` is also exported as `fragment_amount_needed`; the character's owned count is neither an item property nor useful to another reader.

### The locale is declared and checked, not corrected

The export records the selected locale in its manifest, and the pipeline fails when it is not the locale the published data assumes.

Alternative: force the locale before exporting. Rejected because it mutates the operator's client settings, and because `GetLocalizedText` falls back to the raw template when localization is unavailable (`ScriptableItem.cs:178-196`): a switch that half-succeeded would publish a different string shape rather than fail. A declaration cannot half-succeed.

This is the one dependency the export cannot remove, because a localized string has to be in some language. Making it visible is the whole point: nothing today would report an export taken in Japanese.

### A spawn publishes the point the game placed it at

The exporter reads `startPosition` for a monster and an NPC, and derives the row's zone from that same point. Zone and position must come from one point, or a monster that wandered across a boundary would get a row whose zone and coordinates disagree.

Alternative: `originFollowPosition`. Rejected: `Monster.cs:639-642` assigns it from `startPosition` only when it is zero, so an authored follow origin is a different point, and the value would silently mean one thing for most monsters and another for those that follow.

A zero `startPosition` is not an error and SHALL NOT fail the export. It means the capture has not run, and for an `Npc` that capture is in `Start`, which never runs on an object inactive from load: 219 of 236 NPCs read zero. An object whose `Start` has not run has not moved either, so its transform still holds the point it was placed at, and the export reads that. The two branches therefore both answer the same question, and neither publishes a moving actor's position.

This leaves one ambiguity, stated rather than handled: an actor authored at exactly the world origin is indistinguishable from one whose capture has not run. No monster or NPC currently reads zero for that reason, and both branches would answer the origin anyway.

`origin_follow_position` carries the same defect and was not visible in the comparison. `Npc.cs:310-312` fills an unset origin from the start position, so 219 NPCs export zero, 17 export their start point, and none holds a distinct authored value. The two exports agreed only because the same 17 were active in both. The export publishes the value the game settles on, and keeps the authored value when one exists, so a future patch that authors a distinct origin still exports it.

### A read never resolves through a lifecycle method

The gather item name comes from the field `Start` does not assign. `gatherItem.name` is that field, and the identifiers prove it was stable across both exports.

The parenthesised suffix stays. `Chest RF Interiors (10)` is what the object is called, some rows already publish it, and removing it is the content decision this change excludes. The requirement is that the value stops depending on when the exporter ran.

### The visual asset source is canonical, then chosen by structure

The source follows the same structural branch. A `Front` composite keeps the initialized scene instance: switching every group to its template changed 58 layered images, because the scene initialization supplies their appearance. A root-renderer branch uses the canonical template when the group has one. A template holds the controller's initial sprite instead of a live animation frame.

The shared capture resets an active source's animator and samples time zero before it reads either branch. This keeps an initialized composite's appearance while removing its current frame, and it covers a root-renderer group for which the game exposes no template. The source choice and the root-or-composite choice live in shared helpers so the exporters cannot disagree again.

The capture decides between the composite and the root renderer by whether a `Front` child exists. The sources are mutually exclusive in the data, so this reproduces every structural outcome except the one that was unstable, and it removes the activation test that made it unstable.

No failure path is needed, and none is added. The earlier plan failed the export on a `Front` child whose renderers hold no sprite; the measurement found no such entity, and all 208 monster and 234 NPC `Front` subtrees are populated.

Because the three call sites disagree about the order, and that disagreement is what let one of them depend on activation, the choice moves into one helper that all three use. The selector then only ever receives a `Front` subtree, which makes `VisualAssetRendererSelector.cs:31-32` unreachable, so the activation test and the `front ?? root` fallback are removed rather than left to be rediscovered.

Alternative: keep the fallback and accept whichever source has sprites. Rejected: that is the current behaviour, and it published two different images for one NPC across two exports of one build, one of them under a source name describing a child the NPC does not have.

Alternative: keep preferring a scene instance for a root renderer and capture its current sprite. Rejected: Injured Werebear and Orc Oracle each published two animation frames in two runs. The canonical template already carries the initial frame, and sampling time zero covers root-renderer groups for which the game exposes no template.

Alternative: use the canonical template for `Front` composites too. Rejected after runtime verification: that changed 58 layered images because those templates do not carry the appearance that scene initialization applies. A composite therefore keeps its initialized scene source; it had already been byte-stable across runs.

## Risks / Trade-offs

- A structural rule could change an image for an entity whose branch it decides differently → measured before writing: no monster or NPC carries both a root renderer and a `Front` child, and none carries neither, so the rule reproduces every current branch. Only the two root-only NPCs change, and only to the branch their structure names.
- Removing markup by pattern could remove emphasis the game applies for a reason unrelated to the player → remove it only at the two decorations identified, and add a test that an item whose requirement the character meets and one whose requirement it does not produce the same exported tooltip.
- A third player-conditional decoration may exist that neither export exposed, because both ran as one character → enumerate the conditional markup in the tooltip pipeline as part of the work, rather than inferring the set from the observed diff.
- Replacing the bind-point zone could alter an authored bracketed zone elsewhere in a tooltip → apply it only to a `TravelItem` whose destination is `"Bind Point"`, and replace the exact localized value that `TravelItem.ToolTip` generated.
- Removing fragment progress could alter similar authored count markup → apply it only to `FragmentItem`, match the two exact red and green shapes that its override emits, and keep `amountNeeded`.
- Resetting a layered animator could discard the initialized appearance → reset the initialized scene instance rather than its template; sampling time zero changes the frame but keeps the scene object's renderer assets.
- `Npc` captures its start point in `Start`, which does not run while its zone is deactivated, so which NPCs read the zero vector depends on where the exporting character stands → both branches report the placed point, so the exported value does not depend on the branch. `Monster` captures in `Awake` and all 4572 hold a value.
- Correcting a position moves a placement, and the redaction ledger keys a removed placement by its position → none of the twelve is in an excluded zone, so no recorded key changes. A corrected position inside an excluded zone would rekey that entry, which the ledger reports as one line.

## Migration Plan

One export, one build, one publication. The corrected values are a single diff in the generated database, the search index, the map and published image set. Nothing is versioned, so there is no rollback beyond reverting the mod change and re-exporting.

The verification is a second export of the same build, compared file by file. That requires launching the game twice and cannot run in CI, so it belongs to the release procedure rather than to a gate.

## Open Questions

- Whether any exporter outside the four identified reads session state that both exports happened to agree on. The comparison can only find a dependency that differed between two runs by one operator on one machine. Answering it does not change this design; it would add work of the same shape.
