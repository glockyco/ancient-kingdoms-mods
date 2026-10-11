# CombatVerification

Materializes combat fixtures and measures runtime stats, damage, target state, and action timing.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Use these registered HotRepl commands:

- `fixture.validate` and `fixture.validateMatrix` validate fixtures.
- `fixture.createCharacter` and `fixture.buildCharacter` create and configure subjects.
- `probe.statSheet`, `probe.perHitDamage`, `probe.targetState`, and `probe.actionInterval` return measurements.
- `fixture.observe` records a fixture window and writes `observation.json` beside the active scratch database.

Other results return through the command channel.

## Settings

None.

## Limits

Character construction and combat probes mutate runtime state. `fixture.observe` only writes beside a scratch database.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md). The HotRepl host must be installed with `build-tool deploy-host`. Requires [DataExporter](../DataExporter/README.md) and [HotReplCommands](../HotReplCommands/README.md) at runtime.
