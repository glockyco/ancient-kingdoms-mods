# Combat model evidence

This file records the measurements the combat engine and its verification depend on. Each entry
names the game build it was taken on and the scope it covers. A measurement informs a formula or a
policy. It does not qualify a parity claim outside its own scope.

## Superseded gear and rotation planner

The planner design recorded several historical probes. They informed the event engine, but they did
not use the current fixture protocol and do not establish current parity.

The first live probe used a level 28 Druid and the level 55 Northern Wastes dummy. The source design
did not record a game version, Steam build, or assembly hash for this probe. Keep it only as historical
scope evidence.

| Live quantity | Observation |
|---|---|
| Stat sheet, eight independent stats | Exact match on all eight |
| Attribute coefficients, three attributes at four magnitudes | Exact match on all rows |
| Action cycle, weapon delay 28, zero haste | 1.651 s observed; 1.620 s predicted |
| Damage per hit | 18, 16, and 16 observed; 17 predicted with support 15 to 19 |

A second probe used an engine-created level 50 Warrior with 200 veteran points in an isolated
database. The source design associates the game-backed prerequisite rows with Ancient Kingdoms
0.9.31.1, Steam build 24986533, assembly
`bd2521453b35dfb58c4fec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc0`.

| Achieved quantity | Observation |
|---|---|
| Maximum level | 50 |
| Skill points at level 50 | 49 |
| Allocatable attribute points | 249: 49 from levels and 200 from veteran awards |
| Race and class progression attributes | 87 |
| Total progression and allocated attributes | 336 |
| Health, energy, and mana maxima | Exact match on all three |
| Damage and defense with starting gear | Exact match |
| Mercenary damage, magic damage, accuracy, and critical chance | Exact match on all four |
| Mercenary rolls | Both values were inside the reachable envelope |

A dagger raised one measured mercenary's damage from 17 to 462. The 445-point increase contained
410 direct weapon damage and 35 damage from the item's Strength. This probe established that companion
equipment must use the complete equipment pipeline.

The same 0.9.31.1 design recorded one-action timing and effect behavior with the follow-up loop stopped.

| Level 50 character, weapon delay 28, zero haste | Observation |
|---|---|
| Weapon-category skill refractory | 1.120 s observed and predicted |
| Skill without a weapon category | 0.750 s observed and predicted |
| Non-damaging target debuff | 1.120 s, the full weapon interval |
| Target block chance | Matched `defense * 0.0001` to four decimals |
| Weaker effect in the same category | Replaced the stronger effect |
| Expired effect before cleanup | Contributed for one tick |

The mitigation probe used Ancient Kingdoms 0.9.31.0, Steam build 24925347. The source design did not
record an assembly hash for this probe. It used a level 50 Rogue, Stab level 1, fixed intent 464, and
an Ancient Cyclops at level 55. Critical hits were excluded by a median filter.

| Defense | Hits | Observed ratio | Predicted at 0.0005 | Difference |
|---:|---:|---:|---:|---:|
| 300 | 17 | 0.7561 | 0.7650 | -1.2 % |
| 500 | 17 | 0.6917 | 0.6750 | +2.5 % |
| 700 | 11 | 0.5956 | 0.5850 | +1.8 % |
| 1000 | 18 | 0.4407 | 0.4500 | -2.1 % |
| 2000 | 9 | 0.0881 | 0.0900 | -2.1 % |
| 10000 | 6 | 0.0916 | 0.0900 | +1.8 % |

The four unclamped rows fit coefficient 0.000498 against 0.000500 in source. Defense 2000 and 10000
both left about nine percent of intent, which confirmed the mitigation ceiling at 1800 defense. The
same target's block chance was 0.17 at defense 700 and 0.80 at defense 10000.

## Superseded verification harness

The harness experiments below are recorded under Ancient Kingdoms 0.9.31.1, Steam build 24986533,
assembly `bd2521453b35dfb58c4fec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc0`, except the 0.9.31.0
mitigation probe above. Their scope was mechanism discovery, not a current-version baseline.

| Experiment | Sample | Observation | Engine decision |
|---|---:|---|---|
| `Hunter's Sigil` landing | Six conditions, 1,000 attempts each | Rates 0.607 to 0.958; maximum absolute prediction error 0.016 | Apply 0.005 resistance per target level, cap it at 0.1, and subtract caster accuracy |
| `Wyrmbrand Hex (A)` refresh | 60 attempts over 120 s, seed 7901 | 21 landings; 108.009 s uptime; fraction 0.9001 against 0.9057 expected | Model each landing and refresh event |
| Same-recipient `Debuff AC` replacement | One stronger-then-weaker pair | Stronger remaining time fell from 30 s to zero | The newest non-empty category member replaces earlier members on that recipient |
| Owner and companion `Debuff AC` | One simultaneous pair on different recipients | Both retained 30 s | Effect categories are local to the recipient |
| Long-cooldown schedule | 36 cooldown and horizon pairs | Fractional relaxation exceeded the executable schedule by 0 to 0.75 casts | Run integer schedules on the event timeline |
| Matched Warrior and Rogue resources | One transition per class and three ticks | Both reached 4; Warrior stayed at 4; Rogue with Fury fell to 1 | Apply shared combat returns, then class-specific active recovery effects |
| Companion cadence and output | Eleven accepted 20 s windows | Damage 0 to 688; hit gaps 0.834 to 11.232 s | Sample autonomous selection and qualify movement state |

The landing conditions changed defense, target level, and caster accuracy while keeping one non-elite
Snake and `Hunter's Sigil` fixed. Predicted/observed pairs were 0.951/0.958, 0.901/0.892,
0.851/0.835, 0.651/0.664, 0.601/0.607, and 0.801/0.804. Seeds were 7801 through 7806.

The companion windows used a level 5 target with zero defenses and companions with 50 base damage and
50 base magic damage. Near-stationary totals were Warrior 0, Cleric 67, Rogue 688, Wizard 525, Druid
266, and Ranger 339. The non-monotonic movement and haste samples established that companion output
must be sampled, not treated as a fixed reachable rate.

## Default replicate count

Measured on the committed planner payload for Ancient Kingdoms 0.9.32.4 (Steam build 25326396,
assembly `6dff3b0cb35dcd11ff8d6d6456f9db9a536c9258fbcc022321f3c527aef83771`) with model version 2.

Build: `verification/fixtures/d/D-class-warrior.json`, a level 50 Human Warrior with 200 veteran
points, a Rusty Sword, Slam at level 5, and no allocated attribute points. Target: the level 55
Northern Wastes training dummy (defense and every resist 1000, block chance 0.164, health
1,000,000). Policy: Slam, then Melee Attack. Horizon 60 s. Seed 20260917.

| Replicates | Mean DPS | Standard error | Standard error / mean | Wall time |
|---:|---:|---:|---:|---:|
| 16 | 9.06 | 0.235 | 2.59 % | 22 ms |
| 32 | 9.14 | 0.167 | 1.83 % | 20 ms |
| 64 | 9.22 | 0.102 | 1.10 % | 23 ms |
| 128 | 9.23 | 0.072 | 0.78 % | 37 ms |
| 256 | 9.31 | 0.050 | 0.54 % | 64 ms |
| 512 | 9.36 | 0.036 | 0.39 % | 131 ms |
| 1024 | 9.37 | 0.025 | 0.27 % | 225 ms |

At 256 replicates the window held 36.0 Melee Attack casts (29.3 landed, 461 damage) and 2.0 Slam
casts (1.6 landed, 98 damage).

Decision: 128 is the smallest power of two whose standard error is below one percent of the mean.
Authored scenarios use `replicates: 128` unless a comparison declares more. The scenario field stays
explicit; the engine has no default.
