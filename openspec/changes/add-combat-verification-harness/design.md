## Context

The repository has typed fixture validation, character materialization, state and damage probes,
comparison helpers, baseline helpers, and 33 committed descriptors. These components do not yet form a
verified matrix runner. The runner validates descriptors after world entry; it does not materialize
each build, execute its actions, obtain planner predictions, compare observations, or persist a
qualified baseline. A successful validation command is not evidence of combat parity.

The experiments recorded in tasks 7.7 through 7.14 establish specific runtime observations. They are
not a current-version baseline or an independent accuracy study. Source evidence has an assembly hash
in `server-scripts/SNAPSHOT.toml`; each measurement must identify the actual installed assembly.

The engine constrains the design:

- `PlayerSkills.CmdUse` is the interface action path. Acceptance and cast completion occur at different
  stages. Facing changes avoidance and damage, so a command return is neither proof of a cast nor a
  complete description of its inputs.
- `Database.CharacterCreate` does not enforce class/race pairing or perform all creator setup. The
  character creator owns pairing, the basic skill, starting city, appearance, and tutorial setup.
- Definitions needed for legality checks become available after world entry. Character selection
  cannot switch the loaded character. Materialization refuses an already-advanced character.
- Awarding experience invokes progression and companion scaling. Equipment grant and swap invoke the
  callbacks needed for attributes and set bonuses. Skill gates depend on points already spent.
- The database opens from the login screen. Redirecting its path before connection permits a scratch
  database, but the parent directory must exist before SQLite opens it.
- A damage-entry prefix can stamp skill, school, and requested damage before the single-argument hit
  event reads health taken. The two-argument events are not subscribable on this runtime. A postfix
  cannot provide the stamp to an event that has already fired.
- The game shares its random generator across systems. Repeating a seed did not reproduce a combat
  sequence. Companion rolls assigned after hire do not survive reload unchanged.

## Goals / Non-Goals

**Goals:**

- Compare the planner's production evaluation with an achieved, legal game state.
- Separate setup failure, insufficient evidence, statistical rejection, and model disagreement.
- Preserve enough evidence to reproduce the procedure and inspect every reported quantity.
- Protect the player save and refuse incompatible or incomplete evidence.

**Non-goals:**

- Gameplay automation or a second combat model inside the harness.
- Bit-exact random sequences or a universal percentage accuracy guarantee.
- Implementing the linked planner or capture changes through this planning revision.

## Decisions

### Shared build data, separate outer records

Fixtures and captures share versioned logical build data: identity, progression, allocations,
equipment and augments, companions and their rolls/equipment, consumables, and the declared
`learnedBookIds`. Each learned-book identity is a stable item asset ID. `learnedBookIds` declares
permanent progression, not inventory ownership, and remains separate from allocated attribute points,
skill budgets, inventory consumables, equipped bonuses, and transient effects. An empty declaration means
that no books are learned. A missing or unread declaration is incomplete. Unknown and duplicate IDs are
refused; the harness does not silently deduplicate them.

The versioned planner/game catalog owns each book's current attribute gains and effect classifications.
Build records carry identities, not copied gains or classifications. The current `BuildEnvelope` holds
version axes only; it is not this complete build-data contract. Keep serialized schema, capture schema,
model, and game-data versions distinct.

The planner change owns the shared capture and adapter contract, catalog resolution and production
evaluator, optimizer treatment, and editor handling of explicit hypothetical declarations. The editor may
preserve `learnedBookIds` in links and imports, but it does not edit an original capture or a live
character.

Fixture execution metadata contains targets, initial state, actions, facing, windows, and sampling
policy. Capture metadata contains completeness and container state. Neither belongs in shared build
data. Use thin C# and TypeScript adapters with a checked round trip, rather than claiming identical
outer schemas. An unknown schema fails. An unread section remains missing, not empty. Required
measurement inputs must be complete before evaluation or materialization. Stable asset identifiers
are keys; display names provide context, not identity. Capture reads the character's actual learned-book
state, not inventory ownership, and never calls learning, reset, or other mutation paths to obtain it.
A capture with unresolved book contributions is incomplete for dependent qualification and preserves its
observations and diagnostics.

The linked planner change owns the shared build/capture adapters and production evaluator. Its
production model resolves the current catalog gains for `learnedBookIds` and applies them once. The
optimizer holds the declared progression fixed and never silently grants books. The harness owns fixture
execution, observation, and comparison. Tests of an isolated evaluator do not satisfy this dependency.
The adapter must invoke the same evaluation path used for planner results, with matching data and model
identities, rather than a verification-only formula copy.

### Requested state is not achieved state

Perform structural checks before launch. Read game-owned legality rules after world entry, and check
class/race pairing through the creator before creation. Do not copy game cost or prerequisite tables
into the harness. Translate runtime names to stable identifiers at the boundary, including class
restrictions and multi-slot item categories.

Create through the creator, progress one experience requirement at a time, and spend attributes and
skills through engine commands. Allocate skills in reachable passes; stop and name the blocked skill
when no purchase succeeds. Materialize each declared `learnedBookIds` entry through the normal game
learning path, never by assigning a book or its gains directly. Grant and equip through the engine, clear
undeclared equipment, and verify set effects. Materialize declared consumables, ammunition, target,
position, facing, resources, and initial effects before the measurement that depends on them.

Each mutation reads before and after. For learned books, read back the learned IDs and resulting live
attribute totals. Report those totals as achieved state, never as base attributes or allocated points.
Compare all required achieved fields with the request before
measurement. A mismatch stops dependent quantities and identifies the field; it is not silently
accepted as a different fixture. Preserve achieved state in the report. Do not feed measured caster
stat totals into the prediction of those same totals. Independently measured target state may be an
input when the protocol declares this boundary and preserves its provenance.

### Companion-last materialization has a bounded exception

Hire companions after owner progression. Use the engine's price, name, and equip path. Assign only the
health multiplier, resource multiplier, and base combat roll within the race/archetype envelope the
hire path can produce. Validate the envelope from current game evidence, including the integer base
combat upper bound's exclusion. This is the only exception to engine-driven build materialization.

Do not assign race. Check the drawn race and fail a named-race mismatch. A seed records context; it
cannot guarantee a race. Do not add an unbounded hire/dismiss loop. Companion energy multipliers are
recorded even where the current engine does not consume them; prediction must follow the actual
resource getter, not the field name.

After every load, reapply allowed transient rolls and verify them and the companion equipment again.
No scratch marker can substitute for that readback. Companion AI remains autonomous; the player
sequence does not force companion skill selection.

### Ownership and backup precede mutation

Reuse the export path's session and typed runtime transport, not a second launcher. Acquire exclusive
installation/session ownership before scratch mutation or launch. Refuse an existing game instance
without deleting or changing scratch state. Check the process and endpoint identity so commands cannot
reach an unrelated instance. Keep ownership through shutdown and the final isolation check.

Verify a timestamped backup of an existing live save and its SQLite sidecars before scratch mutation
or launch; record a missing save as absent. Resolve scratch paths canonically under an explicitly owned root; reject escapes,
symlinks, and ambiguous ownership before deletion or redirection. Create a fresh parent directory
before opening SQLite. Confirm the runtime-reported database path before world entry or fixture work.
A pathname string match alone is insufficient protection.

On success, failure, and cancellation, stop only the owned process, release resources, and compare the
player save with its pre-run evidence. Report isolation or cleanup failure alongside the original
failure. A crashed run can leave scratch state; it must never require repairing the player's save.
Reserved names in the live save are rejected because cleanup cannot protect a crashed run.

### One fixture attempt has a complete lifecycle

Use a fresh character and game session per fixture attempt by default. This follows the existing
world-entry and fresh-character constraints without inventing an in-session class switch. Repetitions
start from the protocol's verified initial state. Handle a full scratch roster through owned-fixture
slot management; never delete a player character.

Scratch reuse is optional. A reusable per-fixture record requires successful materialization, matching
assembly and fixture-content hashes, and a verified saved state. A whole-matrix validation marker does
not qualify. After load, restore transient state and repeat required readbacks. An interrupted build
is not reusable. Measurement success and baseline qualification are separate from materialization
reuse eligibility.

The full flow is structural preflight, ownership, backup, scratch preparation, launch/redirect,
creation/world entry, game legality, materialization/readback, measurement, production prediction,
comparison, baseline gate, persisted report, shutdown, and isolation verification. Prediction may be
computed earlier once its declared inputs are available, but success requires every applicable stage.
A validation-only command must identify itself as such. The first baseline is an explicit qualification
operation, not a silent pass when no baseline exists.

A retained character reload reads the learned IDs and achieved live attributes before measurement. The
harness does not learn or reset a permanent book during reload, and it proves that persisted gains are
not applied a second time. Failure to prove this leaves the retained state unusable and preserves the
reload diagnostics.

### Player schedules and observation boundaries are explicit

A fixture states ordered player actions, timing, whether and how the sequence repeats, facing, target,
start conditions, horizon, and stopping rule. Declare whether an action at the exact horizon is
included and how an in-flight action is handled. Record attempted, accepted, completed, and landed
counts separately. Record refusals with available engine evidence; do not invent a refusal reason or
remove attempts from denominators. Unexpected refusal invalidates dependent comparison unless the
fixture explicitly tests it.

Use the same schedule and state semantics for planner and game. Re-evaluate state-dependent damage,
resource costs/gains, effect expiry, maintained target defenses, and thresholds at the relevant events.
The linked planner must supply this behavior before rotation parity can close. Replacing random inputs
with means does not by itself yield an exact expectation through rounding, resource decisions, or
thresholds; validate that assumption or label the approximation.

Every quantity declares units, sampling unit, numerator/denominator, and window. Distinguish requested
damage from health taken, misses from zero-damage hits, and target death or overkill from mitigation.
Reset or invalidate windows whose target state no longer meets the protocol. Account for warm-up,
server timing resolution, effect cleanup, and companion movement rather than silently mixing states.

### Diagnostic tiers differ from attribution fidelity

| Diagnostic tier | Required coverage |
|---|---|
| A | Stat totals, progression, equipment, set thresholds, augments, caps, and consumables |
| B | Skill handler and school branches, damage intent/reduction, effect application and settled target state |
| C | Basic-attack cadence over weapon delay and haste, including clamps |
| D | Executable class rotations, resources, maintained effects/upkeep, and autonomous companion contribution |

Tier B requires combat or effect application; it is not a stat-only tier. Maintain explicit effect
coverage in B and D, without adding a new letter. Cover every supported player damage school and
mercenary archetype, plus meaningful lower-level and bare/equipped cases. A coverage label is not
proof that a descriptor reaches the claimed handler. The matrix must be extensible, not a fixed count
of accepted labels. Existing 33 descriptors are a starting inventory, not accepted coverage evidence.

A lower-tier failure makes dependent higher-tier interpretation unreliable. Passing lower tiers
narrows the investigation but does not prove the cause of a higher-tier failure.

Attribution fidelity is separate: totals, individual hits, and skill-attributed hits. The prefix plus
hit-event path provides the highest level. Lower levels remain useful diagnostics when patching fails,
but cannot pass a rotation comparison that requires skill attribution. State probes declare their own
attributability and settled-state conditions rather than borrowing a damage tier.

### Statistical acceptance is declared before measurement

Use exact equality for deterministic discrete invariants and justified numeric tolerance for rounding
or clock resolution. A theoretical support bound is distinct from an observed sample range. Reject an
impossible observation only when the model actually defines a hard support bound.

Stochastic quantities require a versioned protocol chosen before the run: sampling unit, minimum
sample sufficiency, independent repetitions or an explicit dependence treatment, confidence level,
error control across the matrix, stopping rule, and acceptance criteria. Hits in one sustained window
are not assumed independent. Companion selection and maintained-effect uptime generally need repeated
windows. Binomial landing analysis is appropriate only when its trial assumptions hold. Protocol
spikes must justify these choices and demonstrate their false-rejection behavior before gating.

Do not assert exact equality of stochastic means, seeds, event counts, or observed sequences across
runs. Preserve sequences and per-quantity counts for inspection. Insufficient samples are inconclusive,
not a pass. A failed mean test is a failed mean test, not proof of a model error; an out-of-support
sample does not prove a variance error. Report the failed criterion and evidence without a causal label
that the measurement cannot establish. Do not widen tolerances after seeing a failure to make it pass.

### Reports and baselines preserve evidence identity

Persist assembly hash and game labels, fixture name and content hash, build schema versions,
model/evaluator identity, data identity, requested and achieved state, declared and achieved
`learnedBookIds`, catalog identity and gain-resolution provenance, target input provenance, seed,
protocol/tolerance versions, units/windows, per-quantity event counts, raw sequences, and attribution
fidelity. Record failed, incomplete, unsupported, and inconclusive outcomes explicitly. Missing required
artifacts prevent verified success even if in-memory comparisons passed.

Check identity and compatibility before numeric baseline comparison. A diagnostic mismatch override
may show differences but cannot count as a compatible verified run. A game-version difference is not
proof that the game caused a numerical difference. Preserve the old baseline and diagnostic report
before an explicit reviewed update.

Baseline capture and comparison both honor comparison failure. Only complete, compatible, passing
required coverage can qualify for promotion. A nonempty review reason alone cannot bless failed input.
Store the reviewed reason, identities, protocol, evidence, and scope with the baseline. Apply the
predeclared statistical drift policy, not exact stochastic summaries. Commit descriptors and reviewed
baselines under `verification/`; retain scratch state outside version control.

### Raw parity and normalized predictions are different claims

The running game is authoritative for raw parity. A planner may deliberately normalize a known game
defect only in a separately identified result with a defect/evidence reference and explicit affected
quantities. Never mix raw and normalized residuals or hide a raw mismatch through normalization.

Historical samples and an in-sample maximum residual cannot establish a global 2.5 percent bound.
Any published accuracy boundary needs a defined build/mechanic/version domain, adequate current corpus,
and independent validation not used to fit that boundary. Unknown or unverified domains carry no
numeric accuracy claim. The linked planner owns presentation and uncertainty corrections; this change
supplies qualified evidence and must not close those planner tasks on their behalf.

### Targeted spikes close uncertain contracts

Before implementation acceptance, exercise ownership/refusal/cancellation and fresh/reused scratch
loads; trace one complete fixture from request through production prediction and persisted comparison;
and establish the stochastic protocol using repeated game windows. Include a maintained-effect
rotation and a companion case in the vertical slice. Record concrete commands, identities, observed
state, and decisions in existing planning/evidence locations. A helper unit test or descriptor count
cannot replace these runtime spikes.

## Risks / Trade-offs

- Separate sessions cost time. They avoid unsupported character switching and state leakage; reuse is
  allowed only after its saved and transient state guarantees are proven.
- Exclusive ownership may refuse a usable-looking endpoint. Refusal is safer than commanding another
  process or deleting its database.
- Broad statistical coverage costs repeated windows. Predeclared error control avoids a matrix that
  fails randomly or passes because its tolerances were fitted to its own observations.
- Patch failure lowers attribution. Preserve diagnostics, but leave dependent parity incomplete.
- A legal descriptor may still fail materialization. Fail at readback rather than measuring a different
  build under the requested name.
- Planner adapters, dynamic evaluation, and defensible uncertainty remain cross-change dependencies.
  Local comparison helpers cannot substitute for them.

## Migration Plan

1. Reconcile task status with component evidence; retain historical experiments without promoting them
   to full-run acceptance. Revise the linked planner plan separately for the dependencies above.
2. Complete shared contracts and the safety/materialization spikes before enabling matrix execution.
3. Connect one complete vertical slice to the production evaluator, then extend behavioral coverage.
4. Freeze and verify statistical protocols, complete the matrix, and persist its full evidence.
5. Qualify a reviewed baseline, then enable the version-update gate and reported-build parity. Validate
   any published accuracy boundary against independent evidence.

Until qualification, retain validation and probe commands as explicitly limited diagnostics. If a
protocol or model migration fails, retain its failed report and the prior baseline; do not rewrite the
baseline or claim compatibility. Resume implementation through the implementation workflow, not as a
side effect of this planning revision.
