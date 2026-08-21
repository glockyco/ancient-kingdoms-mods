## Context

See `proposal.md` — Why. Three facts shape the approach.

**The pipeline orders redaction against denormalization.** `denormalizers/__init__.py` `run_all()` applies quest, crafting, and journal exclusions first, runs `exclusions.py` for coordinates, then denormalizes monster drops and spawns, and only then applies the monster-zone exclusion — deliberately, because the exclusion needs the complete inferred spawn set. Item sources, zone relationships, experience, search keywords, and tooltips all run afterwards. Any new removal has the same constraint: it must run after the data it reasons about exists, and before the denormalizers that copy that data elsewhere.

**References take four shapes.** Typed columns (`zone_id`, `to_zone_id`, `sub_zone_id`, and the rest), junction rows, identifiers embedded in JSON, and generated display strings. Schema introspection sees the first two. The third needs declared carriers — 17 columns hold entity identifiers, and `quests.finish_quest_locations` and `quests.objectives` hold zone identifiers in different spaces, numeric and string, alongside positions. The fourth is invisible to all of it: `portals.name` reads `"Portal to Old Valorath"` because it was generated from the destination.

**Publishing is four surfaces, not one.** `compendium.db`, `search.db`, image files copied to `website/static/images/`, and prerendered pages that embed their own data payload. Each is written by a different step, and a row deleted from the first is not removed from the others.

## Goals / Non-Goals

**Goals:**

- Two mechanisms that can be reasoned about separately and configured for any zone.
- Coverage that follows the schema, so a new entity type does not need a code change to be redacted.
- A verification strong enough that a missed reference fails the build instead of shipping.

**Non-Goals:**

- Deciding whether a zone is released. That is a human judgement recorded in configuration.
- Text redaction. Prose that names a zone stays; only references are followed.
- Reworking the pipeline's execution order beyond the placement the new steps require.
- A general-purpose ORM or reference graph for the whole schema. The mechanisms need reachability for the entity kinds that redaction produces, not a universal model.

## Decisions

### Two mechanisms with separate configuration, not one list with modes

Position suppression and unreleased-zone exclusion answer different questions: *may we show where this is?* and *may we show that this exists?* Today they share a list because Temple of Valaark and Old Valorath both needed something hidden, and that coincidence has been load-bearing ever since — the released zone's policy is what currently governs the unreleased one.

Position suppression mirrors a rule the game enforces itself. In zone 23 the client closes the live map, substitutes the static `templeValaarkMap` sprite, and disables the player marker (`UIMap.cs:138-153`, `:335`), refuses teleport items (`TravelItem.cs:17-21`), and returns the player to their bind point (`Player.cs:5464-5468`, `NetworkManagerMMO.cs:905-909`). The zone withholds positional information by design, so publishing coordinates for it would disclose what the game deliberately denies. The mechanism therefore keys on that game rule, not on whether map artwork happens to exist. No comparable special case exists for zone 25, which is further evidence that Old Valorath's redaction is about release status alone.

Two configuration keys, each holding zone identifiers, each driving one pass. A zone may appear in both, and the combination is meaningful: suppression is a weaker form of the same removal, so exclusion subsumes it.

Alternatives considered:

- **One list with a per-zone mode.** Rejected: the two passes share no logic beyond column discovery, and a mode field invites a third mode instead of a third mechanism.
- **Keep `[monsters.exclude].zone_ids` and add more entity-specific keys.** Rejected: the entity list would grow with the schema, which is the defect being removed.

### Column discovery from the schema, with declared JSON carriers

The affected columns come from inspecting the schema for zone-reference columns, plus a declared list of JSON carriers for identifiers that introspection cannot see. Sub-zone references resolve to their parent through the sub-zone table.

The hardcoded table list is the reason nine tables carrying zone references are unhandled today. Schema-derived discovery makes coverage a property of the schema rather than of someone remembering to edit a list.

The JSON carriers stay declared rather than sniffed, because a heuristic that decides which JSON keys are identifiers would be guessing at content. Their declaration is verified: the invariant check is the safety net for a carrier nobody declared.

Alternatives considered:

- **Declare every column explicitly.** Rejected: it is the current design, and it is what failed.
- **Sniff JSON structure for identifier-shaped keys.** Rejected: unpredictable, and would act on data it does not understand.

### Cascade to a fixpoint, with reachability computed per entity kind

Removal iterates: remove rows that reference the zone, then remove entities whose every source, spawn, or user is gone, and repeat until a pass changes nothing. Termination is guaranteed because each pass only deletes.

Reachability is evaluated per entity kind and must enumerate every relationship for that kind. The concrete trap: `curse_of_valorath` has no monster user and is the weapon proc of `cursed_dagger`, which drops from a live boss. A skill rule reading only `monster_skills` deletes it. Skills are reachable through monsters, weapon procs, scroll skills, relic buffs, potion and food buffs, pet skills, and class lists.

Alternatives considered:

- **Fixed two-pass cascade.** Rejected: the depth is a property of the data, not a constant.
- **Foreign-key `ON DELETE CASCADE`.** Rejected: it expresses referential integrity, not editorial reachability. It cannot express "keep this item because another monster still drops it", and it would not see JSON references at all.

### Boundary references are scrubbed in place

An entity that straddles the boundary keeps its row and loses its reference. The inbound portal is the case that exists: it stands in a published zone, it is gated by a live key, and it leads somewhere unreleased. It keeps its position and requirements, and loses destination identity, destination name, and destination coordinates. Its generated display name is regenerated so it no longer discloses the destination.

This keeps the frontend ignorant of redaction: it renders a portal with no destination, which needs no exclusion list. `constants.ts` can then stop carrying one, removing the third source of truth.

Alternatives considered:

- **Delete the portal.** Rejected: the gate is real, reachable, and visible to players in a released zone.
- **Keep the destination and filter in the website.** Rejected: it puts redaction knowledge back into the frontend, which is the defect being removed, and it leaves the identity in shipped data.

### Manual identifiers are named, never inferred

Content with no reference edge cannot be derived. `old_valorath_token` has no source, no usage, and no zone reference. The tempting rule — remove items with no source — matches 96 items, 82 with no usage either, including `gold`, furniture, 20 armor-set bonus markers, 15 fatecharms, and the five `draconium_*` items that `[items.hide_crafting]` deliberately publishes. The rule is unusable and its failure is silent.

So the configuration accepts identifiers, and the artifact says plainly that this list is manual and expected to grow when unreleased content ships without connections.

### The ledger follows the citations pattern, and provenance comes from the cascade

The repository already solves this problem once: `citations.lock.json` is a committed ledger, `compendium citations check` fails when reality diverges from it, `compendium citations sync` rewrites it deliberately, and `pnpm check:citations` runs in `lefthook.yml`. Redaction reporting adopts the same four parts rather than inventing a reporting format.

The reason chain is emitted by the fixpoint loop, not reconstructed afterwards. Each iteration already knows which removal orphaned which entity; that is exactly the `via` edge and the pass number. Recovering it later would mean re-running the cascade in a second mode, so the ledger is a reason to design provenance into the loop rather than a feature layered over it.

`sync` stays a separate command. If `build` rewrote the ledger, the diff that is supposed to catch an unintended removal would be produced by the same run that made it.

Alternatives considered:

- **A printed report at build time.** Rejected: it shows the current state and cannot detect that the state changed, which is the failure worth catching.
- **Generating the ledger from the published database by diffing against the export.** Rejected: it recovers what is missing but not why, and the reason is the part that cannot be reconstructed.
- **A separate follow-up change for reporting.** Rejected: the cascade would ship without provenance and be rewritten to add it.

### The invariant check is a value scan, not a schema walk

After the cascade, the build scans published values for identifiers of redacted zones and removed entities, and fails on a hit. It scans values of any shape rather than following declared references, because its purpose is catching the reference form that discovery does not know about. A schema-driven check would only re-verify what the schema-driven removal already did.

The check runs across every publish surface, not only the database, since three of the four surfaces are written by separate steps.

## Risks / Trade-offs

- **The value scan reports a false positive on prose** → An entity identifier is a token like `old_valorath`, distinct from the prose spelling "Old Valorath", so the scan targets identifiers rather than names. Prose that names a zone stays by design; if a scan hits appear in a text column, that column is either a genuine embedded reference or needs an explicit exemption recorded with its reason.
- **Schema introspection acts on a column that looks like a zone reference and is not** → Discovery is asserted in tests against the current schema, and the build reports which columns it selected so an unexpected one is visible rather than silent.
- **Removing the frontend exclusion list changes map behaviour for Temple of Valaark** → That zone stays under position suppression, which already nulls its geometry; the layer filter becomes redundant rather than load-bearing. Verify the map renders it the same way before deleting the constant.
- **The fixpoint is slower than a single pass** → It runs on a build-time database of 1,679 items and 361 monsters, and each pass is a set of indexed deletes. Cost is not a concern at this size.
- **Prerendered pages are produced downstream of the pipeline** → Removal must precede the site build for the page and payload surfaces to be clean, so the ordering is a build-graph constraint, not a pipeline-internal one.

## Migration Plan

No data migration. The pipeline rebuilds the published artifacts from the exported JSON on every run, so the change takes effect on the next `compendium build` plus site build. Rollback is reverting the change and rebuilding.

The published output changes shape for consumers: `old_valorath`, its dependents, and their images and search entries disappear. `[monsters.exclude].zone_ids` is replaced by the unreleased-zone mechanism in the same commit, so no configuration is silently ignored.
