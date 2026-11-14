# Design

## Context

See proposal.md for motivation and the held-item publication policy. The research is source and asset analysis, not a recorded run. Its behavior claims must be observed on the covered build before they become player-facing text.

The existing World snapshot captures authored entities. Chambers rooms and their monsters instead live in owned additive scenes (`server-scripts/MadMageTowerScenes.cs:Create`, `server-scripts/MadMageTower.cs:Prepare,Spawn`). The run origin starts at x >= 8192 and y <= -8192 (`server-scripts/MadMageTower.cs:Run.Origin`). Zone 26 is a dungeon definition, not world geometry (`server-scripts/ZoneInfo.cs:zones`, `server-scripts/MadMageTower.cs:EnsureZone`).

`publish_zone_shots` currently requires one focal point and capture per released zone and validates normal focal positions against zone bounds or triggers. `capture.zoneShots` finds a trigger, warps the character, activates world roots and copies trigger lighting. Neither path can represent an entered private chamber. Artwork already has a shared manifest, photographic encoding and entity-owned redaction. Acquisition already has canonical methods, grouped inputs, corpse delivery, conditions and provider-specific locations. The native dungeon fragment roll is separate from template drops in `build-pipeline/src/compendium/denormalizers/acquisition.py`.

The Virtues route is the presentation reference: game icons, contextual map/art cards, staged actions, rank comparisons and interactive examples, not a prose article decorated with a chart. Existing specs require prerendered facts and retention of entity layouts. These transfer to the Chambers page, but a shrine map does not transfer to a generated chamber.

## Goals / Non-Goals

Goals:

- Separate reproducible definitions and rule inputs from private run observations.
- Reuse acquisition, requirement, artwork and redaction contracts instead of adding page-only interpretations.
- Make real-run capture verifiable without treating private coordinates as world geography.
- Leave the final page composition and copy to a real-page comparison.

Non-goals:

- Do not generate showcase rooms outside the entry flow, publish live seeds as destinations or use UnityPy art as a screenshot substitute.
- Do not infer keeper floors from proximity or construct tower spawn rows from the nine ordinary prefabs.
- Do not exempt journal-hidden items or reconstruct their names, icons or identifiers in the rules page.

## Decisions

### 1. Export one Chambers definition and deterministic rule tables

Add `chambers_of_chaos.json` with typed config references and rule data. Load and validate `MadMageTowerConfig`, then resolve the keeper, seal, reward, pool and group members through existing stable entity IDs (`server-scripts/MadMageTowerConfig.cs:Load,IsValid,EncounterGroup`). Preserve optional support as null. Register the output in the exporter catalog and session manifest and consume it through the loader catalog. Missing required references fail promotion or composition.

Read exposed rule constants directly. Call `SealDropChance`, `CompletionExperience`, `MaximumEnemyLevelBonus`, `Health` and `Power` for explicit integer inputs (`server-scripts/MadMageTowerRules.cs:SealDropChance,CompletionExperience,MaximumEnemyLevelBonus,Health,Power`). Derive the supported character-level and total-veteran domains from exported progression and the game's veteran cap (`server-scripts/Experience.cs:maxVeteranLevel`). Tabulate every supported integer veteran value, every reachable enemy level, room indices 0 to 2, and ordinary/guardian variants. Keep the room index zero-based in data and one-based in presentation. Do not interpolate integer-rounded Health or Power, copy their formulas to the pipeline, or use the exporting character as the input.

For seal chance, include every level used by eligible exported contexts and the threshold/plateau levels. Store the input domain so a new unsupported live level fails rather than selecting a nearest row. A level-based chance view uses those callable results, including the zero chance below 40 and 10% plateau from 55.

`Reward`, `EnemyLevel` and `Trials` accept random inputs (`server-scripts/MadMageTowerRules.cs:Reward,EnemyLevel,Trials`). Use deterministic seeded calls for parity probes, not sampled estimates of exact probabilities. Keep the exact reward bands, level-offset weights and trial bag as narrowly source-cited stochastic rule metadata where interop cannot provide a controllable random source. The level weight is `7 - abs(offset)`, with the guardian starting at offset 0. Call the deterministic maximum-bonus method rather than restating its veteran thresholds. Do not label sampled minima/maxima or frequencies as the game's distribution. The shared website calculation module combines this metadata with exported values for both server and browser consumers.

Alternative: one hand-maintained table duplicates the game and silently drifts. Exporting a sample run would confuse a roll with a rule. Exhaustive numeric lookup tables cost more rows but avoid a second implementation of the game's rounding.

### 2. Carry the keeper role and augment chain end to end

Add `is_chambers_of_chaos_keeper` to exporter NPC roles, pipeline models and persisted role data. Allocate a new matching bit without renumbering existing role bits. Extend service/notable classification, map facets and filters, role badges, the website role list and rules link, search keywords and NPC description priority. Source it from `Npc.madMageTowerEntry`, not the name Mordrath (`server-scripts/Npc.cs:madMageTowerEntry`). Mordrath's position and sub-zone come from the fresh World export. Its world placement remains mappable even though the destination has no world map.

Classify `AugmentUpgradeItem` as `augment_upgrade` before general item fallbacks. Export `augment_next_quality_id` only when `CanUpgrade` is true, preserving null otherwise (`server-scripts/AugmentItem.cs:nextQuality,CanUpgrade`). Add the field to pipeline models, schema and load path, plus the reviewed type label to the website's item/search lists. This work is part of this change, not an assumed dependency already supplied by the game-version update.

For every valid predecessor link and applicable catalyst, create an `augment_upgrade` canonical inventory method with two consumed inputs of quantity one and one next-quality inventory output. Extend kind unions, SQL constraints, detail relations, shared readers, assembly, projections, expansion, fingerprints, source summaries, reverse-use rendering and condition evaluation together. Do not represent it as crafting or a merchant service.

The target must be a loose inventory augment that is not itself augmented, below Legendary, with a valid next-quality link. Space can come from a consumed input slot, an eligible existing result stack or an empty preferred slot, not necessarily an additional empty slot (`server-scripts/AugmentUpgradeItem.cs:TryUpgrade`). Preserve unknown target-instance facts as unknown. The game checks matching defensive affinity and an exact one-step quality increase (`server-scripts/AugmentItem.cs:CanUpgrade`).

Use existing exported token vendor offers for Chaos Catalyst. Confirm the five Adventurer merchants and their 10-token price rather than hardcoding a second vendor list. The private graph is guardian reward, Chaos Token, vendor offer, Chaos Catalyst, upgrade method, next-quality augment. Public views retain amounts and action context through the existing "Redacted item" placeholders, without naming, picturing, linking or identifying the excluded currency. The twelve `legendary_*` augments must acquire their upgrade sources. No valid link alone becomes a physical acquisition root. A multi-step expansion consumes one catalyst per step, never one catalyst for the whole chain.

Alternative: a special source sentence on Legendary pages leaves reverse uses, browser tools and source counts disagreeing.

### 3. Model native drops and run rewards without invented spawns

Seal of Chaos is a code-defined roll in the normal death path after ordinary loot, for non-boss elites with live level >= 40 (`server-scripts/Monster.cs:OnDeath`). Add its output and chance to the qualifying kill context, as with dungeon fragments. Audit every acquisition completeness/probability check that separately enumerates native outputs, not just the visible source builder. Use the spawn or event's effective live level. A template at level 40 that actually spawns at 33 is ineligible. Do not exclude summoned or event elites unless the death path does so. Tower deaths take a different branch and never run this roll (`server-scripts/Monster.cs:OnDeath`).

Represent the Chambers guardian as a procedural reward provider scoped to the Chambers definition, not a new named monster or fixed `monster_spawns` row. Token delivery is to the guardian corpse after the prior two chambers and final objective (`server-scripts/MadMageTower.cs:MonsterDied`). Keep the run-entry requirement and one seal consumed on first entry as shared context, not an additional cost charged when the token is looted (`server-scripts/MadMageTower.cs:Begin,Ready`). Missing level or veteran facts expose the reward bands, not a personal default of zero. Token quantity uses the entry snapshot. Completion experience uses the player's level when the guardian dies (`server-scripts/MadMageTower.cs:Begin,MonsterDied`).

Normalize the native outputs and entry cost before redaction, then use the existing trace and placeholder projections on public surfaces. Eligible elite drop rows, entry requirements, guardian reward bands and catalyst prices retain permitted chances and amounts without excluded item names, icons, links or identifiers. A redacted reward remains a redacted reward, not an empty loot table. Do not publish a Seal of Chaos, Chaos Token or Torn Page item page or reverse-use page.

Pool membership is its own relation. The nine prefab pages keep their ordinary world stats and drops and add a link to tower scaling. Tower clones have rewritten levels, Health, Power, defense and resistances, no normal gold/drop table and no respawn (`server-scripts/MadMageTower.cs:Spawn,NormalizeCombat`). Explain owner-only triple dungeon-balanced kill experience, Double XP handling, and the absence of ordinary kill credit from the separate death path (`server-scripts/MadMageTower.cs:AwardKillExperience`, `server-scripts/Monster.cs:OnDeath`). Do not transfer prefab loot into the procedural context.

Alternative: fake tower spawns would create false map locations and ordinary loot sources.

### 4. Add a run-relative capture mode, not a zone-shot exemption

Extend `capture.zoneShots` and its DTOs with an explicit `procedural_run` framing mode alongside the existing authored-world and suppressed-position forms. Keep one primary shot per zone, with separately identified illustrations. Migrate all focal-file, command, manifest and validator readers together to a versioned schema. Existing world framing and Temple anchor behavior remain unchanged.

Each procedural focal record names the zone, stable capture ID, intended artwork kind, chamber index, room-relative camera position, frame scale and a composition note. Store no absolute private-scene origin as a curated focal point. Select suitable frames from real entered runs. Do not seed or replace the run merely to satisfy a planned illustration.

Prepare the run in the scratch database before invoking capture: redirect before database access, create an owned scratch character, raise it to level 40 through typed controls, grant a Seal of Chaos, approach the freshly exported Mordrath placement and enter through the actual keeper interaction. If the necessary typed setup or trial-navigation controls do not exist, add narrowly scoped scratch-only commands with before/after receipts. Do not bypass entry by setting zone 26 or warping to tower coordinates. The game's travel guard refuses tower destinations (`server-scripts/MadMageTower.cs:CanTravel`).

Capture only a ready, live chamber owned by the scratch player. Resolve ownership with the game's run/scene identity and loaded room, not scene-name prefix alone (`server-scripts/MadMageTower.cs:IsInside,HostRoom`, `server-scripts/MadMageTowerClient.cs:SceneFor`, `server-scripts/MadMageTowerScenes.cs:IsTowerScene`). `HostRoom` is a preparation-time helper, so it is not by itself a ready-room query. Read the live generated room and floorplan for the actual frame (`server-scripts/MadMageTowerRoom.cs:Floorplan`, `server-scripts/MadMageTower.cs:Run`).

In this mode keep the player in place, move only the camera, and retain the room's generated geometry, lighting and atmosphere. Do not call the world-zone activation, trigger-lighting or player-warp branch. Keep creatures, hide the player, UI, overlays and solution-bearing labels, then inspect the rendered result. Restore camera, render targets and temporarily hidden objects on success, cancellation and failure. If the run unloads, restore only still-live rendering objects. Never restore a saved player position from an obsolete room.

Each shot records the run seed, chamber index, trial kind and room-relative camera position, alongside its capture ID, zone, mode, camera size, dimensions, timestamp and PNG digest. Check run identity and readiness immediately before and after readback. A transition, timeout, death or mismatched room invalidates the capture. Write image/receipt updates atomically and merge selected records so capturing a later layout does not erase earlier zone shots.

The build checks the explicit capture mode, dimensions, timestamp and image digest. It also checks required provenance fields are present and well formed. Frames are reviewed by eye for correct framing, representative content and publication safety.

Require at least three visibly distinct generated layouts: one `zone/shot` and at least two illustration kinds owned by `chambers_of_chaos`. Use the shared visual asset manifest and photo encoding for all of them. Raw provenance stays in capture inputs, not public coordinates or source-location geometry. Publish no image with gated clues, rune labels, answer sequences or excluded item names/icons. Captions and alt text describe only permitted visible content and go through the same copy review.

Alternatives: exclude zone 26 and lose approved coverage, invent a world rectangle, or accept any PNG without a receipt. Each either removes the requested page or weakens validation for the wrong reason.

### 5. Withhold challenge content before all public outputs

Keep the generic mechanics for Riddle, Runes and Manuscript on the rules page. Do not copy the twenty riddle texts or sixteen puzzle stories into a route module. Riddle questions, choices and `correctAnswer` are source content, and canonical rune words already encode the solution (`server-scripts/MadMageTowerRiddles.cs:Riddle,All`, `server-scripts/MadMageTowerPuzzles.cs:Definition,All`, `server-scripts/MadMageTower.cs:Answer,Interact`).

Add separate typed challenge records to the raw Chambers export, with stable identities and explicit content fields. The raw export remains private. A required publication policy in `redactions.toml` has an empty permitted-field set for both riddle and rune-puzzle families until the developer answer is recorded. No missing-key default grants permission. Classify fields explicitly, and reject an unknown field for publication. A field allowlist supports an answer that permits clues but not solutions without loading withheld values into a browser component.

Feed unpermitted rows and fields into the existing removal/partial-clearing machinery, declared references and ledger, not a second SQL-delete pass. The website reads only the post-redaction database. Add an output gate that checks the database and its compressed browser copies, search, prerender payloads, JS bundles and selected artwork/captions. When permission excludes all fields, no challenge record or identifying text is published. Do not apply the existing developer-request placeholder wording to a question still awaiting an answer.

A spoiler disclosure control is considered only for content permitted by the answer. It does not protect an answer embedded in HTML, page data or script. Store the answer's permitted content and display constraints in this change before changing the allowlist and deliberately syncing the ledger. Keeping the gate closed is a complete publication path for the rest of the Chambers coverage, not a reason to defer the whole rules page.

Alternative: a client boolean, CSS hiding or a collapsed panel still distributes the answers.

### 6. Keep every journal-hidden item excluded

Every `items.ignore_journal = 1` item stays excluded because the developer asked for all flagged items to be left out of the compendium. This includes Seal of Chaos, Chaos Token, Torn Page of Chaos and the other flagged items. The game's flag filters crafting-journal recipe results (`server-scripts/UIJournal.cs:Start`), but that implementation detail is not the compendium's publication reason. Correct the explanation in `redactions.toml` without changing the rule, exported flags or removal seeds.

Use the existing redacted-placeholder behavior for published entries that need these items. The entry cost, eligible elite drop, guardian reward and Chaos Catalyst's price retain permitted amounts and chances through "Redacted item". Use the existing dashed empty icon slot and developer-request hover text where applicable. No excluded name, icon, link, identifier or dedicated item page is published. The rules page's charts, reward tables, text, image captions and source summaries follow the same rule. Private normalized relationships remain available to the removal and trace machinery so a retained method is not made free or silently lost.

No item-publication delta or named exception is needed. Review ledger differences from the added relationships and challenge gate, not from a change to which flagged items are excluded. Ask Tornar whether the seal, token and page may be published. Until an explicit answer changes the publication policy, retain their exclusions and the existing placeholder presentation.

### 7. Presentation options for comparison, not a selected design

The current version has no Chambers rules page. Build the data and plumbing, then capture real entered runs, then build these three options on `/mechanics/chambers-of-chaos` with that data and artwork. They are comparison candidates, not an approved layout or final player copy. Each includes every required visualization, but makes a different player question the organizing principle. In every option, entry items and rewards use existing redacted-item placeholders without excluded names, images or links. The structural descriptions below refer to private mechanics, not final player-facing labels.

| Option | Player question and structure | Visualization placement |
| --- | --- | --- |
| A. Follow a run | "What do I do from preparing entry to leaving with the reward?" A continuous walkthrough follows entry, two variable chambers, Guardian and exit. | An entry-item drop-chance chart with "Redacted item" sits beside entry. A chamber-sequence strip leads into illustrated trial sections. The 20-minute run timeline spans the walkthrough. Scaling charts appear at the first combat stage with shared level/veteran controls. A redacted-reward quantity table and catalyst-to-augment chain close the run. Three live layout shots illustrate different stages. |
| B. Plan a character | "How hard will this be for my level and veteran points, and what can I earn?" A planning surface leads with shared inputs and comparative results, then offers trial detail and a compact run guide. | Enemy-level distribution, Health and Power across chambers/guardian are the primary panels. Redacted-reward quantity bands sit beside those results. Entry-item drop chance follows with the same placeholder. A compact sequence/timeline and game-art trial selector lead to screenshot-backed objectives. Avoid a second prose walkthrough that repeats every panel. |
| C. Browse the trials | "What might I face, and how does each trial work?" A field-guide composition leads with large illustrated trial sections and a clear always-final Guardian, then a planning section. | Real layouts anchor trial-kind cards and detail sections. A three-chamber sequence shows where those kinds occur. The run timeline groups time, penalties and failure. A lower shared planning section contains level/Health/Power charts, redacted-reward quantities and entry-item drop chance with existing placeholders. Permitted entry and reward facts stay concise rather than becoming a long narrative. |

A is the initial recommendation to compare because it puts irreversible entry-cost consumption, trial objectives and looting before exit in the order a first-time player meets them. B provides the stronger repeat-run planning alternative. C tests whether image-led trial browsing makes the procedural dungeon easier to understand. No option is selected by this recommendation.

For each option, ask what the player can do with each sentence, chart and image. Omit decorative lore and repeated explanations in at least one candidate. Use the live game's help/tracker and strong external dungeon-guide references to check the comparison, with linked quotations in the private review material. Reference pages have not been selected by this planning work and are not evidence of game behavior.

Render and inspect phone, desktop and every layout breakpoint in the actual browser. Include the current absence, all candidates, a marked recommendation and None of these in a Plannotator comparison. Check readable axes, keyboard use, touch controls, chart/table equivalence, image cropping, repeated card sizing and default prerendered facts. Model or persona reviewers can find defects, not choose the design. Record only the selected rule and its exact example in the active change, remove unused comparison implementations, and preserve ordinary entity-page layouts. Review the keeper role label/description, catalyst type label, source/use wording, captions and spoiler wording in their real page contexts too.

### 8. Correct existing rules where the Chambers is an exception

Correct the Death page's remains and respawn rules and its related binding skill text in place. Chambers respawn creates no remains and returns to the run's recorded entry point (`server-scripts/Player.cs:UpdateServer_DEAD`). Bind Affinity and Binding must not imply that a bind point overrides this return or that Gate Scroll bypasses tower travel restrictions (`server-scripts/MadMageTower.cs:CanTravel`). Veteran Awareness must include zone 26 alongside Temple of Valaark as a minimap-mark exception (`server-scripts/Monster.cs:LateUpdate`). Port fixed effect text to Pocket Compendium and regenerate its parity corpus through its producer.

The Party page must describe invitations and acceptance involving a player inside the Chambers as refused (`server-scripts/PlayerParty.cs:UserCode_CmdInvite__String,UserCode_CmdAcceptInvite`). The Experience page must distinguish triple dungeon-balanced kill experience, Double XP and no normal event/regional bonus from completion experience (`server-scripts/MadMageTower.cs:AwardKillExperience,MonsterDied`). Each explanation links to the Chambers rules in the relevant page context. This keeps the facts beside the rule a player reads rather than adding a detached list of exceptions.

## Risks / Trade-offs

- [Redaction obscures entry and reward identities] Keep amounts, chances and action context in the existing placeholders without guessing or reconstructing excluded identities.
- [A random method lacks controllable interop inputs] Keep the exact small stochastic rule source-cited, use deterministic game-call probes, and never estimate an exact distribution from frequency.
- [Tabulation domains change with progression] Export domains with the data and reject unsupported inputs. Regenerate the complete tables from the current game.
- [A room unloads during capture] Check run identity around readback and make cleanup rendering-only in procedural mode.
- [An image leaks a clue even though UI is hidden] Inspect every selected frame and its labels/caption under the same closed publication policy.
- [A new acquisition kind works on an item page but not in browser tools] Migrate every kind consumer, probability/completeness check, reverse projection and source-root rule together.

## Migration Plan

1. Add export contracts, role/upgrade plumbing and rule data, then compose a fresh manifest-verified session with new loaders and canonical methods. Keep journal-hidden items excluded and preserve the retained public relationships through placeholders.
2. Migrate capture producers and readers together, capture at least three distinct entered-run layouts, check their receipts and review frames by eye before publishing shared artwork records.
3. Build and review the three real-page presentation options using the actual data and captures. Keep excluded identities out of every candidate and retain only the selected presentation.
4. Ship only the selected presentation, with the challenge gate closed unless a developer answer has explicitly opened permitted fields. Reconcile affected death, experience and party explanations in place so general rules do not contradict the new exception.
5. Verify runtime observations, export contents, focused pipeline/acquisition tests, all output gates and browser behavior. Set published 0.10.4.0 coverage only once the rules page, zone page, sources, upgrades and valid captures are complete. Deployment still requires an explicit request.
6. On a failed gate retain the previous complete database, artwork and deployment. Do not mutate promoted exports or replace failed captures with unvalidated images.

Contributor instructions need the authored-versus-procedural capture distinction. The HotRepl capture reference needs the new argument/receipt forms, scratch entry procedure and invalidation conditions. Keep the command's schema and configuration as the source for field inventories rather than copying them into documentation. No README addition is planned.

## Open Questions

- What does Tornar permit publishing from the Chambers riddles and rune puzzles: questions, choices, correct answers, puzzle titles, stories, rune words and solution order? Does any permitted content require spoiler-style hiding? May Seal of Chaos, Chaos Token and Torn Page of Chaos be published? Until an answer is recorded, challenge content stays withheld and all three items stay excluded under the existing policy.
- Which of the three page structures, or another structure, should be retained after the real-page comparison? This does not change the required facts, visualization set, data contracts or capture workflow.
