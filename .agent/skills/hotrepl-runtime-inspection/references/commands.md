# Typed control commands

Two mods register the commands below. Run
`hotrepl --url ws://127.0.0.1:18590 describe <name> --json` for a descriptor, and `info --json` for
handshake metadata.

## HotReplCommands

MelonLoader mod in `mods/HotReplCommands/`.

| Command                   | Kind | Description                                                                                                                                                                                      |
| ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compendium.preflight`    | sync | Checks mod visibility, directory existence, scene, and player readiness.                                                                                                                          |
| `world.summary`           | sync | Returns the active scene, the network state, the character count, and local-player status.                                                                                                        |
| `world.enter`             | job  | Drives the game to a spawned local player, without exporting. Reports the character it entered as. Args: `{"character": string?}`; an absent value selects the lowest name in ordinal order.       |
| `compendium.export`       | job  | Runs world entry if needed, calls DataExporter and optionally MapScreenshotter, and returns artifact refs. Args: `{"screenshots": bool}`.                                                         |
| `game.quit`               | sync | Calls `Application.Quit()` and returns `{"quitting": true}`.                                                                                                                                      |
| `game.useScratchDatabase` | sync | Points the database at a scratch file beside the game's own, so a run that creates or changes characters cannot reach player data. Refuses once the connection is open, so call it first.           |

## CombatVerification

MelonLoader mod in `mods/CombatVerification/`.

| Command                   | Kind | Description                                                                                                                                                                                                                                                                        |
| ------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fixture.validate`        | sync | Checks a fixture against rules read from the running game. Needs a spawned player, because the class prefabs are unreadable before one exists. Reads only.                                                                                                                          |
| `fixture.createCharacter` | job  | Creates one character by driving the character creator. Needs character selection open, so call it before world entry. Refuses when the roster holds eight characters. Args: `{"characterName": string, "class": string, "race": string}`.                                            |
| `probe.statSheet`         | sync | Reads the complete combat state of the player and each companion: every attribute, every computed stat, resource maxima and multipliers, each occupied slot with what it contributes, and each armour set with its piece count and declared bonuses. Reads only. Args: `{}`.          |
| `probe.targetState`       | job  | Reads what a hit will meet on the local player's target: every stat its combat component computes, discovered rather than listed, and each timed effect with its category and remaining time. Reads twice around the engine's cleanup pass and reports what the pass removed, what it left expired, and whether it runs on that target at all. Takes no arguments. |
| `probe.perHitDamage`      | job  | Records every hit the local player lands inside a window, each with the health it took, the victim and a server timestamp, and derives the action count from the same window so a miss can be told from a landing. Something else has to drive the actions; the probe only listens. Args: `{"windowSeconds": number}`. |
| `probe.actionInterval`    | job  | Reads how often the local player can act. Stills the attack loop first and reports every value it cleared, then samples for `windowSeconds` and reports the completed actions with the gaps between them. Args: `{"windowSeconds": number?}`.                                        |
| `fixture.buildCharacter`  | job  | Brings the spawned player to a fixture's declared level, veteran points, attributes, skill levels, equipment, and companions. Empties a slot the fixture does not declare, because a created character wears starter equipment. Args: `{"character": {...}, "companions": [...]}`.     |
