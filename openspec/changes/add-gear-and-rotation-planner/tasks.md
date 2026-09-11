# Tasks: add gear and rotation planner

Order follows dependency. Historical harness experiments inform formulas; the complete harness run
qualifies production parity only after integration. Checked tasks record local components or named
experiments, not a release-ready evaluator. Reopened tasks retain existing useful work and state the
remaining acceptance criteria. Each requirement maps to implementation and observable verification.
The prior simulator is removed only after the replacement passes runtime and release gates.

## 1. Verification prerequisites

- [ ] 1.1 Complete the reopened harness ownership, full-roster, and per-fixture session lifecycle
      acceptance. Retain prior selection and lifecycle experiments as component evidence. Verify the
      complete safety reports, not a descriptor-validation success, are linked before dependent
      matrix execution.
- [x] 1.2 Complete harness task 7.8 for debuff landing across defense, accuracy, and level difference, then record the fitted terms and bounds.
- [x] 1.3 Complete harness task 7.9 for effective debuff uptime, then record whether duration times landing probability is valid.
- [ ] 1.4 Complete harness evidence for category replacement on one recipient, including two distinct
      sources targeting the same recipient. Retain the existing same-recipient and different-recipient
      experiments as component evidence only; they do not prove shared-target behavior or roster
      separability.
- [x] 1.5 Add and run a harness experiment for integer-schedule gaps at cooldowns of 45 seconds and above, then set the rotation policy from the result.
- [x] 1.6 Add and run a harness experiment that compares Rogue and Warrior resource behavior, then set their separate model policies.
- [x] 1.7 Add and run companion-output experiments by archetype, range style, initial distance, target movement, haste, and cooldown reduction.
- [ ] 1.8 Qualify prerequisite evidence with actual assembly identity, fixture content, sampling
      details, and persisted report references. Retain historical observations with their recorded
      scope; verify incompletely identified experiments cannot substitute for current full-run
      acceptance.
## 2. Runtime data foundations

- [x] 2.1 Add a `DataExporter` model and exporter for every player-class slot, accepted item category, and mercenary prefab slot. Keep class and race compatibility in curated metadata and its character-creator check.
- [x] 2.2 Register the slot exporter explicitly and add tests that cover Shield for Warrior, Cleric, Wizard, and Druid; Bow for Ranger; and Weapon for Rogue.
- [x] 2.3 Run a real game export, compare the offhand values with the live reading in `design.md`, and record the export artifact and game build.
- [x] 2.4 Load the slot table through the ordered pipeline schema, loader, and required-registration assertion, keeping raw exports out of version control.
- [x] 2.5 Export or derive class and race progression curves, level and veteran budgets, skill trees, mercenary archetypes, consumables, and ammunition inputs.
- [x] 2.6 Add pipeline tests that fail when any required progression, slot, skill, consumable, ammunition, or effect-classification input is absent.

## 3. Serialized contracts and planner payload

- [ ] 3.1 Define shared logical build data and checked C# and TypeScript adapters, distinct from the
      version-only BuildEnvelope. Include stable learned-book asset IDs (`learnedBookIds`) with
      complete-empty versus missing/unread state, and distinguish raw observed attributes,
      base/class-race progression, allocated points, and derived totals. Keep fixture execution and
      capture completeness/container metadata separate. Verify a fixture and capture round-trip build
      contents and reach the same production evaluation path without silent defaults; reject unknown or
      duplicate book identities and keep catalog gains out of authored build records.
      Keep this end-to-end gate open until tasks 3.11 through 3.15 pass.
- [x] 3.2 Define the evaluation-scenario record for target, horizon, initial resources and cooldowns, buffs, consumables, ammunition, incoming events, roster, and target count.
- [x] 3.3 Define explicit refusal policies for unknown schemas, unsupported target counts, incompatible game data, stale model markers, and incomplete captures.
- [x] 3.4 Add one owned build-pipeline writer for the deterministic planner payload path, stale-output deletion, required-output assertion, and deterministic serialization.
- [x] 3.5 Emit equipment, progression, skills, mercenary archetypes, consumables, ammunition, and effect classifications into the planner payload.
- [x] 3.6 Register one content-hashed browser import and extend redaction verification to the raw and compressed planner payload.
- [x] 3.7 Add reproducibility tests for stable raw bytes, compressed bytes, content hash, stale-output deletion, and missing-output failure.
- [x] 3.8 Compare every emitted effect kind with modelled, excluded, and unsupported registries; fail publication for an unclassified admitted kind.
- [x] 3.9 Measure and record the raw and compressed payload baseline for the non-book domains then present; do not treat it as book-inclusive.
- [x] 3.10 Publish required learned-book definitions/effect classifications with preflight/publication checks and refreshed payload measurement.

Task 3.1 is the acceptance gate for tasks 3.11 through 3.15, not a prerequisite for starting them.
Complete the schema in 3.11 before migration, catalog resolution, and capture production.
Task 3.14 brings the required capture work from section 10 before adapter parity acceptance.
Schema and serialization checks can precede runtime qualification; they do not complete task 3.1.

- [x] 3.11 Define the complete versioned logical-build schema and its checked C# and TypeScript boundaries.
      Use stable asset IDs for skills, items, augments, and learned books. Retain displayed names only as context.
      Include progression, allocations, equipment instance state, companion rolls/equipment, and consumable and ammunition identities with quantities.
      Distinguish raw observed attributes, base/class-race progression, allocated points, and derived totals.
      Keep fixture execution and capture completeness, containers, integrity, and producer metadata outside logical build data.
      Preserve complete-empty versus missing/unread state and keep book gain definitions catalog-owned.
      Verify serialization preserves these distinctions and rejects unknown schemas or failed capture integrity.
- [x] 3.12 Migrate every existing producer and consumer to the schema from 3.11 in one versioned cutover.
      Update the fixture corpus, C# validation/materialization, TypeScript parsing, and affected tests and documentation.
      Migrate existing capture contracts and use the same schema for the capture producer in 3.14.
      Remove obsolete fields and compatibility shims. Do not maintain a second logical-build contract.
      Verify field-specific refusal of missing required inputs before mutation or evaluation.
      Verify declared empty sections cannot silently preserve previous runtime state.
- [ ] 3.13 Implement catalog-to-evaluator resolution through the shared contract from 3.11.
      Resolve build identities and declared state through the versioned catalog.
      Include class/race progression, allocations, learned books, equipment/augments, skills/passives, companion inputs, consumables, and ammunition.
      Reuse production stat and combat formulas. Do not copy formulas into adapters.
      Keep measured totals as observations, never prediction inputs or substitutes for missing base state.
      Reject unknown or duplicate book IDs, unresolved required identities, missing definitions, and unsupported admitted effects.
      Verify catalog-derived inputs reach the production evaluator without manually assembled stats/actions or silent defaults.
      Verify learned-book gains apply once without consuming allocation budgets.
- [ ] 3.14 Implement complete read-only capture production against the schema from 3.11.
      Complete the shared capture core and required build reads in tasks 10.1 through 10.5 and 10.10.
      Use the local-file transport in 10.7 and retain the deployment and runtime evidence required by 10.9.
      Preserve raw/base/allocated/derived meanings, skill allocations, instance state, companion state, quantities, and learned identities.
      Verify observed-empty sections remain distinct from absent or unread sections.
      Verify partial captures remain inspectable while missing required state blocks dependent evaluation.
      Record independent runtime proof that capture changes neither gameplay state nor meter state.
- [ ] 3.15 Prove fixture/capture parity through the migrated adapters and catalog resolver.
      Round-trip equivalent authored fixture and runtime-produced capture builds while preserving their distinct outer metadata.
      Supply the same complete scenario and verify both reach the same production evaluator with matching predictions and evaluation identities.
      Verify unknown schemas, corrupt containers, missing required sections, and unknown or duplicate book IDs refuse dependent evaluation.
      Retain task 7.1's explicit-schedule integration and tasks 4.4 and 6.14's dynamic timeline as prerequisites to full combat comparison.
      Do not replace a requested fixture schedule with a solved rotation.
      Keep maintained-effect, autonomous-companion, and persisted running-game comparison acceptance in task 7.9. Adapter parity alone does not qualify those gates.

## 4. Numeric kernel and evaluation scenario

- [x] 4.1 Extract shared `f32`, `iround`, ceiling, floor, clamp, and expectation-substitution primitives from the existing source-cited stat module.
- [x] 4.2 Add boundary tests that fail when an intermediate round, clamp, or float narrowing moves from its engine position.
- [x] 4.3 Implement the versioned scenario parser and reject missing fields, unsupported target counts, and incompatible version tuples.
- [ ] 4.4 Integrate timed resources, cooldowns, buffs, consumables, ammunition, and incoming damage
      into the production event timeline. Preserve existing scenario helpers. Verify current state
      changes the next dependent action instead of evaluating every action from initial state.
- [x] 4.5 Add scenario tests for the default stationary dummy, empty incoming events, supplied incoming events, ammunition exhaustion, and unsupported durability loss.

- [ ] 4.6 Prove deterministic expectation assumptions at integer rounding, resource affordability,
      and health thresholds with small exact reference cases. Verify any mean-substitution
      approximation is named and limited to independently validated domains; deterministic output
      alone is not proof of exact expectation.

## 5. Target, caster, and hit evaluation

- [x] 5.1 Extend the source-cited monster stat module with defense, magic resist, and four elemental resist curves plus spawn values.
- [x] 5.2 Implement target avoidance, mitigation, debuff landing, mitigation ceilings, and explicit target parameters using the measured harness results.
- [x] 5.3 Add target tests for level difference, all resist schools, defense saturation, debuff floors and ceilings, and stale denormalized fields.
- [x] 5.4 Build the caster stat sheet for attack power, spell power, passive damage, resource capacities, four clamps, armour thresholds, and integer boundaries.
- [ ] 5.5 Complete live stat-sheet comparisons for every admitted caster-state term. Preserve existing
      local comparisons and boundary tests. Verify current fixture evidence covers progression,
      equipment, passives, sets, caps, and consumables without substituting measured totals as inputs.
- [x] 5.6 Implement one ordered hit pipeline with separate handlers for each damaging skill class, avoidance, mitigation, criticals, and post-hit effects.
- [x] 5.7 Implement resource-burn damage, weapon-category gates, archetype-specific offhands, wielder-specific offhand damage, and engine skill refusals.
- [x] 5.8 Add per-skill-class tests, including the populated fields the engine ignores, and cover normal, poison, fire, cold, magic, and disease damage.
- [x] 5.9 Add hit tests for resource-burn bypass, assassination health gate, slot 13 category selection, offhand wielders, and known game defects.
- [x] 5.10 Model catalog-resolved learned-book gains without budget consumption or double counting.

## 6. Timing, effects, resources, and companions

- [x] 6.1 Implement weapon interval, cast time, skill cooldown, skill refractory, follow-up delay, haste, spell haste, and measured long-cooldown policy.
- [x] 6.2 Implement the resource engine for regeneration, damage return, costs, maximum-resource burn, and distinct Rogue and Warrior policies.
- [x] 6.3 Implement source-cited steady-state refresh and cooldown-reduction helpers with local
      behavior checks. Finite-window integration and evidence-qualified bounds remain subject to
      tasks 6.14 and 7.4 through 7.6.
- [x] 6.4 Implement the previously measured category replacement and different-recipient isolation
      behavior as component logic; this task does not close the shared-recipient requirement.
- [x] 6.5 Implement declared consumables, ammunition consumption, and the default scenario's no-durability-loss policy.
- [x] 6.6 Implement normal and veteran skill budget, tier, prerequisite, level, weapon, assassination, and other engine precondition gates.
- [x] 6.7 Implement player rotation solving with explicit skill inclusion and exclusion and no free-form action-priority language.
- [x] 6.8 Implement mercenary state, equipment, autonomous action expectation, two-gate cadence, movement policy, and healer reserve.
- [x] 6.9 Add timing tests for haste, spell haste, flat refractory, reduced cooldown, follow-up attacks, and long-cooldown integer schedules.
- [x] 6.10 Add resource tests for mana, energy, Rogue Fury, Warrior behavior, damage return, burn skills, and the inert mercenary energy multiplier defect.
- [x] 6.11 Add component effect tests for proc refresh, cooldown reduction, consumables, ammunition,
      category replacement, different-recipient isolation, and excluded durability loss. Shared-target
      replacement remains open under tasks 6.17 and 7.12.
- [x] 6.12 Add skill-legality and rotation tests for every gate and for deliberate omission of an available skill.
- [x] 6.13 Add companion tests for each archetype, melee and ranged behavior, movement state, cadence bound, healer reserve, and equipment contribution.

- [ ] 6.14 Re-evaluate resource-burn intent, assassination gates, target defenses, effects, and
      cooldown changes at their relevant timeline events. Verify a game-backed transition spike
      covers depletion/recovery, incoming damage, maintained refresh/expiry, and target-health
      crossing.
- [ ] 6.15 Integrate companion autonomous selection, current achieved state, movement-qualified
      behavior, and healer reserve into the production result. Verify each supported archetype
      against declared repeated-window evidence rather than applying a scripted player rotation.
- [ ] 6.16 Implement explicit raw and evidenced known-defect-normalized evaluation modes in the same
      production engine. Verify affected quantities and evidence references are retained, raw game
      behavior is preserved, and recommendations cannot gain from a defect-only advantage.
- [ ] 6.17 Implement effect source and recipient IDs and resolve category exclusivity in each
      recipient's `Skills` list. Preserve independent per-entity stat aggregation, allow different
      recipients to retain same-category effects, and replace the older effect when two sources target
      one recipient. Add source/recipient attribution to replacement and expiry events.

## 7. Model verification and calibration

- [ ] 7.1 Connect shared fixture and capture adapters to the production evaluator. Use one
      event/state engine for explicit harness sequences and solved planner sequences without
      replacing the requested schedule. Verify a complete fixture produces per-quantity predictions
      with model/evaluator/data identity, action counts, and declared boundaries.
- [x] 7.2 Run source-only fixtures for rounding, stat aggregation, hit order, target terms, resource transitions, timing gates, and effect classifications.
- [ ] 7.3 Complete the harness model-comparison and reviewed baseline gates after dynamic production
      evaluation is integrated. Verify materialization/readback, required behavioral coverage, live
      observations, statistical acceptance, persisted provenance, and isolation all pass;
      validation-only or incomplete runs cannot qualify.
- [ ] 7.4 Compare predicted and measured quantities across supported player classes, damage schools,
      weapon branches, resource engines, maintained effects, and mercenary archetypes. Verify
      execution reaches each claimed behavior with requested/achieved-state agreement and
      independently sourced target inputs.
- [ ] 7.5 Report model accuracy, finite-run variation, and search quality with separate evidence
      scopes. Keep raw and known-defect-normalized results distinct and identify every
      transformation. Verify a normalized match cannot alter raw parity and an unknown domain
      carries no invented numeric boundary.
- [ ] 7.6 Define a current calibration corpus and independent validation set before fitting a scoped
      prediction boundary. Use the harness statistical protocol with sufficient samples and full
      provenance. Verify held-out validation and out-of-domain refusal; an in-sample maximum
      residual cannot establish a global accuracy claim.
- [x] 7.7 Retain existing source-only regression fixtures for corrected formulas and classified
      effects. These defend local behavior; they do not qualify production integration, a
      statistical protocol, or a running-game baseline.
- [ ] 7.8 Update the game-version procedure to invoke complete qualified model comparison and
      reviewed baseline handling. Verify mismatch evidence is retained before explicit promotion and
      descriptor validation cannot satisfy the release gate.
- [ ] 7.9 Run the shared-contract vertical-slice spike with C# fixture and capture inputs through
      production evaluation and persisted harness comparison. Include a maintained effect and
      autonomous companion. Verify failed readback or missing evidence prevents full verification
      without substituting measured caster totals as predictions.
- [ ] 7.10 Run a same-input raw/normalized defect spike and an independent calibration spike under a
      predeclared protocol. Verify mode separation, failed-baseline rejection, nonlinear
      approximation scope, and out-of-domain unverified status; retain complete report identities.
- [ ] 7.11 Qualify book-aware stat/damage parity with complete, independently sourced inputs and current catalog identities. For captured inputs, link runtime qualification of the read-only capture producer.
- [ ] 7.12 Run a shared-target effect experiment with two sources and one recipient, then repeat with
      different recipients as the control. Verify newest-wins replacement by recipient `Skills` list,
      source/recipient IDs in the event report, and the limit of the different-recipient evidence.
      Verify the result does not authorize independent full-roster scoring.

## 8. Build optimizer

- [ ] 8.1 Enumerate class, race, main-hand, offhand, two-handed, ammunition, and other discrete legality branches before local search.
- [ ] 8.2 Implement deterministic multi-start block coordinate ascent with a recorded seed, start count, convergence rule, and fixed-point spread.
- [ ] 8.3 Optimize equipment, attributes, normal skills, and veteran skills against one explicit
      scenario, result mode, and model/evaluator/data identity. Verify scores are recomputed across
      any incompatible boundary and recommendations do not value defect exploitation.
- [ ] 8.4 Enforce level, class, race, slot, weapon, point-budget, tier, prerequisite, consumable, ammunition, and scenario constraints.
- [ ] 8.5 Solve weapon choice and rotation jointly and re-solve the rotation after every weapon-branch change.
- [ ] 8.6 Solve category-exclusive effects per recipient `Skills` list, retain source and recipient IDs,
      and allow an action to be omitted when it would replace that recipient's stronger effect.
- [ ] 8.7 Optimize the player and each active mercenary, capture pets for accounting only, and label every entity included in the total.
- [ ] 8.8 Compare the heuristic with the exact reference search on a bounded current objective
      corpus. Record objective gap, fixed-point spread, missed branches, and benchmark scope
      separately. Verify no search observation is presented as combat-model accuracy.
- [ ] 8.9 Measure any surrogate against the display objective and justify the number of candidates carried forward; reject rank correlation alone.
- [ ] 8.10 Enforce owned-item quantities across slots and entities. Full-catalog searches MAY remove
      item-assignment constraints and reuse per-entity stat aggregation, but roster scoring remains
      joint unless the scenario records a proven encounter-separability condition.
- [ ] 8.11 Report search-gap evidence as missed-optimum distance to a reference search for the stated
      benchmark domain. Preserve deterministic model score order; do not group candidates or derive
      pairwise equivalence from the gap. If product requirements add practical alternatives, record a
      separately named product tolerance and its independent evidence.
- [ ] 8.12 Add optimizer tests for every branch, constraint, interaction, unsupported effect, owned-item conflict, and scenario-version change.
- [ ] 8.13 Report wasted stat allocation and the cap or threshold that caused it.
- [ ] 8.14 Verify the explanation against a candidate with each capped stat and each thresholded set bonus.
- [ ] 8.15 Hold declared learned-book progression fixed in optimization; do not silently grant books.
- [ ] 8.16 Verify a full-catalog roster search against shared target health, mitigation, recipient
      effects, and autonomous companion actions. Permit separate entity scoring only when the scenario
      contains a documented encounter-separability proof; otherwise retain joint scoring and per-entity
      stat attribution.

## 9. Planner page and worker

- [ ] 9.1 Add the planner route with a server load that returns the default versioned build, scenario, and result.
- [ ] 9.2 Render the default build, target, scenario, total, uncertainty components, and explanation in prerendered HTML with a working no-JavaScript path.
- [ ] 9.3 Add controls for class, race, level, veteran points, equipment, attributes, normal and veteran skills, consumables, ammunition, and active mercenaries.
- [ ] 9.4 Add owned-catalog selection, target selection, scenario controls, and automatic-rotation skill inclusion and exclusion.
- [ ] 9.5 Add a dedicated optimizer worker and client with correlated start, progress, result, cancel, cancelled, error, and termination states.
- [ ] 9.6 Discard stale messages and unknown request identifiers, clean up worker errors, and preserve the last complete result after cancellation.
- [ ] 9.7 Add a planner-specific versioned link encoder that preserves the build and scenario, omits defaults, and refuses unknown schema fields.
- [ ] 9.8 Add a sitemap entry as an explicit bare URL and verify restored links across supported model and game-data version combinations.
- [ ] 9.9 Add result breakdowns for per-entity, per-ability, stat, buff uptime, consumable, ammunition, and scenario contributions.
- [ ] 9.10 Show target limitations, unsupported effects, version compatibility, result mode, and
      separate model/finite-run/search evidence beside the result. Verify unverified domains have no
      numeric accuracy claim and normalized recommendations do not hide raw comparison failures.
- [ ] 9.11 Add browser interaction checks for manual build editing, target and scenario changes, progress, cancellation, permalink restore, and no-JavaScript content.
- [ ] 9.12 Add explicit hypothetical learned-book controls and preserve declarations in links and sharing without mutating the source capture or live character.

## 10. Character capture mod

- [ ] 10.1 Create the distributable mod project and shared capture core for versioned build data
      with separate capture metadata. Verify exported data is consumable through the checked
      production adapter without requiring the capture producer to generate harness reports or
      predict evaluator output.
- [ ] 10.2 Capture player progression, raw attributes and allocations with explicit meaning,
      per-pool skill levels, equipment, inventory/storage, stable item identities, quantities,
      containers, augments, durability, consumables, and ammunition. Verify readback preserves each
      required build input without converting unread fields to empty values.
- [ ] 10.3 Capture active mercenary and pet state with completeness and explicit exclusions.
      Distinguish companion live rolls/combat state from saved hire values; pets remain
      accounting-only. Verify dependent evaluation stops for missing required state while a partial
      capture can still be inspected.
- [ ] 10.4 Implement read-only character and meter capture paths that refuse missing runtime objects and cannot mutate gameplay or meter state.
- [ ] 10.5 Add game-free core tests and game-backed checks for schema rejection, completeness, containers, duplicate items, missing runtime state, and mutation absence.
- [ ] 10.6 Add separate typed commands for read-only meter capture and explicit mutating meter reset, with reset prohibited as a capture side effect.
- [ ] 10.7 Write one local JSON file, report its exact path, and register the same file as an optional HotRepl automation artifact.
- [ ] 10.8 Add the mod to the solution, build tool, package output, and player-facing download registry.
- [ ] 10.9 Build and deploy the mod, invoke it in a loaded game, inspect the file, and confirm the player's build and game state before and after capture.
- [ ] 10.10 Capture actual learned-book state read-only, using stable IDs and completeness, without inferring learning from inventory ownership or invoking learning/reset/mutation paths; record independent runtime proof of the read-only behavior.

## 11. Import and measured comparison

- [ ] 11.1 Add a browser-local file picker and parser that never uploads capture contents.
- [ ] 11.2 Populate the editor from a compatible capture and preserve the current build after a rejected import.
- [ ] 11.3 Apply schema, capture integrity, model/evaluator, game-data, and game-build compatibility
      rules with field-specific errors. Verify supported captures reach the production evaluator,
      unknown schemas fail, and incomplete required sections block dependent calculations without
      preventing safe inspection.
- [ ] 11.4 Apply owned-item quantities and containers from the capture to the optimizer's shared-inventory constraint.
- [ ] 11.5 Compare the current or imported build with a selected candidate under one scenario and list every equipment, attribute, skill, consumable, and roster change.
- [ ] 11.6 Show per-change contributions only for compatible scenario, mode, and
      model/evaluator/data identities. Verify incompatible numeric comparison is refused and a
      normalized score is never compared as if it were raw game parity.
- [ ] 11.7 Compare captured meter totals and denominators with production predictions only when
      required build, target, sequence/state, and observation inputs are complete. Verify missing
      context remains diagnostic, units/windows and identities are recorded, and capture alone
      cannot qualify a verified harness baseline.
- [ ] 11.8 Add browser checks for valid import, every refusal policy, owned-copy conflicts, current-versus-candidate comparison, and meter comparison.
- [ ] 11.9 Preserve learned-book declarations during import and comparison. Refuse dependent comparisons for missing, unknown, or duplicate identities while retaining diagnostic inspection and leaving the source capture unchanged.

## 12. Performance and release gates

- [ ] 12.1 Benchmark representative and worst-case searches in the supported browser and record latency, peak worker memory, and first-progress latency.
- [ ] 12.2 Measure cancellation acknowledgement, main-thread responsiveness, and maximum permalink length for a maximum-size build.
- [ ] 12.3 Set release budgets from the recorded measurements and add regression checks for every budget.
- [ ] 12.4 Run model, optimizer, pipeline, capture-core, website, browser, and strict OpenSpec checks with the final payload and fixture corpus.
- [ ] 12.5 Run the real-game default-build comparison and one imported-player comparison through the
      production path. Verify matching inputs and identities, complete qualified harness evidence,
      separate raw/normalized outputs, and independently supported accuracy domains. Report search
      evidence separately from finite-run and model evidence.
- [ ] 12.6 Document the planner workflow, local-only capture privacy, version mismatch policy, unsupported-effect behavior, benchmark scenario, and known model limits.
- [ ] 12.7 Qualify release with the learned-book domain, including catalog completeness, redaction, refreshed payload measurement, book-aware parity, fixed progression, and independently recorded read-only capture evidence.

## 13. Retire the prior attempt

- [ ] 13.1 Inventory every route, sitemap entry, type, import, and shared helper owned only by the prior simulator after the replacement passes section 12.
- [ ] 13.2 Remove the prior simulator route and its simulator-specific types, helpers, tests, and sitemap entry without deleting shared formula code still in use.
- [ ] 13.3 Re-run website checks, sitemap generation, browser smoke checks, and dead-reference searches after removal.

## 14. Requirement coverage
Each requirement has an implementation task and a distinct verification task.

### `combat-model`
| Requirement | Implementation | Verification |
|---|---|---|
| State-dependent decisions follow the ordered event timeline | 4.4, 6.14 | 4.6, 7.9 |
| Verified claims require a complete qualified harness report | 7.1, 7.3, 7.5, 10.10 | 7.9, 7.10, 7.11, 12.5, 12.7 |
| Shared build data and checked adapters preserve provenance | 3.11-3.14, 10.1, 10.10, 11.3 | 3.1, 3.15, 7.9, 10.5, 11.8, 11.9 |
| Learned-book gains are catalog-owned and applied once | 3.10, 3.11, 3.13, 5.10 | 3.15, 7.11, 12.7 |
| Every formula traces to decompiled source | 3.10, 4.1, 5.1, 5.2, 5.4, 5.6, 5.10, 6.1-6.8 | 7.2, 7.11, 12.4 |
| Evaluation is deterministic without overstating stochastic exactness | 4.1, 5.10, 7.1 | 4.6, 7.2, 7.10, 7.11 |
| Accuracy claims are scoped and independently validated | 7.5, 7.6 | 7.10, 7.11, 12.5, 12.7 |
| Resource generation and spending follow the event state | 4.4, 5.10, 6.2, 6.14 | 4.5, 6.10, 7.9, 7.11 |
| Buff timing distinguishes finite windows from steady state | 6.3-6.5, 6.14 | 6.11, 7.4, 7.9 |
| A buff category holds at most one effect per recipient | 6.4, 6.17 | 1.4, 6.11, 7.12 |
| The refractory a skill sets is selected by the skill's own fields | 6.1 | 6.9 |
| One hit is derived in the engine's own order | 5.6 | 5.8, 5.9 |
| A prediction is derived from the target's own state | 5.1, 5.2 | 5.3, 7.4 |
| Target avoidance and mitigation are reducible, and reduction is not certain | 5.2 | 1.2, 1.3, 5.3 |
| Skill levels respect the allocation budget | 5.10, 6.6 | 6.12, 7.11 |
| Each damaging skill class is evaluated by its own rule | 5.6 | 5.8 |
| Resource-burn damage bypasses avoidance and mitigation | 5.7 | 5.9 |
| A skill that requires a weapon category is gated on it | 5.7, 6.6 | 5.9, 6.12 |
| A declared consumable set is part of the build | 4.4, 6.5 | 4.5, 6.11 |
| A controlled companion is evaluated by the same pipeline | 6.8, 6.15, 6.16 | 6.13, 7.4, 7.9 |
| The offhand slot differs by archetype | 2.1, 5.7 | 2.2, 2.3, 5.9 |
| An offhand item contributes damage by wielder and class | 5.7 | 5.9 |
| A companion's special-action cadence is bound by two gates, and weapon delay is not one of them | 1.7, 6.8 | 6.13, 7.4 |
| A skill the engine would refuse is not scheduled | 6.6, 6.7, 6.14 | 6.12, 7.9 |
| Spell haste is distinct from haste | 6.1 | 6.9 |
| Known-defect normalization is separate from raw parity | 6.16, 7.5 | 7.10, 12.5 |
| A resource multiplier is applied only where the game applies it | 5.4, 6.2 | 5.5, 6.10 |
| A target stat is derived from its curve and its spawn, not from a denormalised scalar | 5.1 | 5.3 |
| Integer rounding follows the engine | 4.1, 5.6 | 4.2, 5.8 |
| Published values require per-quantity production parity evidence | 5.10, 7.1, 7.3, 7.4 | 7.9, 7.11, 12.5, 12.7 |
| The target is an explicit parameter set | 3.2, 4.3 | 4.5, 5.3 |
| Every evaluation names a complete scenario | 3.2, 4.3, 4.4, 7.1 | 4.5, 7.9, 9.11 |
| Equipment and skill effects are exhaustively classified | 3.8, 3.10, 5.6, 5.10, 6.3-6.6 | 2.6, 6.11, 7.2, 7.11, 12.7 |
| Refresh procs and cooldown changes follow event state | 6.3, 6.14 | 6.11, 7.4, 7.9 |
| Ammunition and durability have explicit policies | 4.4, 6.5 | 4.5, 6.11 |
| Incoming damage is an event-stream input | 3.2, 4.4, 6.2 | 4.5, 6.10 |
| Accuracy, finite-run variation, and search gap remain separate | 7.5, 7.6, 8.11 | 7.10, 9.11, 12.5 |

### `build-optimizer`
| Requirement | Implementation | Verification |
|---|---|---|
| The evaluation is deterministic without claiming false exactness | 4.6, 7.1 | 7.2, 7.10 |
| Consumables and ammunition are part of the coupled search | 6.5, 8.3, 8.4 | 6.11, 8.12 |
| Dynamic state drives displayed evaluation | 4.4, 6.14 | 4.5, 7.9 |
| Recommendations prefer intended behaviour | 6.16, 8.3 | 7.10, 8.12 |
| Captured builds pass checked adapters and completeness gates | 3.11-3.14, 10.10, 11.3 | 3.1, 3.15, 10.5, 11.8, 11.9 |
| The search states search quality separately from prediction accuracy | 8.8, 8.11 | 8.12 |
| Discrete branches are enumerated, not searched locally | 8.1 | 8.8, 8.12 |
| The local search uses multiple independent starts | 8.2 | 8.8, 8.12 |
| The search covers equipment, attributes, and skill allocation | 8.3, 8.4 | 8.12 |
| Declared learned-book progression is fixed | 3.1, 8.15 | 7.11, 8.12, 12.7 |
| The player and active mercenaries are optimized | 8.7 | 6.13, 8.12 |
| Categorised effects are solved within each recipient's `Skills` list | 6.17, 8.6 | 1.4, 6.11, 7.12, 8.12 |
| Full-catalog roster scoring requires encounter separability evidence | 8.10, 8.16 | 7.12, 8.12 |
| Owned-gear planning treats inventory as shared | 8.10, 11.4 | 8.12, 11.8 |
| Weapon choice and rotation are solved together | 8.5 | 8.12 |
| Ranking uses a surrogate whose fidelity is measured | 8.9 | 8.12 |
| Wasted stat allocation is reported | 8.13 | 8.14 |
| The optimization objective is bound to one evaluation identity | 8.3 | 8.12 |
| Unsupported effects cannot win a ranking | 3.8, 3.10, 8.12 | 7.2, 9.11, 11.9 |
| Search-gap evidence reports missed-optimum distance, not ranking equivalence | 8.8, 8.11 | 8.12 |

### `gear-planner`
| Requirement | Implementation | Verification |
|---|---|---|
| Recommendations use intended behaviour | 6.16, 9.10 | 7.10, 9.11 |
| Core facts render without JavaScript | 9.1, 9.2 | 9.11 |
| The default target is the endgame training dummy | 9.1, 9.2 | 9.11, 12.5 |
| The target is selectable and the result is per-target | 9.4, 9.9 | 9.11 |
| A target that cannot exercise a modelled mechanic says so | 9.10 | 9.11 |
| A build is shareable by link | 9.7, 9.8, 9.12 | 9.11 |
| Learned-book declarations are explicit and shareable | 9.12 | 9.11, 11.9, 12.7 |
| Prediction accuracy, finite-run variance, and search gap remain separate | 9.10 | 9.11, 12.5 |
| The result explains itself | 9.9, 9.10 | 9.11 |
| Compute does not block the interface | 9.5, 9.6 | 9.11, 12.1-12.3 |
| A reader can author a complete build | 9.3, 9.4, 9.12 | 9.11 |
| A reader can import a local character capture | 10.10, 11.1-11.4 | 11.8, 11.9 |
| Current and candidate builds are comparable | 11.5, 11.6 | 11.8, 11.9 |
| Unsupported effects block a best-build claim | 3.8, 3.10, 9.10 | 7.2, 9.11, 11.9 |
| Planner performance is measured and gated | 12.1-12.3 | 12.4 |
| Serialized, capture, evaluator, model, and data versions remain distinct | 3.1, 3.3, 9.7, 9.12 | 9.8, 11.3, 11.8, 11.9 |

### `character-state-export`
| Requirement | Implementation | Verification |
|---|---|---|
| Logical build data is separate from capture metadata | 3.11, 3.12, 3.14, 10.1, 10.2, 10.10 | 3.1, 3.15, 7.9, 10.5, 11.9 |
| Learned-book state uses stable identities | 3.1, 10.10 | 7.11, 10.5, 11.9 |
| The export is read-only | 10.4, 10.10 | 10.5, 10.9, 11.9 |
| Producer and evaluator provenance remain distinct | 3.1, 10.1 | 10.5, 11.3 |
| Completeness and adapter checks gate dependent evaluation | 3.1, 10.3, 10.10 | 10.5, 11.9 |
| Items are identified by stable identifier | 10.2 | 10.5 |
| The export covers the logical build inputs | 3.14, 10.2, 10.3, 10.10 | 3.15, 10.5, 10.9, 11.9 |
| Companion roll and state contents are captured or explicitly excluded | 10.3 | 10.5, 10.9 |
| Measured combat output is capturable | 10.6 | 11.7, 12.5 |
| The player transport is one local file | 10.7, 11.1 | 10.9, 11.8 |
| Owned items include quantities and containers | 10.2, 11.4 | 10.5, 11.8 |
| Meter reset is explicit and mutating | 10.6 | 10.5, 10.9 |
