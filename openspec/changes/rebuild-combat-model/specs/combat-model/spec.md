## Purpose

Defines what the combat engine guarantees about the numbers it produces. The engine samples the game's
ordered combat pipeline over an event timeline with a seeded random source, so a result is a measured
distribution over replicates and is reproducible for a fixed input.

## ADDED Requirements

### Requirement: Every formula traces to decompiled source

Each formula and each constant the engine applies SHALL cite the region of `server-scripts/` that
implements it, and the citation ledger SHALL verify that region. The engine SHALL NOT apply a stat, a
cap, or a coefficient that the game does not implement.

#### Scenario: A formula is added

- **WHEN** the engine gains a formula that affects a published number
- **THEN** the formula carries a citation to the decompiled region that implements it
- **AND** the citation ledger verifies that region

#### Scenario: A game update changes a cited region

- **WHEN** a cited region changes between game versions
- **THEN** the citation check fails
- **AND** the engine is not published until the formula is re-verified

### Requirement: A result is reproducible for a fixed input

The engine SHALL return identical output for identical build data, scenario, seed, replicate count,
game-data identity, and model identity. The result SHALL record each of those identities.

#### Scenario: The same input is evaluated twice

- **WHEN** an unchanged build and scenario are evaluated twice with the same seed and replicate count
- **THEN** both results are byte-identical
- **AND** both carry the same identities

#### Scenario: Only the seed differs

- **WHEN** the same build and scenario are evaluated with a different seed
- **THEN** the sampled totals differ within their reported standard error
- **AND** the result names the seed it used

### Requirement: Random outcomes are sampled, not replaced by means

The engine SHALL sample every random draw the game makes in the modelled path: the damage variance
roll, the avoidance roll, the critical roll, the effect resist roll, and companion action selection.
The engine SHALL NOT substitute the mean of a draw for the draw. It SHALL run the declared number of
replicates and SHALL report the mean, the standard error, and the replicate count for every sampled
quantity.

#### Scenario: A rounded quantity depends on a random draw

- **WHEN** a hit passes through a variance roll and integer rounding
- **THEN** the reported mean is the average of the rounded sampled hits
- **AND** it is not the rounded value of the mean input

#### Scenario: A threshold depends on a random draw

- **WHEN** an action is affordable in some replicates and unaffordable in others
- **THEN** each replicate schedules the action according to its own state
- **AND** the report gives the fraction of replicates in which the action was cast

### Requirement: Compared builds share one random stream

When two builds are evaluated against the same scenario and seed, the engine SHALL supply the same
random stream to each. A difference between their results SHALL therefore come from the builds, not
from the sample.

#### Scenario: Two builds differ by one item

- **WHEN** two builds that differ by one item are evaluated with one scenario and seed
- **THEN** every draw that both builds make in the same event order returns the same value
- **AND** the report can state which build is higher for that sample

### Requirement: State-dependent decisions follow the ordered event timeline

The engine SHALL advance exact-timestamp events for casts, completions, projectile arrivals, hits,
incoming damage, cooldowns, effect application, effect expiry, and death, and SHALL apply resource
recovery, damage over time, and effect cleanup on the game's fixed one-second tick. At each event it
SHALL read current state: the resource pool, target health, active effects, target defenses, and
cooldowns. A finite scenario SHALL state its horizon and whether an action at the horizon or a hit in
flight is included.

#### Scenario: A resource burn follows a resource gain

- **WHEN** a hit returns resource before a resource-burn cast
- **THEN** the burn uses the pool after the return
- **AND** the report records the gain, the spend, and the resulting damage in order

#### Scenario: A target effect expires before a hit

- **WHEN** the cleanup tick removes a defense effect before a later hit lands
- **THEN** that hit uses the target's unmodified defense
- **AND** an expired effect that the cleanup tick has not yet removed still contributes

#### Scenario: Target health crosses a threshold

- **WHEN** target health falls to or below the assassination threshold after an earlier hit
- **THEN** the next cast decision sees the updated health
- **AND** an assassination skill becomes available from that event

#### Scenario: A projectile arrives after target death

- **WHEN** a projectile reaches a target that died before arrival
- **THEN** the arrival contributes no damage
- **AND** the report records the cast and the arrival separately

### Requirement: One hit is derived in the engine's own order

The engine SHALL derive a hit as the integer steps the game applies, in the game's order: aggregate
damage plus the skill's flat damage, the skill's damage percent where the handler applies one, the
variance roll, the level-difference term, school mitigation, and the critical multiplier. Each
damaging skill handler SHALL have its own evaluation path, including handlers that ignore a populated
field. A resource-burn skill SHALL bypass avoidance and mitigation. Offhand damage SHALL follow the
wielder and class rule.

#### Scenario: A handler ignores a populated field

- **WHEN** a frontal-projectiles skill declares a damage percent
- **THEN** the engine applies base damage without that percent

#### Scenario: A caster is below the target's level

- **WHEN** the caster is five levels below the target
- **THEN** the running amount is reduced by ten percent before mitigation

#### Scenario: A resource-burn skill hits a high-defense target

- **WHEN** a resource-burn skill hits a target with saturated mitigation
- **THEN** the full burn amount is applied

#### Scenario: A Rogue wears an offhand weapon

- **WHEN** a player Rogue uses a melee skill with an offhand weapon equipped
- **THEN** half of the offhand's own damage is removed, rounded up
- **AND** the offhand's attribute bonuses remain

### Requirement: Action timing follows the skill's own fields

Completing a skill SHALL set the delay before the next default attack. A non-spell skill that requires
a weapon category SHALL set the haste-reduced weapon interval with its floor. Any other skill SHALL set
the flat period that haste does not reduce. Spell haste SHALL reduce a spell's cast time and nothing
else. A skill that produces no damage SHALL pay the same delay as one that does.

#### Scenario: Haste rises on a caster rotation

- **WHEN** haste rises for a build whose skills set the flat period
- **THEN** the delay between actions does not fall

#### Scenario: Spell haste rises on a melee rotation

- **WHEN** spell haste rises for a build without spells
- **THEN** no cast time or interval changes

### Requirement: Resources follow the event state

The engine SHALL update each resource pool at every cast, hit, incoming-damage, recovery, and effect
event. Damage returns SHALL use the post-mitigation amount. A class effect that changes a pool per
tick SHALL apply at the tick. An action whose cost exceeds the current pool SHALL be refused at that
event and recorded as refused.

#### Scenario: A Rogue holds Fury through recovery ticks

- **WHEN** a Rogue with Fury active passes three recovery ticks
- **THEN** each tick applies the rounded per-tick Fury change
- **AND** a Warrior with the same inputs keeps its pool unchanged

#### Scenario: An action is unaffordable at its event

- **WHEN** the current pool is below an action's cost
- **THEN** the action is not cast at that event
- **AND** the report counts the refusal

### Requirement: A buff category holds one effect per recipient

The engine SHALL keep at most one effect per non-empty category in each recipient's effect list. The
most recently applied effect SHALL replace every earlier effect in that category on that recipient,
regardless of source or magnitude. Effects on different recipients SHALL NOT interact. Every effect
event SHALL carry a source entity and a recipient entity.

#### Scenario: A weaker effect is applied over a stronger one

- **WHEN** a weaker effect in the same category is applied second to the same recipient
- **THEN** the stronger effect expires and only the weaker effect contributes

#### Scenario: Two sources apply one category to different recipients

- **WHEN** an owner and a companion apply the same category to different recipients
- **THEN** both effects remain active

### Requirement: A companion follows its autonomous policy

The engine SHALL model a controlled companion by sampling its own action policy: a shared special-action
timer drawn from the game's range, a uniform choice among ready offensive skills, a follow-up default
attack whose cooldown haste reduces, and the healer archetype's resource reserve. A companion's stat
sheet SHALL use the equipment pipeline the player uses. The engine SHALL NOT assign a companion the
player's action schedule. The result SHALL state whether the companion was modelled in range for the
whole window.

#### Scenario: A companion equips one weapon

- **WHEN** one dagger is placed on a bare mercenary
- **THEN** its damage rises by the item's damage plus the Strength it grants

#### Scenario: A healer companion is low on mana

- **WHEN** a cast would take a healer companion below its reserve
- **THEN** the companion does not cast it in that replicate

### Requirement: Learned-book gains are catalog-owned and applied once

The engine SHALL resolve each declared learned-book identity through the catalog and SHALL apply its
gains once as permanent progression. It SHALL NOT spend attribute or skill points for a book. An
unknown or duplicate identity SHALL be refused.

#### Scenario: A build declares one book

- **WHEN** a build declares a book that grants Strength
- **THEN** the stat sheet includes the gain once
- **AND** the allocated-point total is unchanged

### Requirement: Every evaluation names a complete scenario

An evaluation SHALL consume a scenario that states the target, the horizon, the boundary treatment,
the initial resources and cooldowns, active consumables, ammunition supply, the incoming-damage
events, the roster, the target count, the seed, and the replicate count. A missing field SHALL be
refused. A target count other than one SHALL be refused.

#### Scenario: A scenario omits the replicate count

- **WHEN** a scenario has no replicate count
- **THEN** the evaluation is refused with the field name

#### Scenario: A scenario names two targets

- **WHEN** a scenario names a target count of two
- **THEN** the evaluation is refused as unsupported

### Requirement: A target is derived from its curves and its spawn

The engine SHALL derive target defense, block chance, magic resist, and elemental resists from the
target's curve columns at the spawn's level. It SHALL NOT read a denormalised scalar where a curve
exists beside it. Physical mitigation and block chance SHALL saturate at the game's ceilings.

#### Scenario: The default target is evaluated

- **WHEN** the level 55 training dummy is the target
- **THEN** block chance is the curve value at level 55 plus the defense term
- **AND** it is not the level 50 sampled scalar

### Requirement: The class domain is explicit

The planner payload SHALL list every player class the engine supports and every class it excludes
with the reason for the exclusion. An excluded class SHALL NOT be filtered by an unrelated property.
The engine SHALL refuse a build of an excluded class and SHALL name the reason.

#### Scenario: The payload is built for a game with a Bard

- **WHEN** the export contains the Bard class
- **THEN** the payload names Bard as excluded with the song-system reason
- **AND** the six supported classes are listed

#### Scenario: A Bard build is evaluated

- **WHEN** a build declares the Bard class
- **THEN** the engine refuses it and reports the exclusion reason

### Requirement: Every admitted effect is classified

The payload SHALL classify every equipment, augment, consumable, ammunition, learned-book, and skill
effect that can influence output as modelled, excluded by a stated rule, or unsupported. Publication
SHALL fail for an unclassified admitted effect. An evaluation that meets an unsupported effect SHALL
refuse with the effect identity.

#### Scenario: A game update adds an effect kind

- **WHEN** an export contains an effect kind with no classification
- **THEN** the payload build fails and names the kind

### Requirement: The engine reproduces the game as it runs

The engine SHALL reproduce documented game defects that affect output, as the game applies them. It
SHALL NOT correct a defect in a published number. A defect the engine reproduces SHALL be documented
under `docs/game-bugs/`.

#### Scenario: A companion uses energy

- **WHEN** a Warrior mercenary's energy multiplier is above one
- **THEN** its maximum energy does not change
- **AND** the documented defect is referenced from the formula

### Requirement: Skill allocation and legality gate the rotation

The engine SHALL refuse a build whose skill levels exceed the pool budget, tier gate, prerequisite
chain, or level requirement. It SHALL NOT schedule a skill the engine would refuse: a skill without
its required weapon category, an assassination skill above the health threshold, or an unaffordable
skill.

#### Scenario: A bow skill has no bow

- **WHEN** a Ranger without an equipped bow includes a bow skill
- **THEN** the skill is never cast
- **AND** the report names the missing category

### Requirement: The result attributes output to its sources

A result SHALL report total damage per entity, per ability, and per damage school, the cast, refused,
and landed counts per ability, and the uptime of each maintained effect, all measured from the
replicates. Each value SHALL carry its mean and standard error.

#### Scenario: A rotation maintains one debuff

- **WHEN** a rotation refreshes one target debuff through the window
- **THEN** the report gives the debuff's measured uptime fraction
- **AND** the fraction is not the duration-over-cooldown ratio
