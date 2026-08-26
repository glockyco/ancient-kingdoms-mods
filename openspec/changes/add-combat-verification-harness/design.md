## Context

See `proposal.md` for motivation. This section records the engine facts that make the approach
possible, all read from the decompiled source and several confirmed against a running game.

**Action commands are the real path.** `PlayerSkills.CmdUse(int skillIndex, Vector2 direction)` is the
command the interface itself sends. `TableUI.cs:99` and `UICraftingStation.cs:64,444` call it directly,
and `UserCode_CmdUse` is the authoritative server handler
(`server-scripts/PlayerSkills.cs:666-733`). It enforces the barber guard, the learned-skill check, the
state gate of `IDLE`, `MOVING` or `CASTING`, index bounds, `CheckTarget`, the mana cost, and the energy
cost, then sets the pending and follow-up skill and the look direction. Cooldown is enforced slightly
later at cast start through `IsReady`. Simulating pointer input would send this same message, so
driving actions through the command is faithful rather than a shortcut.

**Look direction is a damage input.** `UserCode_CmdUse` assigns `player.lookDirection = direction`, and
`Combat.cs:649` grants a combat advantage when attacker and victim share a look direction, multiplying
avoidance by 0.8 and adding 10 percent damage, or 25 percent for a Rogue with the relevant skill. A
fixture that leaves direction unspecified produces an unstable damage figure.

**Character creation is a static method.** `Database.CharacterCreate(...)`
(`server-scripts/Database.cs:2956`) builds a correct level-one character of any class. This matters
because each class is a distinct player prefab with its own skill templates, so a class cannot be
changed on an existing character at runtime.

**Levelling has a single correct entry point.** The `Experience.current` setter runs the engine's own
loop: it increments level, invokes `onLevelUp`, and calls `LevelUpMercenaries`
(`server-scripts/Experience.cs:56-110`). Awarding experience therefore grants attribute points, skill
points, the class attribute cadence, veteran points past the cap, and correct companion scaling,
without any of those being assigned by hand.

**Equipment changes propagate through a callback.** `PlayerEquipment` subscribes
`slots.Callback += OnEquipmentChanged` (`server-scripts/PlayerEquipment.cs:155`), so assigning a slot
applies attribute bonuses and armour set thresholds. `PlayerInventory.Add(Item, int, int, string)` is
public.

**Damage carries its skill.** `Combat.DealDamageAt(Entity victim, int amountDamage, ScriptableSkill
skill, ...)` (`server-scripts/Combat.cs:519`) receives the skill, so a postfix can attribute a hit.
Three public events also exist without patching: `onDamageDealtTo` and `onKilledEnemy` as
`UnityEvent<Entity>`, `onServerReceivedDamage` as `UnityEvent<Entity, int>`, and
`onClientReceivedDamage` as `UnityEvent<int, DamageType>` (`server-scripts/Combat.cs:93-99`).

**The database path is a static field, and the redirect works.** `GameManager.pathFileDB`
(`server-scripts/GameManager.cs:283`) is read when the connection is opened
(`server-scripts/Database.cs:759`), and the connection is opened from the login screen
(`server-scripts/UILogin.cs:732`), not at start-up. `ConnectInternal` then creates the file, sets
write-ahead journaling, and runs `CreateAllTables` and `CreateAllIndexes`, so a fresh path
self-initialises exactly as a first run does.

The whole approach was exercised end to end before this design was written. A run redirected the path
at the start scene, created one character of each of the six classes, levelled one of them to the cap
and through all 200 veteran awards, hired a mercenary, and equipped it. The live save's content hash
was identical before and after. Account provisioning needed no intervention, because `getAccount`
creates an account when the table is empty (`server-scripts/Database.cs:837-857`).

**The random generator is unseeded in combat.** `UnityEngine.Random.InitState` is called only in
`NoticeBoardElvenVillage.cs:152,154`. Combat never seeds it, so a harness may.

## Goals / Non-Goals

**Goals:**

- Make a measured disagreement between model and game cheap to produce and unambiguous to read.
- Localise a disagreement to a mechanic rather than to a build.
- Keep every fixture reachable in normal play, so a measurement means something.
- Survive a game update by failing loudly rather than drifting quietly.

**Non-Goals:**

- Bit-exact reproduction of a damage sequence.
- Any capability that helps a player play. The harness measures and reports.
- Modelling allied players. A fixture covers only entities its owner controls.

## Decisions

### One descriptor for fixtures and for reported builds

An authored validation fixture and a build captured from a player's game describe the same thing. Using
one schema means the bug-report path and the regression suite are the same code, and a player's report
becomes a runnable fixture rather than a description to be interpreted.

The alternative is two formats with a converter. That adds a translation layer whose bugs would be
indistinguishable from the model bugs it is meant to help find.

### Materialize through engine paths, with one bounded exception

A fixture is built by the engine. Creation, levelling, skill spending, item grant, and equip all use
the methods listed in Context.

The reason is not convenience. A hand-forged character can hold a combination the engine cannot
produce, for example a skill level above what its point budget allows or an attribute total inconsistent
with its class cadence. Measuring such a character validates the model against a state no player can
reach, which is worse than not measuring.

The exception is a companion's rolled values. A mercenary's health multiplier, resource multiplier, and
base combat value are randomised at hire (`server-scripts/Player.cs:9744-9790`), so requesting a
specific companion through the engine path would mean hiring repeatedly until the roll matched. The
harness therefore assigns those three values directly, and constrains them to the envelope the hire
path can produce.

That envelope is race dependent and archetype dependent:

| Race | Health multiplier | Resource multiplier, Warrior or Rogue | Resource multiplier, others | Base combat factor |
|---|---|---|---|---|
| Human | 0.95 to 1.00 | 0.95 to 1.00 | 0.95 to 1.00 | 0.90 |
| Elf | 0.90 to 0.95 | 0.90 to 0.95 | 1.00 to 1.05 | 0.70 |
| Dwarf | 1.00 to 1.05 | 1.00 to 1.05 | 0.90 to 0.95 | 0.70 |
| Dark Elf | 0.90 to 0.95 | 0.90 to 0.95 | 1.00 to 1.05 | 0.90 |
| Fire Goblin | 0.95 to 1.00 | 1.00 to 1.05 | 0.90 to 0.95 | 0.90 |
| Felarii | 0.90 to 0.95 | 1.00 to 1.05 | 0.90 to 0.95 | 0.95 |
| Drassar | 0.95 to 1.00 | 1.00 to 1.05 | 0.90 to 0.95 | 0.95 |

Base combat at hire is an integer in the half-open interval from zero to `round(owner level × factor)`,
because the engine uses an integer range whose upper bound is exclusive. Each veteran point then adds
one to base damage and one to base magic damage, and adds 0.0025 to the resource multiplier
(`server-scripts/Player.cs:4510-4685, 9822-9832`). A companion's level equals its owner's level.

One entry in that table is dead. `Energy.max` is `baseEnergy.Get(level)` plus flat bonuses and never
reads `multiplierEnergy` (`server-scripts/Energy.cs:12-37`), while `Health.max` does apply
`multiplierHealth` (`server-scripts/Health.cs:34-40`). The resource multiplier is therefore inert for a
Warrior or Rogue companion, including its veteran accumulation. The harness records the value for
fidelity but must not treat it as affecting output.

### Mirror the export architecture

The repository already runs a game-driving pipeline: a build-tool command invokes a typed command
registered by a mod, which performs work and returns artifact references. The verification run takes
the same shape rather than inventing a second one.

Evaluated expressions were rejected as the interface. They are untyped, unversioned, and not
reviewable, which is the ad-hoc situation this change exists to replace. Evaluation remains appropriate
for one-off investigation.

### Probe fidelity is a ladder, and the top rung is required

| Tier | Mechanism | Yields |
|---|---|---|
| 1 | combat meter totals and active seconds | totals, and an action interval by inference |
| 2 | subscribe to the public damage events | per-hit attacker and amount, and damage type |
| 3 | postfix on the damage entry point | per-hit with the skill the engine chose |

Validating a rotation requires knowing which skill the engine selected, so tier three is required.
Tiers one and two are retained because they need no patch and therefore keep working when a patch
target moves.

### Determinism is a variance reduction, not a guarantee

Seeding the generator makes combat rolls reproducible only if the draw order is also reproducible. Other
systems draw from the same generator, so the order is stable only in an isolated encounter against a
target that neither moves nor attacks.

A comparison therefore seeds the generator, runs a stated number of events, and asserts on the mean
within a tolerance and on the observed range within predicted bounds. The observed sequence is recorded
for diffing but is not the pass condition.

### A diagnostic ladder, so a failure localises

| Tier | Fixture shape | Isolates |
|---|---|---|
| A | no combat | the stat sheet: attributes, equipment, passives, set thresholds, caps, consumables |
| B | one skill, one hit | the damage pipeline, per skill class |
| C | auto-attack only, swept over weapon delay and haste | the timing model and its clamps |
| D | full build over a stated duration, traced | the rotation and the resource engine |

A tier D failure with A, B, and C passing points at the rotation. A single whole-build fixture would
only report that something is wrong.

### The descriptor keys items by identifier, and one gate refuses

A fixture names an item by the identifier the game uses, and carries the display name only as context.
The planner's export capability already requires this, and a fixture and a captured build share one
schema, so keying by name would have forced a conversion step and broken a stored fixture whenever a
game update renamed an item.

An absent section and an empty section mean different things. A section the stat sheet depends on must
be present, and an empty list states that it holds nothing. Absent means the section was never read,
which no default may stand in for. Companions and actions may be absent, because a fixture naming
neither measures the stat sheet alone.

Reading a descriptor is permissive, and validation is the only gate. A reader that rejected the first
absent field would report one fault where a fixture often has several, and the contract is to name every
field at fault together with its permitted range.

### Legality is checked against injected rules, not a restated table

The validator takes the rules it needs as an input. The running game supplies them from its own
definitions, and a test supplies synthetic ones. Restating the game's cost, tier, and prerequisite
tables inside the validator would create a second source of truth that drifts from the game silently,
which is the failure this change exists to prevent. The engine remains the final authority: a
materialization step that the engine refuses fails the run.

### Committed fixtures live beside the baseline, and scratch state records what built it

Fixture definitions and the recorded baseline are committed, and a scratch database is not. They
therefore live apart: definitions and baselines under a `verification/` directory in the repository,
and scratch state inside the game installation where the redirect points.

Retained scratch state carries a marker naming the build identity and a digest of the fixture
definitions it was materialized from. A run compares both and rebuilds when either moved. The digest
covers each definition's name as well as its content, because a baseline is keyed on the fixture name
and a rename therefore describes a different fixture.

### One session client, one flow for each purpose

Connecting, confirming the protocol, waiting until the game has registered the commands a flow calls,
calling one, and quitting are the same for every flow. They live in one session client. The export flow
and the verification flow each compose it and differ only in the commands they call and what they do
with the answers.

### Isolation by redirecting the database path

A run points the game's database path at a scratch file. Fixture characters therefore never exist in a
player's save, and a crashed run leaves nothing to clean up.

The alternative, reserved character names in the live save with deletion afterwards, fails exactly when
it matters most, which is when a run crashes.

### Scratch saves are reused and are not committed

Materializing a full fixture matrix costs real time, so a scratch save is retained between runs and
reused when the game version and the fixture definitions are both unchanged. It is rebuilt when either
changes, because a game update can add or alter class abilities.

Scratch saves are not committed. Fixture descriptors and the golden baseline are, because those are the
reviewable artifacts.

### A golden baseline with a drift gate

Measured quantities are recorded per fixture. A run compares against that baseline and fails on drift,
in the same posture the repository already applies to source citations. This folds the harness into the
existing per-version update workflow, which is where a game change is already expected to surface.

## Risks / Trade-offs

- A patch target for the trace postfix can move or disappear. → Tiers one and two need no patch, so a
  moved target degrades fidelity rather than stopping verification. The run reports which tier it
  achieved.
- A fixture can drift out of legality when the game changes point budgets or gates. → Materialization
  spends points through the engine, so an illegal request fails during materialization rather than
  producing a quietly wrong measurement.
- Redirecting the database path is a global mutation and could touch a real save if it were wrong. →
  The run refuses to start unless the resolved path is inside its own scratch directory, and a backup of
  the live save is verified before a run that could reach it.
- The measurement is only as good as the fixture's realism. Measuring an unreachable build gives a
  precise answer to the wrong question. → Legality is a requirement, not a convention.
- Time cost grows with the matrix. → Tiers A and B need no combat and dominate the coverage, so the
  expensive tiers stay small.
- The harness could be mistaken for gameplay automation. → It runs only when invoked for verification,
  performs no action outside a fixture, and is not published to players.

### A player rotation is scripted, a companion rotation is an expectation

The engine has no autonomous action selection for a player. `UserCode_CmdUse` sets the pending and
follow-up skill only for a follow-up default attack, so the engine repeats the basic attack and nothing
else. This was observed: a single command produced an indefinite sequence of the same basic attack and
no other skill.

A player fixture therefore states its action sequence explicitly, because there is no engine selection to
validate. Validating a rotation means validating that a stated sequence produces the predicted output,
which is what the planner's solved rotation asserts.

A companion is the opposite case. `PetSkills` selects uniformly at random among ready damage and debuff
skills every two to four seconds, and a healer archetype withholds casts below a mana reserve. A
companion contribution is therefore reported as an expectation over that selection and is not scripted.

### The baseline stores bounds, not a sequence

Because the engine shares one random generator across systems, an exact event sequence is not reliably
reproducible. A baseline that stored one would produce failures that carry no information.

The baseline therefore stores the seed, the event count, the mean, and the predicted bounds. A full
observed sequence is retained beside it as a non-gating artifact for inspection.
