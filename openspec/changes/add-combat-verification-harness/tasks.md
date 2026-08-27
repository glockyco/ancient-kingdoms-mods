## 1. Fixture descriptor

- [x] 1.1 Define the descriptor schema covering class, race, level, veteran progression, attribute
      allocation, skill levels per point pool, all sixteen equipment slots with augments, companions with
      their own equipment and rolled values, declared consumables, the target spawn, the action sequence,
      the facing for each action, and a seed. Include a schema version and the game version the
      descriptor was written against.
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
- [x] 1.5 Confirm the descriptor round-trips with the planner's character export payload, so a captured
      build is usable as a fixture without conversion.
- [x] 1.6 Remove the class and race pairing from the rules read after world entry. The pairing is a game
      rule, but it lives in the character creator, which enables one class button per race. The creator is
      live exactly where creation happens, so the pairing is checked there rather than answered from a
      copy. Nothing reports it as unchecked, because nothing has to guess.

- [ ] 1.7 Split the checks by what each one needs. The schema version, the presence of the sections a
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
- [x] 2.6 Add a scratch reuse check: reuse an existing scratch database when the recorded game version
      and the fixture definitions both match, and rebuild otherwise.
- [x] 2.7 Verify isolation with an automated assertion that the player save's content hash is unchanged
      across a full run.

- [ ] 2.9 Refuse to launch while another instance answers the runtime endpoint, and report that rather
      than proceeding. A launch does not take the endpoint from the instance holding it, so a run beside a
      stale one measures a process it does not control. Shut the game down when a run ends, including when
      it fails.

- [ ] 2.8 Keep a character slot free before creating one. The roster holds at most eight characters, and
      past that the selection screen disables creation and registers no handler, so a matrix over six
      classes and the targeted fixtures beside them exhausts it. Reuse a character whose class a fixture
      needs, or remove one an earlier run created.

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
- [ ] 3.3 Reuse the existing world-entry character selection so a fixture matrix can address any of the
      six classes. Selection by name already exists and is covered by the runtime control capability, so
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
- [ ] 3.7 Implement item granting and equipping by assigning equipment slots, so the equipment-changed
      callback applies attribute bonuses and armour set thresholds.
- [ ] 3.8 Implement companion acquisition through the engine's hire command, ordered after the owner's
      progression is complete so the companion receives no part of the per-level increment.
- [ ] 3.9 Assign companion rolled values directly after acquisition, validating each against the race and
      archetype envelope, and record a value the engine never reads without letting it affect output. The
      load path restores the value stored at hire, so an assigned value lives only until the game reloads,
      and no later step may reload it.
- [ ] 3.10 Implement companion equipping through the companion's equipment slots.
- [ ] 3.11 Fail materialization loudly when a step does not take effect, naming the step and the value
      that did not change. The engine reports nothing: an out-of-range index, a wrong entity state, and a
      failed affordability check all return without an error and without an effect. A step therefore
      reads the value it intends to change, acts, and reads again, and the harness supplies the reason
      the engine does not.

## 4. Probe: stat sheet and cadence

- [ ] 4.1 Implement a stat sheet probe that reads every combat stat, every attribute, both resource
      maxima, health maximum, and the per-slot equipment contribution.
- [ ] 4.2 Implement an action interval probe that records action timestamps and derives the observed
      interval, and have it report the weapon delay and haste it observed alongside.
- [ ] 4.3 Implement a per-hit probe by subscribing to the target's damage event, recording attacker,
      amount and damage type with a server timestamp.
- [ ] 4.4 Seed the random generator before a measurement and record the seed with the results.
- [ ] 4.5 Have every probe declare the fidelity tier it achieved.
- [ ] 4.6 Implement a target-state probe that reads the target's defense, block chance, magic resist and
      each elemental resist, plus its active effect list with each entry's category and remaining
      duration. It reads the target, not the caster.
- [ ] 4.7 Make the probe quiesce the caster before a reading: stop the follow-up attack loop, clear the
      pending action and the target, then confirm the refractory value is unchanged across two samples.
      Without this an auto-attack rewrites the value between samples and the reading is unattributable.
- [ ] 4.8 Have the target-state probe re-read after the engine's cleanup pass, because an expired effect
      still contributes for one tick and a single reading captures the pre-cleanup value.

## 5. Probe: skill attribution

- [ ] 5.1 Add a postfix on the damage entry point that records the skill, damage type, victim, and final
      amount per hit. The method resolves as a single overload and retains its interop method-info
      pointer, so it is patchable.
- [ ] 5.2 Make the trace tolerate the patch failing to apply: fall back to the lower fidelity tier and
      report the tier reached rather than aborting the run.
- [ ] 5.3 Emit the trace as a timestamped event log usable for rotation comparison.
- [ ] 5.4 Verify the trace against the per-hit event probe on the same run, so the two agree on hit count
      and total damage.

## 6. Comparison and reporting

- [ ] 6.1 Implement per-quantity comparison covering every stat, the action interval, per-hit damage and
      sustained output, reporting each result separately rather than one verdict.
- [ ] 6.2 Assert on a mean within tolerance and an observed range within predicted bounds, and fail when
      any observed value falls outside its bounds regardless of the mean.
- [ ] 6.3 Record fixture identity, target, game version, model version, seed and event count in every
      report.
- [ ] 6.4 Present tier results in order so the lowest failing tier is evident, and mark higher tiers
      unreliable when a lower tier fails.
- [ ] 6.5 Record actions the engine refused, with the reason, and exclude them from the action count.

## 7. Fixture matrix

- [ ] 7.1 Add tier A fixtures, needing no combat: one per class at the level cap with full veteran
      progression, plus targeted fixtures for a three-piece armour set, an exactly-five-piece set, the
      attack speed floor, the avoidance floor, an augment, and a declared consumable set.
- [ ] 7.2 Add tier B fixtures: a single hit per damaging skill class, including the class that ignores its
      damage multiplier field and the class that ignores the caster's combat stat entirely.
- [ ] 7.3 Add tier C fixtures: basic attack only, swept across weapon delay and haste, including a case
      at the attack speed floor.
- [ ] 7.4 Add tier D fixtures: a full build over a stated duration with an explicit action sequence, per
      class.
- [ ] 7.5 Add lower-level fixtures at the pre-veteran levels so the level difference terms and the
      smaller equipment pool are covered.
- [ ] 7.6 Add a companion fixture that measures contribution with and without equipment, reported as an
      expectation over the engine's random action selection.
- [ ] 7.7 Add target-state fixtures that measure the physical mitigation coefficient directly: identical
      hits against targets of differing defense, solving the coefficient from the observed reduction. The
      model reads this coefficient from source and it has never been measured.
- [ ] 7.8 Add a fixture that measures the debuff landing rate over repeated attempts against targets of
      differing defense and at differing caster accuracy, reporting the observed rate against the
      predicted probability. This also resolves the level-difference term, which is currently unknown and
      assumed to be zero.
- [ ] 7.9 Add a fixture that measures effective debuff uptime over a stated duration, so the product of
      the duration bound and the landing probability is checked rather than assumed.
- [ ] 7.10 Add a buff category fixture: apply a weaker effect over a stronger one in the same category and
      assert the stronger one expires, then apply two effects in different categories and assert both
      persist.
- [ ] 7.11 Add a cross-entity category fixture: have a companion and its owner hold effects in one shared
      category and record which survives, so the planner's interference requirement is measured rather
      than argued.

## 8. Baseline and drift gate

- [ ] 8.1 Define the baseline format storing, per fixture and per quantity, the seed, event count, mean
      and predicted bounds. Retain a full observed sequence beside it as a non-gating artifact.
- [ ] 8.2 Implement comparison against the baseline and fail the run when a quantity has changed,
      reporting the quantity and both values.
- [ ] 8.3 Make baseline updates an explicit, reviewed operation rather than an automatic rewrite.
- [ ] 8.4 Report a game version difference before comparing, so a change is attributed to the update
      rather than to the model.
- [ ] 8.5 Add the verification run to the per-version update procedure alongside the existing source
      citation check.

## 9. Reported-build intake

- [ ] 9.1 Accept a build captured from a player's game as a fixture, rejecting an unrecognised schema
      version rather than parsing it partially.
- [ ] 9.2 Honour a payload's completeness markers, treating an unread section as missing rather than
      empty.
- [ ] 9.3 Produce a parity report for a reported build that distinguishes a model disagreement from a
      difference in the reported setup, naming the differing field.

## 10. Documentation and verification

- [ ] 10.1 Document the verification run in the repository's command documentation, including the scratch
      isolation guarantee, the backup step, and the requirement that no other instance is already running.
      A launch does not take the runtime endpoint from an instance that already holds it, so a stale one
      answers every command while the new window is the one on screen.
- [ ] 10.2 Add a skill or procedure document for authoring a fixture and interpreting a parity report,
      covering the tier ladder and what a failure at each tier implies.
- [ ] 10.3 Record every formula the comparison relies on as a source citation in the citation ledger.
- [ ] 10.4 Run the relevant mod tests, then the build-tool build, then a full verification run against a
      freshly built scratch database, and confirm the player save hash is unchanged.
- [ ] 10.5 Confirm the planner change's requirement that predicted values are validated against the
      running game is satisfied by a recorded baseline.
