# Tasks: add gear and rotation planner

Order follows dependency. The combat-verification harness produces measurements and fixtures before
model formulas are finalized. Each model task has a separate verification task. The prior simulator is
removed only after the replacement passes the runtime and release gates.

## 1. Verification prerequisites

- [x] 1.1 Complete harness tasks 1.7, 2.8, 2.9, and the matrix lifecycle in 3.3, then attach their reports to the planner evidence set.
- [x] 1.2 Complete harness task 7.8 for debuff landing across defense, accuracy, and level difference, then record the fitted terms and bounds.
- [x] 1.3 Complete harness task 7.9 for effective debuff uptime, then record whether duration times landing probability is valid.
- [x] 1.4 Complete harness tasks 7.10 and 7.11 for same-entity replacement and cross-entity category isolation, then record the event rules.
- [x] 1.5 Add and run a harness experiment for integer-schedule gaps at cooldowns of 45 seconds and above, then set the rotation policy from the result.
- [x] 1.6 Add and run a harness experiment that compares Rogue and Warrior resource behavior, then set their separate model policies.
- [x] 1.7 Add and run companion-output experiments by archetype, range style, initial distance, target movement, haste, and cooldown reduction.
- [x] 1.8 Record every prerequisite result with game build, fixture, sample size, observed bound, and the formula or policy it controls.

## 2. Runtime data foundations

- [x] 2.1 Add a `DataExporter` model and exporter for every player-class slot, accepted item category, and mercenary prefab slot. Keep class and race compatibility in curated metadata and its character-creator check.
- [x] 2.2 Register the slot exporter explicitly and add tests that cover Shield for Warrior, Cleric, Wizard, and Druid; Bow for Ranger; and Weapon for Rogue.
- [x] 2.3 Run a real game export, compare the offhand values with the live reading in `design.md`, and record the export artifact and game build.
- [ ] 2.4 Load the slot table through the ordered pipeline schema, loader, and required-registration assertion, keeping raw exports out of version control.
- [ ] 2.5 Export or derive class and race progression curves, level and veteran budgets, skill trees, mercenary archetypes, consumables, and ammunition inputs.
- [ ] 2.6 Add pipeline tests that fail when any required progression, slot, skill, consumable, ammunition, or effect-classification input is absent.

## 3. Serialized contracts and planner payload

- [ ] 3.1 Define one logical build envelope with separate serialized-schema, capture-schema, model, and game-data versions and thin C# and TypeScript adapters.
- [ ] 3.2 Define the evaluation-scenario record for target, horizon, initial resources and cooldowns, buffs, consumables, ammunition, incoming events, roster, and target count.
- [ ] 3.3 Define explicit refusal policies for unknown schemas, unsupported target counts, incompatible game data, stale model markers, and incomplete captures.
- [ ] 3.4 Add one owned build-pipeline writer for the deterministic planner payload path, stale-output deletion, required-output assertion, and deterministic serialization.
- [ ] 3.5 Emit equipment, progression, skills, mercenary archetypes, consumables, ammunition, and effect classifications into the planner payload.
- [ ] 3.6 Register one content-hashed browser import and extend redaction verification to the raw and compressed planner payload.
- [ ] 3.7 Add reproducibility tests for stable raw bytes, compressed bytes, content hash, stale-output deletion, and missing-output failure.
- [ ] 3.8 Compare every emitted effect kind with modelled, excluded, and unsupported registries; fail publication for an unclassified admitted kind.
- [ ] 3.9 Measure and record the final raw and compressed payload sizes after all required domains are present.

## 4. Numeric kernel and evaluation scenario

- [ ] 4.1 Extract shared `f32`, `iround`, ceiling, floor, clamp, and expectation-substitution primitives from the existing source-cited stat module.
- [ ] 4.2 Add boundary tests that fail when an intermediate round, clamp, or float narrowing moves from its engine position.
- [ ] 4.3 Implement the versioned scenario parser and reject missing fields, unsupported target counts, and incompatible version tuples.
- [ ] 4.4 Implement timed initial state for resource, cooldown, buff, consumable, ammunition, and incoming-damage events.
- [ ] 4.5 Add scenario tests for the default stationary dummy, empty incoming events, supplied incoming events, ammunition exhaustion, and unsupported durability loss.

## 5. Target, caster, and hit evaluation

- [ ] 5.1 Extend the source-cited monster stat module with defense, magic resist, and four elemental resist curves plus spawn values.
- [ ] 5.2 Implement target avoidance, mitigation, debuff landing, mitigation ceilings, and explicit target parameters using the measured harness results.
- [ ] 5.3 Add target tests for level difference, all resist schools, defense saturation, debuff floors and ceilings, and stale denormalized fields.
- [ ] 5.4 Build the caster stat sheet for attack power, spell power, passive damage, resource capacities, four clamps, armour thresholds, and integer boundaries.
- [ ] 5.5 Add live character stat-sheet comparisons and synthetic boundary tests for every caster-state term.
- [ ] 5.6 Implement one ordered hit pipeline with separate handlers for each damaging skill class, avoidance, mitigation, criticals, and post-hit effects.
- [ ] 5.7 Implement resource-burn damage, weapon-category gates, archetype-specific offhands, wielder-specific offhand damage, and engine skill refusals.
- [ ] 5.8 Add per-skill-class tests, including the populated fields the engine ignores, and cover normal, poison, fire, cold, magic, and disease damage.
- [ ] 5.9 Add hit tests for resource-burn bypass, assassination health gate, slot 13 category selection, offhand wielders, and known game defects.

## 6. Timing, effects, resources, and companions

- [ ] 6.1 Implement weapon interval, cast time, skill cooldown, skill refractory, follow-up delay, haste, spell haste, and measured long-cooldown policy.
- [ ] 6.2 Implement the resource engine for regeneration, damage return, costs, maximum-resource burn, and distinct Rogue and Warrior policies.
- [ ] 6.3 Implement steady-state refresh-proc uptime and cooldown-reduction effects with source citations and harness-calibrated bounds.
- [ ] 6.4 Implement buff-category exclusivity within each controlled entity, cross-entity isolation, stronger-effect replacement, and deliberate action omission.
- [ ] 6.5 Implement declared consumables, ammunition consumption, and the default scenario's no-durability-loss policy.
- [ ] 6.6 Implement normal and veteran skill budget, tier, prerequisite, level, weapon, assassination, and other engine precondition gates.
- [ ] 6.7 Implement player rotation solving with explicit skill inclusion and exclusion and no free-form action-priority language.
- [ ] 6.8 Implement mercenary state, equipment, autonomous action expectation, two-gate cadence, movement policy, and healer reserve.
- [ ] 6.9 Add timing tests for haste, spell haste, flat refractory, reduced cooldown, follow-up attacks, and long-cooldown integer schedules.
- [ ] 6.10 Add resource tests for mana, energy, Rogue Fury, Warrior behavior, damage return, burn skills, and the inert mercenary energy multiplier defect.
- [ ] 6.11 Add effect tests for proc refresh, cooldown reduction, consumables, ammunition, category replacement, cross-entity isolation, and excluded durability loss.
- [ ] 6.12 Add skill-legality and rotation tests for every gate and for deliberate omission of an available skill.
- [ ] 6.13 Add companion tests for each archetype, melee and ranged behavior, movement state, cadence bound, healer reserve, and equipment contribution.

## 7. Model verification and calibration

- [ ] 7.1 Implement deterministic fixture evaluation against the shared build envelope and scenario schema.
- [ ] 7.2 Run source-only fixtures for rounding, stat aggregation, hit order, target terms, resource transitions, timing gates, and effect classifications.
- [ ] 7.3 Complete the harness model-comparison and baseline tasks only after sections 4 through 6 are complete.
- [ ] 7.4 Compare predicted and measured per-quantity values across player classes, damage schools, weapon branches, resource engines, and mercenary archetypes.
- [ ] 7.5 Record model error separately from finite-run variance, search gap, and every intentional game-defect normalization.
- [ ] 7.6 Calibrate the displayed prediction boundary from the comparison corpus and fail when a fixture falls outside it.
- [ ] 7.7 Add a regression fixture for every corrected formula or newly classified effect before changing the model.
- [ ] 7.8 Add the verified model comparison and baseline run to the game-version update procedure.

## 8. Build optimizer

- [ ] 8.1 Enumerate class, race, main-hand, offhand, two-handed, ammunition, and other discrete legality branches before local search.
- [ ] 8.2 Implement deterministic multi-start block coordinate ascent with a recorded seed, start count, convergence rule, and fixed-point spread.
- [ ] 8.3 Optimize equipment, attributes, normal skills, and veteran skills against one explicit scenario and version tuple.
- [ ] 8.4 Enforce level, class, race, slot, weapon, point-budget, tier, prerequisite, consumable, ammunition, and scenario constraints.
- [ ] 8.5 Solve weapon choice and rotation jointly and re-solve the rotation after every weapon-branch change.
- [ ] 8.6 Solve category-exclusive effects per entity and allow an action to be omitted when it would replace that entity's stronger effect.
- [ ] 8.7 Optimize the player and each active mercenary, capture pets for accounting only, and label every entity included in the total.
- [ ] 8.8 Compare the heuristic with the exact reference search on a bounded corpus and record objective gap, fixed-point spread, and missed branches.
- [ ] 8.9 Measure any surrogate against the display objective and justify the number of candidates carried forward; reject rank correlation alone.
- [ ] 8.10 Enforce owned-item quantities across slots and entities while allowing independent full-catalog searches.
- [ ] 8.11 Derive the ranking equivalence band from measured search-gap evidence and group candidates inside it.
- [ ] 8.12 Add optimizer tests for every branch, constraint, interaction, unsupported effect, owned-item conflict, and scenario-version change.
- [ ] 8.13 Report wasted stat allocation and the cap or threshold that caused it.
- [ ] 8.14 Verify the explanation against a candidate with each capped stat and each thresholded set bonus.

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
- [ ] 9.10 Show target limitations, unsupported effects, game-build mismatch, model-version warning, and separate uncertainty components beside the result.
- [ ] 9.11 Add browser interaction checks for manual build editing, target and scenario changes, progress, cancellation, permalink restore, and no-JavaScript content.

## 10. Character capture mod

- [ ] 10.1 Create the distributable mod project and shared capture core for the versioned build envelope.
- [ ] 10.2 Capture player progression, attributes, skills, all equipped slots, inventory, storage, stable item identities, quantities, containers, augments, and durability.
- [ ] 10.3 Capture active mercenaries and pets with completeness markers and explicit exclusions for any unavailable section.
- [ ] 10.4 Implement read-only character and meter capture paths that refuse missing runtime objects and cannot mutate gameplay or meter state.
- [ ] 10.5 Add game-free core tests and game-backed checks for schema rejection, completeness, containers, duplicate items, missing runtime state, and mutation absence.
- [ ] 10.6 Add separate typed commands for read-only meter capture and explicit mutating meter reset, with reset prohibited as a capture side effect.
- [ ] 10.7 Write one local JSON file, report its exact path, and register the same file as an optional HotRepl automation artifact.
- [ ] 10.8 Add the mod to the solution, build tool, package output, and player-facing download registry.
- [ ] 10.9 Build and deploy the mod, invoke it in a loaded game, inspect the file, and confirm the player's build and game state before and after capture.

## 11. Import and measured comparison

- [ ] 11.1 Add a browser-local file picker and parser that never uploads capture contents.
- [ ] 11.2 Populate the editor from a compatible capture and preserve the current build after a rejected import.
- [ ] 11.3 Apply schema, capture, model, game-data, and game-build compatibility rules with field-specific errors.
- [ ] 11.4 Apply owned-item quantities and containers from the capture to the optimizer's shared-inventory constraint.
- [ ] 11.5 Compare the current or imported build with a selected candidate under one scenario and list every equipment, attribute, skill, consumable, and roster change.
- [ ] 11.6 Show per-change contributions and refuse a numerical comparison when scenario or required version tuples differ.
- [ ] 11.7 Compare captured meter totals and denominators with the model, naming target, build, model, game data, run variance, and prediction boundary.
- [ ] 11.8 Add browser checks for valid import, every refusal policy, owned-copy conflicts, current-versus-candidate comparison, and meter comparison.

## 12. Performance and release gates

- [ ] 12.1 Benchmark representative and worst-case searches in the supported browser and record latency, peak worker memory, and first-progress latency.
- [ ] 12.2 Measure cancellation acknowledgement, main-thread responsiveness, and maximum permalink length for a maximum-size build.
- [ ] 12.3 Set release budgets from the recorded measurements and add regression checks for every budget.
- [ ] 12.4 Run model, optimizer, pipeline, capture-core, website, browser, and strict OpenSpec checks with the final payload and fixture corpus.
- [ ] 12.5 Run the real-game default-build comparison and one imported-player comparison, then record model, run-variance, and search-gap evidence separately.
- [ ] 12.6 Document the planner workflow, local-only capture privacy, version mismatch policy, unsupported-effect behavior, benchmark scenario, and known model limits.

## 13. Retire the prior attempt

- [ ] 13.1 Inventory every route, sitemap entry, type, import, and shared helper owned only by the prior simulator after the replacement passes section 12.
- [ ] 13.2 Remove the prior simulator route and its simulator-specific types, helpers, tests, and sitemap entry without deleting shared formula code still in use.
- [ ] 13.3 Re-run website checks, sitemap generation, browser smoke checks, and dead-reference searches after removal.

## 14. Requirement coverage
Each requirement has an implementation task and a distinct verification task.

### `combat-model`
| Requirement | Implementation | Verification |
|---|---|---|
| Every formula traces to decompiled source | 4.1, 5.1, 5.2, 5.4, 5.6, 6.1-6.8 | 7.2, 12.4 |
| Evaluation is deterministic and reproducible | 4.1, 7.1 | 7.2, 12.4 |
| The model reports a stated error boundary | 7.5, 7.6 | 12.5 |
| Resource generation from combat is modelled | 4.4, 6.2 | 4.5, 6.10 |
| Buff contributions are weighted by uptime | 6.3-6.5 | 6.11, 7.4 |
| A buff category holds at most one buff | 6.4 | 1.4, 6.11 |
| The refractory a skill sets is selected by the skill's own fields | 6.1 | 6.9 |
| One hit is derived in the engine's own order | 5.6 | 5.8, 5.9 |
| A prediction is derived from the target's own state | 5.1, 5.2 | 5.3, 7.4 |
| Target avoidance and mitigation are reducible, and reduction is not certain | 5.2 | 1.2, 1.3, 5.3 |
| Skill levels respect the allocation budget | 6.6 | 6.12 |
| Each damaging skill class is evaluated by its own rule | 5.6 | 5.8 |
| Resource-burn damage bypasses avoidance and mitigation | 5.7 | 5.9 |
| A skill that requires a weapon category is gated on it | 5.7, 6.6 | 5.9, 6.12 |
| A declared consumable set is part of the build | 4.4, 6.5 | 4.5, 6.11 |
| A controlled companion is evaluated by the same pipeline | 6.8 | 6.13, 7.4 |
| The offhand slot differs by archetype | 2.1, 5.7 | 2.2, 2.3, 5.9 |
| An offhand item contributes damage by wielder and class | 5.7 | 5.9 |
| A companion's cadence is bound by two gates, and weapon delay is not one of them | 1.7, 6.8 | 6.13, 7.4 |
| A skill the engine would refuse is not scheduled | 6.6, 6.7 | 6.12 |
| Spell haste is distinct from haste | 6.1 | 6.9 |
| A known defect is modelled as the behaviour it should have | 5.9, 6.10 | 7.4, 7.5 |
| A resource multiplier is applied only where the game applies it | 5.4, 6.2 | 5.5, 6.10 |
| A target stat is derived from its curve and its spawn, not from a denormalised scalar | 5.1 | 5.3 |
| Integer rounding follows the engine | 4.1, 5.6 | 4.2, 5.8 |
| Predicted values are validated against the running game | 7.3, 7.4 | 7.6, 12.5 |
| The target is an explicit parameter set | 3.2, 4.3 | 4.5, 5.3 |
| Every evaluation names its scenario | 3.2, 4.3 | 4.5, 9.11 |
| Equipment and skill effects are exhaustively classified | 3.8, 5.6, 6.3-6.6 | 2.6, 6.11, 7.2 |
| Refresh procs and cooldown changes affect steady state | 6.3 | 1.4, 6.11 |
| Ammunition and durability have explicit policies | 4.4, 6.5 | 4.5, 6.11 |
| Incoming damage is an event-stream input | 3.2, 4.4, 6.2 | 4.5, 6.10 |
| Uncertainty components remain separate | 7.5, 8.11 | 9.10, 12.5 |

### `build-optimizer`
| Requirement | Implementation | Verification |
|---|---|---|
| The search states what it does not guarantee | 8.8, 8.11 | 8.12 |
| Discrete branches are enumerated, not searched locally | 8.1 | 8.8, 8.12 |
| The local search uses multiple independent starts | 8.2 | 8.8, 8.12 |
| The search covers equipment, attributes, and skill allocation | 8.3, 8.4 | 8.12 |
| The player and active mercenaries are optimized | 8.7 | 6.13, 8.12 |
| Categorised effects are solved within their owning entity | 8.6 | 6.11, 8.12 |
| Owned-gear planning treats inventory as shared | 8.10, 11.4 | 8.12, 11.8 |
| Weapon choice and rotation are solved together | 8.5 | 8.12 |
| Ranking uses a surrogate whose fidelity is measured | 8.9 | 8.12 |
| Results within the error boundary form an equivalence band | 8.11 | 8.12 |
| Wasted stat allocation is reported | 8.13 | 8.14 |
| The optimization objective is scenario-bound | 8.3 | 8.12 |
| Unsupported effects cannot win a ranking | 3.8, 8.12 | 7.2, 9.11 |
| Search-gap evidence defines equivalence | 8.11 | 8.8, 8.12 |

### `gear-planner`
| Requirement | Implementation | Verification |
|---|---|---|
| Core facts render without JavaScript | 9.1, 9.2 | 9.11 |
| The default target is the endgame training dummy | 9.1, 9.2 | 9.11, 12.5 |
| The target is selectable and the result is per-target | 9.4, 9.9 | 9.11 |
| A target that cannot exercise a modelled mechanic says so | 9.10 | 9.11 |
| A build is shareable by link | 9.7, 9.8 | 9.11 |
| Uncertainty is presented, not hidden | 9.10 | 9.11, 12.5 |
| The result explains itself | 9.9, 9.10 | 9.11 |
| Compute does not block the interface | 9.5, 9.6 | 9.11, 12.1-12.3 |
| A reader can author a complete build | 9.3, 9.4 | 9.11 |
| A reader can import a local character capture | 11.1-11.4 | 11.8 |
| Current and candidate builds are comparable | 11.5, 11.6 | 11.8 |
| Unsupported effects block a best-build claim | 3.8, 9.10 | 7.2, 9.11 |
| Planner performance is measured and gated | 12.1-12.3 | 12.4 |
| Serialized, model, and data versions remain distinct | 3.1, 3.3, 9.7 | 9.8, 11.3, 11.8 |

### `character-state-export`
| Requirement | Implementation | Verification |
|---|---|---|
| The export is read-only | 10.4 | 10.5, 10.9 |
| The payload carries provenance and a version | 3.1, 10.1 | 10.5, 11.3 |
| The payload reports its own completeness | 10.3 | 10.5 |
| Items are identified by stable identifier | 10.2 | 10.5 |
| The export covers what a build needs | 10.2, 10.3 | 10.5, 10.9 |
| Companion state is captured or explicitly excluded | 10.3 | 10.5, 10.9 |
| Measured combat output is capturable | 10.6 | 11.7, 12.5 |
| The player transport is one local file | 10.7, 11.1 | 10.9, 11.8 |
| Owned items include quantities and containers | 10.2, 11.4 | 10.5, 11.8 |
| Meter reset is explicit and mutating | 10.6 | 10.5, 10.9 |
