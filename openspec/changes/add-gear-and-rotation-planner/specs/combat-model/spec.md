## Purpose

Defines what the deterministic combat evaluation guarantees about the numbers it produces, so a
reader can rely on a predicted damage figure and know its boundary. The model reproduces the game's
own combat pipeline, so its value depends entirely on matching that pipeline.

## ADDED Requirements

### Requirement: Every formula traces to decompiled source

Each formula the model evaluates SHALL cite the region of `server-scripts/` that implements it. A
constant that the model applies SHALL NOT be introduced without such a citation.

The model SHALL NOT introduce a stat, a cap, or a coefficient that the game does not implement.

#### Scenario: A formula is added

- **WHEN** the model gains a formula that affects a published number
- **THEN** the formula carries a citation to the decompiled region that implements it
- **AND** the citation ledger verifies that region

#### Scenario: A game update changes a cited region

- **WHEN** a cited region changes between game versions
- **THEN** the citation check fails
- **AND** the model is not published until the formula is re-verified

### Requirement: Evaluation is deterministic and reproducible

The model SHALL produce the same output for the same input. It SHALL NOT sample random outcomes to
produce a published number.

Each stochastic term in the game pipeline SHALL be replaced by its exact expectation. An avoidance
roll and a critical roll are Bernoulli trials, so each contributes its probability. The damage
variance range is symmetric, so it contributes its mean.

#### Scenario: The same build is evaluated twice

- **WHEN** an unchanged build is evaluated against an unchanged target
- **THEN** both evaluations return an identical number

#### Scenario: Two builds differ by a small amount

- **WHEN** two builds differ in predicted output by less than one percent
- **THEN** the ordering between them is stable across evaluations
- **AND** the ordering is not attributed to sampling variance, because none exists

### Requirement: The model reports a stated error boundary

A published damage figure SHALL carry the boundary within which it is claimed to be accurate. The
model SHALL NOT present a figure as exact.

The boundary SHALL distinguish error against the game from error between internal layers.

#### Scenario: A reader views a predicted figure

- **WHEN** the planner displays a predicted damage per second
- **THEN** the stated boundary accompanies it

#### Scenario: Two results fall inside the boundary

- **WHEN** two builds differ by less than the stated boundary
- **THEN** they are presented as equivalent rather than ranked against each other

### Requirement: Resource generation from combat is modelled

The model SHALL account for resource returned by dealing and by taking damage, because that return
dominates the resource budget for the affected classes.

Auto-attack damage returns a fraction of post-mitigation damage as energy for melee classes.
A named Wizard skill returns a fraction of damage as mana. Taking physical damage returns a
square-root scaled amount of energy.

The model SHALL express resource income as a function of combat output rather than of resource
capacity.

#### Scenario: A melee build increases its auto-attack output

- **WHEN** a build raises auto-attack damage or attack rate
- **THEN** the modelled resource income rises with it
- **AND** the number of affordable skill casts rises

#### Scenario: A build raises resource capacity alone

- **WHEN** a build raises maximum resource without raising combat output
- **THEN** the modelled sustained resource income does not rise proportionally

### Requirement: Buff contributions are weighted by uptime

A stat bonus from a maintained buff SHALL contribute in proportion to the buff's steady-state uptime,
derived from its duration and cooldown. A bonus from an always-on passive SHALL contribute in full.

Duration over cooldown is the uptime only where application always succeeds. An effect applied to a
target is additionally gated by a resist roll, and its uptime is covered by the target-state requirement.

The model SHALL charge the time and the resource cost of maintaining each buff.

#### Scenario: A buff has a duration shorter than its cooldown

- **WHEN** a buff lasts ten seconds on a thirty-second cooldown
- **THEN** its stat bonus contributes one third of its nominal value
- **AND** its cast time and resource cost are charged against the rotation budget

#### Scenario: A buff cannot be afforded

- **WHEN** maintaining a buff costs more resource than the build generates
- **THEN** the model does not credit that buff's bonus

### Requirement: A buff category holds at most one buff

The model SHALL treat a non-empty buff category as exclusive. When a category holds more than one
candidate effect, at most one SHALL contribute.

Selection SHALL follow the engine, which keeps the buff applied most recently and expires every other
buff in that category. The engine compares category names only, so the model SHALL NOT assume that the
larger effect survives.

The model SHALL apply this rule to any source of a categorised effect, including a skill, a consumable,
and an entity other than the one being optimised.

#### Scenario: A weaker effect is applied over a stronger one in the same category

- **WHEN** two effects share a category and the weaker one is applied second
- **THEN** only the weaker effect contributes

#### Scenario: Two effects occupy different categories

- **WHEN** two effects carry different non-empty categories
- **THEN** both contribute

#### Scenario: An effect carries no category

- **WHEN** an effect has an empty category
- **THEN** it does not expire any other effect

### Requirement: The refractory a skill sets is selected by the skill's own fields

Completing any skill SHALL set the period that delays the next auto-attack. The model SHALL select the
value from the skill's own fields and SHALL NOT select it from whether the skill is a basic attack.

A skill that is not a spell and requires a weapon category SHALL set the weapon interval, derived from
the equipped weapon's delay and reduced by haste to a floor. Any other skill SHALL set the flat period,
which haste SHALL NOT reduce.

A skill that produces no damage SHALL be charged the same cost as one that does.

#### Scenario: A skill requires a weapon category

- **WHEN** a non-spell skill requiring a weapon category completes
- **THEN** the delay is the haste-reduced weapon interval

#### Scenario: A spell declares a weapon category

- **WHEN** a skill is a spell and also declares a weapon category
- **THEN** the delay is the flat period, because being a spell takes precedence

#### Scenario: Haste rises on a caster rotation

- **WHEN** haste rises for a build whose skills set the flat period
- **THEN** the modelled delay between actions does not fall

#### Scenario: A skill deals no damage

- **WHEN** a target debuff that produces no damage completes
- **THEN** it is charged a full delay

### Requirement: One hit is derived in the engine's own order

A hit SHALL be derived as a sequence of integer steps in the order the engine applies them, and not as
one product of factors. Each step rounds, so a different order gives a different integer.

The order is: the caster's aggregate damage plus the skill's own flat damage, then the skill's damage
percent where it declares one, then a variance roll, then the level difference between caster and
target, then school mitigation, then the critical multiplier.

The level difference SHALL be a damage term rather than a property of the target. It adds two percent of
the running amount for each level the caster holds above the target and removes two percent for each
level below, bounded at twenty percent either way. A model that omits it is correct only where caster
and target are the same level.

The variance roll SHALL be a factor from 0.9 to 1.1 around the amount, applied before the level
difference and before mitigation. The model SHALL report a fixed-state expectation with the roll at its
mean, and SHALL state the band a single hit can fall in.

#### Scenario: A build is evaluated against a higher-level target

- **WHEN** a level 50 build is evaluated against a level 55 target
- **THEN** ten percent of the amount is removed before mitigation is applied

#### Scenario: The level difference exceeds the bound

- **WHEN** caster and target differ by more than ten levels
- **THEN** the term is held at twenty percent

#### Scenario: A single hit is compared with a prediction

- **WHEN** one measured hit is compared with a fixed-state prediction
- **THEN** agreement is judged against the variance band and not against the mean alone

### Requirement: A prediction is derived from the target's own state

A predicted amount SHALL be derived from stats read from the target. The model SHALL NOT obtain a
mitigation factor by calibrating against another measured amount.

A calibrated factor absorbs every term the model is missing, so it agrees with the measurement it was
fitted to and fails wherever the missing term differs. The level difference term is one such term: a
factor fitted at one target level silently carries that level's difference into every other.

#### Scenario: A model term is missing

- **WHEN** a prediction is derived from read stats and disagrees with a measurement
- **THEN** the disagreement is attributable to a named missing term rather than absorbed

### Requirement: Target avoidance and mitigation are reducible, and reduction is not certain

The model SHALL treat a target's avoidance and mitigation as reducible by a maintained debuff rather
than as fixed properties of the target.

Applying a debuff SHALL be gated by a resist probability derived from the target and reduced by the
caster's accuracy. The modelled uptime of a debuff SHALL be its duration and cooldown bound multiplied
by its landing probability.

Physical mitigation SHALL be modelled with its ceiling. A reduction that does not bring the target below
that ceiling SHALL contribute nothing to mitigation.

#### Scenario: A debuff reduces target defense

- **WHEN** a defense debuff is active on a target
- **THEN** both the target's mitigation and its derived block chance fall

#### Scenario: A target sits above the mitigation ceiling

- **WHEN** a debuff reduces defense but the target remains above the mitigation ceiling
- **THEN** the model reports no mitigation gain from that debuff

#### Scenario: Accuracy rises against a high-defense target

- **WHEN** accuracy rises against a target whose block chance it cannot reduce to zero
- **THEN** the modelled debuff uptime rises

### Requirement: Skill levels respect the allocation budget

The model SHALL evaluate a build at the skill levels the build actually allocates. It SHALL NOT
assume that every skill sits at its maximum level.

Normal and veteran skill points SHALL be treated as separate budgets. Each budget SHALL be one point
per level after the first, plus one per veteran point.

Every gate a skill carries SHALL be enforced: the level it requires, the points already spent in its
own budget, up to two predecessor skills each at its own level, and the number of skills already
learned in its tier. A tier admits at most two learned skills at tiers one and three, and at most one
at tiers two and four. A tier is therefore a choice between skills and not only a threshold to pass.

#### Scenario: A build requests more points than it has

- **WHEN** an allocation exceeds the available points in either budget
- **THEN** the model rejects the allocation as infeasible

#### Scenario: A skill sits behind a spend threshold

- **WHEN** a skill requires a number of already-spent points
- **THEN** the model treats it as unavailable until that many points are spent in the same budget

#### Scenario: A tier already holds its permitted skills

- **WHEN** an allocation learns a third skill in a tier that admits two
- **THEN** the model rejects the allocation as infeasible

#### Scenario: A skill has two predecessors

- **WHEN** a skill names two predecessor skills
- **THEN** both are required at their stated levels

### Requirement: Each damaging skill class is evaluated by its own rule

The model SHALL evaluate each skill class by the formula that class implements. It SHALL NOT apply one
shared damage formula to every skill.

Where a class ignores a populated data field, the model SHALL follow the class and not the field.
Where a class ignores the caster's combat stats, the model SHALL not apply them.

#### Scenario: A skill class ignores its damage multiplier field

- **WHEN** a skill belongs to a class that does not apply its multiplier field
- **THEN** the model does not apply that multiplier
- **AND** the discrepancy between field and behaviour is recorded

#### Scenario: A skill does not scale with gear

- **WHEN** a skill class applies base damage without the caster's combat stat
- **THEN** improving equipment does not change that skill's contribution in the model

#### Scenario: Damage is applied on projectile arrival

- **WHEN** a skill delivers damage by projectile
- **THEN** the model computes the amount at cast and credits it after the travel delay
- **AND** it credits nothing when the target would already be dead

### Requirement: Resource-burn damage bypasses avoidance and mitigation

A resource-burn skill SHALL be modelled as converting the current resource pool into damage that
receives no avoidance roll and no mitigation reduction.

The model SHALL therefore treat maximum resource as contributing to output, and SHALL show that its
value rises with target mitigation.

#### Scenario: A resource-burn skill is used against a high-mitigation target

- **WHEN** a target reduces ordinary damage by ninety percent
- **THEN** the resource-burn contribution is not reduced
- **AND** the model reports the resulting relative value of maximum resource

#### Scenario: The resource pool is empty

- **WHEN** the resource pool is empty at the moment of use
- **THEN** the modelled contribution is zero

### Requirement: A skill that requires a weapon category is gated on it

The model SHALL treat a damaging skill that requires a weapon category as unavailable unless the
equipped weapon satisfies it.

A category that the game checks against the offhand slot SHALL be checked against that slot.

#### Scenario: A build lacks the required weapon

- **WHEN** a skill requires a weapon category the build does not equip
- **THEN** the skill contributes nothing
- **AND** the rotation is solved without it

#### Scenario: A required category is checked in the offhand

- **WHEN** a skill requires a category the game resolves from the offhand slot
- **THEN** the model checks the offhand slot rather than the main hand

### Requirement: A declared consumable set is part of the build

The model SHALL evaluate the consumable buffs a build declares, and SHALL report which consumables a
figure assumed.

The model SHALL NOT assume a consumable that the build does not declare.

#### Scenario: A figure assumes food and a potion

- **WHEN** a predicted figure includes consumable buffs
- **THEN** the assumed consumables are named alongside it

#### Scenario: Two consumables share a stacking category

- **WHEN** two declared consumables occupy the same buff category
- **THEN** only one contributes, under the buff category requirement

### Requirement: A controlled companion is evaluated by the same pipeline

The model SHALL evaluate a mercenary through the same stat and damage pipeline as a player, because a
mercenary equipment component inherits the player equipment stat contribution.

A mercenary SHALL be modelled with the base damage a newly hired mercenary receives. The model SHALL
NOT include the increment the engine adds for each level-up a mercenary was present for.

That increment is a defect. The engine derives a mercenary's skill level from the owner's current state
but accumulates its base damage per event, so two otherwise identical mercenaries differ by the whole of
the owner's progression depending only on when each was hired. The model represents the intended
behaviour rather than the accumulated one.

A model figure SHALL state that it assumes a newly hired mercenary, because a player holding a
mercenary that accumulated the increment will measure more output than the model reports.

A value the engine assigns but never reads SHALL NOT contribute to a predicted figure.

Mercenary output SHALL be reported as an expectation over its action selection, not as a fixed
rotation, because that selection is random among available skills.

#### Scenario: A mercenary is given equipment

- **WHEN** equipment is placed on a mercenary
- **THEN** the modelled output rises through both the direct stat contribution and the attributes it
  adds

#### Scenario: Mercenary output is reported

- **WHEN** the model reports a mercenary contribution
- **THEN** it states that the figure is an expectation over random action selection

#### Scenario: A mercenary base stat is unknown

- **WHEN** a mercenary's rolled base damage is not supplied
- **THEN** the model states the assumption it used rather than presenting the result as measured

#### Scenario: A best-in-slot plan assumes a companion roll

- **WHEN** a plan is not limited to what a player already owns
- **THEN** the best roll reachable for that companion's race and archetype is assumed
- **AND** the assumption is stated, because reaching it requires re-hiring

#### Scenario: A plan is limited to owned companions

- **WHEN** a plan is limited to what a player already owns
- **THEN** each companion's supplied roll is used rather than the best reachable one

#### Scenario: A mercenary accumulated the level-up increment

- **WHEN** a player's mercenary was present during the owner's progression and carries the accumulated
  increment
- **THEN** the model still reports the newly hired value
- **AND** the report states that the player's own output will be higher

#### Scenario: Two mercenaries of the same archetype are compared

- **WHEN** two mercenaries share an archetype and a race
- **THEN** the model may still assign them different base damage, because that value is rolled at hire
- **AND** a plan that may re-hire uses the best roll the race can produce, while a plan limited to what
  a player owns uses the value that player supplied

### Requirement: The offhand slot differs by archetype

Slot 13 SHALL be treated as a property of the archetype. It accepts a shield for a Warrior, a Cleric, a
Wizard and a Druid, a bow for a Ranger, and a weapon for a Rogue, and the companion archetypes match
their namesakes. A Ranger and a Rogue therefore have no shield available at all.

The model SHALL read the accepted category per archetype and SHALL NOT apply one archetype's slot table
to another.

#### Scenario: A search considers a shield for a Ranger

- **WHEN** the search enumerates items for slot 13 of a Ranger
- **THEN** only bows are candidates, and no shield is offered

#### Scenario: A Rogue fills the offhand

- **WHEN** the search enumerates items for slot 13 of a Rogue
- **THEN** one-handed weapons are candidates

### Requirement: An offhand item contributes damage by wielder and class

Aggregate attack power contains every worn weapon. Each damage path SHALL then remove the part that does
not apply, and the model SHALL follow the same rule per case rather than one shared rule.

For a player, a melee or target skill SHALL exclude all of a Ranger's bow damage and half of a Rogue's
offhand damage, rounded up before removal. A player's bow skill SHALL exclude the melee weapon's damage.
For a companion, none of these exclusions SHALL apply, so a companion's bow attack keeps the melee
weapon's damage.

An excluded weapon's attribute bonuses SHALL still count. Only the weapon's own damage value is removed,
so a melee weapon raises a bow attack through its strength and its dexterity while contributing none of
its damage.

#### Scenario: A Ranger's bow is valued for a melee rotation

- **WHEN** a bow occupies slot 13 and the rotation is melee
- **THEN** the bow's damage contributes nothing, and its attributes contribute

#### Scenario: A Rogue's offhand is valued

- **WHEN** a one-handed weapon occupies slot 13 of a Rogue
- **THEN** half its damage contributes, and the removed half is rounded up

#### Scenario: The same pair is valued for a companion

- **WHEN** a companion of the Ranger archetype wears a bow and a melee weapon
- **THEN** both weapons' damage contributes to its bow attack

### Requirement: A companion's cadence is bound by two gates, and weapon delay is not one of them

A companion's action rate SHALL be modelled from the two gates the engine applies, and the binding one
is whichever is later. The engine sets a flat refractory period that does not read weapon
delay. It also reduces a companion's non-spell followup skill cooldown by that companion's haste.

The model SHALL NOT value weapon delay on a companion as a cadence change. It SHALL value haste on a
companion only while the reduced cooldown is the binding gate. It SHALL record which gate binds for the
figure it reports.

The model SHALL state that a companion's observed rate is lower than its cadence implies, because a
companion closes distance between actions, and SHALL NOT publish a companion rate as an upper bound
without that qualification.

#### Scenario: A faster weapon is considered for a companion

- **WHEN** two companion weapons differ only in delay
- **THEN** the modelled cadence is identical

#### Scenario: Haste is added to a companion

- **WHEN** a companion gains haste
- **AND** the flat refractory period is the later of the two gates
- **THEN** the modelled cadence is unchanged, and the report names the refractory as the binding gate

#### Scenario: The reduced cooldown becomes the binding gate

- **WHEN** a companion's haste-reduced skill cooldown exceeds its flat refractory period
- **THEN** the modelled cadence follows the reduced cooldown

### Requirement: A skill the engine would refuse is not scheduled

The rotation SHALL NOT schedule an action the engine refuses at the modelled state. A skill can carry a precondition the engine
tests before the cast. The solver SHALL treat such a precondition as a constraint, not as a cost.

The engine refuses an assassination cast above a quarter of target health. Such a skill SHALL be
excluded from a sustained rotation against that target. Where such a skill is excluded, the model
SHALL say so rather than omitting the skill silently.

Rationale: a solver that ignores a precondition reports output the game will not produce, and the
reader cannot tell which of the two is wrong.

#### Scenario: An assassination skill is available against a full-health target

- **WHEN** the rotation is solved against the default target at full health
- **THEN** the assassination skill contributes nothing
- **AND** the result states that the skill was excluded and why

#### Scenario: A skill has no precondition

- **WHEN** a damaging skill carries no engine-tested precondition
- **THEN** it is available to the rotation on its cost and cadence alone

### Requirement: Spell haste is distinct from haste

Haste SHALL reduce the weapon interval only. Spell haste SHALL reduce a spell's cast time only, and
SHALL NOT reduce the cast time of a skill that is not a spell.

A caster's skills set the flat period, which haste never shortens, so spell haste SHALL be the only
timing stat the model credits to a caster.

#### Scenario: A caster gains haste

- **WHEN** haste rises and every skill in the rotation sets the flat period
- **THEN** neither the cast time nor the period falls

#### Scenario: A caster gains spell haste

- **WHEN** spell haste rises for a rotation of spells
- **THEN** each cast time falls and the period does not

### Requirement: A known defect is modelled as the behaviour it should have

Where the game holds a recorded defect, the model SHALL represent the intended behaviour, and the
affected output SHALL name the defect and the report that records it.

The model SHALL NOT value a build by an outcome that depends on a defect, because a published figure
that rests on one becomes wrong when it is fixed.

#### Scenario: A build would gain from a defect

- **WHEN** an arrangement scores higher only because of a recorded defect
- **THEN** the model scores the intended behaviour and the report is cited

### Requirement: A resource multiplier is applied only where the game applies it

The model SHALL scale a resource pool by its multiplier only where the game's own maximum reads that
multiplier.

Mana and health are scaled by theirs. Energy is not, so an entity whose resource is energy SHALL be
modelled at its base curve plus its flat bonuses, whatever multiplier the game stores for it.

#### Scenario: A companion uses energy

- **WHEN** a companion's archetype uses energy
- **THEN** its resource capacity ignores the stored multiplier
- **AND** veteran progression adds no resource capacity for it

#### Scenario: A companion uses mana

- **WHEN** a companion's archetype uses mana
- **THEN** its resource capacity is scaled by the stored multiplier, including the veteran
  accumulation in it

### Requirement: A target stat is derived from its curve and its spawn, not from a denormalised scalar

The model SHALL compute a target's combat stats from the level-scaling curve and the spawn's own
level and stat overrides. It SHALL NOT read a denormalised scalar that was sampled at one level.

Where a published scalar already folds in a derived term, the model SHALL recompute that term rather
than adding it again.

#### Scenario: A spawn is not at the prefab's default level

- **WHEN** a target spawn's level differs from the level at which a published scalar was sampled
- **THEN** the model recomputes the stat from the curve and the spawn override
- **AND** the published scalar is not used

#### Scenario: Block chance is computed for a spawn

- **WHEN** avoidance is computed against a monster
- **THEN** block chance is derived from its base curve, its level, and its spawn defense
- **AND** the derived value is used rather than a stored block-chance column

### Requirement: Integer rounding follows the engine

The model SHALL reproduce the engine's rounding at each step where the engine rounds. This includes
half-to-even rounding where the engine rounds to nearest, and directional rounding where the engine
takes a ceiling.

#### Scenario: A stat lands on a half value

- **WHEN** an attribute coefficient produces a value ending in one half
- **THEN** the model rounds to the nearest even integer, matching the engine

#### Scenario: A negative level term is applied

- **WHEN** the attacker is below the target's level and the level term is negative
- **THEN** the model applies a ceiling to the negative product, matching the engine

### Requirement: Predicted values are validated against the running game

Before a figure is published, the model SHALL be compared against the same quantity read from a running
game, for a character built to a stated definition rather than for whichever character happened to be
available.

A comparison SHALL cover the stat sheet, the action interval, and the damage of a single hit, and SHALL
be recorded so that a later run can detect a change. Each recorded comparison SHALL name the game build
it was taken against.

#### Scenario: The model changes

- **WHEN** a formula or coefficient in the model changes
- **THEN** the affected quantity is re-compared against a live reading before publication

#### Scenario: A comparison disagrees

- **WHEN** a live reading disagrees with the model
- **THEN** the model is corrected and the live reading is treated as authoritative

#### Scenario: The game changes under a recorded comparison

- **WHEN** the installed build differs from the build a recorded comparison names
- **THEN** the difference is reported before the comparison is used

### Requirement: The target is an explicit parameter set

An evaluation SHALL be against a named target with stated parameters. The model SHALL NOT publish a
target-independent damage figure.

The parameter set SHALL include the values that determine output: level, avoidance, and the
mitigation value for each damage school.

#### Scenario: The target changes

- **WHEN** the selected target changes
- **THEN** the evaluation is recomputed
- **AND** the previous figure is not carried over

#### Scenario: A target parameter is missing

- **WHEN** a required target parameter is absent
- **THEN** the evaluation fails rather than substituting a default
