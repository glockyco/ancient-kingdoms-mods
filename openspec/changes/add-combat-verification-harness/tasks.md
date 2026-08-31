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
- [ ] 1.5 After planner tasks 3.1 and 10.1 define both adapters, round-trip the shared build envelope
      between a fixture and a character capture. Verify fixture-only execution fields and capture-only
      completeness and container fields remain outside that envelope.
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
- [x] 2.6 Add a scratch reuse check: reuse an existing scratch database when the recorded game version
      and the fixture definitions both match, and rebuild otherwise.
- [x] 2.7 Verify isolation with an automated assertion that the player save's content hash is unchanged
      across a full run.

- [x] 2.8 Reconcile the existing roster-full handling with the matrix lifecycle. Keep a character slot
      free before creation, reuse a character whose class a fixture needs, or remove one an earlier run
      created. Add a game-backed run that starts with all eight slots occupied.

- [x] 2.9 Refuse to launch while another instance answers the runtime endpoint, and report that rather
      than proceeding. A launch does not take the endpoint from the instance holding it, so a run beside a
      stale one measures a process it does not control. Shut the owned game process down on success and
      every failure path, and prove endpoint ownership with a stale-instance run.

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
- [x] 3.9 Assign the health multiplier, the resource multiplier and the base combat value directly after
      acquisition, reading each one back. The resource follows the archetype. Do not assign the race: it is
      drawn from a list the archetype allows, so an assigned one produces a companion the game never
      offers. Check the drawn race against the fixture instead, and let the seed make it reproducible. The
      load path restores the values stored at hire, so an assigned value lives only until the game reloads,
      and no later step may reload it.
- [x] 3.10 Implement companion equipping through the companion's own command, granting each item into the
      owner's inventory because that is where the command reads from. The item's level requirement is
      checked against the owner's level, not the companion's.
- [x] 3.11 Fail materialization loudly when a step does not take effect, naming the step and the value
      that did not change. The engine reports nothing: an out-of-range index, a wrong entity state, and a
      failed affordability check all return without an error and without an effect. A step therefore
      reads the value it intends to change, acts, and reads again, and the harness supplies the reason
      the engine does not.

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


- [ ] 6.1 Implement per-quantity comparison covering every stat, the action interval, per-hit damage and
      sustained output, reporting each result separately rather than one verdict. Per-hit damage is two
      quantities: the amount the caster asked for, which the probe reads from the engine, and the
      reduction applied to it. A model can be right about one and wrong about the other.
- [ ] 6.2 Assert on a mean within tolerance and an observed range within predicted bounds, and fail when
      any observed value falls outside its bounds regardless of the mean.
- [ ] 6.3 Record fixture identity, target, game version, model version, seed and event count in every
      report.
- [ ] 6.4 Present tier results in order so the lowest failing tier is evident, and mark higher tiers
      unreliable when a lower tier fails.
- [ ] 6.5 Record actions the engine refused, with the reason, and exclude them from the action count.

## 7. Fixture matrix

Tasks 7.7 through 7.14 are experiments rather than model checks. They establish quantities and
policies the model needs, so they run before the corresponding formulas are finalized. Tasks 7.1
through 7.6 are comparison fixtures and wait for the model where they require predictions.


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
- [x] 7.7 Measure the physical mitigation coefficient directly: identical hits against differing defense,
      solving the coefficient from the observed reduction. Measured as 0.000498 against 0.000500 in
      source, fitted over four defense values. One target was held and only its defense changed, because
      the reachable bosses differ in level as well as defense and a second variable would have to be
      removed again. The ceiling is confirmed rather than argued: defense 2000 and defense 10000 took the
      same nine percent of intent. The same series also measured the block chance coupling, 0.17 at
      defense 700 against 0.80 at defense 10000, which is its cap.
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
- [ ] 7.12 Measure integer-schedule gaps for skills with cooldowns of 45 seconds and above across
      representative fight horizons. Record the fractional relaxation, executable schedule, and gap.
- [ ] 7.13 Measure Rogue and Warrior resource behavior separately under matched damage, skill cost, and
      horizon inputs. Record the negative `Fury` regeneration effect instead of applying one class policy.
- [ ] 7.14 Measure companion output by archetype, melee or ranged behavior, initial distance, target
      movement state, haste, and cooldown reduction. Record observed cadence and output bounds so the
      planner does not treat engine cadence as a reachable rate without qualification.

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
- [ ] 10.5 After the planner model and sections 6 through 8 are complete, record the baseline that
      satisfies the planner's running-game validation requirement and link the report from both changes.
