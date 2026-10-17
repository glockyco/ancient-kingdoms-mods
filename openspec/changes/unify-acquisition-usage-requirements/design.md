## Context

See [the proposal](proposal.md) for motivation and [the parent design](../plan-shared-game-model/design.md) for the agreed character-aware direction. This change implements the acquisition, usage and requirements slice of its relation contract. It does not implement every relation family in that contract.

### Current evidence and reconciliation

Read-only queries and execution of the existing source readers established these boundaries. Game-code findings below are hypotheses until their runtime gates pass.

| Area | Current evidence | Disposition |
| --- | --- | --- |
| Existing probability rules | Boss original pools and theoretical per-kill odds, exact portable-chest odds, altar thresholds and shared fishing calculations are implemented. | Preserve these implementations. Replace their input projections, not their mathematics. |
| Fragment placement | The published source graph associates Vanishing Fatecharm Fragment with an Ancient Mummy placement in Northern Wastes. The matching dungeon is Vault of the Vanished. Template propagation loses placement eligibility. | Export the placed actor's authoritative loot context and derive eligible source placements from it. |
| Special sources | Executing the readers finds Primal Essence through an exchange and Alchemy Workbench through housing, although the ordinary source-family result is empty for both. Fatecharm conversions also have working special summaries. | Normalize existing facts and migrate the working displays. Do not describe them as entirely missing features. |
| Station recipes | Recipe exporters read station arrays, but station models retain no membership. Crafting definitions are deduplicated without preserving the offering station. | Export explicit memberships and distinguish definition identity from provider identity. |
| Vendor gates | Item data already exports faction and Adventuring thresholds. The vendor relation's reputation tier is empty. | Normalize existing offer and provider gates. Do not add another export of the same thresholds. |
| NPC casters | Correct ID extraction resolves 235 memberships across six skills. The existing object-to-ID comparison resolves zero. | Normalize NPC membership and migrate its list/count/context consumers together. |
| Portal use | A stored key-to-portal use survives with a NULL destination, but the current destination inner join hides it. | Keep the use and its requirements without reconstructing the withheld destination. |
| Portable chest results | The live Malachite page shows two percentages for each gem-bag source. Ordered rolls are exposed as separate source results. | Retain both configured rolls and aggregate their mutually exclusive first-award contributions before formatting the item-per-opening result. |
| Recipe alternatives | All 158 published recipe results currently have one recipe each. The tree nevertheless selects the first recipe by construction and loses requested-amount/output-size scaling. | Preserve alternative definitions and correct deterministic batch quantities. Do not claim a current duplicate-result recipe collision. |
| Skill requirements | Rank-dependent level and point-cost curves already exist in the export but are dropped during insertion. Current curves have constant increments. | Retain and consume the curves. Do not claim observed nonconstant requirements in the current game. |

The relevant current producers are the item source/usage denormalizers, `monsters/drops.py`, `server/item-sources.ts`, `server/item-usages.ts`, `server/item-source-summary.ts`, `server/obtainability.ts`, `queries/popup.ts`, `queries/map-search.ts` and `skills/skillDetail.ts`. The [prose cleanup record](../archive/2026-10-17-clarify-compendium-prose/design.md) records the fixes this change must preserve.

## Goals / Non-Goals

### Design boundaries

- One normalized method/condition model supplies the migrated forward, reverse and location reads. Export JSON is input, not a second website relationship API.
- Keep static game definitions, possible methods and currently executable actions distinct. A known container's contents do not prove the container is obtainable.
- Keep costs, eligibility, random success, objective progress and item-instance transfers distinct.
- Preserve the existing database delivery, entity IDs, routes, recorded artwork and query-worker transport.
- Retain all currently supported acquisition paths, not only ordinary drops and vendors.

### Explicit exclusions

No active-character selector, persistence migration, planner, share endpoint, save reader, stash search, new reference routes, combat simulator or general redesign lands here. The complete effect-applier/stat-grant migration and unrelated domain read models remain later work. NPC skill membership is the narrow exception because the parent assigns its existing defect to this slice.

Do not add seasonal text or rows to pages that currently exclude them. Model existing conditional game data without changing page-specific publication policy. Existing seasonal presentation is not redesigned or expanded.

## Decisions

### 1. A method is an execution opportunity, not an item/provider pair

Use a common acquisition-method anchor with typed method details, input/cost groups, outputs and provider memberships. Typed detail tables retain real foreign keys. Assemble requirement roots in the shared reader from these normalized domain facts after redaction. Do not persist a second expression graph.

A method can have several providers with the same behavior, such as identical station offerings. Provider-specific gates and placement conditions remain membership overlays. Distinct ingredient sets, rules, yields or gates remain distinct variants even when their result item matches.

Alternative rejected: union the current flat source pairs and call them canonical. They cannot represent bundles, conditional delivery or phased costs. A wide nullable table or arbitrary metadata JSON would weaken validation and duplicate decoding in every consumer.

Private ingestion identities are deterministic and kind-qualified. Preserve authored definition references and ordered entry locators. When no authored definition ID exists, derive a private key from the complete definition, not only its result. Before publication, replace new internal keys with process-local opaque sequential IDs ordered by surviving public semantics. Detail IDs retain equality with their parent IDs. Never publish a hash or encoding of a removed identity. Existing public entity and route IDs do not change. Conflicting definitions under one private key fail.

### 2. Outputs preserve event and delivery semantics

An output identifies an item or native balance resource, its amount/yield rule, delivery destination, bundle/slot and optional condition. Native gold is not a synthetic item. Inventory, key ring, equipped starter slot and placed house structure are different deliveries.

Non-item consequences needed by existing displays remain phase-bound method effects, not invented purchase prerequisites. For example, a faction chest's standing changes can occur even when it awards no gold. A negative standing delta does not itself mean the character must first hold that amount. This change describes those consequences but does not simulate or mutate character state.

Methods retain these distinctions:

| Method family | Important structure |
| --- | --- |
| Kill loot | Original ordered pool, equipment and quest rules, event overrides, eligible placements and separate fragment rolls. Corpse generation is not a promise that one player receives the item. |
| Vendor purchase | Offered asset, actual delivered yield, price resource, quantity and provider/product gates. |
| Quest acceptance/completion | Separate phases, provided items, unconditional rewards and conditional class-selected reward slots. |
| Altar completion | Activation cost and access, activating-player tier selection and the final-wave reward event. Tier alternatives are not four independent rewards. |
| Crafting, Cooking, Alchemy, Scribing | Complete definition, ordered material group, output quantity, applicable success rule, knowledge condition and exact station memberships. |
| Gathering and world chest | Attempt prerequisites, primary/secondary outcomes, integer bounds, extra-unit modifiers and opening/key/lockpick branches. |
| Pack, portable chest, distribution pool | Preserve whether an actual carried item is used, an award expands a pack immediately, or a parent roll resolves a virtual pool. |
| Merge and fragment conversion | Whole component group, initiating item memberships, exact quantities and inventory/key-ring delivery. |
| Treasure digging | Map consumed at a dig destination, followed by its actual reward. The destination is not a source of the map. |
| NPC services | Definition eligibility, carried-instance conditions, batch behavior, native gold cost and provider roles. |
| Creation, housing and cap-XP rewards | Source-cited creation bundle, explicit House catalog/structure delivery, and the further XP-cycle reward after the veteran cap. These are not fictional world spawns. |

A RandomItem pool is not a player-openable chest. A pack bought or crafted into its contents does not require an invented intermediate inventory/opening step. Preserve the offered asset for inspection while showing what that particular action actually delivers.

Definition inspection also queries offered/initiating asset memberships, not only awarded outputs. Selecting an offered pack must still reveal its providers and contents when buying it awards contents rather than the carried pack. Keep inspectability, entity reachability and inventory obtainability distinct.

Content definitions without a valid acquisition root remain inspectable, as currently happens for unused class chests. A sourceless cycle cannot make itself obtainable. Existing conditional sale-list inputs do not authorize new seasonal presentation.

Page policies that exclude new seasonal presentation apply consistently to rows, counts and metadata. They do not rewrite conditional methods as unconditional or turn their canonical data into a personal-availability claim.

### 3. Inputs are shared with reverse usage

Store one input/cost edge with resource identity, quantity or batch rule, possession scope, behavior and consumption event. Reverse material, currency, merge and fragment uses query that edge. They do not reconstruct prices from a different item column.

Retained tools and keys are not costs. Quest objectives use explicit roles: acquisition counter, inventory fulfillment, secondary inventory/equipment/key alternative, equipped objective or successful-brew counter. Acceptance, fulfillment and completion consumption remain separate. Recipe learning is not the same event as spending materials on a craft.

Rune blessing demonstrates the batch contract: the normal interaction converts all carried Cursed Runes and charges per converted rune. Show a per-unit estimate only when labeled as such. Do not describe one rune as the selectable execution batch.

Instance recovery, such as removing an existing augment, is labeled recovery rather than a new static origin. Bank withdrawals, buyback, corpse retrieval and player trades do not acquire invented world providers. Static augment compatibility uses the game's categories and instance exclusions, not an exhaustive item-by-augment cross product.

### 4. Probabilities are results of named processes

Keep finite, typed rule identities and lossless inputs. Do not create a configurable probability interpreter. Reuse the existing TypeScript boss, chest, fishing and profession functions, adapting their inputs from canonical rows.

A result states its event, quantity meaning and assumptions. Per template roll, per eligible corpse generation, per successful opening and per attempted action are different events. At-least-one probability is not expected quantity. Missing personal inputs do not silently become zero.

Preserve pool order, multiplicity, name-based duplicate caps, weighted top-up attempts, quest gates, outer success gates and mutually exclusive slots. Do not remove gated candidates from a pool before the rule runs when the game still lets them consume weight or attempts. Compute result-level aggregation before rounding. Sum row contributions only when they are mutually exclusive first-award contributions, as for a repeated item in one portable chest.

Static pages retain explicit baseline/scenario calculations. A quest-needed scenario does not assert that an unspecified character has that quest. Actual eligibility and a hypothetical consumed-Fatecharm scenario remain separate. Hunting, Bard's Luck and Charisma change the applicable event or cost rule, not provider identity.

For deterministic output, requested quantity uses whole execution batches and the actual output size. For probabilistic output, show cost per attempt and its chance rather than a guaranteed material total. Do not implement a least-cost acquisition optimizer in this change.

### 5. Typed requirements have phases, subjects and honest knowledge

Use a closed typed expression tree with `all`, `any` and predicates. Add a predicate only when a migrated consumer needs it, and handle it exhaustively. Published unsupported kinds or missing rule parameters fail validation. Unknown evaluation is for unavailable facts, not an unimplemented predicate.

The shared reader alone composes the tree from normalized typed facts. Empty all/any groups are invalid. Redaction preserves withheld operand positions and amounts before the tree is assembled, rather than silently dropping gates.

Roots name their phase, such as offer, accept, fulfill, perform, learn or equip/use. Predicates bind their subject: player, wearer, selected item instance, permitted party members or current world instance. Acquisition eligibility is not equipment compatibility. A source-level sort hint is not a level requirement.

| Fact family | Required distinction |
| --- | --- |
| Numeric progression | Character level, total veteran points, available points, already-spent points, faction standing, profession fraction, Adventuring fraction and total equipped item level retain distinct units and subjects. Format stored fractions as percentages only at the presentation boundary. |
| Altar tier | A finite `altar_tier` predicate compares the activating player's level plus total veteran points with the native inclusive score bounds. Keep both bounds, rather than composing lower-bound metrics that cannot exclude higher tiers. |
| Identity restrictions | Resolve explicit class/race identities through the existing identity mapping, with authored alternatives preserved. Do not guess unknown names. |
| Item possession | Inventory, native base-inventory slots, equipment, key ring, bank, house chest and mercenary storage are distinct scopes. Backpack items do not satisfy base-slot restrictions. Unslotted ownership cannot prove that subset. Preserve the game's actual OR branches. |
| Objectives | Active incomplete quest need and event counters differ from historical quest completion and possession. |
| Recipe/skill knowledge | Use the game's knowledge identity. Scribing does not inherit Alchemy's learned-recipe gate. Skill prerequisites use base ranks rather than armor-set bonuses. |
| Tool/profession | Tool category, selected instance, quality/durability and the existing raw success function determine the attempt floor. A displayed zero chance is not a substitute input. |
| Party and world | Online party-key sharing differs from nearby loot need. Current referenced monster state differs from saved kill history. Keep game-clock windows separate from UTC cooldowns. |

The evaluation input is a read-only projection of the parent character contract plus optional party/world facts, not another persistence model. Facts retain entered/imported/derived provenance and collection completeness. Positive membership or a sufficient known lower bound can prove met in a partial collection. Missing membership proves unmet only for a complete collection. Unknown inventory is not empty inventory.

`all` is unmet if any child is unmet, met only when all are met, otherwise unknown. `any` is met if any child is met, unmet only when every child is unmet, otherwise unknown. Missing authored data is not an empty expression. Re-evaluate current-instance observations only within their declared scope. Historical kills cannot satisfy a portal's current-monster gate or rearm a summon cycle.

Current pages render the same factual conditions without a personal-status badge. Existing profession attempt-floor controls are the first evaluator consumer using their explicit tool/skill scenario inputs. They evaluate those qualifications, not unobserved inventory or whole-action availability. The later character feature supplies its full projection without changing predicate meanings. Do not infer a character from unrelated remembered calculator numbers.

### 6. Shared readers own both directions and geometry

Add environment-neutral query and assembly modules under the existing query organization. Each requires an injected executor. They import neither browser-worker startup nor server database initialization. Thin callers adapt better-sqlite3, sql.js and build-script access to the same query/assembly contract.

Read batches of target/provider IDs and assemble normalized rows without an item-by-item query loop or a Cartesian input/output/placement join. The canonical read result retains method identity, all alternatives, conditions, output/cost groups, rule inputs and source provenance. Presentation grouping can collapse equivalent rows but cannot drop different costs, places or conditions. Do not truncate the authoritative result to the first recipe or three source names.

The source graph uses method branches and quantity-aware edges. Path-local cycle detection stops expansion without deleting a shared ingredient's other occurrence. A deliberate display limit reports that the branch is not expanded and keeps its inspection link.

Direct map locations are where that method awards the selected result. Resolve exact provider memberships and eligible placements, including immediate pack/random resolution inside a parent award. Inventory openings and transformations do not acquire the positions of every upstream ingredient. Readers inspect a container/component to reach its own sources. Full transitive trip planning remains the later Where to Get feature.

Keep known methods without geometry. Position-suppressed providers keep non-geometric facts. Optional display joins, such as an unpublished portal destination, cannot erase an otherwise valid use. Map coordinate conversion stays at the existing map boundary.

Reuse content-hashed database delivery and the current worker. No second database, planner bundle, cache framework or server query endpoint is introduced.

### 7. Export only missing authoritative inputs

| Input work | Source and constraint |
| --- | --- |
| Placed monster loot context | Capture stable per-placement loot zone, respawn, experience multiplier and classification, plus explicit pool differences/event overrides. Do not infer these from a template's union of zones or read a lifecycle-mutated cache as authored configuration. |
| Station membership | Join each valid-scene station/table's actual offered entries to one complete definition. Inspect explicitly referenced home-workstation prefabs separately. Prefabs discovered by Resources are not world placements. |
| Housing catalog | Capture the explicit catalog and referenced structure/workstation capabilities without private house placements or name-based capability inference. |
| Base item class restriction | Preserve the base restriction for relevant non-equipment items rather than populating it only in the equipment branch. A fresh export determines configured affected items. |
| Exact portal gate target | Retain the actual referenced scene placement/instance identity, not merely a monster template with the same name. |
| Exact summon membership | Capture the trigger's referenced monster or NPC placement and each guard by object identity. A same-template placement is not equivalent. |
| NPC quest offers | Capture the native ordered quest entries with separate acceptance and completion flags. These flags alone define providers. Quest start/end associations are not acceptance or completion checks and cannot invent a provider. |
| Required special references | Add the authoritative lockpicks reference needed by the chest alternative. Reuse existing special item, fragment, price, threshold and extra-gather fields. |
| Existing skill curves and NPC IDs | Retain rank curves during insertion and normalize ordered NPC membership. Neither needs another runtime discovery mechanism. |
| Code-defined grants/rules | Keep one cited representation of creation grants and process constants. Resolve existing identities and verify in scratch state. Do not invoke character creation as part of ordinary export. |

Use existing exporter descriptors, the dataset catalog and immutable-session verification. Missing required references stop the export/build. Do not evaluate the exporting character's eligibility to decide which configured offers exist. Known authoring/event overrides and transient observed world state are different data.

Resolve configured zone boundaries from authored collider vertices, offsets and transforms before freezing placements. Early capture cannot rely on physics registration or a simulated frame. All exporters use the same immutable boundary table. Missing, degenerate or unsupported geometry fails capture. Verify containment and nearest-boundary attribution against native physics once it is ready. Repeated exports establish stability, not geographic correctness.

The full effect-applier parameters, character base-stat gaps and authored save quest IDs remain with their planned first consumers. They are not silently bundled into this change. No unused NPC-loot implementation is added for today's empty NPC drop arrays.

NPC membership keeps its authored index. Caster counts count distinct NPC identities for a skill, not repeated entries in one NPC's list. This correction does not expand the change into the full effect-applier catalogue.

### 8. Normalize before closure, then derive presentation

The pipeline loads definitions and enriches altar waves before normalizing memberships, method inputs/outputs, requirements and roll data. It then drops private staging before geometry and hidden-crafting policies run, so normalization cannot recreate a withheld fact. Semantic closure follows those policies. Derived roots, source hints, opaque rekeying and final semantic checks follow the surviving graph.

Declare each reference's reachability direction and geometry behavior once in the existing system. Costs and prerequisites are not providers of the referenced items. Source-free cycles do not create roots. A removed required input cannot make the remaining method look cheaper or unconditional.

Preserve valid alternatives while preventing blocked branches from becoming eligible. When a retained public entity has a withheld requirement target, keep a nonidentifying withheld-condition marker that evaluates unknown, not a dangling ID or an empty true condition. Remove unusable acquisition branches without removing unrelated provider entities. Preserve probability mass and process behavior without publishing removed identities. If that cannot be proved for an affected model, fail publication rather than renormalizing and claiming an exact chance.

The removal set is monotonic across semantic anonymization and closure recomputation. Preserve anonymous ordered competitors, multiplicity, duplicate groups, caps, quality filters and scaling in finite loot processes. Preserve withheld required operands without their identities. Anonymizing the final reference cannot resurrect a removed entity.

Hidden-crafting policy, manual exclusions, source reachability and geometry suppression continue to apply. Definitions can remain inspectable without becoming advertised sources.

### 9. Cut over the touched relation families completely

Migrate every consumer of the acquisition, usage, objective and NPC membership families in scope. Remove their replaced source/usage projections, duplicated virtual definitions, raw relationship-JSON reads and helper APIs. Keep no fallback path that gives the old answer when the new query is empty.

Unrelated effect-applier and domain queries remain their current implementation until their own planned change. This is a defined capability boundary, not a compatibility alias for a migrated family.

### 10. Preserve publication identity during schema changes

The existing content-hashed database transport already invalidates changed database bytes. Sitemap dates use explicit page-facing projections rather than storage layout. Preserve the historical database, source, export and published manifest as private verification inputs. A disposable private conversion carries a published date only when its old hash reconciles and old/new public semantics match. Complete that conversion before the first new prebuild.

Ship only manifest version 2 with `hash_scheme:"compendium-page-v2"` and one canonical projector. Production rejects old/mixed schemes instead of resetting dates or keeping an old reader. Remove IndexNow, its key/tests/deploy hooks and temporary-baseline ignore. Deployment becomes `pnpm build && wrangler deploy`. No bridge CLI, receipts, notification replacement or release orchestrator remains.

Hash the complete public value structurally. Frame scalar types, object keys and ordered array children unambiguously, then hash child digests rather than expanding repeated subtrees. Cache only immutable subvalue digests within one build. Copied and shared representations of the same value must agree. Sort unordered projections deterministically without serializing entire expanded item graphs as sort keys. The same implementation hashes both private historical and candidate semantic captures.

The expanded-JSON implementation processed 9.3 billion characters across the current sitemap and reached about 3 GB RSS. Eight page payloads individually exceeded the runtime's contiguous-string limit. Streaming those bytes avoids the exception but retains the unnecessary work. Structural hashing replaces that design before the first version-2 publication, without omitting public facts or shipping a compatibility mode.

## Page changes for review

This matrix is the requested approval boundary. It describes information and interactions, not a redesign. No project page changes while preparing these artifacts.

| Surface | Proposed visible change | Preserve |
| --- | --- | --- |
| Item detail and source summaries | Consistent method rows with quantities, event-labeled chances, purchase gates, grouped transformation/service costs and real delivery. Add omitted verified starter/cap-XP paths. Show one per-opening outcome for repeated chest entries. | Item identity, artwork, current correct prose, contents for known but sourceless definitions, and honest no-known-source states. |
| Item used-for sections | Identify objective progress, inventory/equipment/key conditions, consumption timing, complete merge/fragment groups, brew objectives and accurate augment affinity. | Existing zero-amount omission and clear Have/Deliver/Equip distinctions. |
| Obtainability trees and recipe detail | Retain all methods and their ingredients, output sizes, whole batches, learning conditions and exact stations. Make cyclic/unexpanded branches inspectable. | Current routes and ingredient links. Do not present all alternative ingredients as one required bundle. |
| Recipe overview | Use qualified method identity and complete ingredient groups, with real recipe type/provider membership. | Current overview structure and links. No new station route family. |
| NPC detail and popups | Offer-specific gates, true pack yields and supported service/batch costs from the shared relation. NPC skills use actual memberships. | Services and classifications, unrelated combat summaries, and the distinction between ordinary UI access and server enforcement. |
| Monster detail and popups | Correct placement-conditioned loot/fragment sources and shared probability events. | Existing theoretical boss math, immunity copy, corpse timing and guard-group explanations. |
| Gather/chest detail and popups | Shared attempt conditions, outer success, primary/secondary quantities, key/lockpick alternatives and passive extra units. | Existing exact rules and units. Do not call every secondary roll an unconditional per-click chance. |
| Quest detail, overview and popups | One objective projection with predecessor alternatives, phases, roles and item scopes. | Existing reward text, daily queue/cooldown distinction and current correct quest copy. |
| Portal/key uses and popups | Preserve a use whose destination is withheld. Explain own-key/party-key and current-instance conditions without claiming historical kills unlock it. | Redaction and existing navigation. No invented destination. |
| Class equipment and profession pages | Reuse source, ingredient and requirement data. Existing tool/skill qualifiers use shared evaluation with their explicit inputs. | Class layouts, profession calculators and readable Mining/Slayer/Radiant Seeker presentation. No general profession redesign. |
| Skill detail and mechanics | Correct NPC-derived caster contexts and retain real per-rank learning inputs. | Existing skill identities, detailed mechanics and current correct summaries. No new effect entity or reference catalogue. |
| Map item popup, selection and bounds | Add pack, portable-chest and virtual-pool inspection plus supported nonspatial methods through the shared reader. Use only eligible direct provider geometry. | Selection URLs, search ranking, markers, camera behavior, and no focus action for a virtual method alone. |
| Zone/item-overview filters | Attribute outcomes to their actual eligible providers and stations rather than all template placements or tables. | Existing zone information, filter controls and URLs. |
| Metadata, search and sitemap inputs | Derive touched source/usage descriptions and fingerprints from the canonical projection. | Useful search context, ranking, canonical titles and truthful date changes. No broad metadata rewrite. |

No new seasonal presentation is included. A renderer must not turn an internal distribution label into a claim that the player can carry or open that pool.

## Migration Plan

1. Confirm the page matrix and record field-by-field runtime evidence for new or changed published claims. Reuse valid prior evidence for unchanged rules. Coordinate the required simulator cases rather than substituting new theoretical output for game observation.
2. Preserve the historical database, source, export, manifest and reproduced old hashes as private comparison evidence. Implement the strict semantic manifest projector with the reader cutover. Reconcile dates once outside production and seed the new manifest before its first prebuild.
3. Extend only required exporter inputs, register them and perform fresh scratch-safe exports. Compare repeated configured output and explicit membership/placement records. Keep original and new sessions.
4. Build canonical methods, conditions, objective and NPC membership rows, reference declarations and shared rule/query assembly. Rebuild the database from the verified session rather than altering a published database in place.
5. Migrate all scoped readers and approved surfaces, including source-level sort hints, geometry, metadata, search and fingerprint callers. Remove obsolete code and storage in the same coherent cutover.
6. Exercise contract boundaries in both SQLite hosts, compare complete method/usage results, build the full site, review intentional differences and inspect approved surfaces at desktop and phone widths. Review redaction and sitemap dates before release. Verify deployment assets contain no retired notification key or client.

Rollback restores the prior code, database/images, runtime-session selection and publication manifest together through existing atomic publication mechanisms. No compatibility schema is shipped. The current character store is not migrated because this change does not introduce one.

## Verification

Runtime evidence precedes publication of changed game behavior. The implementation tasks cover fragment placements and event overrides, station/home memberships, vendor gates/prices, pack delivery, full-batch services, starter grants, cap-XP reward, tool/skill floors, quest scopes, portal sharing/current-instance state, key/lockpick consumption and passive extra quantities.

Permanent tests target wrong outcomes, not copied wiring or literal prose. Important cases include repeated Malachite input rows producing one outcome, branch-specific costs, a partial inventory that cannot prove absence, a three-item merge, prerequisite alternatives, a withheld portal destination, NPC-only skills, real skill curves, an ineligible placement of an otherwise eligible template, and source-free cycles. Synthetic alternatives/nonconstant curves are valid contract cases but not evidence that the current game configures them.

The final smoke runs the real shared reader and rule path. Browser checks cover the page matrix, source inspection and map focus at 1440px and 390px. New primitives are introduced only when an actual consumer in this change uses them. Retire temporary probes after recording their conclusions.

### Implementation checkpoint

IndexNow removal is committed separately. Pipeline behavior coverage passes 591 tests and 98 subtests. Python, Svelte, dead-code, documentation and citation checks passed before the latest consumer integration edits. Native exporter tests pass all 108 cases, including authored boundary regressions.

The full website suite passes all 99 files and 763 tests in 37.15 seconds, without increasing timeouts. Equivalent all/any requirement operands are structurally sorted. The authored-monster regression retains every forward/reverse target assertion through the existing batched reader and exercises a real item popup per method, rather than repeating the complete item-popup path for every outcome. A separate smoke still executes the original monster and all 31 individual item popups. All 32 complete output digests match their preserved values, covering 4,627 SQL calls and 660,248 returned rows. A four-worker experiment was slower and is not retained. Both-host parity and end-to-end website acceptance remain open.

Housing catalog verification completed through native purchase and placement of an ordinary table and an Alchemy Workbench. The placed workstation's complete offers match the referenced prefab. Both task-owned structures were removed and house ownership restored.

The first two configured sessions are rejected as publication inputs because their early snapshots assigned every monster placement and portal endpoint to Vault of the Vanished. The authored-boundary correction now has two complete scratch-safe exports. All 3,833 artifacts in each passed manifest size/hash validation, and all 33 nonvisual JSON artifacts are byte-identical across the fresh processes. Independent native geometry comparison agrees on exact published zone/subzone attribution for all 6,393 exported provider points and 329 boundary samples. The earlier failed raw-distance diagnostic remains separate and is not asserted as passing. Forty-five NPC composites differ between sessions, along with their visual registry records. Their cause is not established. This renderer variation is recorded separately from stable configured acquisition facts and remains artwork work. The original save and backup remain byte-identical, sidecars remain absent, the prior scratch directory and tutorial preference are restored, and the owned game has quit. The final database rebuild, parity, date reconciliation, integrated builds and browser acceptance remain pending.

Native loot verification passed matching dungeon, Northern Wastes mummy and low-multiplier controls through actual monster initialization and generated corpses. Boss/elite classification and replayed event fields are recorded separately from loot-generation claims. The native portal gate and full fade/travel path pass all six sharing and exact-monster-state controls. Accepted cases reach the controlled destination and clear the fade. Its fixture uses an inactive in-process party member, not a second network client, and temporary actor survival stats. Actor state, buffs, portal fields and owned objects are restored. Cooking passes through normal station interaction, recipe selection and the default Baking cast. At 9% raw chance, below the attempt floor, materials remain. At 10%, attempts consume materials, food can fail and the non-food result succeeds. Native brewing increments the quest counter, while prior potion ownership does not. Completion acknowledgement precedes clearing quests. All five current secondary-item quests pass 12 absent, inventory and equipped-crown cases through active authored providers and unchanged offers. Positive secondary items are consumed from inventory or equipment. The two zero-amount entries require and consume nothing.

Runtime probes distinguish configured cases from modified-definition controls. Synthetic positive-five quest requirements exposed an equipment-consumption exception. They do not establish a player-reachable defect in a current configured quest. Unsuccessful probe setup and unverified outcomes do not count as passed acceptance.

## Risks / Trade-offs

- Lossless methods require more structure than flat source rows. Typed details and bounded shared queries avoid an arbitrary graph framework or a wide nullable record.
- Some runtime fields are mutable or unavailable in existing exports. Capture explicit stable references, declare event rules separately and fail instead of guessing.
- Eligibility can be unknown while a baseline chance is known. Keep the two results and their assumptions separate, without new personal-status badges on static pages.
- Scene identity and event scope are easy to confuse with template identity. Verify cross-placement and current-instance cases before claiming availability.
- Redaction can weaken a condition or alter a roll pool if treated as row deletion alone. Preserve nonidentifying semantics and test public outcomes, or stop publication.
- Storage changes can churn sitemap dates. Reconcile dates privately using old-hash and semantic equality, then retain only one production format and projector.
- This change overlaps profession data and later read models. Acquisition owns exact memberships and migrated relation readers. Unrelated layout and domain work remains with its own proposal.

## Planning evidence

The current source/graph readers were executed on Primal Essence, Alchemy Workbench, Chest of Cleric, Diamond and Blessed Rune. SQL independently confirmed the NPC comparison defect, a key use with a NULL destination and a cross-zone fragment association. The existing Malachite page was inspected in a real browser, confirming duplicate bag-source percentages. No new game session, save inspection, production-code edit or site-data mutation occurred during proposal preparation.

A local working README records the research question, report ownership and retention rule. No product README additions are planned for this proposal. Implementation updates the architecture's relation/query invariants, not a second field inventory in documentation.
