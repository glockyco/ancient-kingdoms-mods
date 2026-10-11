# Two-point veteran skills reduce displayed progression and lose points on reset

## Summary

Learning a Bard veteran skill that costs two points reduces the character's displayed veteran level by one and lowers the next veteran point's experience requirement. Resetting veteran skills then refunds only one point for that two-point rank, permanently losing the other point.

## Build

- Game version 0.9.35.1
- Steam build 25863605
- `Assembly-CSharp` SHA-256 `342a45d0fb266a00f75795a525bb7e1c4e907839e8769563333cc8cf0adb5cfc`

## Impact

Bards spending points on Virtuosity, Verse of Beguilement or Final Cadence have their earned progression undercounted. The character window, experience requirement and mercenary resurrection price change merely because points were allocated. A normal token-and-gold reset loses one point for each learned two-point rank.

Source also shows that companion skill ranks, newly materialized mercenary veteran bonuses and hire prices use the same undercounted total. Those companion outcomes were not measured in this run.

## Steps to reproduce

No mods are needed.

1. Reach level 50 on a Bard and earn 60 veteran points. Note the chat's announcement of Veteran Level 60 and the character window's `VT 60` and next-point experience requirement.
2. Spend 50 points on one-point veteran ranks. The displayed veteran level stays 60.
3. Learn Virtuosity, which costs two veteran points. The character window now shows `VT 59`, and the next-point experience requirement is 20,000 lower.
4. Learn Verse of Beguilement, also costing two points. The same values fall again, although no earned progression was removed.
5. Pay the normal 10,000 gold and Token of Redemption fee to reset veteran skills. Only 58 points are available, rather than the 60 earned.
6. Repeat a 50-point one-point allocation, one two-point skill purchase and a paid reset. The remaining budget loses another point.

## Observed

The game announced `Congratulations, you have reached Veteran Level 60!`. A level-50 Human Bard then learned ten ranks each of Leadership, Battlefield Restoration, Innate Charisma, Innate Strength and Innate Constitution, all costing one point per rank. The control allocation left the total and experience requirement unchanged.

| State / action | Unspent points | Cost-weighted points spent | Character window | Next-point experience | Mercenary resurrection price |
|---|---:|---:|---|---:|---:|
| After 50 one-point ranks | 10 | 50 | VT 60 | 2,200,000 | 808 gold |
| Learn Virtuosity, rank 1, cost 2 | 8 | 52 | VT 59 | 2,180,000 | 799 gold |
| Learn Verse of Beguilement, rank 1, cost 2 | 6 | 54 | VT 58 | 2,160,000 | 790 gold |
| Paid token reset | 58 | 0 | VT 58 | 2,160,000 | — |

The game's own cost-weighted spent-point reader plus unspent points still totaled 60 after both purchases. The character window nevertheless showed 59, then 58. Its experience text directly showed `0 / 2,200,000`, then `0 / 2,180,000`, then `0 / 2,160,000`.

A second cycle began with the 58 refunded points. After 50 one-point ranks it had 8 unspent and 50 spent, displaying VT 58. Learning Virtuosity left 6 unspent and 52 spent, displaying VT 57 with a 2,140,000 experience requirement. A second paid reset returned only 57 points, with every veteran skill rank back at zero.

No experience was gained between these allocations and resets. Charisma was unchanged across the two initial two-point purchases, so the resurrection-price changes did not come from a changed discount. The reset removes passive attribute ranks, so prices after reset are not used for that comparison.

## Expected

Allocating an earned point should not reduce earned Veteran Level, as the one-point control demonstrates. The character window should remain consistent with the game's Veteran Level 60 announcement and with unspent plus cost-weighted spent points. A reset should refund the two points actually paid for a two-point rank.

## Cause

`server-scripts/PlayerSkills.cs:UserCode_CmdUpgradeVeteran__Int32` subtracts `skill.upgradeRequiredSkillPoints` and increments the skill's rank by one.

`server-scripts/PlayerSkills.cs:GetTotalVeteranPoints` adds learned veteran ranks to unspent points without weighting those ranks by their point cost. `server-scripts/Player.cs:GetNumberSpentVeteranSkillPoints` does multiply each rank by `upgradeRequiredSkillPoints`, showing the accounting discrepancy within the game's own readers.

`server-scripts/PlayerSkills.cs:ResetVeteranSkillPoints` repeats the unweighted rank addition when calculating the refund, turning the undercount into a permanent loss of available points.

`server-scripts/UICharacterInfo.cs:Update` uses the unweighted total for `VT`. `server-scripts/Experience.cs:max` uses it for `1,000,000 + total × 20,000`. `server-scripts/Player.cs:GetMercenaryResurrectionPrice`, `Player.cs:UserCode_CmdBuyMercenary__Int32__Int64__String__Boolean`, `server-scripts/PetSkills.cs:RefreshSkillLevels` and `server-scripts/UIMercenaries.cs:ButtonSummonMercenary` also consume that total.

## Evidence

- [One-point control: VT 60 and 2,200,000 experience](evidence/veteran-two-point-before.webp).
- [After Virtuosity: VT 59 and 2,180,000 experience](evidence/veteran-two-point-after.webp). The chat still records reaching Veteran Level 60, exposing the disagreement in the game's own interface.
- [After both reset cycles: only 57 points, all ranks reset](evidence/veteran-two-point-reset-loss.webp). The chat records both resets and the original 60-point budget.
- The table combines live server resource values, the game's weighted spent-point reader, actual interface text and the game's resurrection-price function. Companion effects are source derivations only.

The mods read state and drive the game's own `PlayerSkills.CmdUpgradeVeteran` and `Player.CmdResetVeteranSkillPoints` commands. Both resets consumed their normal fee and token. The defect is in game accounting, not the macOS CrossOver platform.

## Notes

- Instrumentation: experience was granted through `Player.CmdGetExperienceNewZone` to reach level 50 and earn 60 veteran points. Gold was granted through `Player.CmdAddGold`. The two authored Token of Redemption items were added to the scratch inventory so both resets could be paid for. No skill cost, rank, veteran-point balance or experience requirement was written by the tool.
- The session used `game.useScratchDatabase` before entering the world and returned `isScratch=true`. Player-save isolation and the final content hash are recorded in the report index.
- Screenshot PNG hashes were checked before WebP conversion.
- Not tested: Final Cadence, companion reloading, actual hires or a mercenary skill-rank threshold. The two measured two-point skills and the repeated normal reset establish the shared counting defect without relying on those outcomes.
