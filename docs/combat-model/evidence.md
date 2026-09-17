# Combat model evidence

This file records the measurements the combat engine and its verification depend on. Each entry
names the game build it was taken on and the scope it covers. A measurement informs a formula or a
policy. It does not qualify a parity claim outside its own scope.

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
