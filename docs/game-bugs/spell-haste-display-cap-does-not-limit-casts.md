# Spell haste stops at 50% in the character window but not when casting

## Summary

The character window caps Spell Casting Haste at 50%, while spell casts use the uncapped bonus. A reachable Druid equipment-and-food combination supplied 58% haste: the window showed 50%, but a one-second Wind Shock cast scheduled only 0.42 seconds and finished in less than 0.5 seconds in both trials.

## Build

- Game version 0.9.35.1
- Steam build 25863605
- `Assembly-CSharp` SHA-256 `342a45d0fb266a00f75795a525bb7e1c4e907839e8769563333cc8cf0adb5cfc`

## Impact

A player cannot tell their effective spell haste from the character window once the total exceeds 50%. Additional bonuses still shorten casts, even though the displayed stat has stopped increasing. This report establishes a display-versus-casting mismatch. It does not assume which of the two caps the developer intends.

## Steps to reproduce

No mods are needed.

1. On a level-50 Druid, equip Earthsong Chestguard, Deathwyrm Sash, Valaark's Worldheart, Cinderflame Band, Emberband, Flameheart Staff and Zephyr Bindings. This combination supplies 48% spell haste.
2. Open the character window and note `Spell Casting Haste: 48%`. Cast Wind Shock on a training Dummy.
3. Eat Frostfire Bison Stew, which adds 10% spell haste. The total is now 58%, but the window shows 50%.
4. Cast Wind Shock again. Its cast is shorter than the half-second duration implied by 50% haste on a one-second spell. Repeat the casts. A developer can inspect the server cast deadline to resolve the sub-second difference precisely.

## Observed

The Druid's rank-5 Wind Shock had an authored cast time of 1 second. The equipment supplied `0.48000005` haste. The food supplied `0.1`. The slight excess over 0.48 is float representation, not an additional bonus.

| Setup | Trial | Character window | Deadline minus first cast-frame time | First cast-frame to completed cast |
|---|---:|---|---:|---:|
| Equipment only: 48% | 1 | 48% | 0.520 s | 0.551 s |
| Equipment only: 48% | 2 | 48% | 0.520 s | 0.522 s |
| Equipment plus food: 58% | 1 | 50% | 0.420 s | 0.477 s |
| Equipment plus food: 58% | 2 | 50% | 0.420 s | 0.443 s |

A frame sampler inside the game recorded corrected server time, the skill's absolute `castTimeEnd`, and the transitions into `CASTING` and back to `IDLE`. Its first observed cast frame read the new deadline with the same frame's server clock. Frame scheduling accounts for the completion overshoot: 2–31 ms below the cap and 23–57 ms above it.

Even allowing the whole preceding sampling gap, the above-cap casts' start-to-deadline windows were 0.420–0.484 seconds and 0.420–0.483 seconds. Both upper bounds are below the 0.500 seconds implied by the displayed cap. These are measured bounds, not a cast-time formula substituted for observation.

## Expected

The character window and the actual casting calculation should agree. If 50% is an intended gameplay cap, casting should apply it too. If the uncapped cast calculation is intended, the window should show the effective 58% rather than 50%.

## Cause

`server-scripts/Combat.cs:spellHaste` sums combat bonus components and returns `Mathf.Clamp(num, -0.5f, 0.5f)`. `server-scripts/UICharacterInfo.cs:Update` formats that clamped property as the displayed percentage.

`server-scripts/Player.cs:UpdateServer_IDLE` and `Player.cs:UpdateServer_MOVING` instead pass `equipment.GetSpellHasteBonus() + skills.GetSpellHasteBonus()` directly to `Skills.StartCast`. `server-scripts/Skills.cs:StartCast` subtracts that uncapped bonus multiplied by the authored cast time before setting the deadline. For a one-second cast, the source therefore predicts 0.52 seconds at 48% and 0.42 seconds at 58%, agreeing with both repeated measurements.

## Evidence

- [Before consuming the food: 48%](evidence/spell-haste-48-percent.webp).
- [After consuming the food: the 58% setup shows 50%](evidence/spell-haste-58-shown-as-50.webp). The chat records the Frostfire Bison Stew consumption.
- The table records live deadline and state-transition readings. The cast-time comparison in Cause is separately derived from source.

The mods read state and drive the game's own `PlayerEquipment.CmdSwapInventoryEquip`, `PlayerInventory.CmdUseItem`, `Player.CmdSetTarget` and `PlayerSkills.CmdUse` commands. The equipment and food kept their authored bonuses, restrictions and durability, and every equip was accepted by the normal equipment check. The mismatch is in game logic and the interface, not the macOS CrossOver platform.

## Notes

- Instrumentation: experience was granted through the game's experience command to reach level 50. The named items were added to the scratch inventory, then equipped or consumed through normal game commands. Mana was restored before each trial and the character was moved beside the Dummy. No haste value, cast duration or deadline was written by the tool.
- The session used `game.useScratchDatabase` before entering the world and returned `isScratch=true`. Player-save isolation and the final content hash are recorded in the report index.
- Screenshot PNG hashes were checked before WebP conversion.
- Not tested: negative haste, channels or bonuses at/above 100%. The source lacks a normal-spell floor and has a 0.05-second channel floor, but this report makes no runtime claim about those states or their reachability.
