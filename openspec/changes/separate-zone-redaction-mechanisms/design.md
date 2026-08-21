## Context

See `proposal.md` — Why. Three facts shape the approach.

**The pipeline orders redaction against denormalization.** `denormalizers/__init__.py` `run_all()` applies quest, crafting, and journal exclusions first, runs `exclusions.py` for coordinates, then denormalizes monster drops and spawns, and only then applies the monster-zone exclusion — deliberately, because the exclusion needs the complete inferred spawn set. Item sources, zone relationships, experience, search keywords, and tooltips all run afterwards. Any new removal has the same constraint: it must run after the data it reasons about exists, and before the denormalizers that copy that data elsewhere.

**References take four shapes.** Typed columns (`zone_id`, `to_zone_id`, `sub_zone_id`, and the rest), junction rows, identifiers embedded in JSON, and generated display strings. Schema introspection sees the first two. The third needs declared carriers — 22 columns hold entity identifiers, and `quests.finish_quest_locations` and `quests.objectives` hold zone identifiers in different spaces, numeric and string, alongside positions. The fourth is invisible to all of it. The `portals` table stores no name, and the map payload builds one from the destination, so the published string reads `"Portal to Old Valorath"` while no column holds it. The same payload also carries `destinationSubZoneName: "Upper Old Valorath"`, and `portals.keywords` ends with the destination name.

**Publishing is four surfaces, not one.** `compendium.db`, `search.db`, image files copied to `website/static/images/`, and prerendered pages that embed their own data payload. Each is written by a different step, and a row deleted from the first is not removed from the others.

## Goals / Non-Goals

**Goals:**

- Two mechanisms that can be reasoned about separately and configured for any zone.
- Coverage that follows the schema, so a new entity type does not need a code change to be redacted.
- A verification strong enough that a missed reference fails the build instead of shipping.

**Non-Goals:**

- Deciding whether a zone is released. That is a human judgement recorded in configuration.
- Text redaction. Prose that names a zone stays, and only references are followed.
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

### Removal is the difference between two reachability closures

The published set is what a player can reach from released content. Removal is therefore not a sweep that hunts orphans, it is a subtraction:

- `R_all` is everything reachable from every zone.
- `R_kept` is everything reachable from the zones that remain, over a graph with the manually named entities and the `ignore_journal` items already taken out.
- The cascade removes `R_all` minus `R_kept`, together with the excluded zones and the named entities themselves.

The transitive part is the closure, so there is no loop, no pass counter, and no termination argument. Depth beyond one step is a property of the closure rather than of an iteration that has to be told when to stop.

The subtraction is also what makes unconnected content safe. `gold`, the furniture, the twenty armor-set markers, the fifteen fatecharms, and the five published `draconium_*` items are reachable from nothing, so they are absent from both closures and the difference never mentions them. They are outside the mechanism's field of view rather than protected by a rule that has to remember them.

Reachability must consider every reference kind. `curse_of_valorath` has no monster user and is the weapon proc of `cursed_dagger`, which drops from a live boss, so a skill rule reading `monster_skills` alone deletes it. Summoning is a reference kind for the same reason: `cinderbone_skeleton` and `spectral_wolf` have no spawn row at all and reach a player only through `skills.summoned_monster_id`, so a monster rule reading spawns alone deletes them. Both paths start at a zone, so "keep a summoned monster unless its summoner is excluded" needs no special case.

Alternatives considered:

- **A fixpoint loop over per-table ownership.** Rejected after building it. Deciding "does this reference keep the entity alive" and "does this row die with the entity" from table names fails immediately: `monster_skills` must keep a skill alive without keeping its monster alive, and `monster_spawns` must do both. Separating them needed two hand-maintained table lists that can disagree with each other, which is the maintained list this change exists to delete, reintroduced in a new place.
- **Mark and sweep from roots, publishing only what is reachable.** Rejected: it removes the 96 items with no source, 82 of which have no usage either and several of which are published deliberately. The subtraction keeps that property without a list of exceptions.
- **Fixed two-pass cascade.** Rejected: the depth is a property of the data, not a constant.
- **Foreign-key `ON DELETE CASCADE`.** Rejected: it expresses referential integrity, not editorial reachability. It cannot express "keep this item because another monster still drops it", and it would not see JSON references at all.

### One reference semantics table, read by every pass

Each discovered reference carries two independent attributes, and every pass reads them from the same place.

| attribute | values | decides |
|---|---|---|
| `reaches` | yes, no | whether the target is in a closure |
| `locus` | own, destination, none | which geometry the reference governs |

Direction follows one rule with one shape of exception. A zone reference is read backwards, because a zone contains the row that names it. An entity reference is read forwards, because an entity provides what it names. The exceptions are destinations, which reach nothing: `to_zone_id`, `teleport_zone_id`, and `travel_zone_id` would otherwise make an excluded zone reachable through the very portal that leads into it.

This dissolves an apparent contradiction between two requirements. "No published row references the zone" and "the portal remains published" both hold, because the spawn is *contained by* the excluded zone while the portal merely *points at* it. The boundary rule stops being an exception and becomes a consequence of the attribute.

The table cannot be complete by construction, so what matters is how it fails. A missing `reaches` edge leaves its target in neither closure, so the target survives holding a reference to something removed, and the value scan reports it. An invented edge removes something it should not, and the ledger diff reports it. Both failure modes are loud, and they are caught by two mechanisms this change already builds.

Alternatives considered:

- **Three separate lists, one per pass.** Rejected: reachability, deletion, and geometry were derived from the same references, and keeping three lists let them disagree about the same column.
- **Infer direction from table or column naming.** Rejected: `monster_skills` and `item_sources_monster` both describe an edge leading away from the monster while naming it on opposite sides, so no naming rule recovers the direction.

### Removal deletes rows, because the database ships to the browser

`compendium.db` is gzipped, content-hashed, and imported by the client bundle through `website/src/lib/database-assets.ts`. Every row it holds is public. A `published` flag, a filtered view, or any scheme that leaves redacted rows in the file and hides them at query time would ship the content it claims to redact.

Alternatives considered:

- **Mark rows unpublished and filter in the reader.** Rejected: the data is the artifact, so filtering happens after it has already been delivered.

### Boundary references are scrubbed in place

An entity that straddles the boundary keeps its row and loses its reference. The inbound portal is the case that exists: it stands in a published zone, it is gated by a live key, and it leads somewhere unreleased. It keeps its position and requirements, and loses destination identity, destination sub-zone, destination name, and destination coordinates. The strings built from the destination are rebuilt so they no longer disclose it, covering the generated display name, the generated sub-zone name, and the keyword list the search index reads.

This keeps the frontend ignorant of redaction: it renders a portal with no destination, which needs no exclusion list. `constants.ts` can then stop carrying one, removing the third source of truth.

The portal's own key names the destination. It reads `iportal_northern_wastes_to_old_valorath_1646438`, so clearing its destination columns would leave the disclosure in the primary key. The key is rebuilt without the destination segment as `iportal_northern_wastes_1646438`, keeping the game object id that makes it stable. Two rows reference it, `portals.id` and `item_usages_portal.portal_id`, and the search index and the map payload both derive from the database, so they follow. No page is prerendered per portal, so no published URL changes.

Alternatives considered:

- **Delete the portal.** Rejected: the gate is real, reachable, and visible to players in a released zone.
- **Keep the key and record an exemption.** Rejected: the published data would still carry a string naming the unreleased zone, which is the disclosure this requirement exists to prevent.
- **Replace the key with the object id alone.** Rejected: `iportal_1646438` discards the origin zone that every other portal key carries, for no gain.
- **Keep the destination and filter in the website.** Rejected: it puts redaction knowledge back into the frontend, which is the defect being removed, and it leaves the identity in shipped data.

### Manual identifiers are named, never inferred

Content with no reference edge cannot be derived. `old_valorath_token` has no source, no usage, and no zone reference. The tempting rule — remove items with no source — matches 96 items, 82 with no usage either, including `gold`, furniture, 20 armor-set bonus markers, 15 fatecharms, and the five `draconium_*` items that `[items.hide_crafting]` deliberately publishes. The rule is unusable and its failure is silent.

So the configuration accepts identifiers, and the artifact says plainly that this list is manual and expected to grow when unreleased content ships without connections.

### The ledger follows the citations pattern, and provenance comes from the cascade

The repository already solves this problem once: `citations.lock.json` is a committed ledger, `compendium citations check` fails when reality diverges from it, `compendium citations sync` rewrites it deliberately, and `pnpm check:citations` runs in `lefthook.yml`. Redaction reporting adopts the same four parts rather than inventing a reporting format.

The reason chain comes from the closure, not from a second computation afterwards. Walking `R_all` already produces, for each entity, the references that reached it and the distance from the zone it was reached through. An entity is removed when every one of those referrers is itself removed, so the referrers are the `via` edge and the distance is a more meaningful number than an iteration counter would have been. Recovering either later would mean recomputing the closure in a second mode.

`sync` stays a separate command. If `build` rewrote the ledger, the diff that is supposed to catch an unintended removal would be produced by the same run that made it.

Alternatives considered:

- **A printed report at build time.** Rejected: it shows the current state and cannot detect that the state changed, which is the failure worth catching.
- **Generating the ledger from the published database by diffing against the export.** Rejected: it recovers what is missing but not why, and the reason is the part that cannot be reconstructed.
- **A separate follow-up change for reporting.** Rejected: the cascade would ship without provenance and be rewritten to add it.

### The invariant check is a value scan, not a schema walk

After the cascade, the build scans published values for identifiers of redacted zones and removed entities, and fails on a hit. It scans values of any shape rather than following declared references, because its purpose is catching the reference form that discovery does not know about. A schema-driven check would only re-verify what the schema-driven removal already did.

The check runs across every publish surface, not only the database, since three of the four surfaces are written by separate steps.

## Risks / Trade-offs

- **The value scan reports a false positive on prose** → An entity identifier is a token like `old_valorath`, distinct from the prose spelling "Old Valorath", so the scan targets identifiers rather than names. Prose that names a zone stays by design. If a scan hit appears in a text column, that column is either a genuine embedded reference or needs an explicit exemption recorded with its reason.
- **A pattern match reads the identifier as a wildcard** → Every identifier here is snake_case, and `_` is a single-character wildcard in SQL `LIKE`, so `LIKE '%divine_essence%'` also matches the prose "divine essence". Measured against the current database, that spelling reports a hit on `gathering_resources.description` where no reference exists. The scan therefore uses `instr`, and the test suite keeps that prose row as the case that must not match.
- **Schema introspection acts on a column that looks like a zone reference and is not** → Discovery is asserted in tests against the current schema, and the build reports which columns it selected so an unexpected one is visible rather than silent.
- **Removing the frontend exclusion list changes map behaviour for Temple of Valaark** → That zone stays under position suppression, which already nulls its geometry, so the layer filter becomes redundant rather than load-bearing. Verify the map renders it the same way before deleting the constant.
- **The closure is slower than a single pass** → It runs on a build-time database of roughly twelve thousand rows that can be nodes, and each edge set is one indexed query per reference column. Cost is not a concern at this size.
- **A denormalizer copies a reference the cascade already cleaned** → No denormalizer reads the export. They read only the database, so nothing resurrects removed content from source. They do copy references between tables, and `item_sources_monster` is built from `monsters.drops` after the cascade runs, so the invariant check runs at the end of denormalization rather than immediately after the cascade.
- **The data already contains a dangling reference** → `summon_triggers.summoned_entity_id` names `astral_projection`, which is not a monster, a skill, or a pet. A value scan meets it. It is not produced by redaction, so it needs a recorded exemption or an upstream fix rather than a weaker check.
- **Prerendered pages are produced downstream of the pipeline** → Removal must precede the site build for the page and payload surfaces to be clean, so the ordering is a build-graph constraint, not a pipeline-internal one.

## Migration Plan

No data migration. The pipeline rebuilds the published artifacts from the exported JSON on every run, so the change takes effect on the next `compendium build` plus site build. Rollback is reverting the change and rebuilding.

The published output changes shape for consumers: `old_valorath`, its dependents, and their images and search entries disappear. `[monsters.exclude].zone_ids` is replaced by the unreleased-zone mechanism in the same commit, so no configuration is silently ignored.
