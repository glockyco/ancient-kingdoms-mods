# Light of the Heavens does not heal players

## Summary

The Cleric mercenary's Light of the Heavens says it restores Health to "all nearby allies". It heals nearby mercenaries, including the Cleric, but never includes the player. In two casts, three mercenaries each received 2,750 Health while their injured owner received nothing from the spell.

## Build

- Game version 0.9.35.5
- Steam build 25927597
- `Assembly-CSharp.dll` SHA-256 `92e750550488928ce34298db50d76d5cf9481ec46c94b6719108f08871d4eaf2`

## Impact

An injured player cannot receive this group heal from their hired Cleric, despite standing beside it. Players expecting "all nearby allies" to include their own character see only their companions recover.

## Steps to reproduce

1. Hire a Cleric and two other mercenaries.
2. Give the Cleric enough Mana to cast its learned rank of Light of the Heavens. At level 50, the measured Cleric needed equipment to afford its rank-6 spell's 1,000 Mana cost.
3. Keep the player and all three mercenaries close together.
4. Lose Health on the player and all three mercenaries. Keep each mercenary below 60 percent Health so the Cleric can choose its area heal.
5. Allow the Cleric to cast Light of the Heavens. Watch the player's Health alongside the three mercenary Health bars.
6. Repeat when the spell is ready and the group is injured again.

No mods are required to observe which Health bars jump on the cast. The exact figures below were read by a runtime sampler.

## Observed

The game's own tooltip method returned:

```text
Unleashes a divine aura that restores 2500 (+330 bonus) health points to all nearby allies.
```

The hired level-50 Cleric had rank 6 and 25 Wisdom. The player and all three mercenaries were placed together inside the spell's 16 yd range. All four characters were alive and started each trial at 100 Health.

The sampler read Health every frame. The following are the adjacent readings immediately before and after the completed Light of the Heavens cast. No regeneration tick occurred between either pair.

| Trial | Time since setup | Character | Before spell lands | After spell lands | Spell contribution |
|---|---|---:|---:|---:|---:|
| 1 | 1.7664 seconds | Player | 172 | 172 | 0 |
| 1 | 1.7664 seconds | Cleric | 181 | 2,931 | 2,750 |
| 1 | 1.7664 seconds | Warrior mercenary | 102 | 2,852 | 2,750 |
| 1 | 1.7664 seconds | Rogue mercenary | 102 | 2,852 | 2,750 |
| 2 | 1.7333 seconds | Player | 136 | 136 | 0 |
| 2 | 1.7333 seconds | Cleric | 180 | 2,930 | 2,750 |
| 2 | 1.7333 seconds | Warrior mercenary | 101 | 2,851 | 2,750 |
| 2 | 1.7333 seconds | Rogue mercenary | 101 | 2,851 | 2,750 |

The Cleric entered `CASTING` with skill index 1, Light of the Heavens, and returned to `IDLE` on each recorded heal. The player's smaller increases outside these paired readings were regeneration, not the spell.

The 2,750-Health amount is measured. Independently, the source predicts 2,500 base Health plus 10 percent from the Cleric's 25 Wisdom, which agrees with both casts.

## Expected

The spell's affected group and its description agree. If players are deliberately excluded, the tooltip should say nearby companions rather than "all nearby allies". If the description is intended, the owner and other nearby allied players should be included.

## Cause

`server-scripts/AreaHealSkill.cs:Apply` gathers ordinary area-heal recipients only when their runtime type matches the caster's type, or when a recipient is a Pet whose owner's type matches the caster's type.

A Cleric mercenary is a Pet. A player is neither a Pet nor a character of the caster's runtime type. A nearby Player therefore fails both branches and is never added to the recipient set.

`server-scripts/Pet.cs:HealSkillCanAffectTarget` likewise excludes players from an ordinary area heal. `server-scripts/Pet.cs:CountAreaHealTargetsInRange` counts only injured eligible recipients. `server-scripts/Pet.cs:TryFindHealSkillForTarget` requires at least three such recipients before selecting an area heal. That is why this reproduction uses the Cleric and two other injured mercenaries, rather than only an injured owner and one companion.

`server-scripts/Pet.cs:TryHandleQueuedSupportSkill` starts the chosen cast through `Skills.StartCast`. Both measured casts followed this normal pet decision and casting path. The effect was not applied directly.

## Evidence

- [Injured owner and nearby mercenaries before the isolated casts](evidence/light-of-heavens-before.webp).
- [Group interface after the two casts](evidence/light-of-heavens-after.webp).
- The table contains adjacent live server-side Health readings, not values inferred from screenshots. Regeneration continued before the after screenshot, so it does not show the exact measurement endpoint.

The mods read state, hired through `Player.CmdBuyMercenary`, and let the Cleric's own support AI select and cast the spell. The recipient filter is game logic and is independent of macOS CrossOver.

## Notes

- Instrumentation: an existing level-50 scratch Ranger received gold through `CmdAddGold`. A Cleric, Warrior and Rogue were hired through `CmdBuyMercenary`, at the price calculated by the game's own mercenary interface.
- The Cleric was equipped with a real Cinderflame Band in a ring slot. Its maximum Mana became 1,244, enough for the 1,000-Mana spell. Mana was restored before each trial. Other Cleric skills were held on cooldown to isolate this spell, and Light of the Heavens' cooldown was cleared between the two trials.
- The player and mercenaries were moved together and their Health was set to 100 at each trial's start. The other two mercenaries' AI was paused so they stayed in place. The Cleric's AI was enabled for both measured casts. No healing or recipient asset was changed.
- A separate tooltip discrepancy was also recorded: `server-scripts/HealSkill.cs:ToolTip` uses the local player's Wisdom, not the mercenary caster's. It displayed a 330 bonus while these casts applied a 250 bonus. This does not explain the player's exclusion from the recipient set.
- The session was redirected with `game.useScratchDatabase` before world entry. It returned `isScratch=true`.
- The player save SHA-256 was `19d7665fd542a59f3d5f65167df4888d8ae4892d2956aaf37eaef8fb3ab4bd97` before launch and after `game.quit`.
- Screenshot PNG SHA-256 values were checked before WebP conversion: `591640834853d6f8ad51f58a1ab3e00c6bb568f12ace7411fb60588a33e6746b` and `ebe2a4b116c71214a9eb30901155849cdb9df5bc91990f105a55539eb9be0571`.
