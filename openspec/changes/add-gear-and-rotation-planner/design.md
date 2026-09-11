## Context

See `proposal.md` for motivation. This section records only the constraints that shape the approach.

The decompiled server source in `server-scripts/` supplies combat rules. Exported prefab data and
runtime measurements establish the inputs and behavior that source alone cannot confirm. The following
constraints shape the design.

Equipment contributes a plain sum. `Equipment.cs` computes every stat bonus as a loop over occupied
slots with positive durability. This additive slot contribution does not make the whole build objective linear: progression, passives,
set thresholds, caps, and skill rules still interact.

Individual random draws have known distributions. `Combat.cs:1506-1546` resolves avoidance as a
Bernoulli trial, `Combat.cs:751` applies a symmetric damage range, and `Combat.cs:842` resolves critical
hits. Their means do not establish the expectation of a timeline with rounding, resource gates,
refresh effects, or health thresholds. Each approximation needs an explicit validity domain.

The player action set is small, but an executable rotation depends on current resources, cooldowns,
target health, and effects. Cooldown reduction and random resource returns can change later actions.
A repeatable deterministic evaluator is not proof that these state transitions have exact expectations.

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
level 55 Northern Wastes dummy. They support the search decisions below, not current game-parity or universal search-gap claims.

| Measurement | Result |
|---|---|
| Naive equipment search space, one class at level 50 | 2.5 x 10^25 |
| Exact Pareto dynamic program, 6 stat dimensions | 86,584 frontier points, 204 s |
| Branch and bound pruning of that frontier | 0 points removed |
| Heuristic-to-reference search score gap against the same objective | 0.00 to 0.42 % |
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
| Recorded total (class/race progression plus allocated points) | 336 |
| Health, energy, and mana maxima | exact match on all three |
| Damage and defense composition with starting gear only | exact match |
| Mercenary damage, magic damage, accuracy, and critical chance | exact match on all four |
| Mercenary roll values against the reachable envelope | both inside range |

In this probe, the allocation budget is 249 points and class/race progression contributes 87 points;
the recorded total is 336. The 336 value is not an allocated-only total or a universal attribute
ceiling. A reproducible comparison must use a character the harness built with the same recorded
progression and allocation state rather than arbitrary save data.

A real export on Ancient Kingdoms 0.9.31.1, Steam build 24986533, wrote `progression.json` with seven
race starts, 300 class-level rows, and 50 level budgets. The required-input preflight joins those rows to
the six exported classes. It also requires the existing skill-tree, mercenary, food, potion, and
ammunition fields. Book support must additionally require `book_strength_gain`, `book_dexterity_gain`,
`book_constitution_gain`, `book_intelligence_gain`, `book_wisdom_gain`, and `book_charisma_gain` before
publication. Task 3.10 adds that preflight; the existing exporter already emits these six fields.
The item export contains 17 gain-bearing books, while the inspected planner payload contained zero
book rows. A positive-control source query found all 17. These observations do
not define a future book count, so publication checks the required fields and classifications rather
than hardcoding 17.

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

- Produce repeatable rankings and name model accuracy, finite-run variance, and search quality
  separately. Publish numeric boundaries only within domains supported by their evidence.
- Keep every published formula traceable to decompiled code, exported data, or a repeatable runtime
  measurement.
- Cover every effect admitted to the search domain, or fail publication when an effect has no model.
- Run search and evaluation in a dedicated browser worker and measure its latency, memory, progress,
  cancellation, and link-size behavior before release.
- Make a manually authored or locally imported player build comparable with an optimized build.

**Non-Goals:**

- Bit-exact emulation of floating-point behavior outside the named integer-rounding boundaries that can
  change a ranking.
- A provably optimal build. Measurement showed that exactness costs 204 s and buys under 0.5 %.
- Allied-player or pet-build optimization. The solved roster is the player and active mercenaries.
- Multi-target, movement, threat, healing, and survivability simulation in this change.

## Decisions

### One evaluation scenario owns every result

A build alone does not determine sustained output. Every evaluation therefore consumes a versioned
scenario containing the target, fight duration, initial resource and cooldown state, active buffs and
consumables, ammunition supply, incoming-damage event stream, included controlled entities, and target
count. The default scenario is one stationary, non-attacking, full-health training dummy with one
player and the selected active mercenaries.

A result and its permalink carry the scenario and result mode. Numeric comparisons require matching
scenario, model, evaluator, and game-data identities, or an explicit compatible interpretation that does
not claim verified parity across an incompatible boundary. Area skills are evaluated against the scenario's explicit target count; this
change supports one target and refuses another value rather than silently treating an area skill as a
single-target skill.

### Complete effect coverage is a release invariant

The derived payload classifies every equippable item effect, ammunition effect, consumable effect,
learned-book gain effect, and skill behavior that can influence the objective. It admits the required
existing book gain fields and their versioned definitions. The model registry classifies each kind as
modelled, excluded by a stated search-domain rule, or unsupported. Publication fails when a required
field, book definition, or admitted kind is missing or unsupported. Search never scores an unknown
effect as zero.

A refresh-proc steady-state formula is admissible only under its stated assumptions. The displayed
finite-window timeline accounts for initial state, applications, refresh, and expiry. Cooldown-reduction buffs alter every active
cooldown the engine alters. Ammunition supply constrains ranged attacks. Initial durability is captured
for comparison, but durability loss remains outside the default non-attacking-dummy scenario and is
labelled unsupported when another scenario would exercise it.

### Shared build data crosses checked language boundaries

Fixtures, captures, planner builds, and permalinks share logical build data, not identical outer records.
The current `BuildEnvelope` contains version axes only. Shared build data includes progression,
allocations, equipment and augments, companions and their rolls/equipment, consumables, ammunition,
and source provenance. The schema must distinguish raw attributes from allocations and derived totals.

Keep fixture targets, action schedules, facing, and sampling policy in execution data. Keep capture
completeness and container state outside shared build data. Producer schema and integrity describe a
capture; model and evaluator identities describe the computation that consumes it. A capture need not
pretend that it was produced by the current browser evaluator.

Thin C# and TypeScript adapters preserve this logical contract. Verify an authored fixture and a local
capture reach the same production evaluation path. An unread required section blocks dependent
computation rather than becoming an empty build section. A partial capture can still be inspected.
Unknown schemas and integrity failures are refused before their contents are trusted.

The result records serialized/capture schemas, model/evaluator identity, and game-data identity
separately. Game-data identity includes the assembly hash and game/build labels. A stale model marker
can be shown as context when the build is re-evaluated, but old and new scores are not automatically
comparable. An incompatible tuple may be inspected diagnostically; it cannot qualify as verified parity.

The derived planner payload remains a separate, explicit build-pipeline output. One writer owns its
path, stale-output deletion, required-output assertion, serialization, compression, and redaction
verification. A generic derived-artifact registry remains deferred until another output needs it.

### Learned books are permanent progression

Shared logical build data declares stable learned-book asset IDs in `learnedBookIds`. An empty list is
complete and means that no books are learned. A missing or unread field is incomplete. Adapters reject
unknown or duplicate identities and do not silently deduplicate them. Capture reads the actual learned
state, not inventory ownership, and does not invoke learning, reset, or other mutation paths.

The versioned planner and game catalog owns each book's gain definition and effect classification. The
logical build record carries IDs, not copied gain values. Completeness remains in outer capture
metadata. `Player.UserCode_CmdTryLearnBook__String`
adds a learned book and its attribute gains, and `CmdResetAttributes` includes those book gains. The
production model resolves the catalog definitions and applies each gain once as a permanent progression
contribution. It does not spend attribute or skill points for a book, and it does not count a gain again
when it derives the stat sheet.
Shared schema and capture fields distinguish raw observed attributes, base or class/race progression,
allocated points, and derived totals. A live total is never labelled as base attributes or allocated
points. Explicit hypothetical declarations are editor inputs; they do not authorize changes to an
original capture or a live character.

The harness, not the browser evaluator, materializes books through the normal game learning paths on
an owned scratch character. It never mutates the original capture or a player's save. It verifies the
learned IDs and resulting attributes, then proves that reload does not apply persisted bonuses twice.
Model evaluation resolves catalog gains and applies them once; it does not invoke engine mutations.
Read-only proof for the capture producer comes from an independently recorded runtime qualification,
not from a self-declared capture flag. If learned state cannot be read without mutation, the capture
keeps that section unread and diagnostics remain available while dependent normalization and evaluation
are refused. Shared-schema and adapter round-trip gates precede materialization and runtime
qualification. Passing one gate does not close the others.

### Character capture is a local file, not a HotRepl workflow

The player-facing mod writes one versioned JSON file and reports its exact path. The planner reads it
through a browser file picker, parses it locally, and never uploads it. HotRepl may register the same
file as an automation artifact, but developer infrastructure is not the user transport.

Capture reads the character's actual learned-book state and records `learnedBookIds` with its
completeness state. It does not infer learned books from inventory ownership. Capture, meter read, and
meter reset are separate operations. Capture and meter read are read-only, and learned-state capture
never invokes learning, reset, or any other mutation path. Meter reset is explicit, labelled as
mutating, and never runs as a side effect of capture. The mod is packaged and listed with the
repository's other player-facing downloads.

### The database worker remains database-only

The planner uses a separate optimizer worker and client. It may reuse the database worker's correlated
request pattern, but not its protocol or runtime. The optimizer protocol is
`start -> progress* -> result`, with an independent `cancel -> cancelled` path. The client discards stale
progress and results, handles unknown request identifiers, terminates the worker on page teardown, and
cleans up errors without replacing the last complete result.

### Uncertainty has separate evidence domains

Finite-run variation, model accuracy, and search quality answer different questions. Search-gap
evidence estimates the distance from the returned score to a reference-search result for its named
benchmark domain. It concerns a potentially missed optimum, not pairwise ranking equivalence. The
production evaluator preserves deterministic score order for a fixed tuple and does not group scores
by the search gap. Fixed-point spread is a separate search observation, not proof of the gap to an
optimum. Neither search measure establishes the accuracy of the combat model. Any practical
alternatives view requires a separately named product tolerance and independent evidence.

A prediction accuracy boundary requires an adequate current corpus and independent validation not
used to fit that boundary. Record build/mechanic/version scope, units, denominators, sampling protocol,
and evidence identity. Unsupported or unverified domains have no numeric accuracy claim. An in-sample
maximum residual rounded to 2.5 percent does not supply this evidence.

Meter comparisons require a declared sampling unit, sufficient observations, dependence treatment,
confidence/error control, and a stopping rule. A count and duration alone do not establish finite-run
uncertainty. Statistical rejection identifies a failed criterion, not a proven causal model defect.
Keep protocol changes reviewed rather than widening a tolerance to accept an observed failure.

Known-defect normalization is a separate result mode, not an uncertainty component or hidden
calibration. Raw predictions follow the achieved game state. A normalized result identifies the defect,
evidence, transformation, and affected quantities. Recommendations retain the policy against valuing
defect exploitation, while raw diagnostics remain available for parity. Compare and rank only like
modes; a normalized match cannot change a raw failure or enter a raw baseline.

### Browser performance is measured before a budget is stated

The 204 s exact-search result rejects exhaustive search; it does not establish that the heuristic is
usable in a browser. Before the page claims interactive behavior, the representative and worst-case
searches record latency, peak worker memory, first-progress latency, cancellation acknowledgement,
maximum permalink length, and main-thread responsiveness. The release budget is set from those results
and becomes a regression gate.

### Deterministic evaluation does not imply exact expectation

The production evaluator returns the same result for the same build, scenario, mode, and identities.
Keep published evaluation deterministic; this change does not introduce random sampling into ranking.

Use exact expectations where their validity is established. In general, evaluating a rounded or
state-dependent function at mean inputs does not equal its expectation. Damage variance can change
rounding, resource affordability, target-health gates, proc timing, and later actions. Symmetric input
variance alone cannot justify a mean-substitution timeline.

For nonlinear cases, use a justified deterministic expectation calculation or declare and independently
validate the approximation within its supported domain. A targeted spike must compare small exact
reference cases and game-backed transition windows before the contract is accepted. Sampling may be
used as an investigation reference; it does not replace the deterministic production contract.

The choice avoids ranking noise, not the need for evidence. Another simulator's average-range option
is not proof that this game's coupled state transitions preserve expectations.

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

These surrogate measurements belong to the exploratory objective and corpus. Revalidate candidate
retention, objective gap, and fixed-point spread against the complete production objective. Do not
carry a fitted ratio or a top-20 retention claim into a new domain without evidence.

The production timeline evaluates a scripted sequence for harness parity and a solved sequence for
planner recommendations. Both use the same event/state engine. A parity adapter does not silently
replace the fixture sequence with a better one. Record repetition, start/end inclusion, in-flight
actions, facing, and refusal policy. Track attempted, accepted, completed, and landed actions separately.

Recompute dependent quantities at their engine event: resources and costs, resource-burn intent,
assassination eligibility from current target health, ammunition, effects, target defenses, and cooldown
changes. Handle projectile intent at cast and outcome at arrival. A precomputed hit multiplied by a
use count does not satisfy this contract when any of those inputs changes. Companions retain their
autonomous selection and movement-qualified model rather than receiving a scripted player rotation.


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

The historical experiment converged in 3 sweeps from each start, with a 4.00 percent fixed-point
spread across four starts. This supports multiple starts but does not establish a release-wide bound.

The alternative was an exact Pareto dynamic program. It was measured at 86,584 frontier points and
204 s for six stat dimensions, with frontier size growing geometrically at a factor of about 3.2 per
added dimension. Branch and bound removed no points, because the multiplicative objective makes an
admissible completion bound far too loose. That experiment favored heuristic search for its measured domain. The final objective still needs
reference-search comparisons and browser benchmarks before it can claim a search-gap or latency bound.

### Maintenance selection and achieved uptime are different decisions

The search may enumerate which buffs to maintain, but selecting a subset does not establish its
schedule, affordability, or achieved uptime. At most one member of a non-empty category contributes at
a time in one entity. Temporal replacement still follows actual applications.

For an always-successful, affordable periodic buff, duration divided by cooldown can describe a
steady-state duty cycle under stated assumptions. It is not a general finite-window formula. A
resist-gated refreshing effect requires its refresh process, initial state, application schedule, and
landing probability. Multiplying the duty cycle by landing probability is not generally valid.

The event timeline charges cast time and resources, handles application/refusal and replacement, and
updates the target defenses or caster bonuses while the effect is active. It accounts for cleanup and
expiry boundaries before a dependent action. Verify maintained-effect damage and resource output in a
finite-window spike; a binary subset calculation alone cannot close that task.

### A buff category holds one effect per recipient, and the newest wins

`TargetDebuffSkill.cs:288-331` applies an effect to its recipient, and `Skills.cs:1103-1116`
expires every existing effect in that recipient's category before adding the incoming effect.
`Skills.AddOrRefreshBuff` refreshes a buff of the same name in place. Otherwise, when the incoming buff
carries a non-empty category, the engine expires **every** buff already in that category on the
recipient's `Skills` list and then adds the incoming one. It compares category names only. It never
compares magnitude, level, source, or remaining duration.

Each effect event therefore carries a source entity ID and a recipient entity ID. A weaker buff destroys
a stronger buff when both target the same recipient, even when different sources apply them. A self-buff
has the same entity as source and recipient. The measured different-recipient experiment proves only
that effects on different recipient lists do not collide; it does not prove that a full roster can be
scored as independent.

Two consequences shape the model.

The subset enumeration cannot treat same-category effects as independent. One category contributes at
most one effect per recipient, so the enumeration selects at most one member per recipient category.
The event timeline records source and recipient IDs for application, replacement, expiry, and attribution.

A runtime measurement placed `Hunter's Sigil` on the owner and `Tangle Trap` on the companion; both
effects use `Debuff AC`, and both retained their full 30-second duration because their recipients
differed. If the owner and companion target the same recipient, the newer application replaces the
older one regardless of source. The optimizer may omit an action when it would replace that recipient's
stronger effect, but it must not use caster ownership as the collision key.

Expiry is lazy. An expired buff can contribute until the engine cleanup pass removes it, and that
pass depends on entity updates. The timeline must represent the relevant boundary or label a measured
approximation. Do not assume the tick has no effect on a finite window or threshold-sensitive action.

Buff uptime matters. Warrior buff bonuses total 123 percent damage at nominal values but 85 percent
after uptime weighting, against 25 percent from always-on passives.

### The resource engine drives the rotation

`Combat.cs:1256-1262` returns 25 percent of post-mitigation auto-attack damage as energy for the
Warrior and the Rogue. `Combat.cs:1005-1012` returns 25 percent of damage as mana for the Wizard
casting Mystic Spark. `Combat.cs:1201-1206` returns a square-root scaled amount when a Warrior or
Rogue takes physical damage.

Buff-driven percentage regeneration exists but is a minor term. Nominal rates of 3 to 5 percent per
second reduce to under 1 percent per second after duty cycle, and some buffs are net negative.

Combat returns depend on actual damage events rather than maximum resource alone. At each event, the
timeline applies the engine return, current resource cap, and relevant rounding. It also applies
incoming damage, recovery ticks, costs, burns, and active class effects. Average income is a
ranking-layer approximation, not a replacement for event-state affordability.

### Each controlled entity uses the same stat pipeline; roster scoring is joint

A mercenary equipment component inherits the player equipment stat pipeline. It overrides only the
four Mirror lifecycle methods, so every stat channel is wired
(`MercenaryEquipment.cs:7,86-108`). Mercenary gear feeds damage twice, once directly and once through
the Strength it adds (`MercenaryEquipment.cs:95-158`).

A solo owner can field four mercenaries at once (`Player.cs:9800-9870`), which is 64 further
equipment decisions. Their output is not a rounding error, so a total-output figure that ignores it is
wrong.

The design shares equipment evaluation across controlled entities. Player actions use an executable
schedule; companion output uses the autonomous policy rather than the player rotation solver. Per-entity
stat aggregation remains independent and uses the same equipment pipeline. Scoring is not automatically
independent, even when every entity draws from the full published item set: shared target health,
mitigation, effect recipients, and autonomous companion actions can couple the roster through one event
timeline. The production search therefore scores the roster jointly unless the scenario records a
proven encounter-separability proof. An owned-gear plan is additionally coupled by shared inventory,
because one physical item cannot be equipped twice; it remains an assignment problem across entities.

Two mercenary properties resist a fixed rotation. Action selection is uniformly random among ready
damage and debuff skills every 2 to 4 seconds, and a healer archetype refuses a cast that would drop
it below 35 percent mana (`PetSkills.cs:65-178`). The design models mercenary output as the
expectation over that uniform selection, and states that it is an expectation rather than a schedule.

Mercenary base stats derive from owner progression on a per-archetype cadence, and the base combat value
of a new hire is drawn from a range whose upper bound is the owner's level times a factor of that
companion's race (`Player.cs:7979-8205, 4510-4685, 9780-10023`). Current hire-path evidence defines the race-dependent envelope; the harness checks it rather than
assuming that a field name or historical table establishes current legality. A mercenary is therefore a rolled asset, and the
planner treats its base stats as an input rather than a value it can assume.

### Companion state and reload normalization are explicit

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

Raw evaluation uses the supplied achieved companion state, including transient veteran accumulation.
A capture must distinguish a live value from a saved hire roll; neither can silently stand in for the
other. A reload can change raw inputs, including a zero-roll reroll.

A recommendation may use an explicitly identified post-reload planning assumption instead of valuing
transient damage. The result names that assumption and the defect evidence. It is not raw parity for
a companion whose current state differs. A normalized result must define its transformation rather
than claim that every defect has one obvious intended formula.

Which roll to assume follows the distinction the planner already draws. Dismissal has no cost beyond the
hire price (`server-scripts/Player.cs`, the dismiss command destroys the companion outright), and
re-hiring draws a fresh roll, so the best roll is reachable. A best-in-slot plan therefore assumes the
best reachable roll, exactly as it assumes the best obtainable item. A plan limited to what a player owns
uses that player's supplied state. Best-roll assumptions remain declared planning inputs, not evidence
that a harness hire will draw the requested race or roll.

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
the quality rolled at hire and the whole veteran accumulation therefore change nothing. This defect is recorded in `docs/game-bugs/mercenary-energy-multiplier-is-never-used.md`. Raw evaluation
follows the getter and ignores the inert multiplier. Any separately requested normalization must
state its evidenced rule and affected quantities; it cannot change the raw result or baseline.

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

The measured equipment subset was 21,488 B gzipped for all 887 equippable non-costume items. The
book-aware planner payload from Ancient Kingdoms 0.9.31.1 contains 889 surviving equipment items, 54
augments, 295 skills, six mercenary archetypes, 120 consumables, two ammunition items, 17 learned-book
definitions, 192 equipment slots, and 60 effect classifications. Deterministic serialization produces
3,551,418 raw bytes and 157,069 gzip bytes. These measurements replace the pre-book baseline for browser
budgets. The build discovers the learned-book count from the current catalog; it does not enforce 17 as
a permanent count.

A Cloudflare Worker endpoint is possible but unnecessary. Static assets plus a dedicated optimizer
worker avoid per-request CPU limits and keep local capture data on the reader's machine.

### Validation through the game's own combat meter

`Combat.cs:427-490` maintains per-entity damage and healing totals with an active-seconds
denominator, and `Player.cs:8256-8285` resets them across the player, the pet, and four mercenaries.

The level 55 dummy has a `damage` value of 0 and is immobile, so a predicted number can be compared
against a measured one under controlled conditions.

Two mechanisms use this data. The harness owns controlled fixture execution and qualified statistical
comparisons. A validation-only harness run does not exercise that path. The local capture records a
reader's build, actual `learnedBookIds`, and meter state without mutating either. A meter capture alone
does not establish the action sequence, target history, or sampling sufficiency needed for verified
parity.

The comparison adapter declares those missing inputs and uses the production evaluator only when
dependent data is complete. It retains target provenance, requested and achieved state, per-quantity
counts, units, windows, learned-book catalog identity, and model/evaluator/data identities. Book-aware
stat and damage quantities are required before a result can qualify. Read-only capture evidence must
come from an independently recorded runtime qualification of the capture producer; a self-declared
read-only flag is not proof. The qualified capture must show the learned state without invoking learning
or reset paths. It need not construct a harness report or claim a baseline it did not measure.

## Slot 13 and the weapons in it

Slot 13 is not one slot. Every class prefab and every mercenary prefab serializes its own slot table.
A real export on Ancient Kingdoms 0.9.31.1, Steam build 24986533, wrote 192 rows for 12 owners to the
ignored runtime artifact `exported-data/equipment_slots.json`. Player and mercenary rows agreed: the
offhand requires "Shield" for a Warrior, a Cleric, a Wizard and a Druid, "Bow" for a Ranger, and
"Weapon" for a Rogue. A Ranger and a Rogue can therefore never hold a shield, and the search space for
those two classes differs in kind rather than in degree.
The static table in `GameManager` that names the slot "Shield" is a display default, and the initializer
in the decompiled `PlayerEquipment` is one prefab's value.

Attack power sums every worn slot, so each damage path removes the part that should not count. The
corrections are gated on the wielder being a player, which is where the asymmetry comes from.

| Case | Slot 12 damage | Slot 13 damage | Site |
|---|---|---|---|
| Player melee or target skill, Ranger | all | none | `TargetDamageSkill.cs:218` |
| Player melee or target skill, Rogue | all | half, removal rounded up | `TargetDamageSkill.cs:223` |
| Player bow skill | none | all | `TargetProjectileSkill.cs:196` |
| Companion, any of the above | all | all | the same lines, gated on `caster is Player` |

Only the weapon's own damage is removed. Attribute bonuses survive, so a melee weapon raises a bow attack
through strength and dexterity while contributing none of its damage.

### Measured, level 50, against Ancient Cyclops at defense 700

| Subject | Configuration | Attack power | Expected | Mean dealt |
|---|---|---|---|---|
| Ranger, melee | bow worn, durability 10 | 864 | 490 | 283.9 per landed hit |
| Ranger, melee | bow worn, durability 0 | 469 | 95 | 53.2 per landed hit |
| Ranger, melee | slot 13 empty | 469 | 470 | 271.2 per landed hit |
| Rogue, melee | offhand worn | 878 | 696 | 404.4 per landed hit |
| Rogue, melee | slot 13 empty | 463 | 464 | 268.2 per landed hit |
| Ranger companion, bow | bow and melee worn | 873 | 1085 | 691.4 per landed hit |

The Rogue pair separates the three candidate rules cleanly. Calibrated on the empty case, a full offhand
predicts 508, none predicts 268, and half predicts 402.3 against 404.4 observed.

The Rogue rows were taken per hit, from the event the engine raises for each landing. The others were
taken by sampling the caster's running total every frame, which is exact per hit while one action is in
flight at a time but reports two hits as one where that fails. A figure to be compared against a model
term should be taken the first way: the same pair measured by sampling put the half rule 2.6 percent out
rather than 0.5, which is the difference between confirming a rule and choosing between two.

The companion figure excludes the player rule outright. Applying it would predict 660 against 691.4
observed, which would need the target to amplify damage.

Two rows document game defects. Raw evaluation must reproduce their observed behavior; separately
identified normalized recommendations may remove the defect benefit with evidence: `docs/game-bugs/broken-offhand-subtracts-damage-it-never-gave.md` and
`docs/game-bugs/a-bow-without-a-melee-weapon-cancels-its-own-damage.md`.

## One hit, derived rather than calibrated

Every figure above was obtained by calibrating a mitigation factor on one configuration and predicting
another. That works for choosing between two rules whose predictions are far apart, and it hides
whatever the factor absorbed. Reading the target's own stats removes the need for it.

A level 50 Rogue with one dagger, Stab at level 1, against Ancient Cyclops at level 55:

| Step | Source | Value |
|---|---|---|
| Intent | `combat.damage` 463 plus the skill's flat 1 | 464 |
| Variance | `RoundToInt(amount * Random.Range(0.9, 1.1))`, `Combat.cs:756` | 418 to 510 |
| Level difference | `+= CeilToInt(amount * clamp((50 - 55) * 0.02, -0.2, 0.2))`, `:758` | -10 percent |
| Physical mitigation | `-= CeilToInt(amount * clamp(defense * 0.0005, 0, 0.9))`, `:821` | -35 percent |
| Predicted | mean 271, band 244 to 298 | |
| Observed | mean 270.4 over 17 hits, range 246 to 294 | |

Nothing was fitted. `defense` 700 and the target's level were read from the target, the skill's flat
damage and percent were read from the skill, and the arithmetic is the engine's.

Two terms this exposes that the earlier calibrations had absorbed:

- **The level difference is a damage term, not a target property.** Two percent per level, bounded at
  twenty percent either way. A factor fitted against the level 55 dummy carries a hidden -10 percent
  into every prediction at another target level.
- **Variance is plus or minus ten percent of the intent**, applied before the level term and before
  mitigation. A single hit therefore tells almost nothing, and the band is wide enough to admit a wrong
  model. Seventeen hits put the mean within 0.2 percent.

The intent term is no longer derived either. The harness stamps the damage entry point and reads the
amount the caster asked for, which was 464 on every hit and matches the 463 plus 1 derived above. With
the health taken beside it, the engine's whole reduction is one ratio per hit, and the band that ratio
must fall in follows from the source: variance from 0.9 to 1.1, then -10 percent, then -35 percent, so
0.5265 to 0.6435. Fourteen of fourteen hits fell inside it with a mean of 0.5779 against a centre of
0.585.

These samples provide local evidence, not a complete distribution check or an accuracy boundary.
A hard support check can reject an impossible hit, but a wrong distribution may still fit the same
support. The qualified harness combines justified support checks with predeclared statistical
acceptance and sample sufficiency; neither this observed mean nor this band alone proves parity.

Order matters because each step rounds separately. The steps are integer operations with their own
`CeilToInt` and `RoundToInt`, so the model has to walk them in the engine's order rather than multiply
one set of factors.

## The mitigation coefficient, measured

The model reads `clamp(defense * 0.0005, 0, 0.9)` from source. It has now been measured, by holding one
target and changing only its defense, so the level difference, the block chance floor and every caster
term stay fixed and the coefficient is the only thing moving.

Ancient Kingdoms 0.9.31.0, Steam build 24925347. Ancient Cyclops at level 55, a level 50 Rogue, Stab at
level 1, intent 464 read from the engine's own argument on every hit. Critical hits excluded by median
filter; a critical is unambiguous at this scale.

| Defense | Hits | Observed ratio | Predicted at 0.0005 | Difference |
|---|---|---|---|---|
| 300 | 17 | 0.7561 | 0.7650 | -1.2 percent |
| 500 | 17 | 0.6917 | 0.6750 | +2.5 percent |
| 700 | 11 | 0.5956 | 0.5850 | +1.8 percent |
| 1000 | 18 | 0.4407 | 0.4500 | -2.1 percent |
| 2000 | 9 | 0.0881 | 0.0900 | -2.1 percent |
| 10000 | 6 | 0.0916 | 0.0900 | +1.8 percent |

A fit over the four unclamped points gives 0.000498 against 0.000500 in source, a difference of 0.5
percent. The recorded residuals are historical observations. They lack the predeclared repeated-run protocol
needed to qualify a current statistical accuracy boundary.

The ceiling is confirmed by the last two rows rather than argued from the source. Raising defense from
2000 to 10000 is a fivefold rise and changed nothing: the target still took nine percent of intent, where
an unclamped coefficient would have taken it to zero and past it. Mitigation saturates at 1800 defense,
so a defense debuff is worth nothing at all above that and everything below it.

### A defense debuff moves two things

Block chance is `clamp(baseBlockChance + defense * 0.0001, 0, 0.8)`, and the same target read 0.17 at
defense 700 and 0.80 at defense 10000, which places its own base at 0.10 and puts the second reading at
the cap. The published value for the one boss that carries 10000 defense is also 0.80, so the cap is
reached in the game's own data rather than only under instrumentation.

The landing rate followed: 6 hits from 23 actions at defense 10000 against roughly 11 from 18 at defense
700. A defense debuff therefore raises damage twice, through mitigation and through how often a hit
lands, and both saturate. The model already requires this coupling; it is now measured.

## A companion is a different machine

A companion does not run the `Monster` state machine or call `Monster.StartRefractoryPeriod`.
`PetSkills.NextAttackSkill` checks the default skill whenever the companion is idle. It samples a special
action only when a shared timer drawn from 2 to 4 seconds expires, then chooses uniformly from the ready
offensive skills. Each selected skill also carries its own cooldown, which starts when its cast completes.
Weapon delay does not enter either gate. Haste reduces only a companion's non-spell followup cooldown.

A companion also closes distance between actions. The in-range action-selection expectation is therefore
an upper bound while movement is uncontrolled, not a reachable prediction. The model reports the
movement state with the bound instead of applying the unrelated monster refractory periods.

A companion needs no ammunition either. Both the check and the consumption return early for a caster that
is not a player, while a player's bow skill requires an arrow in the inventory and consumes one, halved
in expectation while an `Endless Quiver` is held.

## Haste and spell haste do not overlap

`Skills.StartCast` reduces a cast time by spell haste and only when the skill is a spell. Haste reduces
the weapon interval and nothing else. A caster's skills take the flat period, which haste never touches,
so spell haste is the only timing stat a caster has, and the model must credit the two stats to different
terms. Neither appeared in this design before it was measured.

## Risks / Trade-offs

- Full-domain absolute accuracy is unverified. This design contains both model-to-model comparisons
  and specific live experiments, neither of which is a qualified full baseline. → Complete the harness
  production-evaluator comparison and independently validate any scoped accuracy claim before release.
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
- An exported field can carry less behaviour than its name implies, or more. `multiplierEnergy` is
  never applied, because `Energy.max` does not read it. `requiredWeaponCategory2` gates nothing, but it
  is read: `Skills.cs:1387` uses it to select `castEffect2` over `castEffect`. `is_assassination_skill`
  has a behavioural consumer that constrains the rotation. `PlayerSkills.cs:126-138` refuses the cast
  unless the target sits at or below a quarter of its maximum health. → The model reads behaviour from
  code, never from a field's name or its presence. A field with no consumer is recorded so a later
  reader does not implement it.
- Skill classes disagree with their own data. `FrontalProjectilesSkill` ignores a populated
  `damagePercent`, and `AreaObjectSpawnSkill` ignores the caster's combat stat entirely. → Each
  damaging skill class gets its own evaluation path and its own test, rather than one shared formula.
- The analytic surrogate can misrank if a future mechanic couples the rotation to a stat outside its
  basis. → The candidate count K is configurable, and a rank-fidelity check runs against the event
  timeline whenever the model changes.
- Block coordinate ascent is start-dependent at 4.00 percent. → Multiple starts are required, and the
  start count is a recorded parameter rather than an implementation detail.
- The fractional relaxation of the rotation cannot be realised by an integer cast schedule. Across
  36 cooldown and horizon pairs, the relaxation exceeded the executable schedule by 0 to 0.75 casts.
  → The relaxation ranks candidates only. The event timeline produces every displayed number.
- A game patch can silently invalidate a formula. → The citation ledger already fails on drift, and
  the derived payload regenerates from the pipeline.
- Displayed precision can imply false confidence. → Report measured search-gap evidence as distance
  from the returned score to a reference-search result. Preserve deterministic score order and do not
  group candidates by that gap. Report prediction accuracy and finite-run variance separately. If a
  practical alternatives view is added, name its product tolerance and qualify it independently.

## Planner prerequisite evidence

The recorded game-backed prerequisite rows name Ancient Kingdoms 0.9.31.1, Steam build 24986533,
assembly `bd2521453b35dfb58c4fec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc0`. Harness task references
locate their experiment descriptions; they are not substitutes for persisted run provenance. Earlier
measurements elsewhere in this design have their own recorded build or remain incompletely identified.
Do not attribute them all to this snapshot.

| Harness task and fixture | Sample | Observed bound | Controlled formula or policy |
|---|---:|---|---|
| 1.7, split descriptor and game validation | Complete descriptor rejection set | No validation rule was evaluated in both layers | Validate serialized shape before launch; evaluate runtime facts only in the game |
| 2.8, full-roster lifecycle | One all-eight-slots run | The matrix obtained a usable character without exceeding eight slots | Reuse or remove harness-created characters before materialization |
| 2.9, stale-endpoint ownership | One stale-host run and one clean shutdown run | Zero launches beside an answering host; zero owned processes after shutdown | Refuse an occupied runtime endpoint and own the launched process through every exit path |
| 3.3, six-class selection lifecycle | Six classes, one selected character per session | Every class reached its named fixture through the existing world-entry selector | Run one loaded character per session; do not add another selector |
| 7.8, `Hunter's Sigil` landing | Six conditions, 1,000 attempts each | Observed landing 0.607 to 0.958; maximum absolute prediction error 0.016 | Include 0.005 resistance per level difference, capped at 0.1, and subtract caster accuracy |
| 7.9, `Wyrmbrand Hex (A)` refresh | 60 attempts over 120 seconds, seed 7901 | Uptime 0.9001 against finite-horizon expectation 0.9057 | Duration times landing probability is not valid for repeated refresh attempts; model the refresh process |
| 7.10, same-recipient `Debuff AC` replacement | One stronger-then-weaker application | Stronger remaining time fell from 30 seconds to zero | The newest non-empty category member replaces every existing member in the recipient's `Skills` list |
| 7.11, owner and companion `Debuff AC` on different recipients | One simultaneous owner-companion pair | Both effects retained 30 seconds | Different-recipient isolation is component evidence only; it does not prove shared-target collision or roster separability |
| 7.12, long cooldown schedule matrix | 36 cooldown-horizon pairs | Fractional gap 0 to 0.75 casts | Use the relaxation for search only; use executable integer schedules for displayed output |
| 7.13, matched Warrior and Rogue resource transition | One transition per class and three recovery ticks | Both reached 4 resource after returns and cost; Warrior stayed at 4, Rogue fell to 1 | Apply combat returns identically, then apply each class's active recovery effects separately |
| 7.14, companion cadence and output | Eleven accepted 20-second windows | Damage 0 to 688; observed hit gaps 0.834 to 11.232 seconds | Model output as an action-selection expectation with movement-qualified bounds, not a reachable fixed rate |

These experiments inform the named formulas and policies. They do not close the reopened lifecycle
acceptance, complete dynamic evaluator integration, or qualify current accuracy. The harness owns the
full comparison report and reviewed baseline; planner tasks cannot close those gates on its behalf.


## Integration acceptance and targeted spikes

The existing fixture evaluator computes hits from initial state before solving a rotation. Its local
tests do not establish shared-build adaptation or production integration. Treat helpers for effects,
resources, and uncertainty as component evidence until the same production path consumes them.

The harness must compare independent model inputs with achieved, legal state. Requested-versus-achieved
mismatches stop dependent measurements. Do not supply measured caster totals as the predicted totals
being checked. Independently read target state is permitted only with declared provenance and scope.

Run these spikes before closing integration or accuracy tasks:

1. Round-trip shared build data through C# fixture and capture adapters and the browser evaluator.
   Include `learnedBookIds`, raw/base/allocated/derived contributions, and book completeness. Verify
   missing data, unknown or duplicate IDs, version mismatches, and capture-only metadata retain their
   meaning.
2. Trace a fixture from request through book materialization, readback, actions, production prediction,
   statistical comparison, and persisted evidence. Include resulting attributes, a maintained effect,
   and an autonomous companion. Verify reload does not apply persisted book gains twice.
3. Exercise resource burn after depletion/recovery, an incoming-damage transition, effect refresh and
   expiry, and a target-health threshold crossing. Compare a fixed-state case with a changing-state case.
4. Evaluate one evidenced game defect in raw and normalized modes. Verify the raw residual remains
   visible and neither a normalized score nor a mode mismatch can pass the raw baseline gate.
5. Define calibration and independent validation domains before fitting an accuracy boundary. Verify
   adequate current samples and declared statistical acceptance, including nonlinear approximation cases.

A full verified result requires the harness's complete materialization, measurement, comparison,
provenance, baseline, and isolation gates. Baseline qualification is explicit; missing or failed
baseline evidence cannot become success. The initial qualification follows the harness's reviewed
promotion procedure rather than requiring a nonexistent prior baseline. Historical experiments remain
useful evidence for narrow questions but cannot bypass these stages.

## Migration Plan

1. Reconcile the shared contracts and task acceptance without removing proven local components.
2. Complete checked adapters and dynamic production evaluation, then run the integration spikes.
3. Complete the harness matrix and qualify its reviewed current baseline. Independently validate each
   published accuracy domain; leave unsupported domains without numeric claims.
4. Connect optimizer, browser, capture, and import consumers to that production contract. Verify each
   actual surface and the release gates before retiring the prior simulator.

If a model, protocol, or data migration fails, preserve the failed report and prior baseline. Do not
rewrite evidence to make the migration pass. Retain the prior published surface until the replacement
passes its release gates. No implementation migration occurs as part of this planning revision.
