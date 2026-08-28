# Tasks: add gear and rotation planner

Order follows dependency. Two facts set the spine.

The model cannot start from source alone. The per-archetype slot 13 table exists in no decompiled file
and in no exporter, so section 1 exports it before section 5 needs it. The published `items.slot` column
repeats `items.weapon_category` on every row. A payload cannot learn from it that a Ranger offhand takes
a bow while a Warrior offhand takes a shield.

The pipeline has never written a derived JSON artifact. Every derived value today is a column on
`compendium.db`. Section 2 adds a writer, its registration assertion, and an extension of
`compendium redactions verify`. That command scans three surfaces today and would miss the payload.

Three claims in `design.md` were checked against source before this list was written. Two were wrong and
are corrected in the artifacts. `requiredWeaponCategory2` is read at `Skills.cs:1387`, where it selects a
cast effect. A companion's cadence is bound by a haste-reduced cooldown as well as a flat refractory.

The third gap was a missing requirement rather than wrong prose, and `combat-model` gained it. The engine
refuses an assassination cast above a quarter of target health, so the rotation must not schedule one.

## 1. Export the slot table the source does not carry

- [ ] 1.1 Add a `DataExporter` model and exporter for the equipment slot table of every player class
      prefab and every mercenary prefab, recording the slot index and the accepted item category.
      Register it in `DataExporter.ExportAllData()`, which
      `tests/DataExporter.Tests/ExporterRegistrationTests.cs` enforces.
- [ ] 1.2 Run a real export and confirm the offhand values against the reading in `design.md`: `Shield`
      for Warrior, Cleric, Wizard and Druid, `Bow` for Ranger, and `Weapon` for Rogue. A successful build
      is not evidence, so `rule://build-is-not-runtime-proof` applies.
- [ ] 1.3 Load the table into the pipeline: schema, loader, and the registration assertion the build
      command already checks. Keep the exported JSON out of version control.
- [ ] 1.4 Record in `design.md` that the table is now derived from an export rather than from one live
      reading, and cite the exporter instead of the reading.

## 2. The derived planner payload

- [ ] 2.1 Add the payload writer to `build-pipeline`, emitting one compact artifact for the planner.
      Register it where `compendium build` discovers derived outputs, and add the assertion that fails
      when it is absent.
- [ ] 2.2 Emit the equippable item set: identity, level and class gating, the stat vector, weapon delay
      and ammunition, procs, and both augment set bonuses. Read the slot table from section 1 rather than
      the `items.slot` column.
- [ ] 2.3 Emit per-class skill trees with point costs, prerequisites, tier caps, and weapon gates,
      including which skills are veteran.
- [ ] 2.4 Emit mercenary archetype data and the per-race base value factors the archetype needs.
- [ ] 2.5 Emit the consumable buff set: food and potion effects with their magnitudes, durations, and
      buff categories.
- [ ] 2.6 Extend `compendium redactions verify` to scan the payload. A payload that publishes a redacted
      item is a defect, and the current three surfaces do not include it.
- [ ] 2.7 Confirm the payload is reproducible: build twice without changing input and compare bytes.
      Record the measured gzipped size beside the design's figure of 21,488 B for 887 items.

## 3. The evaluation kernel

- [ ] 3.1 Lift `f32` and `iround` out of `website/src/lib/utils/merc-stats.ts` into a shared kernel, and
      add the ceiling and floor forms the damage path needs. One owner, with the existing tests moved
      or extended rather than duplicated.
- [ ] 3.2 Define the expectation substitution for each random term, so evaluation is deterministic. Cover
      the three Bernoulli terms and the one uniform damage range.
- [ ] 3.3 Define the error boundary type that every reported figure carries, and the rule that turns a
      substituted expectation into a stated band.
- [ ] 3.4 Define the target parameter record and its refusal path, so a target that cannot exercise a
      mechanic is reported rather than silently evaluated.
- [ ] 3.5 Write the module header that states the citation convention, following
      `website/src/lib/utils/merc-stats.ts`. Every constant carries its own `Source:` line.

## 4. Target and caster state

- [ ] 4.1 Extend `website/src/lib/utils/monster-stats.ts` from block chance alone to defense, magic
      resist, and the four elemental resists, each from curve columns plus the spawn's own values.
- [ ] 4.2 Add the resource capacity functions, reproducing that `Energy.max` ignores its multiplier while
      `Mana.max` applies it. Cite the defect report rather than the multiplier's intent.
- [ ] 4.3 Build the caster stat sheet: attack power, spell power, the passive percentage term with its
      rounding, the four clamps, and both armour set thresholds. This has no requirement of its own and
      every damage task depends on it.
- [ ] 4.4 Test the stat sheet against a live reading from a known character, not only against source.

## 5. The per-hit damage pipeline

- [ ] 5.1 Implement the ordered integer walk of one hit, one function per engine step, in the engine's
      own order.
- [ ] 5.2 Implement avoidance, mitigation, and the seven resist functions as one shape. Treat accuracy as
      a term with three consumers, and do not cap it when avoidance reaches its floor.
- [ ] 5.3 Implement the mitigation ceiling and state its consequence: defense above the saturation point
      buys nothing, which is why a dummy understates a debuff.
- [ ] 5.4 Implement debuff landing probability as the factor that multiplies a duration bound.
- [ ] 5.5 Implement the resource-burn bypass, which ignores avoidance and mitigation entirely.
- [ ] 5.6 Give each damaging skill class its own evaluation path and its own test, including the class
      that ignores its own damage multiplier and the class that ignores the caster's combat stat.
- [ ] 5.7 Implement the weapon category gate, including both slot 13 categories from section 1.
- [ ] 5.8 Implement the offhand damage rules per wielder and class, including the half removal rounded up
      and the companion case that applies no removal.
- [ ] 5.9 Implement the two skill point budgets and the tier caps, so a build cannot hold every skill at
      maximum.
- [ ] 5.10 Implement the engine-refused precondition constraint, so the solver never schedules an
      assassination skill against a target above a quarter health.

## 6. Cadence, resources, and buffs

- [ ] 6.1 Implement the refractory period, selecting the branch on the skill's own fields rather than on
      the followup flag. Correct `website/src/lib/types/skills.ts` where it encodes the wrong selector.
- [ ] 6.2 Implement the weapon interval clamp and the unarmed default.
- [ ] 6.3 Implement haste and spell haste as disjoint consumers with their own clamps.
- [ ] 6.4 Implement resource income as a function of post-mitigation output rather than of capacity,
      including the four floor sites and the square-root term.
- [ ] 6.5 Implement the one-second recovery tick as a fixed-tick event, distinct from the exact-timestamp
      events.
- [ ] 6.6 Implement steady-state buff uptime from duration and cooldown, and charge maintenance against
      time and resource.
- [ ] 6.7 Implement buff category exclusivity: one member per category, selected by recency and never by
      magnitude. Cover the cross-entity collision.
- [ ] 6.8 Implement the declared consumable set as part of the build, including its category collisions.

## 7. Companions and live validation

- [ ] 7.1 Run a companion through sections 4 to 6 unchanged, confirming the equipment stat pipeline is
      shared rather than reimplemented.
- [ ] 7.2 Implement the companion cadence from both gates, and record which gate binds for a reported
      figure.
- [ ] 7.3 Implement companion output as an expectation over uniform action selection, and label it an
      expectation rather than a schedule.
- [ ] 7.4 Implement the newly hired policy for base damage and the reconstructed multipliers, citing the
      two defect reports.
- [ ] 7.5 Implement the defect policy: model intended behaviour where a defect is recorded, and name the
      report beside the term.
- [ ] 7.6 Validate the model against the running game with the harness that already exists under
      `mods/CombatVerification/`, and record the measured gap.
- [ ] 7.7 Close the tasks in `openspec/changes/add-combat-verification-harness/tasks.md` that state they
      wait for a model. Sections 6, 8, 9 and 10 and tasks 7.1 to 7.6 there become reachable.

## 8. The optimizer

- [ ] 8.1 Define the decision variables across equipment, attribute allocation, and normal and veteran
      skill allocation, as one build record. Reuse the fixture descriptor shape from
      `mods/CombatVerification/Fixtures/FixtureDescriptor.cs` rather than inventing a second.
- [ ] 8.2 Implement discrete branch enumeration over hand configuration, weapon candidate, and both
      armour set thresholds.
- [ ] 8.3 Implement block coordinate ascent over the three coupled blocks, with the start count as a
      named recorded parameter.
- [ ] 8.4 Implement multi-start and record the measured fixed-point spread, so a single start cannot be
      configured silently.
- [ ] 8.5 Solve weapon choice and rotation together, because a damaging skill can require a weapon
      category.
- [ ] 8.6 Implement the analytic surrogate for ranking, and the fidelity check that runs against the
      event timeline whenever the model changes.
- [ ] 8.7 Implement per-entity optimization for the player and each active companion, independent for a
      best-in-slot plan.
- [ ] 8.8 Implement owned-gear planning as an assignment across entities, because one item cannot be
      equipped twice.
- [ ] 8.9 Implement interference between controlled entities, including the option to not use an action.
- [ ] 8.10 Implement the equivalence band, so results inside the error boundary are not presented as
      ranked.
- [ ] 8.11 Report wasted allocation: the excess above a cap and any contribution of zero.
- [ ] 8.12 State what the search does not guarantee, with the measured gap against a reference search.

## 9. The planner page

- [ ] 9.1 Add the route with a server load that returns the default build and its numbers, following the
      split that `website/src/routes/mechanics/mercenary-stats` uses for compute and that
      `website/src/routes/monsters/[id]` uses for marking a control as script-only.
- [ ] 9.2 Render the default result in prerendered HTML, and confirm the no-JavaScript path shows the
      numbers with the controls hidden.
- [ ] 9.3 Add a target selector defaulting to the level 55 dummy in Northern Wastes, with the result
      labelled by the target it belongs to. Existing queries filter dummies out, so the selector needs a
      query that returns them.
- [ ] 9.4 Report when a selected target cannot exercise a modelled mechanic, as a function of the target
      rather than as a per-skill constant.
- [ ] 9.5 Add the build permalink encoder. The map encoder is typed to the map end to end, so this needs
      its own, keeping the omit-defaults rule and reading through the existing search normaliser.
- [ ] 9.6 Carry a version marker in the link and state when a stored build came from an earlier model. No
      URL in the site carries one today.
- [ ] 9.7 Present uncertainty rather than hiding it, including the equivalence band from task 8.10.
- [ ] 9.8 Render the result breakdown: per-ability contribution, buff uptime, and why an item was
      selected. Mark an item effect the model does not cover.
- [ ] 9.9 Extend the worker protocol for compute: a discriminated response, a progress message, and a
      cancel path. The database protocol has none of these, and a pending request can only be resolved
      by a matching response.
- [ ] 9.10 Run the optimizer in its own worker, so a long search does not starve database reads behind
      the single existing worker.
- [ ] 9.11 Add the route to the sitemap manifest, in the list for a route whose freshness no single hash
      captures.

## 10. Capture a live character and its measured output

- [ ] 10.1 Add the mod project, following the smallest existing mod as the template, and register its
      typed commands without changing another project.
- [ ] 10.2 Capture the player build read-only: level, veteran points, attributes, skills, all sixteen
      slots with augments, and durability.
- [ ] 10.3 Capture companion state, or state explicitly that a companion was excluded and why.
- [ ] 10.4 Identify every item by its stable identifier, so a captured build resolves against the
      published payload.
- [ ] 10.5 Report the payload's own completeness, naming what it could not read rather than omitting it.
- [ ] 10.6 Carry provenance and a version: game build, mod version, and the payload schema version.
- [ ] 10.7 Read the combat meter and its active-seconds denominator, and reset it through the command the
      engine already exposes. All four fields are synchronized, so a client can read them.
- [ ] 10.8 Return the capture as an artifact rather than an inline result, following the existing
      artifact key conventions.
- [ ] 10.9 Split the mod so the rule applied to what was read is testable without the game, and add the
      test project entry.
- [ ] 10.10 Verify the capture in the running game and confirm the meter figure against a hand
      measurement.

## 11. Retire the prior attempt

- [ ] 11.1 Remove the earlier simulator route and its page, and drop its sitemap entry.
- [ ] 11.2 Remove the type coupling in `website/src/lib/types/formula.ts`, which states that a type from
      the earlier attempt satisfies the weapon stat shape.
- [ ] 11.3 Repoint the link on the combat mechanics page at the planner.
- [ ] 11.4 Relocate any measured result or rejected alternative the earlier attempt recorded, then delete
      the rest. `documentation-lifecycle` states which four kinds of rationale survive a deletion.

## 12. Verification and release

- [ ] 12.1 Run `uv run compendium citations check` and confirm every new constant carries a resolvable
      source citation.
- [ ] 12.2 Run the website tests, `pnpm check`, and `pnpm lint`, then `pnpm build` to confirm the route
      prerenders.
- [ ] 12.3 Run the mod test projects and `dotnet run --project build-tool build`.
- [ ] 12.4 Drive the planner in a browser: default render, target change, optimize, permalink round trip,
      and the no-JavaScript path.
- [ ] 12.5 Compare a published figure against the reader-facing capture from section 10 on one real
      build, and record the gap.
- [ ] 12.6 Update the mechanics snapshot only for an intentional visible change, and explain each diff.

## Requirement coverage

Every requirement in the four specs maps to at least one task above.

| capability | requirement | tasks |
| --- | --- | --- |
| combat-model | Every formula traces to decompiled source | 3.5, 12.1 |
| combat-model | Evaluation is deterministic and reproducible | 3.2 |
| combat-model | The model reports a stated error boundary | 3.3, 9.7 |
| combat-model | Resource generation from combat is modelled | 6.4, 6.5 |
| combat-model | Buff contributions are weighted by uptime | 6.6 |
| combat-model | A buff category holds at most one buff | 6.7 |
| combat-model | The refractory a skill sets is selected by the skill's own fields | 6.1 |
| combat-model | One hit is derived in the engine's own order | 5.1 |
| combat-model | A prediction is derived from the target's own state | 4.1 |
| combat-model | Target avoidance and mitigation are reducible, and reduction is not certain | 5.2, 5.3, 5.4 |
| combat-model | Skill levels respect the allocation budget | 5.9 |
| combat-model | Each damaging skill class is evaluated by its own rule | 5.6 |
| combat-model | Resource-burn damage bypasses avoidance and mitigation | 5.5 |
| combat-model | A skill that requires a weapon category is gated on it | 5.7 |
| combat-model | A declared consumable set is part of the build | 2.5, 6.8 |
| combat-model | A controlled companion is evaluated by the same pipeline | 7.1 |
| combat-model | The offhand slot differs by archetype | 1.1, 1.2, 1.3 |
| combat-model | An offhand item contributes damage by wielder and class | 5.8 |
| combat-model | A companion's cadence is bound by two gates | 7.2 |
| combat-model | A skill the engine would refuse is not scheduled | 5.10 |
| combat-model | Spell haste is distinct from haste | 6.3 |
| combat-model | A known defect is modelled as the behaviour it should have | 7.5 |
| combat-model | A resource multiplier is applied only where the game applies it | 4.2 |
| combat-model | A target stat is derived from its curve and its spawn | 4.1 |
| combat-model | Integer rounding follows the engine | 3.1 |
| combat-model | Predicted values are validated against the running game | 4.4, 7.6, 12.5 |
| combat-model | The target is an explicit parameter set | 3.4 |
| build-optimizer | The search states what it does not guarantee | 8.12 |
| build-optimizer | Discrete branches are enumerated, not searched locally | 8.2 |
| build-optimizer | The local search uses multiple independent starts | 8.3, 8.4 |
| build-optimizer | The search covers equipment, attributes, and skill allocation | 8.1, 8.3 |
| build-optimizer | Every controlled entity is optimized | 8.7 |
| build-optimizer | Controlled entities can interfere | 8.9 |
| build-optimizer | Owned-gear planning treats inventory as shared | 8.8 |
| build-optimizer | Weapon choice and rotation are solved together | 8.5 |
| build-optimizer | Ranking uses a surrogate whose fidelity is measured | 8.6 |
| build-optimizer | Results within the error boundary form an equivalence band | 8.10 |
| build-optimizer | Wasted stat allocation is reported | 8.11 |
| gear-planner | Core facts render without JavaScript | 9.1, 9.2 |
| gear-planner | The default target is the endgame training dummy | 9.3 |
| gear-planner | The target is selectable and the result is per-target | 9.3 |
| gear-planner | A target that cannot exercise a modelled mechanic says so | 9.4 |
| gear-planner | A build is shareable by link | 9.5, 9.6 |
| gear-planner | Uncertainty is presented, not hidden | 9.7 |
| gear-planner | The result explains itself | 9.8 |
| gear-planner | Compute does not block the interface | 9.9, 9.10 |
| character-state-export | The export is read-only | 10.2 |
| character-state-export | The payload carries provenance and a version | 10.6 |
| character-state-export | The payload reports its own completeness | 10.5 |
| character-state-export | Items are identified by stable identifier | 10.4 |
| character-state-export | The export covers what a build needs | 10.2 |
| character-state-export | Companion state is captured or explicitly excluded | 10.3 |
| character-state-export | Measured combat output is capturable | 10.7, 10.8 |
