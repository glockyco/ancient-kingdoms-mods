## Purpose

Defines the guarantees and limits of the production combat evaluator. The evaluator reproduces the
game's ordered combat pipeline over a state-changing event timeline and resolves learned-book gains
from the versioned catalog. A result is deterministic for a fixed input, but its accuracy claim depends
on qualified, current, independently validated evidence.

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

### Requirement: Evaluation is deterministic without overstating stochastic exactness

The evaluator SHALL produce the same output for the same build data, scenario, game-data identity,
model identity, evaluator identity, and evaluation mode. It SHALL NOT sample random outcomes to produce a published
number.

The evaluator SHALL use an exact expectation only where the engine ordering, probability law,
rounding, and state transitions prove that expectation. Where those conditions are not proven, it
SHALL label the deterministic approximation and its validity domain. A verified prediction SHALL
require independent validation of that approximation. Diagnostic evaluation MAY show an unverified
approximation without a numeric accuracy claim. The evaluator SHALL record the expectation or approximation
method and SHALL NOT require a new Monte Carlo product or sampling mode.

Deterministic repeatability SHALL NOT be presented as proof that a mean substitution is exact, and a
statistical rejection SHALL NOT by itself identify the model term that caused it.

#### Scenario: The same build is evaluated twice

- **WHEN** an unchanged build is evaluated with the same scenario, identities, and mode
- **THEN** both evaluations return identical values and method and identity metadata

#### Scenario: A stochastic term has a proven expectation

- **WHEN** the engine's probability, ordering, rounding, and state transitions prove an exact expectation
- **THEN** the evaluator uses that expectation
- **AND** the report identifies the proof boundary

#### Scenario: A stochastic term has interacting state transitions

- **WHEN** no exact expectation is proven for resource decisions, thresholds, rounding, or event timing
- **THEN** the evaluator identifies the deterministic approximation and its validation status
- **AND** the report does not call that approximation exact

#### Scenario: Two close builds are evaluated repeatedly

- **WHEN** two builds have close deterministic objective values
- **THEN** each evaluation repeats the same values and deterministic score ordering
- **AND** search-gap evidence remains separate from model repeatability and sampling variance

### Requirement: Accuracy claims are scoped and independently validated

A numeric accuracy boundary SHALL be published only for a stated build, mechanic, game-version, and
scenario domain that has an adequate current corpus and independent validation. The validation set
SHALL not be used to fit the boundary. Historical samples and an in-sample maximum residual SHALL not
establish a global boundary, including a global 2.5 percent bound.

A result outside the qualified domain, or without current independent validation, SHALL carry no
numeric accuracy boundary and SHALL not be presented as exact. A qualified boundary SHALL distinguish
model error against the running game from finite-window variation and internal comparison error.

#### Scenario: A qualified prediction is displayed

- **WHEN** the planner displays a prediction within a domain with current corpus and independent validation
- **THEN** it displays the qualified numeric boundary with its domain and evidence identity
- **AND** it does not present the boundary as global

#### Scenario: A prediction has no qualified validation

- **WHEN** the build, mechanic, version, or scenario is outside the qualified domain
- **THEN** the result has no numeric accuracy boundary
- **AND** the report states that accuracy is unverified

#### Scenario: A historical residual is available

- **WHEN** only historical samples or an in-sample maximum residual support a proposed boundary
- **THEN** the planner refuses that numeric boundary
- **AND** it does not convert the residual into a global percentage claim

### Requirement: Resource generation and spending follow the event state

The evaluator SHALL update each resource pool at every relevant cast, completion, hit, incoming
damage, effect, and expiry event. Resource returned by dealing and taking damage SHALL use the
post-mitigation amount and the event order implemented by the engine.

Auto-attack damage returns a fraction of post-mitigation damage as energy for melee classes. A named
Wizard skill returns a fraction of damage as mana. Taking physical damage returns a square-root scaled
amount of energy. A resource-burn skill SHALL spend and damage from the resource pool that exists at
its cast event, not from maximum resource or a steady-state average.

The evaluator SHALL express resource income as a function of combat output and incoming-damage events,
not as a function of resource capacity. It SHALL record the initial pool, every gain and spend, and
any refusal caused by insufficient resource.

#### Scenario: A melee build increases its auto-attack output

- **WHEN** a build raises auto-attack damage or attack rate
- **THEN** the modelled event returns rise with that output
- **AND** the timeline can schedule more affordable skill casts

#### Scenario: A build raises resource capacity alone

- **WHEN** a build raises maximum resource without raising combat output
- **THEN** event-generated resource income does not rise proportionally
- **AND** the report distinguishes capacity from income

#### Scenario: A resource-burn cast follows a resource gain

- **WHEN** damage or an incoming event changes the pool before a resource-burn cast
- **THEN** the cast uses the updated current pool
- **AND** the report records the gain, spend, and resulting damage in order

#### Scenario: A resource-dependent action is unaffordable

- **WHEN** the current pool is below an action's cost at its event
- **THEN** the evaluator does not schedule the action
- **AND** it records the refusal without using future resource income

### Requirement: Buff timing distinguishes finite windows from steady state

An always-on passive SHALL contribute in full. For a finite evaluation window, a maintained buff SHALL
contribute only while its event-timeline state is active, including its initial state, cast time,
application result, expiry, refresh, and cooldown. The evaluator SHALL not replace a finite window with
a duration-over-cooldown ratio. Effect removal SHALL follow the engine cleanup boundary, not merely
the timestamp at which remaining duration reaches zero.

For a steady-state result, the evaluator MAY use duration and cooldown uptime only when the application,
refresh, resource, and timing process is stationary and the expectation or approximation is proven or
validated for the stated domain. An effect applied to a target SHALL also use the target's current
resistance, landing result, and maintained target state at each relevant event.

The evaluator SHALL charge each maintenance cast's time and resource cost and SHALL update those costs
when the rotation or state changes.

#### Scenario: A finite window ends during a buff

- **WHEN** a buff lasts ten seconds, its cooldown is thirty seconds, and the finite window ends at fifteen seconds
- **THEN** only the active timeline interval contributes
- **AND** the report does not substitute one third uptime for the window

#### Scenario: A steady-state buff has proven uptime

- **WHEN** application and refresh form a stationary process with a validated uptime calculation
- **THEN** the sustained result uses that uptime
- **AND** the report identifies it as steady-state rather than finite-window evidence

#### Scenario: A maintained target effect expires

- **WHEN** the engine cleanup boundary removes a target effect before the next action
- **THEN** the next action uses the target's unmodified state
- **AND** the report records the expiry before that action

#### Scenario: A buff cannot be afforded at its cast event

- **WHEN** maintenance costs more resource than the current pool provides
- **THEN** the cast is refused and its bonus is not credited
- **AND** an existing application remains active only until its own removal boundary

### Requirement: State-dependent decisions follow the ordered event timeline

The evaluator SHALL process cast, completion, projectile arrival, hit, incoming damage, resource,
cooldown, effect application, refresh, expiry, target-health, and death events in the engine's order.
The deterministic event model SHALL represent the applicable probabilities or a declared approximation,
not fabricate a sampled live trajectory. At each relevant event it SHALL recompute dependent values,
including resource-burn damage, resource cost,
maintained target avoidance and mitigation, effect landing, effect expiry, and health thresholds.

A finite scenario SHALL state its horizon and boundary treatment for an action at the horizon or a hit
that remains in flight. The evaluator SHALL not use a steady-state value for a finite event window
unless the result labels and validates that approximation.

#### Scenario: A maintained target effect expires before a hit

- **WHEN** the engine cleanup boundary removes a defense effect before a later hit lands
- **THEN** that hit uses the target's current defense without the effect
- **AND** the report records the expiry before the hit

#### Scenario: A threshold changes during the fight

- **WHEN** target health crosses an engine-tested threshold after an earlier event
- **THEN** the next cast checks the updated health
- **AND** a skill becomes available or unavailable according to that state

#### Scenario: A resource burn follows a state update

- **WHEN** a resource gain or spend occurs before a resource-burn cast
- **THEN** the cast damage uses the current post-update pool
- **AND** the evaluator does not reuse a prior or steady-state resource value

#### Scenario: A delayed hit arrives after target death

- **WHEN** a projectile reaches a target that died before arrival
- **THEN** the delayed hit contributes no damage
- **AND** the report records the cast and arrival separately

### Requirement: A buff category holds at most one effect per recipient

The model SHALL treat a non-empty buff category as exclusive in the recipient entity's `Skills` list.
`TargetDebuffSkill.cs:288-331` and `Skills.cs:1103-1116` are the source evidence for this recipient
scoping. When a category holds more than one candidate effect for one recipient, at most one SHALL
contribute. Every effect event SHALL carry a source entity ID and a recipient entity ID. The source or
caster ID SHALL NOT partition the collision domain.

Selection SHALL follow the engine, which keeps the buff applied most recently and expires every other
buff in that category on the recipient. The engine compares category names only, so the model SHALL NOT
assume that the larger effect survives.

The model SHALL apply this rule to every categorised effect, including skills and consumables. Effects
with different recipients SHALL remain isolated. The model SHALL retain source and recipient IDs for
application, replacement, expiry, and attribution.

#### Scenario: A weaker effect is applied over a stronger one in the same category

- **WHEN** two effects share a category and the weaker one is applied second to the same recipient
- **THEN** only the weaker effect contributes
- **AND** the source IDs do not prevent replacement

#### Scenario: Two sources target one recipient

- **WHEN** an owner and a companion apply the same category to one recipient
- **THEN** the newest effect replaces the earlier effect regardless of source
- **AND** the event record retains both source IDs and the recipient ID

#### Scenario: Two effects occupy different categories

- **WHEN** two effects carry different non-empty categories for one recipient
- **THEN** both contribute

#### Scenario: An effect carries no category

- **WHEN** an effect has an empty category
- **THEN** it does not expire any other effect

#### Scenario: Sources target different recipients

- **WHEN** an owner and a companion apply the same category to different recipients
- **THEN** both effects remain active in their separate recipient lists
- **AND** this narrower isolation result does not establish full-roster scoring independence

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
difference and before mitigation. The evaluator SHALL use the roll at its mean only where the resulting
fixed-state expectation is proven under the engine's rounding and later steps. Otherwise it SHALL label
the approximation and its validation status under the deterministic-evaluation requirement.
A report SHALL state a justified hard single-hit
support band separately from any mean or accuracy claim. A mean approximation SHALL NOT be used to
assert hard support without a separate derivation.

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

A predicted amount SHALL use explicit target inputs derived from exported spawn rules or an
independent target readback. The result SHALL retain their provenance. The model SHALL NOT obtain a
mitigation factor by calibrating against another measured amount.

A calibrated factor absorbs every term the model is missing, so it agrees with the measurement it was
fitted to and fails wherever the missing term differs. The level difference term is one such term: a
factor fitted at one target level silently carries that level's difference into every other.

#### Scenario: A model term may be missing

- **WHEN** a prediction is derived from read stats and disagrees with a measurement
- **THEN** the report preserves the disagreement without absorbing it into a calibrated factor
- **AND** it names a missing term only when independent evidence supports that attribution

### Requirement: Target avoidance and mitigation are reducible, and reduction is not certain

The model SHALL treat a target's avoidance and mitigation as reducible by a maintained debuff rather
than as fixed properties of the target.

Applying a debuff SHALL be gated by a resist probability derived from the target and reduced by the
caster's accuracy. In a finite window, the evaluator SHALL apply the actual landing, expiry, refresh,
and target-state events. In a stationary steady state, it MAY use the duration and cooldown bound
multiplied by landing probability only when that expectation or approximation is proven or validated.

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

Normal and veteran skill points SHALL be treated as separate budgets from their exported progression
rules. Normal-level and veteran awards SHALL NOT be added to both pools.

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

A resource-burn skill SHALL convert the current resource pool at its cast event into damage that
receives no avoidance roll and no mitigation reduction. The evaluator SHALL spend the converted
resource in the same event order as the engine.

Maximum resource SHALL affect output only through the current resource that the scenario makes
available. Increasing maximum resource alone SHALL not increase a burn at a fixed current pool. The
relative value of a burn can rise when target mitigation reduces ordinary damage, but the burn amount
itself SHALL not change because of that mitigation.

#### Scenario: A resource-burn skill is used against a high-mitigation target

- **WHEN** a target reduces ordinary damage by ninety percent
- **THEN** the resource-burn amount is unchanged
- **AND** the report shows its relative contribution beside the reduced ordinary damage

#### Scenario: The resource pool is empty

- **WHEN** the resource pool is empty at the moment of use
- **THEN** the modelled burn contribution and resource spend are zero

#### Scenario: Maximum resource rises at a fixed current pool

- **WHEN** maximum resource rises but current resource at the cast event does not
- **THEN** the burn damage does not rise
- **AND** the report distinguishes maximum from current resource

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

In raw mode, a mercenary SHALL use its achieved supplied state, including any increment the engine
has accumulated while it was present. A named normalization for the transient companion progression defect MAY use a declared post-reload
base-damage assumption and exclude that increment. Other defect normalizations SHALL NOT silently
apply this unrelated transformation.

The increment is a recorded defect. The engine derives a mercenary's skill level from the owner's
current state but accumulates its base damage per event, so otherwise identical mercenaries differ by
the owner's progression depending only on when each was hired. A normalized result SHALL cite the defect
record and identify the declared post-reload planning assumption; it SHALL NOT call that state an
achieved raw observation.

A planning figure without an achieved companion SHALL state its newly hired or best-roll assumption.
A player holding a mercenary with an accumulated increment can therefore measure more raw output than a
normalized planning figure reports.

Companion skills SHALL follow supplied state or the declared legal owner progression. Companion rolls
SHALL be supplied achieved inputs or explicitly declared reachable best-roll planning assumptions. They SHALL not become new optimizer decision dimensions. A value the engine
assigns but never reads SHALL NOT contribute to a predicted figure.

Mercenary output SHALL account for random selection among available skills rather than present a fixed
rotation. It SHALL use an exact expectation only where the selection, timing, resource, and state
transitions prove one; otherwise it SHALL label the deterministic approximation and its validation status. A verified
companion prediction SHALL require independent validation within its stated domain.

#### Scenario: A mercenary is given equipment

- **WHEN** equipment is placed on a mercenary
- **THEN** the modelled output rises through both the direct stat contribution and the attributes it
  adds

#### Scenario: Mercenary output is reported

- **WHEN** the evaluator reports a mercenary contribution
- **THEN** it states that selection is random and identifies the expectation or approximation method and validation status
- **AND** it does not present a sampled sequence as the predicted contribution

#### Scenario: A mercenary base stat is unknown

- **WHEN** a mercenary's rolled base damage is not supplied
- **THEN** dependent evaluation stops unless the planning scenario explicitly supplies a reachable roll assumption
- **AND** such an assumption is never presented as measured state

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
- **THEN** raw mode reports the achieved increment
- **AND** named known-defect-normalized mode reports the newly hired value with the defect reference

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

### Requirement: A companion's special-action cadence is bound by two gates, and weapon delay is not one of them

A companion's special-action rate SHALL be modelled from the shared selection timer and each skill's
cooldown. The engine draws the selection timer from 2 to 4 seconds. It then selects uniformly from the
offensive skills that are ready. A skill's cooldown starts when its cast completes.

The model SHALL NOT value weapon delay on a companion as a cadence change. It SHALL reduce a
companion's non-spell followup skill cooldown by that companion's haste. It SHALL record whether a
skill cooldown or the shared special-action selection gate limits each reported rate.

The model SHALL state that movement can make the in-range cadence unreachable. It SHALL NOT publish
that cadence as a reachable prediction while a companion must close distance between actions.

#### Scenario: A faster weapon is considered for a companion

- **WHEN** two companion weapons differ only in delay
- **THEN** the modelled cadence is identical

#### Scenario: Haste is added to a companion's default attack

- **WHEN** a companion gains haste
- **AND** its default attack is a non-spell followup skill
- **THEN** the modelled default-attack cooldown falls

#### Scenario: A special skill has a short cooldown

- **WHEN** a special skill is ready more often than the shared selection process chooses it
- **THEN** the report names special selection as the binding gate

#### Scenario: A special skill has a long cooldown

- **WHEN** a special skill is ready less often than its uniform selection share
- **THEN** the report names the skill cooldown as the binding gate

### Requirement: A skill the engine would refuse is not scheduled

The rotation SHALL check every engine-tested precondition at the skill's cast event. The solver SHALL
treat a precondition as a state constraint, not as a cost, and SHALL update the constraint after every
event that can change it.

The engine refuses an assassination cast above a quarter of target health. The evaluator SHALL exclude
that cast while the target is above the threshold, and SHALL consider it only after the timeline reaches
the threshold. A result SHALL name each excluded action and its state-based reason.

A solver that ignores a precondition reports output the game will not produce, and the reader cannot
tell which of the two is wrong.

#### Scenario: An assassination skill is available against a full-health target

- **WHEN** the rotation is solved against the default target at full health
- **THEN** the assassination skill is excluded at that state
- **AND** the result states the health threshold that caused the exclusion

#### Scenario: An assassination threshold is crossed

- **WHEN** earlier landed damage reduces target health below one quarter
- **THEN** a later assassination cast is eligible if its other gates pass
- **AND** the timeline records the threshold crossing before the cast

#### Scenario: A skill has no precondition

- **WHEN** a damaging skill carries no engine-tested precondition
- **THEN** it is available to the rotation on its current cost and cadence alone

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

### Requirement: Known-defect normalization is separate from raw parity

The running game SHALL remain authoritative for raw parity. Where an evidenced, recorded defect
changes a supported quantity, the evaluator MAY produce a known-defect-normalized result that models
the intended behavior. The normalized result SHALL name the defect, evidence reference, affected
quantities, and evaluation mode. It SHALL not alter, hide, or overwrite the raw diagnostic result.

The planner SHALL make objective mode explicit and SHALL compare candidates only within the same mode.
The only objective modes SHALL be raw and a named known-defect-normalized mode. A raw result MAY support
a recommendation when no known defect affects the compared objective. When a defect affects the
objective, raw output SHALL remain diagnostic and SHALL not give a recommendation an advantage from
that defect. A named normalized mode MAY support the affected recommendation only with current evidence
for that defect; otherwise the affected recommendation SHALL be withheld.

A defect SHALL not be normalized without current evidence. If no evidence supports normalization, the
result SHALL remain raw or unverified, and the planner SHALL withhold any recommendation affected by
that defect.

#### Scenario: A raw game result differs from normalized output

- **WHEN** a recorded defect changes a measured quantity
- **THEN** the report contains separate raw and normalized outputs
- **AND** each output names its mode and evidence identity

#### Scenario: A build gains only from a known defect

- **WHEN** a build ranks higher in raw mode only because of a recorded defect
- **THEN** a named, evidenced normalized mode scores the intended behavior
- **AND** the raw higher score remains a diagnostic, not an affected recommendation

#### Scenario: Candidates use different objective modes

- **WHEN** one candidate is raw and another is known-defect-normalized
- **THEN** the planner refuses to compare them as one ranking
- **AND** it requires an explicit common mode

#### Scenario: A defect lacks evidence

- **WHEN** a suspected defect has no current evidence reference
- **THEN** the evaluator does not normalize it
- **AND** the result states that normalized accuracy is unverified and withholds any affected recommendation

### Requirement: A resource multiplier is applied only where the game applies it

Raw evaluation SHALL scale a resource pool by its multiplier only where the game's own maximum reads
that multiplier. A named normalization may differ only under the separate known-defect contract.

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

### Requirement: Published values require per-quantity production parity evidence

Before a figure is published as verified, the production evaluator SHALL be compared with the same
quantity read from a running game through a complete, qualified harness report. The harness SHALL use
the shared logical build data through a checked adapter and SHALL invoke the same production evaluator,
data identity, and model identity used for planner output. It SHALL not use a test-only formula or
measured caster totals as prediction inputs.

The comparison SHALL cover every required quantity separately, including stat totals, action interval,
resource transitions, effect and target-state transitions where applicable, and damage quantities. When
learned books are present, stat and damage parity SHALL include their catalog-resolved gains and the
learned-book identity and catalog version. A reported damage comparison SHALL preserve requested damage
and health taken separately. Raw parity and known-defect-normalized output SHALL be compared and
reported separately. For captured inputs, read-only producer qualification SHALL establish how the
learned state was read. Inventory ownership or a mutating learning or reset command is not that proof.

A mismatch SHALL preserve the running-game observation and report the failed quantity, state, identities,
and protocol. A statistical rejection SHALL identify the rejected criterion and evidence, but SHALL NOT
claim a model cause without independent evidence. A game-version or identity mismatch SHALL prevent a
verified claim.

#### Scenario: The model changes

- **WHEN** a formula, coefficient, event rule, or approximation changes
- **THEN** every affected quantity is re-compared with current qualified live evidence before publication
- **AND** unaffected quantities retain their evidence identity

#### Scenario: One quantity disagrees

- **WHEN** one measured quantity disagrees with production prediction
- **THEN** the report identifies that quantity and preserves the matching quantities as separate results
- **AND** it does not replace the prediction with the measured value

#### Scenario: A statistical criterion rejects a comparison

- **WHEN** a declared statistical test rejects a quantity
- **THEN** the report records the test, sample, and rejection
- **AND** it does not label a particular model term as the cause from rejection alone

#### Scenario: The evaluator identity differs

- **WHEN** a harness report uses an evaluator, data, or model identity different from the planner result
- **THEN** the evidence is not qualified for publication
- **AND** the identity mismatch is named

#### Scenario: The game changes under a recorded comparison

- **WHEN** the installed assembly or game-data identity differs from a recorded comparison
- **THEN** the difference is reported before the comparison is used
- **AND** the old evidence does not qualify the new result

### Requirement: Verified claims require a complete qualified harness report

A verified model claim SHALL require a complete harness report that records the logical build data and
achieved state, fixture execution data, target input provenance, game assembly identity and label,
serialized schema and any applicable capture schema identity, game-data identity, evaluator and model identities, objective
mode, scenario and protocol versions, units and windows, per-quantity action and event counts, raw
observations and sequences, attribution fidelity, comparison outcomes, and any normalization output. For
a book-aware claim, the report SHALL include the learned-book IDs, catalog identity, resulting stat and
damage quantities, and, for captured inputs, runtime qualification of the read-only capture producer.

The report SHALL distinguish setup failure, incomplete evidence, statistical rejection, model
mismatch, and qualified success. A missing required artifact, incompatible identity, insufficient
sample, or unqualified approximation SHALL prevent a verified claim. A diagnostic report MAY preserve
observations, but SHALL not qualify a claim by itself. Qualification SHALL require passing all required
comparisons, the reviewed baseline gate, persisted evidence, cleanup, and final isolation readback.
Initial baseline qualification SHALL follow the harness's explicit reviewed promotion procedure rather
than silently pass a missing baseline. A numeric accuracy boundary additionally requires independent
validation. The harness report SHALL not require capture to
generate it, and a capture SHALL not generate it as a side effect.

#### Scenario: A complete report qualifies a claim

- **WHEN** all required state, comparisons, identities, protocol, reviewed baseline, persistence, cleanup, and isolation gates pass
- **THEN** the report may qualify the stated quantities and domain
- **AND** it identifies the production evaluator and model used

#### Scenario: A required evidence artifact is missing

- **WHEN** a report lacks a required identity, achieved state, quantity observation, protocol field, or raw sequence
- **THEN** the result is incomplete or diagnostic
- **AND** it has no verified accuracy claim

#### Scenario: Book-aware evidence is missing

- **WHEN** a book-aware report lacks learned IDs, catalog identity, resulting stat or damage quantities, or required capture-producer qualification
- **THEN** the result is incomplete or diagnostic
- **AND** it has no verified book-domain claim

#### Scenario: A statistical comparison rejects

- **WHEN** a complete report fails a predeclared statistical criterion
- **THEN** the report records the rejection as a failed comparison
- **AND** it does not convert that rejection into a proven model cause or qualified evidence

#### Scenario: A capture is read without harness execution

- **WHEN** a local capture is inspected or evaluated without a complete harness run
- **THEN** capture provenance remains available
- **AND** the result is not called a qualified harness report

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


### Requirement: Every evaluation names a complete scenario

The evaluator SHALL evaluate a build only with a scenario that states the named target and its
independent parameters, finite or steady-state horizon, initial resources and cooldowns, initial
health and effects, active buffs and consumables, ammunition and durability policy, incoming-damage
events, included controlled entities, target count, schedule policy, event-boundary rules, and
objective mode. Harness parity SHALL retain the explicit fixture action sequence and refusal policy.
Planner recommendations MAY solve the sequence from declared skill inclusion and exclusion; both
paths SHALL use the same production event/state evaluator.

A harness comparison SHALL distinguish requested state from achieved state and stop dependent
measurement when they differ. A planning scenario without a live character SHALL declare hypothetical
inputs rather than fabricate achieved-state evidence. The scenario SHALL identify the source and
provenance of independently supplied target state. A missing required input SHALL block the dependent
evaluation rather than receive a default or measured replacement. A partial local capture MAY remain
available for read-only inspection, but it SHALL not satisfy a missing required input.

This change supports one target. It SHALL refuse another target count. Pet state MAY be recorded for
meter accounting and provenance, but the evaluator SHALL not optimize pet builds.

#### Scenario: A default evaluation runs

- **WHEN** the planner evaluates its default build
- **THEN** the result names the stationary, non-attacking, full-health training dummy scenario
- **AND** it states initial resources, cooldowns, effects, schedule, horizon, boundary rules, ammunition,
  durability, included entities, target count, and objective mode

#### Scenario: A required target input is absent

- **WHEN** the selected scenario does not provide a target value required by the evaluator
- **THEN** the dependent evaluation stops as incomplete
- **AND** it does not copy a caster value or prediction into the target input

#### Scenario: A multi-target scenario is requested

- **WHEN** the scenario requests more than one target
- **THEN** evaluation fails with the unsupported target-count field named

### Requirement: Shared build data and checked adapters preserve provenance

Fixtures, local captures, and planner inputs SHALL share versioned logical build data without sharing
identical outer records. Logical build data SHALL include progression, `learnedBookIds`, allocations,
equipment and augments, controlled companions and their rolls and equipment, consumables, ammunition,
and quantities. The learned-book declaration SHALL distinguish complete-empty from missing or unread
state. It SHALL distinguish raw observed attributes, base or class/race progression contributions,
allocated points, and derived totals; a live total SHALL NOT be labelled as base attributes or
allocated points. The version-only `BuildEnvelope` SHALL identify version axes only. It SHALL not
replace the logical build data.

Fixture execution data SHALL remain separate from build data and SHALL contain target, initial state,
action schedule, facing, horizon, and sampling policy. Capture completeness, container integrity,
producer provenance, and capture state SHALL remain separate from build data. Capture SHALL read actual
learned-book state rather than inventory ownership, and SHALL not invoke learning, reset, or another
mutation path. Read-only behavior SHALL be proven by an independently recorded runtime qualification of
the capture producer, not by a self-declared capture flag. If learned state would require mutation to
read, the adapter SHALL retain that section as unread and refuse only dependent evaluation or
normalization.

Checked adapters SHALL reject unknown schemas or failed container integrity, preserve missing versus
empty sections, and invoke the same production evaluator used for planner results. A required missing
or unread section SHALL block only its dependent evaluation. It SHALL not block read-only inspection
of the captured sections, and capture alone SHALL not claim a harness report or verified parity.

Character and meter capture SHALL be read-only. Meter reset SHALL be an explicit, separate mutating
operation and SHALL never run as a capture side effect. Local capture parsing SHALL remain local and
SHALL not upload its contents. Pet state MAY be captured for provenance and meter accounting, but the
optimizer SHALL not select a pet build.

#### Scenario: A fixture and capture use different outer records

- **WHEN** a fixture and a capture contain the same logical build data
- **THEN** each retains its execution or capture metadata
- **AND** the evaluator adapts both to the same production evaluation path

#### Scenario: A capture section is missing

- **WHEN** a capture marks skills or equipment as missing or unread
- **THEN** read-only inspection can show the captured sections and completeness state
- **AND** an evaluation that needs that section stops as incomplete
- **AND** it does not treat the section as empty

#### Scenario: A capture is unknown or corrupt

- **WHEN** a schema is unsupported or container integrity does not match the payload
- **THEN** the adapter refuses the capture before evaluation
- **AND** it reports the failed identity or integrity check

#### Scenario: Capture and meter operations are requested

- **WHEN** character capture or meter capture runs
- **THEN** it does not mutate gameplay or reset the meter
- **AND** an explicit meter-reset command is required for reset

#### Scenario: A local capture is used without a harness

- **WHEN** a player imports a valid local capture without running a fixture
- **THEN** the evaluator can inspect or use complete build data according to its input policy
- **AND** the result does not claim harness verification merely because capture succeeded

### Requirement: Learned-book gains are catalog-owned and applied once

The model SHALL resolve each stable identity in `learnedBookIds` through the versioned game catalog.
The catalog SHALL provide the required book gain definitions and effect classifications; the logical
build record SHALL carry identities, not copied gains. Capture completeness SHALL remain in the outer
capture metadata. The source behavior is
`Player.UserCode_CmdTryLearnBook__String`, which adds the learned book and its attribute gains, and
`CmdResetAttributes`, which includes those book gains. The model SHALL apply each resolved gain once as
a permanent progression contribution. It SHALL NOT spend attribute or skill points for a book, treat a
learned book as an inventory consumable, or count its gain again in derived stats. A complete empty
declaration means no book gain. Missing or unread state, an unknown identity, a duplicate identity, a
missing catalog definition, or an unclassified effect SHALL refuse dependent evaluation or publication
rather than receive a silent default.

The harness, not the browser evaluator, SHALL materialize books through the normal game learning paths
on an owned scratch character. It SHALL never mutate the original capture or a player's save. It SHALL
verify learned IDs and resulting attributes, and prove that reload does not apply persisted bonuses
twice. Harness materialization mutates the scratch character. Model evaluation resolves catalog
contributions; it does not perform learning or reset operations.

#### Scenario: A learned book resolves to a catalog gain

- **WHEN** a complete build declares a known learned-book identity
- **THEN** the model applies its catalog-resolved gain once to the progression contribution
- **AND** it leaves attribute and skill point budgets unchanged

#### Scenario: A learned book is already represented in derived state

- **WHEN** a capture includes a learned-book identity and an observed derived total containing that gain
- **THEN** the model derives its prediction from independent declared inputs and catalog gains applied once
- **AND** it compares the observed total without feeding that total back into its own prediction

#### Scenario: Book data is missing or unclassified

- **WHEN** a required book field, catalog definition, or effect classification is missing
- **THEN** dependent publication or evaluation is refused
- **AND** the report names the missing field or classification

#### Scenario: The harness reloads a learned character

- **WHEN** the harness reloads a character after normal book-learning materialization
- **THEN** it verifies learned IDs and resulting attributes
- **AND** it fails if persisted book bonuses apply twice

### Requirement: Equipment and skill effects are exhaustively classified

Every equipment, ammunition, consumable, learned-book, and skill effect admitted to an evaluation
SHALL be classified as modelled, excluded by a stated domain rule, or unsupported. The model SHALL NOT
score an unsupported effect as zero.

Publication SHALL fail when the planner payload admits an effect kind for which the model has no
classification. The required existing book gain fields are `book_strength_gain`,
`book_dexterity_gain`, `book_constitution_gain`, `book_intelligence_gain`, `book_wisdom_gain`, and
`book_charisma_gain`; these fields and their definitions SHALL be present before publication. An
unknown or unclassified book effect is a publication refusal.

#### Scenario: A new proc effect enters the payload

- **WHEN** an exported proc-effect kind has no model classification
- **THEN** planner publication fails and names that effect kind

#### Scenario: An equipped effect is outside the model

- **WHEN** an imported build contains an unsupported effect
- **THEN** the build is not ranked
- **AND** the result names the unsupported effect

### Requirement: Refresh procs and cooldown changes follow event state

At each eligible landed event, the evaluator SHALL apply the proc probability and refresh rule.
Eligibility alone SHALL NOT guarantee a proc or extend its expiry. A
steady-state contribution SHALL use the proc probability, duration, and triggering cadence only when
the stationary expectation is proven or validated for the stated domain. A cooldown-reduction effect
SHALL alter every active cooldown that the game alters and no other timing gate.

#### Scenario: A proc duration is refreshed in a finite window

- **WHEN** the modelled proc triggers from an eligible hit before the effect expires
- **THEN** the effect expiry is extended according to the engine rule
- **AND** the finite-window contribution records the refresh event

#### Scenario: A proc lands after expiry

- **WHEN** the modelled proc triggers after the effect has expired
- **THEN** the evaluator applies a new proc under the landing rule
- **AND** it does not treat the event as a continuous refresh

#### Scenario: A steady-state proc has validated uptime

- **WHEN** repeated event windows validate a stationary proc expectation
- **THEN** the sustained result uses the stated expectation or approximation
- **AND** it identifies the validation domain instead of claiming finite-window exactness

#### Scenario: A cooldown-reduction buff is active

- **WHEN** the game applies that buff to a skill cooldown
- **THEN** the evaluator applies the same reduction before scheduling the affected skill
- **AND** it leaves unrelated timing gates unchanged

### Requirement: Ammunition and durability have explicit policies

A ranged evaluation SHALL consume the selected ammunition and SHALL refuse a horizon for which the
stated supply is insufficient. The model SHALL carry initial durability for provenance.

The default non-attacking-dummy scenario SHALL state that it causes no durability loss. A scenario
that would cause durability loss SHALL be refused until that transition is modelled.

#### Scenario: Ammunition runs out

- **WHEN** the solved ranged rotation needs more ammunition than the scenario supplies
- **THEN** evaluation fails and reports the required and available quantities

#### Scenario: Incoming damage would reduce durability

- **WHEN** a scenario includes a durability-loss condition
- **THEN** evaluation fails and names durability loss as unsupported

### Requirement: Incoming damage is an event-stream input

Resource returned from taking damage SHALL be derived only from the scenario's incoming-damage event
stream. The model SHALL NOT infer target attack cadence from defensive target statistics or from total
damage alone.

#### Scenario: The target does not attack

- **WHEN** the incoming-damage event stream is empty
- **THEN** taking-damage resource generation is zero

#### Scenario: Incoming damage is supplied

- **WHEN** the scenario supplies timed incoming-damage events
- **THEN** the resource engine derives returns from those events in their stated order

### Requirement: Accuracy, finite-run variation, and search gap remain separate

A result SHALL report model error, finite-window variation, and search gap as separate quantities when
they apply. Model error SHALL come only from qualified current validation. Finite-window variation
SHALL come from the declared observation protocol. Search gap SHALL come only from independent search
comparison for a named benchmark domain and SHALL describe the distance from the best-found result to a
reference-search result. It SHALL concern a potentially missed optimum, not pairwise ranking
equivalence, model accuracy, or a prediction boundary.

The evaluator SHALL preserve deterministic score order for candidates with the same evaluator, model,
game-data, scenario, and objective mode. It SHALL NOT group candidates by a search gap. A separately
named product tolerance MAY support a practical alternatives view only when independently evidenced.
An intentional game-defect normalization SHALL remain separate from all three quantities and from raw
parity.

#### Scenario: Two candidates fall inside a measured search gap

- **WHEN** candidates share the comparison tuple and their objective difference falls inside the named search-gap band
- **THEN** the evaluator preserves their deterministic score order and reports both scores
- **AND** it does not present them as equivalent because of the search gap

#### Scenario: A measured rate is compared with a prediction

- **WHEN** finite-window variation and qualified model error both apply
- **THEN** the report names both values and their derivations
- **AND** it does not replace either with the search gap

#### Scenario: Search evidence lacks model validation

- **WHEN** a search-gap benchmark exists without current independent model validation
- **THEN** it can report distance to the reference-search result only
- **AND** the result has no numeric model-accuracy boundary

#### Scenario: Objective modes differ

- **WHEN** candidates use raw and known-defect-normalized modes
- **THEN** no shared search-gap comparison is applied
- **AND** each mode remains separately reported
