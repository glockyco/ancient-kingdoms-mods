# Resurrection calculates restored Mana from maximum Health

## Summary

Accepting a resurrection sets Mana to 20% of the player's maximum Health, not maximum Mana. A Druid with 1,060 maximum Health and 880 maximum Mana returned with 212 Mana in both trials. Twenty percent of maximum Mana would be 176.

## Build

- Game version 0.9.35.1
- Steam build 25863605
- `Assembly-CSharp` SHA-256 `342a45d0fb266a00f75795a525bb7e1c4e907839e8769563333cc8cf0adb5cfc`

## Impact

The Mana available after resurrection depends on the player's Health pool. A Health bonus can increase restored Mana without increasing maximum Mana. A low-Health caster receives less than a high-Health character with the same Mana pool. If the calculated value exceeds maximum Mana, the resource setter caps it there.

## Steps to reproduce

No mods are needed.

1. Use a Mana-using character whose maximum Health and maximum Mana differ. Note both maxima in the character window.
2. Die to a monster and release your spirit, leaving a corpse.
3. Have another player cast Resurrection, or use a Scroll of Resurrection, on that corpse.
4. Accept the resurrection and immediately note current Mana, before regeneration changes it.
5. Repeat. Compare the result with 20% of maximum Health and 20% of maximum Mana.

## Observed

A level-50 Human Druid had 1,060 maximum Health and 880 maximum Mana, with no resource-max buffs. Both trials began with a natural death to the Ancient Cyclops and used the game's release-spirit command before resurrection acceptance. Each corpse changed from `resurrected=false` to `true`.

| Trial | After death, Health / Mana | Before accepting, Health / Mana | Action | Immediately after, Health / Mana |
|---|---|---|---|---|
| 1 | 0 / 0 | 530 / 0 | Accept corpse resurrection | 636 / 212 |
| 2 | 0 / 0 | 530 / 0 | Accept corpse resurrection | 636 / 212 |

All readings above are live values. The sampler ran inside the game and read the resources in the same frame as the acceptance command, before a regeneration tick. The derived comparisons are 1,060 × 0.6 = 636 Health, 1,060 × 0.2 = 212 Mana, and 880 × 0.2 = 176 Mana. Neither resource cap bound the result.

## Expected

The Mana restoration should use maximum Mana if the intended restoration is 20% of that resource. The resurrection tooltip does not promise a resource percentage. This report identifies the apparent wrong-resource reference in the acceptance handler, not a broken tooltip promise.

## Cause

`server-scripts/Player.cs:UserCode_CmdResurrect__Int32__Single__Single__NetworkIdentity` assigns:

```csharp
health.current = Mathf.RoundToInt((float)health.max * 0.6f);
mana.current = Mathf.RoundToInt((float)health.max * 0.2f);
```

The second assignment reads `health.max` too. `server-scripts/EnergyResource.cs:current`, inherited by `Mana`, clamps current Mana to its own maximum. That cap does not correct the input's resource basis.

## Evidence

The table records two complete natural-death → release-spirit → corpse-acceptance sequences. The recorded corpse network IDs were 7788 and 7791. Both belonged to the scratch Druid and were unresurrected before acceptance. The character remained in `IDLE` before and after each acceptance.

The mods read state and drive the game's own `PlayerSkills.CmdUse`, `Player.CmdRespawn` and `Player.CmdResurrect` commands. The acceptance command was sent with the real released corpse's network identity. The defect is in the game's resource assignment, not the macOS CrossOver platform.

## Notes

- Instrumentation: experience was granted through `Player.CmdGetExperienceNewZone` to reach level 50 without spending attribute points. The character was moved into the Cyclops's attack range. The resurrection acceptance was sent directly through the handler used by the normal confirmation button. A second client was not connected and no resurrection spell's casting time was measured.
- An initial exploratory acceptance before release-spirit was discarded. Its incomplete fixture was reset. Neither discarded values nor that reset are part of the two reported trials, which used natural combat deaths and real released corpses.
- The session used `game.useScratchDatabase` before entering the world and returned `isScratch=true`. Player-save isolation and the final content hash are recorded in the report index.
- The 20% maximum-Mana expectation is inferred from the adjacent Health/Mana assignments. The observed 212-Mana result and the `health.max` reference are directly verified.
