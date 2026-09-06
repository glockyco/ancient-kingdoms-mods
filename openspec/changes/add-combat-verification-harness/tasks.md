Checked tasks below record local component work or named experiments, not complete harness acceptance.
Reopened tasks retain useful existing implementations but require the corrected observable contract.
The linked `add-gear-and-rotation-planner` change needs a separate planning revision for shared adapters,
production evaluator integration, dynamic state evaluation, raw/normalized separation, and independently
validated accuracy claims. Do not close those dependencies from this change.

## 1. Fixture descriptor

- [ ] 1.1 Complete the shared build-data and fixture execution schemas. Keep the current
      version-only BuildEnvelope distinct from build data and capture metadata. Verify required
      fields, initial state, consumables/ammunition, and scheduling policies round-trip without
      silent defaults; the existing descriptor is component evidence only.

- [x] 1.2 Implement legality validation: skill allocation within each pool's budget, tier gates
      satisfied, prerequisite chains satisfied, attribute totals consistent with the class progression at
      the stated level, equipment satisfying slot class, level and weapon category, a two-handed weapon
      leaving the offhand empty, and companion rolled values inside the race and archetype envelope.
      Take the rules the checks need as an injected input rather than restating them. The running game
      supplies them from its own definitions, so they cannot drift from the game, and a test supplies
      synthetic ones. Restating the game's cost, tier and prerequisite tables in the validator would
      create a second source of truth.
- [x] 1.3 Make validation report the specific field and the permitted range on failure, and make it
      refuse rather than clamp.
- [x] 1.4 Add unit tests for legality, one per rejection reason, using descriptors that fail exactly one
      rule each.
- [ ] 1.5 After the linked planner defines build/capture adapters, round-trip shared build data
      through C# and TypeScript. Verify completeness and container metadata stay capture-only,
      execution stays fixture-only, and the adapter reaches the production evaluator without copying
      formulas.

- [x] 1.6 Remove the class and race pairing from the rules read after world entry. The pairing is a game
      rule, but it lives in the character creator, which enables one class button per race. The creator is
      live exactly where creation happens, so the pairing is checked there rather than answered from a
      copy. Nothing reports it as unchecked, because nothing has to guess.

- [x] 1.7 Split the checks by what each one needs. The schema version, the presence of the sections a
      measurement depends on, a slot named twice and a negative level are questions about the descriptor,
      so answer them without the game and before launch. Every question the game answers stays in the
      check that runs against it, and neither side restates the other.

## 2. Run isolation and lifecycle

- [x] 2.1 Add a build-tool verification command that launches the game and waits for the runtime host,
      reusing the existing launch path rather than duplicating it. Launching, streaming the game log for a
      fatal start-up error, and shutting down cleanly now sit in one session that the export command and
      the verification command each compose.
- [x] 2.2 Redirect the game's database path to a scratch location before the login screen opens its
      connection, then open the connection so the schema self-initialises. This is a runtime command on
      the existing command mod rather than a new one: isolating game state is a command-surface concern
      that serves any run, not only a fixture run.
- [x] 2.3 Refuse to start unless the resolved database path lies inside the run's scratch location, and
      report the resolved path when refusing. The runtime command reports the path it opened, and the
      run refuses on that reported value rather than on the call having succeeded.
- [x] 2.4 Create and hash-verify a timestamped backup of the player save, including write-ahead and
      shared-memory sidecars, before any run that could reach it.
- [x] 2.5 Identify the build by the content hash of the assembly the decompiled evidence was produced
      from, recording the version string and Steam build identifier as labels beside it. Confirm the
      installed assembly still hashes to the recorded value before measuring, so a run cannot attribute
      results to source that no longer describes the build.
- [ ] 2.6 Qualify scratch reuse per fixture using assembly and fixture-content hashes plus
      successful materialization. Reject interrupted or validation-only markers. Verify saved state
      and reapply/read back transient state after reload; exercise both reuse and incompatible
      rebuild.

- [ ] 2.7 Verify player-save and sidecar isolation across the complete matrix on success, failure,
      and cancellation. Preserve the existing isolated lifecycle experiment as component evidence,
      not proof of a full verification run.

- [ ] 2.8 Execute the matrix with a fresh character/session per fixture attempt, or proven
      per-fixture saved-state reuse. Verify all six classes and an initially full eight-slot scratch
      roster; existing selection and roster helpers do not prove matrix execution.

- [ ] 2.9 Acquire exclusive installation/session ownership before scratch mutation or launch. Refuse
      a stale instance without touching scratch, verify process/endpoint identity, and stop only the
      owned process on every outcome. Exercise stale ownership, launch failure, and cancellation;
      the existing endpoint check alone is insufficient.

- [ ] 2.10 Prove canonical owned-path checks reject escapes and symlinks before
      deletion/redirection. Verify backup precedes mutation, fresh reset recreates the SQLite
      parent, and cleanup preserves original failure plus isolation results. Run a fresh/reused
      scratch safety spike before matrix execution.

### Safety component evidence

The validation-only safety spike passed against game 0.9.31.1, Steam build 24986533
(assembly prefix `bd2521453b35`). It confirmed the launch identity, exact scratch database
path, descriptor validation, native shutdown, scratch cleanup, and unchanged player-save
hashes. The endpoint stopped after 4.6 seconds, and the native process stopped after
6.5 seconds. Shutdown checks retain ownership while waiting for both.

A separate process holding the installation lock caused refusal before backup or scratch
mutation. A concurrent verification command refused the occupied endpoint without a
WebSocket handshake. The command does not write validation-only reuse markers.

Tasks 2.9 and 2.10 remain open. Native shutdown before the first authenticated runtime
response and an actual retained-scratch reuse spike still need acceptance evidence.
These results do not qualify per-fixture materialization, matrix execution, or combat parity.

## 3. Materialization commands

- [x] 3.1 Add a mod project that registers typed runtime commands, following the existing command-mod
      pattern. It registers a read-only check of a fixture against the game's own definitions. The check
      runs once the world is loaded, because that is when those definitions exist.
- [x] 3.2 Implement character creation by driving the character creator, not by calling the database
      entry point. The creator chooses the class's basic skill, the starting city and the appearance, and
      it disables the tutorial, none of which is data a fixture could supply without copying a decision
      the creator already makes. It also holds the class and race pairing, and it reports a refused name
      in its own words. Select the race before the class, because a race that forbids the selected class
      changes the selection.
- [x] 3.3 Reuse the existing world-entry character selection so a fixture matrix can address any of the
      six classes. World entry serves one character per session, and it refuses to switch once a
      character is loaded, so a matrix either runs one fixture per session or gains a way back to
      selection. A failed build also consumes its character, because the build refuses one that has
      already been advanced, so an attempt needs a character of its own. Selection by name already exists and is covered by the runtime control capability, so
      do not add a second selector. The order is forced rather than chosen: the creator lives on the
      selection screen and the game's definitions arrive with the loaded world, so a run creates, enters,
      and then checks against the game.
- [x] 3.4 Implement level and veteran progression by awarding experience incrementally so the engine
      grants attribute points, skill points, the class attribute progression and veteran points itself.
      Award one requirement at a time and stop at the target, because awarding an unbounded amount at the
      cap makes the engine's loop spin.
- [x] 3.5 Implement skill allocation by spending points through the engine's upgrade commands for the
      normal and veteran pools separately. Spend in an order that satisfies each purchase's own
      requirement on points already spent, because a skill row unlocks on the spend total rather than on
      the level. Repeat a pass while any declared level is still reachable, and stop when a pass buys
      nothing. Report the blocked skill when declared levels remain.
- [x] 3.6 Implement attribute allocation by spending points through the engine's attribute commands.
- [x] 3.7 Implement item granting and equipping through the game's own grant and swap, so the
      equipment-changed callback applies attribute bonuses and armour set thresholds. Empty a slot the
      fixture does not declare, because a created character wears starter equipment and an undeclared
      piece would contribute to every measurement. An augment needs no separate step: it rides in the
      inventory slot and the swap carries it.
- [x] 3.8 Implement companion acquisition through the engine's hire command, ordered after the owner's
      progression is complete so the companion receives no part of the per-level increment. Supply a
      generated name and the game's own price, because the engine stores an empty name verbatim and a
      dismissal addresses a companion by name.
- [ ] 3.9 Retain bounded post-hire assignment of companion health, resource, and base combat rolls
      with readback. Do not assign race: fail a named-race mismatch without claiming the seed
      guarantees it. Reapply allowed transient rolls after every reload and verify an actual reload
      preserves the requested measured state.

- [x] 3.10 Implement companion equipping through the companion's own command, granting each item into the
      owner's inventory because that is where the command reads from. The item's level requirement is
      checked against the owner's level, not the companion's.
- [x] 3.11 Fail materialization loudly when a step does not take effect, naming the step and the value
      that did not change. The engine reports nothing: an out-of-range index, a wrong entity state, and a
      failed affordability check all return without an error and without an effect. A step therefore
      reads the value it intends to change, acts, and reads again, and the harness supplies the reason
      the engine does not.

- [ ] 3.12 Materialize consumables, ammunition, target, positioning/facing, initial resources, and
      effects through declared engine paths. Verify before/after and final requested-versus-achieved
      readback; a mismatch must stop dependent measurement.

- [ ] 3.13 Drive the explicit player schedule with declared repetition, start/end, in-flight action,
      and refusal policies while leaving companions autonomous. Verify a finite game-backed window
      records attempts, acceptance, completion, and hits separately.

## 4. Probe: stat sheet and cadence

- [x] 4.1 Implement a stat sheet probe that reads every combat stat, every attribute, both resource
      maxima, health maximum, and the per-slot equipment contribution. Discover each set from the game
      rather than listing it, so a stat a patch adds is reported. Report each armour set's piece count and
      declared bonuses beside the slots, because a set bonus is a threshold effect rather than a per-slot
      one and the totals cannot be accounted for without it.
- [x] 4.2 Implement an action interval probe that records action timestamps and derives the observed
      interval, and have it report the weapon delay and haste it observed alongside.
- [x] 4.3 Implement a per-hit probe by subscribing to a damage event, recording the victim, the
      amount and a server timestamp. Needed before any damage rule can be measured exactly: a mean
      over completed actions mixes landed hits with the ones the target blocked, and two
      configurations with different accuracy are not comparable through it. The two events that carry
      an amount take two arguments and cannot be subscribed to on this platform, so the probe listens
      to the caster's single-argument hit event and reads the amount from the running total inside it.
      A damage type is not on that event, so it belongs to 5.1 alone.
- [x] 4.4 Seed the random generator before a measurement and record the seed with the results. An
      identical seed does not reproduce the sequence, tested twice against one fixture: the engine
      draws from one generator for every system, so the seed is provenance rather than determinism.
- [x] 4.5 Have a damage measurement declare the fidelity tier it achieved. The tiers the specification
      defines are tiers of damage attribution, so a stat reading has none; the probes that read state
      declare instead whether their reading is attributable, which is the same question for them.
- [x] 4.6 Implement a target-state probe that reads the target's defense, block chance, magic resist and
      each elemental resist, plus its active effect list with each entry's category and remaining
      duration. It reads the target, not the caster.
- [x] 4.7 Make the probe quiesce the caster before a reading: stop the follow-up attack loop, clear the
      pending action and the target, then confirm the refractory value is unchanged across two samples.
      Without this an auto-attack rewrites the value between samples and the reading is unattributable.
- [x] 4.8 Have the target-state probe re-read after the engine's cleanup pass, because an expired effect
      still contributes for one tick and a single reading captures the pre-cleanup value. The pass is
      also skipped entirely when the engine does not update the entity, so the probe reports whether it
      could have run: an unchanged pair otherwise reads as a settled state.

- [ ] 4.9 Connect probes to per-quantity units, windows, counts, state provenance, and sampling
      protocols. Verify target death/overkill, misses, effect expiry/cleanup, and unattributable
      readings cannot silently contaminate a comparable window.

## 5. Probe: skill attribution

- [x] 5.1 Stamp the damage entry point with the skill, the damage type and the amount the caster asked
      for, and read the stamp from inside the hit event. This is the only route to a damage type per
      hit, because the event that carries one cannot be subscribed to. A prefix rather than a postfix,
      because the final amount is a local the entry point never returns, while the hit event fires
      before it returns and therefore belongs to the same call. The entry point resolves as a single
      overload and patched cleanly.
- [x] 5.2 Make the trace tolerate the patch failing to apply: fall back to the lower fidelity tier and
      report the tier reached rather than aborting the run. One hit that named no skill holds the whole
      window at the lower tier, since that hit is the one a comparison would misplace.
- [x] 5.3 Emit the trace as a timestamped event log usable for rotation comparison. The measurement is
      the log: one entry per hit carrying the skill, the school, the amount asked for, the health taken
      and a server timestamp.
- [x] 5.4 Verify the trace against the per-hit event probe on the same run. They are one record by
      construction, so the check is stronger than a count agreement: the amount asked for comes from the
      patch and the health taken comes from the caster's own total, and their ratio has to fall inside
      the band the engine's own steps allow. Fourteen of fourteen hits fell inside 0.5265 to 0.6435,
      mean 0.5779 against a band centre of 0.585. A stamp landing at the wrong moment would leave a hit
      unnamed or put a ratio outside the band.

## 6. Comparison and reporting

Every task in this section compares a predicted quantity against a measured one. Start it only after
the planner model tasks for those quantities are complete. Complete and close these tasks in this
change; no planner task closes them on the harness's behalf.


- [ ] 6.1 Connect per-quantity comparisons to live observations and the planner production
      evaluator, covering stats, cadence, damage intent/reduction, effects, and sustained output.
      Verify one complete fixture report uses matching independent inputs, not caller-supplied
      predictions or measured caster totals substituted for predicted totals.

- [ ] 6.2 Replace generic mean/range tolerance gating with predeclared versioned deterministic and
      stochastic protocols. Specify sampling units, sample sufficiency, dependence treatment,
      matrix-wide error control, stopping rules, and hard support bounds where justified. Verify
      repeated windows behave under the declared acceptance policy; insufficient evidence is
      inconclusive.

- [ ] 6.3 Persist assembly/fixture-content/model-evaluator/data identities, requested and achieved
      state, target provenance, seeds, per-quantity counts, units/windows, protocol/tolerances,
      fidelity, and raw sequences. Verify a report can trace each quantity to its inputs and
      observations and fails qualification when required evidence is missing.

- [ ] 6.4 Report diagnostic tiers separately from attribution fidelity and identify failed criteria
      without invented causal labels. Verify a lower-tier failure marks dependent interpretation
      unreliable, while lower-tier passes do not prove the cause of a higher-tier failure.

- [ ] 6.5 Record attempted, accepted, completed, and landed actions separately, including refusal
      evidence. Keep refused attempts in their proper denominators. Verify an unexpected refusal
      invalidates dependent comparison and a declared refusal fixture reports the expected outcome.

- [ ] 6.6 Run a vertical-slice spike from descriptor through materialization, readback, player
      actions, live measurements, production evaluation, comparison, and persisted evidence. Include
      maintained effects and an autonomous companion case. Verify validation-only and missing-stage
      runs never report full verification success.

- [ ] 6.7 Establish stochastic acceptance with repeated game windows before freezing the gate.
      Record dependence assumptions, minimum samples, confidence/error control across the matrix,
      and stopping policy; verify false-rejection behavior with an appropriate independent
      experiment or simulation tied to observed sampling behavior.

- [ ] 6.8 Separate raw parity from known-defect-normalized predictions with explicit evidence
      references and affected quantities. Verify a normalized result cannot hide a raw mismatch or
      enter a raw baseline.

## 7. Fixture matrix

Tasks 7.7 through 7.14 are experiments rather than model checks. They establish quantities and
policies the model needs, so they run before the corresponding formulas are finalized. Tasks 7.1
through 7.6 are comparison fixtures and wait for the model where they require predictions.


- [ ] 7.1 Complete and execute tier A coverage for all six classes, veteran progression,
      three/exactly-five-piece sets, speed/avoidance floors, augments, and consumables. Preserve
      existing descriptors, but verify achieved state and planner parity rather than coverage
      labels.

- [ ] 7.2 Complete and execute tier B coverage for actual damaging handlers and all supported
      schools, including ignored multiplier and ignored caster-stat branches. Add effect
      landing/application and settled target-state cases. Verify trace evidence reaches each claimed
      handler; Mana Burn alone does not establish AreaObjectSpawnSkill coverage.

- [ ] 7.3 Execute tier C delay/haste sweeps including the speed floor. Verify intervals from
      accepted/completed action evidence under the declared timing protocol, not descriptor
      presence.

- [ ] 7.4 Complete and execute tier D rotations for each class with explicit repetition,
      finite-window boundaries, resource transitions, and maintained-effect upkeep. Verify dynamic
      predictions and traced outcomes; repeated copies of one attack do not establish full rotation
      coverage.

- [ ] 7.5 Execute meaningful pre-veteran fixtures covering level-difference branches and smaller
      equipment pools. Verify achieved levels and branch-specific comparisons, not only low-level
      metadata.

- [ ] 7.6 Cover every supported mercenary archetype, including meaningful bare/equipped comparisons
      and autonomous behavior. Verify repeated-window contribution under the declared statistical
      protocol; Ranger-only descriptors do not establish companion coverage.

- [x] 7.7 Measure the physical mitigation coefficient directly: identical hits against differing defense,
      solving the coefficient from the observed reduction. Measured as 0.000498 against 0.000500 in
      source, fitted over four defense values. One target was held and only its defense changed, because
      the reachable bosses differ in level as well as defense and a second variable would have to be
      removed again. The ceiling is confirmed rather than argued: defense 2000 and defense 10000 took the
      same nine percent of intent. The same series also measured the block chance coupling, 0.17 at
      defense 700 against 0.80 at defense 10000, which is its cap.
- [x] 7.8 Measure debuff landing over 1,000 applications per condition. The runtime experiment held one
      non-elite Snake and `Hunter's Sigil` constant. It changed defense, target level, and caster accuracy,
      then removed the effect after each application. Predicted and observed landing rates were: 0.951 and
      0.958 at defense 100 and level difference 0; 0.901 and 0.892 at defense 100 and level difference 10;
      0.851 and 0.835 at defense 100 and level difference 20; 0.651 and 0.664 at defense 700 and level
      difference 0; 0.601 and 0.607 at defense 700 and level difference 10; and 0.801 and 0.804 at defense
      700, level difference 10, and 0.201 accuracy. Seeds were 7801 through 7806. The results support the
      source level term of 0.005 per level, capped at 0.1, instead of the previous zero assumption.
- [x] 7.9 Measure effective debuff uptime for 120 seconds. `Wyrmbrand Hex (A)` was attempted every
      2 seconds with its 10-second duration and a 0.4 predicted landing probability. The prediction
      includes the skill's 0.3 resistance reduction. Seed 7901 produced 21 landings from 60 attempts,
      108.009 seconds of uptime, and a 0.9001 uptime fraction. The finite-horizon expectation was
      108.680 seconds and 0.9057.
- [x] 7.10 Measure buff category replacement through `Skills.AddOrRefreshBuff`. `Hunter's Sigil` had
      30 seconds remaining before the weaker `Tangle Trap` entered the shared `Debuff AC` category.
      The stronger effect then had zero seconds remaining, while the weaker effect had 30 seconds.
      Adding `Balance of Illithor` in the `Slow` category left both active with 30 and 60 seconds.
- [x] 7.11 Measure a shared category across an owner and companion. The owner held `Hunter's Sigil`,
      and the companion held `Tangle Trap`. Both effects use the `Debuff AC` category. Each retained its
      full 30-second duration. Categories are therefore local to an entity's `Skills` list and do not
      interfere across party members.
- [x] 7.12 Measure integer-schedule gaps for exported cooldowns of 45, 60, 90, 120, 180, and
      300 seconds across 30, 60, 90, 120, 180, and 300-second horizons. A ready skill has fractional
      capacity `1 + horizon / cooldown`. Its executable schedule starts at zero and includes cooldown
      multiples through the horizon. The 36-case matrix had gaps from zero to 0.75 casts. For example,
      a 45-second skill over 60 seconds relaxed to 2.333 casts, scheduled at 0 and 45 seconds, and had a
      0.333-cast gap. A 120-second skill over 90 seconds relaxed to 1.75 casts, scheduled only at zero,
      and had the maximum 0.75-cast gap. Exact cooldown multiples had no gap.
- [x] 7.13 Measure Rogue and Warrior resources with matched inputs. A 20-damage follow-up supplied
      5 resource, and a 100-damage received hit supplied 3. After an equal cost of 4, both classes had
      4 resource. Over the next 3 one-second recovery ticks, Warrior stayed at 4. Rogue finished at 1
      while `Fury` was active because its -0.04 maximum resource per second rounded to -1 per tick.
      Resource projection must therefore include active class effects instead of using one shared policy.
- [x] 7.14 Measure companion output in 20-second windows against a level-5 target with zero defenses.
      Each companion used 50 base damage and 50 base magic damage. Near-stationary totals were Warrior
      0, Cleric 67, Rogue 688, Wizard 525, Druid 266, and Ranger 339. Warrior remained in its priority
      taunt path in the base, distant, moving, and 0.2-haste runs. A 0.25 cooldown reduction after
      5 seconds produced 389 damage over 7 hits, with gaps from 1.533 to 9.165 seconds. Ranger produced
      339 damage near, 563 from a 12-unit start, 382 against a moving target, 651 with 0.2 haste, and
      406 after the same cooldown reduction. Its hit gaps ranged from 0.834 to 11.232 seconds, and its
      first hit ranged from 0.991 to 5.200 seconds. These non-monotonic samples confirm that random skill
      selection and movement state make companion output an observed bound, not a reachable fixed rate.

- [ ] 7.15 Replace fixed descriptor-count/label acceptance with extensible behavioral coverage
      checks. Verify an added valid fixture is accepted and a mislabeled or missing
      handler/school/archetype case cannot satisfy required coverage without execution evidence.

## 8. Baseline and drift gate

- [ ] 8.1 Complete the baseline schema with full report provenance, per-quantity protocols and
      sampling summaries, raw sequences, coverage scope, and reviewed promotion reason. Verify
      evidence can be traced independently of scratch state; existing summary serialization is
      component evidence only.

- [ ] 8.2 Honor comparison failure during baseline capture and comparison. Reject failed,
      incomplete, incompatible, unsupported, or inconclusive required evidence and replace exact
      stochastic equality with the declared drift policy. Verify invalid runs cannot be promoted and
      independent valid samples are judged by that policy.

- [ ] 8.3 Require explicit reviewed baseline promotion after full qualification, not merely a
      nonempty reason. Verify promotion preserves the prior baseline and records evidence, scope,
      identity, protocol, and review reason.

- [ ] 8.4 Check assembly, fixture, model/evaluator, data, and protocol compatibility before numeric
      comparison. Verify a diagnostic mismatch report preserves the old baseline and cannot count as
      verified parity; a version difference alone does not establish cause.

- [ ] 8.5 Integrate only the complete qualified verification command into the per-version update
      procedure. Verify the documented sequence retains mismatch evidence before reviewed baseline
      replacement and does not treat matrix validation as a release gate.

## 9. Reported-build intake

- [ ] 9.1 Accept captured shared build data through the checked adapter with explicit execution
      inputs. Verify unknown schema versions fail rather than partially parse, and a supported
      capture reaches the production evaluation path.

- [ ] 9.2 Honor capture completeness markers and per-measurement dependencies. Verify an unread
      required section blocks parity rather than becoming an empty build section.

- [ ] 9.3 Produce reported-build parity that separates setup mismatch, incomplete evidence, and
      failed comparison. Verify differing fields are named and raw results remain distinct from
      explicitly identified known-defect-normalized predictions.

## 10. Documentation and verification

- [ ] 10.1 Document the verification run in the repository's command documentation, including the
      scratch
      isolation guarantee, the backup step, and the requirement that no other instance is already running.
      A launch does not take the runtime endpoint from an instance that already holds it, so a stale one
      answers every command while the new window is the one on screen.
- [ ] 10.2 Document fixture authoring and parity interpretation in the established documentation
      location. Verify the procedure distinguishes diagnostic tiers, attribution fidelity,
      statistical rejection, and unknown causes without claiming lower-tier passes prove causality.

- [ ] 10.3 Record every formula the comparison relies on as a source citation in the citation
      ledger.
- [ ] 10.4 Run the relevant mod tests, then the build-tool build, then a full verification run
      against a
      freshly built scratch database, and confirm the player save hash is unchanged.
- [ ] 10.5 After the production planner integration and sections 6 through 8 pass, qualify the
      complete baseline and link its persisted report from both changes. Verify matching
      assembly/model/data identities, full coverage, and independent validation before any scoped
      numeric accuracy claim; historical in-sample residuals cannot establish a global bound.
