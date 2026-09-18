## Context

See `proposal.md` for motivation. This section records the state that shapes the approach.

`website/src/lib/planner/` holds about 7,000 lines of TypeScript including tests. The formula modules
are source-cited and locally tested: `engine-math`, `caster`, `target`, `hit`, `timing`, `legality`,
`logical-build`, `capture-build`, `build-envelope`, `scenario`, `scenario-state`, and
`catalog-resolver`. Three modules compose them statically. `evaluate.ts` computes one hit per action
from initial state and multiplies it by a use count. `rotation.ts` solves a fractional schedule from
scalar damage values. `uncertainty.ts` publishes a boundary from an in-sample maximum residual.
`resource.ts`, `effects.ts`, and `companion.ts` are standalone expectation helpers that `evaluate.ts`
does not import.

`mods/CombatVerification/` holds materialization through engine paths, four state probes, a per-hit
damage log with skill attribution, fixture validation, and a C# comparison engine with baseline
commands. `build-tool/VerifyCommand` launches the game into an owned scratch database, validates the
fixture matrix, and returns. No run has materialized a fixture and measured it end to end.
`verification/fixtures/` holds 33 descriptors, two of which name the Bard class.

The measured evidence that exists was gathered by HotRepl experiments and is recorded in the two
superseded designs. The most important results: the stat sheet matches exactly across eight stats and
a three-attribute coefficient sweep; the physical mitigation coefficient fits at 0.000498 against
0.0005 in source with the ceiling confirmed at 1800 defense; debuff landing matches within 0.016 over
six conditions of 1,000 attempts; the refractory after a weapon-category skill is the weapon interval
and after any other skill is a flat 0.75 s; a buff category holds one effect per recipient and the
newest wins; a companion samples a special action on a 2 to 4 s timer; and one dagger raised a
mercenary's damage from 17 to 462. Every formula those experiments confirmed is already in the formula
modules.

The game is 0.9.32.4. The Bard class uses a song resource and five dedicated skill classes
(`Bard*Skill.cs`) with active-song state, auras, renewal, and charm. No current formula module covers
them. The planner payload currently drops Bard because its resource type is not mana or energy.

Engine constraints that fix the timeline shape: `NetworkManagerMMO.cs:105-117` runs recovery on a
one-second tick; casts, swings, and cooldowns use exact timestamps; `Skills.cs:712-717` removes
expired effects on every entity update, so an expired effect leaves within one frame; the game draws
from one shared random generator, so a seed does not reproduce a sequence.

## Goals / Non-Goals

**Goals:**

- One engine that both the harness comparison and the future calculator consume, with no second
  evaluation path.
- Each tier closable on its own with committed evidence.
- Delete every module the new engine makes unreachable in the same change.

**Non-Goals:**

- A search layer or surrogate objective. If a later optimizer needs one, it measures the engine first.
- Reproducing the game's random sequence. The engine samples the same distributions, not the same
  generator.
- A statistical protocol beyond what four tiers and a small fixture corpus need.

## Decisions

### Sample the draws instead of proving expectations

The superseded design required a deterministic expectation and then required proof that mean
substitution survives rounding, affordability, thresholds, refresh, and companion selection. That
proof was never produced and would need a separate argument per mechanic. Sampling removes the
question. Each replicate draws the variance roll, the avoidance roll, the critical roll, the resist roll,
and the companion action choice from the distributions the source defines. The reported value is the
sample mean with its standard error. Variance, refusal rates, and effect uptime fall out of the same
runs.

Reproducibility is kept by a seeded generator. Ranking stability is kept by common random numbers: two
builds evaluated under one scenario and seed consume the same stream in the same event order, so their
difference is not sample noise while their event orders agree. Once the orders diverge, later draws
differ; the report states the replicate count and standard error so a reader can judge a small gap.

Alternative considered: keep the deterministic evaluator and add the proofs. Rejected because task 4.6
of the superseded change had no path to closure and the harness compares distributions regardless.

### Generator and stream layout

The generator is `xoshiro128**` seeded from `splitmix32`. It is small, has no dependency, and passes
the usual statistical batteries for this use. A replicate's stream is seeded from the scenario seed
and the replicate index. Within a replicate, draws are consumed in event order. The `Random.Range`
float draw is mapped to a 32-bit float in [0, 1) times the range, and the Bernoulli draw compares a
float to the probability, mirroring `UnityEngine.Random` usage at the cited sites. Bit equality with
Unity is not a goal.

### One engine, two action policies

The engine owns entities, a target, an exact-timestamp event queue, and the one-second tick. Every
mechanic is a handler on engine state: the hit pipeline at a hit event, the resource engine at hit,
incoming-damage, cast, and tick events, timed effects at application, expiry, and cleanup, cooldowns
at completion. A policy answers one question at an entity's decision event: what does this entity do
now. The player policy has two implementations. A fixture supplies a declared schedule with its
repetition and boundary rules. A planner build supplies an ordered priority list of included skills,
and the policy casts the first skill that is ready, affordable, and legal, or the default attack. The
companion policy samples `PetSkills.NextAttackSkill`: the shared 2 to 4 s special-action timer, a
uniform choice among ready offensive skills, the follow-up default attack, and the healer reserve.

The fractional-knapsack solver is deleted. It answered a search question that no longer exists in this
change and its output could not be executed as an integer schedule.

### The hybrid timeline

Actions, projectile arrivals, cooldown expiry, and effect expiry are exact-timestamp events. Resource
recovery and damage over time run on the tick. The queue orders by timestamp, then by a stable
sequence number, so two events at one timestamp resolve in insertion order. The game removes an
expired effect on the recipient's next update, which is one frame later; the engine removes it at the
expiry timestamp because that frame is below its timing resolution.

### Verification splits at the file boundary

The game side produces evidence and the model side judges it. `build-tool verify` materializes each
fixture in a fresh scratch database, runs the tier measurement the fixture declares through
`fixture.observe`, and writes `verification/observations/<fixture>.json`. It never calls the engine. A
vitest suite in `website/src/lib/planner/` reads every fixture and observation, runs the engine with the
fixture's seed and replicate count, and compares under the protocol. Committed observation files are
the baseline; git review of the diff is the promotion step.

Alternative considered: compare inside the build tool. Rejected because the engine is TypeScript and
the comparison would need a second runtime or a port. Alternative considered: keep the C# comparison
engine and baseline commands. Rejected because they compare against caller-supplied predictions and
would duplicate the protocol.

### Timed windows open at the warm-up refractory boundary

`build-tool verify` travels to the declared target through the game's portal command, places the
player on the requested side, arms the default attack, and opens the window when that attack enters
its refractory period. The attack finishes after this recorded boundary. The engine scenario starts
the default attack on its refractory cooldown and delays every listed non-default action by the
remaining warm-up cast time. The harness fills the player's resources when it observes the
completion, and the approach walk stays outside the window. Inside the window the player casts the
first declared action that is ready and affordable, and the default attack when none is, as the game's
own client does for an unaffordable rage or mana skill. Between the windows of one fixture the
harness cancels the follow-up loop, clears every cooldown, and removes every effect the window added,
so each window repeats the initial state the engine runs from. The harness pauses companion attacks
and support buffs during the player's warm-up, then restores the attack stance when it observes the
completion. The engine delays the Warrior's priority area-taunt path by the remaining warm-up cast
time because that path reacquires its melee target after the stance returns. A companion's damage per
window is the movement of its own damage meter. The harness suppresses
autonomous support-buff checks during the window so the measurement isolates the declared
`PetSkills.NextAttackSkill` policy while retaining the healer resource reserve. The player's damage
is the sum of hits from an action begun inside the window. A late projectile from the warm-up action
is excluded. A tier B window is sized from the engine's cooldown of the slowest listed skill times the declared minimum.
A fixture for a long-cooldown skill therefore declares a small minimum. The game
completes actions on frame boundaries, so an observed interval may differ from the engine's exact
interval by up to three frames of the window's average frame length: one frame of slip at each
endpoint and jitter between frames. The training Dummy is the timed target because it never attacks;
a fighting spawn produced a stun gap inside a cadence window.

### The comparison protocol

A deterministic quantity compares exactly: every stat-sheet field, every legality outcome, every count
the engine fixes. A per-hit ratio compares to the support band the integer steps allow, and one
sample outside the band fails. A stochastic mean compares by a two-sample Welch test between the
observed samples and the engine's replicate values at a significance level of 0.01, with a minimum
sample count declared per quantity in the fixture. Fewer samples report inconclusive. The protocol
does not correct across the fixture corpus because the corpus is small and each fixture is reviewed
individually. A rejection names the quantity, the statistic, and the threshold. It does not name a
cause.

### Class domain by declaration

`planner_payload.py` declares the supported and excluded class sets. Bard is excluded with the reason
that its song system is a separate mechanic family. Preflight fails when the export contains a class
that is neither supported nor excluded, so the next new class stops the build instead of vanishing.
The payload emits a `classDomain` block, and the catalog resolver refuses a build of an excluded class
with the reason. The resource-type filter is removed.

### Observation staleness

Each observation carries the assembly hash. The comparison suite reads the current hash from
`server-scripts/SNAPSHOT.toml`. A hash mismatch reports the fixture as stale and neither passes nor
fails it. `update-game-version` requires that every committed fixture has a current observation, so a
patch cannot publish with evidence from a previous build.

### Evidence moves before the superseded changes are deleted

The measured tables in the two superseded designs move to `docs/combat-model/evidence.md` with their
recorded game builds and their scope. Then the two change directories are deleted. Their task
histories are not carried; git history holds them.

### Bard fixtures move to a supported class

`A-haste-floor` and `C-haste-floor` name Bard. They test the weapon-interval floor, which any
weapon-category class reaches with enough haste. They are re-authored on the Rogue.

### Default replicates are measured

The default replicate count is the smallest power of two at which the level-50 default build's DPS
standard error is below one percent of the mean over a 60 s window. The measurement and the resulting
constant are recorded in the evidence file. The scenario field remains explicit; the default only
seeds authored scenarios.

## Risks / Trade-offs

- [Common random numbers stop aligning after event orders diverge] → The report always carries
  standard error and replicate count; a comparison closer than two standard errors is stated as
  undecided.
- [Sampling cost in the browser] → Not measured in this change. The calculator change benchmarks
  before it sets a budget. A 60 s window with about 100 actions per replicate is cheap in a worker.
- [The harness has never completed a materialized measurement] → Tier A is first and needs only
  creation, progression, equipping, and the stat-sheet probe. Its completion proves the lifecycle
  before any combat window.
- [Welch on dependent hits within one window] → Tier D uses windows as the sampling unit and hits
  only within the support-band check. The minimum window count is declared per fixture.
- [Wine process handling on macOS is fragile] → Existing ownership and shutdown paths are kept as is;
  the change removes reuse, it does not touch launch.
- [Deleting the superseded changes loses planning context] → The evidence file is written and
  reviewed first, and git retains the directories.

## Migration Plan

1. Engine core and player policy with source-only tests. Delete `evaluate.ts`, `rotation.ts`, and
   `uncertainty.ts`.
2. Class domain in the payload and resolver.
3. Harness: `fixture.observe`, fresh scratch per fixture, observation writer. Delete comparison,
   baseline, and reuse code.
4. Tier A observations for six classes, then the comparison suite.
5. Tier C, then tier B, then tier D with companions.
6. Evidence file, superseded change deletion, runbook, citations, and the version-update gate.

Rollback within a slice is a revert. No published surface consumes the removed modules, so there is no
compatibility window.

## Open Questions

- Whether the companion movement state can be held in range for a whole tier D window by target
  placement alone. If not, the companion window records the movement state and the comparison uses the
  in-range replicates only. This does not change the specs or the task breakdown.
- Tier D windows currently model no incoming damage because the Dummy never attacks. Incoming
  returns stay covered by the engine's source-cited unit tests until a fixture against a fighting
  spawn with a recorded incoming stream is authored.
