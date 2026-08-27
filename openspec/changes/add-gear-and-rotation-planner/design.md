## Context

See `proposal.md` for motivation. This section records only the constraints that shape the approach.

The decompiled server source in `server-scripts/` contains the complete combat implementation. Three
properties of that implementation determine the whole design.

Equipment contributes a plain sum. `Equipment.cs` computes every stat bonus as a loop over occupied
slots with positive durability. No item multiplies another item. The map from equipment to stats is
therefore linear.

Every stochastic term has an exact expectation. `Combat.cs:1506-1546` resolves avoidance as one
Bernoulli trial. `Combat.cs:751` applies a symmetric uniform damage range with mean 1.0.
`Combat.cs:842` resolves critical hits as one Bernoulli trial. Weapon procs are memoryless per swing.
Refresh-on-proc effects reach a closed-form steady state.

The rotation is small and deterministic. Each class has 7 to 10 damaging actions on fixed cooldowns
between 4 and 180 seconds. The game has no global cooldown. No proc gates an action.

Action timing is asymmetric. The weapon refractory period gates only a follow-up default attack, and
every completed skill resets it (`Player.cs:2517-2525, 3220-3269`). A skill is limited by its own cast
time and cooldown, not by the weapon interval. The cost of casting a skill is therefore its cast time
plus the delayed auto-attack, and a non-weapon skill sets a flat 0.75 second refractory. One
mechanism does reduce a cooldown: a self buff subtracts `min(remaining * percent, 30)` from every
caster skill (`TargetBuffSkill.cs:277-297`).

Not every skill class evaluates the same formula. `AreaObjectSpawnSkill` applies base damage with no
combat stat at all. `FrontalProjectilesSkill` ignores its populated `damagePercent` field.
`AreaDamageSkill` omits the class special cases that `TargetDamageSkill` applies. A projectile skill
computes damage at cast and applies it on arrival, and voids it when the target dies first.

Some skills require a weapon category (`ScriptableSkill.cs:84-120`). The Rogue has seven damaging
skills that require a dagger, and the Ranger has four that require a bow. A bow occupies the offhand
slot. Weapon choice and rotation are therefore one joint decision.

Two constraints come from the repository. The site must remain functional without JavaScript. Every
hardcoded game value needs a citation to `server-scripts/` that the citation ledger verifies.

The following measurements were taken during exploration against `website/data/compendium.db` and the
level 55 Northern Wastes dummy. They are the evidence for the decisions below.

| Measurement | Result |
|---|---|
| Naive equipment search space, one class at level 50 | 2.5 x 10^25 |
| Exact Pareto dynamic program, 6 stat dimensions | 86,584 frontier points, 204 s |
| Branch and bound pruning of that frontier | 0 points removed |
| Heuristic search optimality gap against the same objective | 0.00 to 0.42 % |
| Auto-attack-only surrogate rank fidelity | rho 0.975, K = 188 |
| Analytic steady-state surrogate rank fidelity | rho 0.998, K = 1 to 3 |
| Steady state against event timeline, long horizon | ratio 0.9034, coefficient of variation 2.86 % |
| Block coordinate ascent convergence | 3 sweeps, every start |
| Block coordinate ascent fixed-point spread across starts | 4.00 % |
| Block coordinate ascent without branch enumeration | 34 % below the branch-enumerated optimum |
| Equipment payload, 887 items, dictionary plus sparse vectors | 90,375 B raw, 21,488 B gzipped |

The following were measured against the running game with a real character, a level 28 Druid, through
HotRepl. They are observations, not derivations.

| Live measurement | Result |
|---|---|
| Stat sheet parity, 8 independent stats | exact match on all 8 |
| Attribute coefficient sweep, 3 attributes across 4 magnitudes | exact match on all rows |
| Observed action cycle, weapon delay 28, zero haste | 1.651 s against 1.620 s predicted |
| Observed damage per hit | 18, 16, 16 against 17 predicted, range 15 to 19 |

A second round was measured against a character created and levelled entirely through engine paths in
an isolated database, so its state is known to be reachable in normal play.

| Quantity, clean level 50 Warrior with 200 veteran points | Result |
|---|---|
| Maximum character level, read from the game | 50 |
| Skill points at the cap | 49 |
| Attribute points at the cap | 249, being 49 from levels and 200 from veteran awards |
| Attributes fixed by race and class progression | 87 |
| Reachable maximum allocated attribute total | 336 |
| Health, energy, and mana maxima | exact match on all three |
| Damage and defense composition with starting gear only | exact match |
| Mercenary damage, magic damage, accuracy, and critical chance | exact match on all four |
| Mercenary roll values against the reachable envelope | both inside range |

A character allocates 249 attribute points at the cap, and 336 is the largest attribute total any
character can reach. A save whose totals exceed 336 is not a valid reference, so a measurement must come
from a character the harness built rather than from arbitrary save data.

Companion equipment is first order. Placing one dagger on a mercenary raised its damage from 17 to 462.
Of that 445 increase, 410 came from the inherited equipment getter and 35 came through the Strength the
item grants. A single item is worth more than twenty times the mercenary's ungeared damage.

The action cycle equals cast time plus the weapon refractory, and animation length adds nothing. A skill
cast therefore costs its cast time **plus** a full refractory reset, not its cast time alone.

A third round measured the refractory branch and the buff category rule directly, with the follow-up
attack loop stopped so that one cast is attributable.

| Live measurement, level 50 character, weapon delay 28, zero haste | Result |
|---|---|
| Refractory after a skill that requires a weapon category | 1.120 s against 1.120 s predicted |
| Refractory after a skill with no weapon category | 0.750 s against 0.750 s predicted |
| Refractory after a target debuff that deals no damage | 1.120 s, a full weapon interval |
| Target block chance against its defense term | matches `defense * 0.0001` to four decimals |
| Weaker same-category debuff applied over a stronger one | the stronger debuff expires |
| Stat contribution of an expired debuff before cleanup | still applied for one tick |

The refractory branch is selected by the skill's own fields, not by whether the skill is a basic attack.
A skill that requires a weapon category takes the weapon interval, which haste shortens to a floor of
0.25 s. A spell, or a skill with no weapon category, takes a flat 0.75 s that haste never shortens. A
skill that deals no damage still pays the full cost. Melee classes hold mostly weapon-category damaging
skills, and caster classes hold mostly the flat kind, so haste changes the rotation cost of one group
and not the other.

Target avoidance and mitigation are not fixed properties of a target. A maintained debuff reduces both,
and one debuff reduced the measured dummy's defense to its floor. Landing is not certain: a resist roll
gates application, and caster accuracy subtracts from the resist probability
(`TargetDebuffSkill.cs`, `Combat.cs:1509-1515`).

## Goals / Non-Goals

**Goals:**

- Produce a ranked build list whose ordering is reproducible and whose displayed numbers carry a
  stated error boundary.
- Keep every published formula traceable to a cited region of decompiled source.
- Run the whole search and evaluation in the browser within interactive latency.
- Make the default result verifiable inside the game.

**Non-Goals:**

- Bit-exact reproduction of integer rounding at every pipeline step. The model targets ranking
  fidelity and a bounded absolute error.
- A provably optimal build. Measurement showed that exactness costs 204 s and buys under 0.5 %.
- Any evaluation of allied player behaviour. The design models effects on the planned character only.

## Decisions

### Deterministic evaluation instead of Monte Carlo simulation

Every random term in the pipeline has an exact expectation, so sampling adds variance without adding
information.

The alternative is the Raidbots and SimulationCraft approach. SimulationCraft reports a 95 percent
confidence interval of plus or minus 1.96 sigma over the square root of the iteration count. To
separate two independent means by a relative delta of 1 percent at a coefficient of variation of 0.5
requires about 19,208 iterations per pair. A delta of 0.1 percent requires about 1,920,801. Against a
large candidate set this is not affordable, and it would introduce ranking noise into a problem that
has none.

SimulationCraft already provides `average_range`, which averages damage ranges instead of sampling
them. That option validates the technique.

### Two evaluation layers with different jobs

The search layer uses an analytic steady state. The display layer uses a deterministic event
timeline.

The analytic layer solves the rotation as a fractional knapsack. Each action has a damage value, an
energy cost, a cast time, and a cooldown. The binding constraints are the energy budget, the per
action cooldown rate, and the one-second time budget. Auto-attacks fill the remaining time and fund
the energy budget.

Measured rank fidelity is rho 0.998 with the true best build at surrogate rank 1 to 3. The top 20
candidates contain the optimum in every encounter tested. The layer costs about 50 floating point
operations.

The analytic layer overestimates sustained output by a stable factor. The measured ratio of timeline
to steady state is 0.9034 with a coefficient of variation of 2.86 percent. A single multiplicative
calibration reduces mean absolute error to 2.32 percent, but the 95th percentile remains 5.59
percent. That tail is too wide for a headline number, so the event timeline produces the displayed
value.

The event timeline also produces the per-ability attribution and buff uptime breakdown. A reader
needs that breakdown to trust a number.

An auto-attack-only surrogate was measured and rejected. Its rank correlation of 0.975 looks healthy,
but the true best build sat at rank 188, and its own top pick was 16.6 percent worse. Rank
correlation alone is not a sufficient acceptance test for a surrogate.

### The event timeline is a hybrid, not pure discrete-event

`NetworkManagerMMO.cs:105-117` runs resource recovery on a fixed one-second tick. Casts, swings, and
cooldowns use exact timestamps.

The timeline therefore advances exact-timestamp events for actions and a fixed one-second tick for
resource, damage-over-time, and heal-over-time recovery. A pure discrete-event loop would misplace
the tick boundary. A pure fixed-tick loop would quantise cast and swing times that the game does not
quantise.

### Enumerate discrete branches before the local search

Block coordinate ascent alone is not sufficient. Without branch enumeration it converged 34 percent
below the branch-enumerated optimum.

The cause is structural. A one-swap neighbourhood cannot cross from a one-hand and shield build to a
two-handed build, because the shield slot must empty in the same step as the weapon change. Hill
climbing sees a valley between the two basins. Weapon delay is also a proxy for weapon class, and
two-handed swords reach 700 maximum damage against 425 for one-handed weapons.

The design therefore enumerates the hand configuration and the weapon candidate as an outer loop,
then runs the local search inside each branch. Armour set commitments are enumerated the same way,
because `PlayerEquipment.cs:1579` activates attribute bonuses at three or more matching pieces and
`PlayerSkills.cs:562-578` activates skill level bonuses at exactly five.

### Multi-start block coordinate ascent over three coupled blocks

The three blocks are equipment, attribute allocation, and skill allocation. They couple through the
stat sheet. Passive skills contribute a damage percentage that multiplies the equipment contribution.
`Innate Strength` adds both raw damage and energy capacity. Buff haste interacts with the weapon swing
floor.

Accuracy has three consumers and does not saturate at one of them. It subtracts from the target's block
probability, it subtracts from the resist probability that gates a debuff, and it feeds the hit
calculation (`Combat.cs:1509-1515`). Against a target whose block chance accuracy cannot reach zero,
accuracy keeps paying through debuff uptime. The model therefore SHALL NOT treat accuracy as capped once
avoidance reaches its floor.

Measured convergence is 3 sweeps from every start. Measured fixed-point spread across four starts is
4.00 percent, so multiple starts are required and a single start is not acceptable.

The alternative was an exact Pareto dynamic program. It was measured at 86,584 frontier points and
204 s for six stat dimensions, with frontier size growing geometrically at a factor of about 3.2 per
added dimension. Branch and bound removed no points, because the multiplicative objective makes an
admissible completion bound far too loose. Exactness was rejected because the heuristic gap is under
0.5 percent and exactness cannot afford a faithful objective.

### Buffs are binary maintenance decisions

Each buff has a fixed duration and cooldown, so its steady-state uptime is the smaller of 1 and the
duration divided by the cooldown. Maintaining it costs a fixed energy rate and a fixed time rate.

Duration over cooldown is an upper bound, not the uptime. A debuff on a target must also survive a
resist roll, so its uptime is that bound multiplied by the landing probability.

The evaluation therefore enumerates the subset of buffs to maintain. For the Warrior this is 2 to the
power of 7 subsets. This is exact and avoids a scheduling search.

### A buff category holds one buff, and the newest wins

`Skills.AddOrRefreshBuff` refreshes a buff of the same name in place. Otherwise, when the incoming buff
carries a non-empty category, the engine expires **every** buff already in that category and then adds
the incoming one. It compares category names only. It never compares magnitude, level, or remaining
duration.

A weaker buff therefore destroys a stronger one in the same category. This was measured: applying a
125-point defence debuff over a 340-point debuff in the same category expired the stronger one.

Two consequences shape the model.

The subset enumeration cannot treat same-category effects as independent. One category contributes at
most one effect, so the enumeration selects at most one member per category.

The collision crosses entity boundaries. A mercenary and its owner draw from separate skill lists that
share categories, so a mercenary can expire the player's debuff and the player can expire the
mercenary's. Mercenary action selection is uniformly random among ready skills, so the outcome is a
random mixture rather than a schedule. An owned entity's action can therefore lower total output, and
the optimizer must be able to select **not** using an action.

Expiry is lazy. An expired buff still contributes until a cleanup pass removes it. The window is one
tick and does not affect a sustained rate, so the model treats expiry as immediate and records the
divergence.

Buff uptime matters. Warrior buff bonuses total 123 percent damage at nominal values but 85 percent
after uptime weighting, against 25 percent from always-on passives.

### The resource engine drives the rotation

`Combat.cs:1256-1262` returns 25 percent of post-mitigation auto-attack damage as energy for the
Warrior and the Rogue. `Combat.cs:1005-1012` returns 25 percent of damage as mana for the Wizard
casting Mystic Spark. `Combat.cs:1201-1206` returns a square-root scaled amount when a Warrior or
Rogue takes physical damage.

Buff-driven percentage regeneration exists but is a minor term. Nominal rates of 3 to 5 percent per
second reduce to under 1 percent per second after duty cycle, and some buffs are net negative.

Energy income is therefore proportional to auto-attack output, not to resource capacity. The model
must express this, because the direction of the dependency changes which builds win.

### Each controlled entity is solved by the same solver

A mercenary equipment component inherits the player equipment stat pipeline. It overrides only the
four Mirror lifecycle methods, so every stat channel is wired
(`MercenaryEquipment.cs:7,86-108`). Mercenary gear feeds damage twice, once directly and once through
the Strength it adds (`MercenaryEquipment.cs:95-158`).

A solo owner can field four mercenaries at once (`Player.cs:9800-9870`), which is 64 further
equipment decisions. Their output is not a rounding error, so a total-output figure that ignores it is
wrong.

The design therefore runs the same solver per controlled entity. For a best-in-slot plan the entities
are independent, because each draws from the full published item set. For an owned-gear plan they are
coupled by a shared inventory, because one physical item cannot be equipped twice. The owned-gear case
is therefore an assignment problem across entities rather than five independent searches.

Two mercenary properties resist a fixed rotation. Action selection is uniformly random among ready
damage and debuff skills every 2 to 4 seconds, and a healer archetype refuses a cast that would drop
it below 35 percent mana (`PetSkills.cs:65-178`). The design models mercenary output as the
expectation over that uniform selection, and states that it is an expectation rather than a schedule.

Mercenary base stats derive from owner progression on a per-archetype cadence, and the base combat value
of a new hire is drawn from a range whose upper bound is the owner's level times a factor of that
companion's race (`Player.cs:7979-8205, 4510-4685, 9780-10023`). The harness design records the measured
factor for each race, and this design does not restate it. A mercenary is therefore a rolled asset, and the
planner treats its base stats as an input rather than a value it can assume.

### Companions are modelled as newly hired

A veteran level adds one base damage and one base magic damage to an active mercenary, and 0.0025 to its
health and resource multipliers (`server-scripts/Player.cs:4527-4537`). Its skill level, by contrast, is
computed from the owner's state when it spawns (`server-scripts/PetSkills.cs:27-41`).

The rolled values survive a restart and the accumulation on top of them does not. The save holds what
was rolled at hire, and the load path rebuilds the multipliers from the owner's veteran total while
assigning the two damage values from the stored roll verbatim
(`server-scripts/Player.cs:9971-9993`). The damage accumulation is therefore transient, and it is lost
every time the game loads, while the multiplier accumulation is restored.

A stored roll of zero is treated as missing rather than as a value, so the load path rolls a fresh
number from a different range instead. A companion whose hire roll produced zero therefore has
different damage in every session.

This was measured across a reload at ten veteran points. Base damage rose from 27 to 37 and returned to
27. The health multiplier rose from 1.004374 to 1.029374 and stayed there. The defect is recorded in
`docs/game-bugs/mercenary-veteran-damage-lost-on-load.md`.

The model therefore takes the stable value in each case. Base damage is the value a newly hired companion
receives, because that is what a player holds after any restart. The health and resource multipliers
include the veteran contribution, because the engine reconstructs it deterministically.

The consequence must be stated to a reader. A player who has not restarted since earning veteran levels
will measure more damage than the model reports, and will match it again after a restart.

Which roll to assume follows the distinction the planner already draws. Dismissal has no cost beyond the
hire price (`server-scripts/Player.cs`, the dismiss command destroys the companion outright), and
re-hiring draws a fresh roll, so the best roll is reachable. A best-in-slot plan therefore assumes the
best reachable roll, exactly as it assumes the best obtainable item. A plan limited to what a player owns
uses that player's supplied value.

The playable races are Human, Elf, Dark Elf, Dwarf, Fire Goblin, Felarii and Drassar. `dark_alliance`
is a faction shared by Dark Elf and Fire Goblin, so it is not a value this table is keyed on.

At the level cap the best reachable base damage is 47, for a Felarii or Drassar companion whose race
factor is 0.95. The accumulated value reaches 247. On the geared companion that was measured, that is 508
against 708, so the policy lowers the figure by about 28 percent. Equipment still dominates: 461 of the
508 comes from one item.

### Resource capacity is a damage stat against a high-mitigation target

A resource-burn skill sets damage to twice the current resource pool and bypasses both avoidance and
mitigation (`TargetDamageSkill.cs:128-169`, `TargetProjectileSkill.cs:216-220`,
`Combat.cs:644-647,812-838`).

Ordinary damage against a target with 2000 defense keeps one tenth of its value. Resource-burn damage
keeps all of it. The relative value of maximum resource therefore rises with target mitigation, and
the model must express resource capacity as an output term and not only as a rotation budget.

Energy and mana do not reach capacity the same way. `Mana.max` multiplies its base curve by the
entity's mana multiplier, and `Energy.max` does not read its energy multiplier at all
(`server-scripts/Energy.cs:27-39`). For a companion that uses energy, which is a Warrior or a Rogue,
the quality rolled at hire and the whole veteran accumulation therefore change nothing. This is a
defect, recorded in `docs/game-bugs/mercenary-energy-multiplier-is-never-used.md`, and the model
represents what the game does rather than what the multiplier implies. A figure that assumed the
multiplier applied would become wrong twice: it is wrong now, and it would need changing again when
the defect is fixed.

### Consumables are part of an honest maximum

The strongest food effects add 25 damage or 3 percent damage for 1800 seconds. The strongest potions
add 25 to an attribute for 600 seconds. Both exceed any plausible benchmark duration.

The model therefore treats a declared consumable set as part of the build. The planner shows which
consumables a figure assumed, because a reader comparing against their own measurement needs to match
them.

### Level 50 with 200 veteran points as the default, and level selects the target

Veteran points exist only at level 50 and above, and 197 equipment items gate at exactly level 50.
There are two build regimes rather than a continuum.

The planner defaults to level 50 with 200 veteran points against the level 55 dummy. Level remains an
input. Selecting a level selects the nearest dummy from the five that exist at levels 40, 40, 45, 50,
and 55. The level difference terms then apply without special handling.

This avoids the failure that Ovale and Hekili both document, where default content assumes maximum
level abilities and misleads a lower level character.

A dummy understates every term that grows with target toughness. Physical mitigation is
`clamp(defense * 0.0005, 0, 0.9)`, so it saturates at 1800 defense. A dummy carries a few hundred
defense and sits far below that ceiling, while a raid boss sits above it. A debuff that removes defense
is therefore worth little against a dummy and much more against a boss, and the resist roll that gates
the debuff is milder against a dummy for the same reason. The default target is honest for ranking gear
on the stat sheet. It is not sufficient for ranking a rotation that maintains a debuff, so a reported
figure names its target.

### Skill allocation is a real constraint

Maxing every normal skill costs 93 points against 49 available. Maxing every veteran skill costs 217
to 249 points against 200 available. A build therefore cannot hold every skill at its maximum level, and
evaluating one that does overstates output.

### Client-side compute, no server endpoint

The measured payload is 21,488 B gzipped for all 887 equippable non-costume items. This is under 1
percent of the compressed database the map route already downloads.

A Cloudflare Worker endpoint is possible but unnecessary. Static assets plus a browser worker avoid
per-request CPU limits and cost nothing.

### Validation through the game's own combat meter

`Combat.cs:427-490` maintains per-entity damage and healing totals with an active-seconds
denominator, and `Player.cs:8256-8285` resets them across the player, the pet, and four mercenaries.

The level 55 dummy has a `damage` value of 0 and is immobile, so a predicted number can be compared
against a measured one under controlled conditions.

Two mechanisms use that, and they answer different questions. The verification harness measures authored
fixtures on every run and fails on drift, which is what detects a modelling error systematically. This
capture answers a reader's own question: whether the number published for *their* build matches what
their game reports. Neither replaces the other, and the capture belongs in this change because a planner
that cannot be checked against the reader's own game is not trustworthy to that reader.

## Risks / Trade-offs

- Absolute accuracy is unverified against the running game. Every figure in this design compares one
  model against another. → The verification harness records a golden baseline against the running game
  before the planner is published, and the capture mod in this change lets a reader repeat the
  comparison on their own build.
- Reading a sample of a code region reliably misses mechanics, because the damage path branches on
  class, skill type, damage school, and entity kind. → Model coverage is established by enumerating a
  code region, not by sampling it. Each formula carries a source citation and a unit test with fixed
  inputs. A claim that a mechanic does not exist requires an exhaustive search, recorded as such.
- The published data contains a convenient scalar that is wrong for most spawns.
  `monsters.block_chance` is sampled at level 50 and already folds in the `defense * 0.0001` term.
  Applied to the level 55 default target it gives 0.084 where the true value is 0.164, an error of 73
  percent, confirmed against a live reading. → The model reads `block_chance_base` and
  `block_chance_per_level` with the spawn's own defense. A denormalised scalar is never read where
  curve columns exist beside it.
- Three exported data fields have no runtime behaviour: `requiredWeaponCategory2` is never checked,
  `multiplierEnergy` is never applied, and `is_assassination_skill` has no consumer. → The model reads
  behaviour from code, never from the presence of an exported field. Each such field is recorded so a
  later reader does not implement it.
- Skill classes disagree with their own data. `FrontalProjectilesSkill` ignores a populated
  `damagePercent`, and `AreaObjectSpawnSkill` ignores the caster's combat stat entirely. → Each
  damaging skill class gets its own evaluation path and its own test, rather than one shared formula.
- The analytic surrogate can misrank if a future mechanic couples the rotation to a stat outside its
  basis. → The candidate count K is configurable, and a rank-fidelity check runs against the event
  timeline whenever the model changes.
- Block coordinate ascent is start-dependent at 4.00 percent. → Multiple starts are required, and the
  start count is a recorded parameter rather than an implementation detail.
- The fractional relaxation of the rotation cannot be realised by an integer cast schedule. The
  measured gap is stable at about 10 percent. → The event timeline produces every displayed number.
- A game patch can silently invalidate a formula. → The citation ledger already fails on drift, and
  the derived payload regenerates from the pipeline.
- Displayed precision can imply false confidence. → Results within the stated error boundary are
  presented as an equivalence band, following the sidegrade pattern that Raidbots documents.

## Open Questions

- The integrality gap of the fractional rotation relaxation was measured in aggregate. Whether it
  varies at cooldowns of 45 s and above is not known. This affects the calibration constant, not the
  approach.
- Rogue resource behaviour may differ qualitatively from Warrior behaviour, because `Fury` carries a
  negative regeneration term while the damage return is unchanged. This affects a per-class default,
  not the architecture.
