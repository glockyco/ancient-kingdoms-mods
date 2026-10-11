# The threat tooltip shows only one third of the maximum Health bonus

## Summary

Taunt's tooltip says its threat bonus is one third of the caster's maximum Health, but the cast adds the full maximum Health. With 445 maximum Health, the tooltip shows `2,000 (+148 bonus)` and each cast adds 2,445 threat, not 2,148.

## Build

- Game version 0.9.35.1
- Steam build 25863605
- `Assembly-CSharp` SHA-256 `342a45d0fb266a00f75795a525bb7e1c4e907839e8769563333cc8cf0adb5cfc`

## Impact

A tank comparing threat skills sees a smaller Health contribution than the game actually applies. The discrepancy grows with maximum Health. Source also shows the same discrepancy for positive-threat area damage skills. Only Taunt was measured here.

## Steps to reproduce

No mods are needed to see the incorrect tooltip, although reading an exact monster threat total requires instrumentation.

1. Learn Taunt on a Warrior, spending its prerequisite ten class skill points first.
2. Note maximum Health in the character window.
3. Hover Taunt in the Skills window. Its listed bonus is maximum Health divided by three, rounded to an integer.
4. Use Taunt on the Crescent Coast training Dummy, then repeat after its cooldown. A developer inspecting the Dummy's threat list will see the full maximum Health added to the listed base threat on each cast.

## Observed

A level-12 Warrior had 445 maximum Health. Rank-1 Taunt listed 2,000 base threat and `+148 bonus`. The Dummy had 295,000 current Health before and after every cast, so the victim-Health cap did not bind. Taunt dealt no damage and applied no stun or fear.

| Trial | Threat before | Action | Threat after | Increase |
|---|---:|---|---:|---:|
| 1 | 0 | Cast rank-1 Taunt | 2,445 | 2,445 |
| 2 | 2,445 | Cast rank-1 Taunt after cooldown | 4,890 | 2,445 |

The sequence was repeated with the tooltip visible: 4,890 → 7,335 → 9,780, again increasing by 2,445 per cast. The interface continued to show `+148 bonus`.

## Expected

The tooltip and the applied threat should agree about the maximum Health contribution. If the full maximum Health is intended, the displayed bonus in this case should be 445. If one third is intended, the applied contribution should be 148.

## Cause

`server-scripts/DamageSkill.cs:ToolTip` and `DamageSkill.cs:ToolTipUpgrade` replace `{AGGRO}` with the listed threat plus `RoundToInt(Player.localPlayer.health.max / 3f)`.

`server-scripts/TargetDamageSkill.cs:ApplyDamage` instead uses `caster.health.max` whenever the skill's listed aggro is positive and passes that contribution to `Combat.DealDamageAt`. `server-scripts/AreaDamageSkill.cs:Apply` uses the same full-Health contribution.

`server-scripts/Combat.cs:DealDamageAt` adds the supplied threat, pre-mitigation damage and stun/fear terms, capped at the victim's current Health. The measured zero-damage Taunt isolates the Health contribution.

## Evidence

- [Tooltip before the repeated sequence](evidence/threat-health-bonus-tooltip.webp): 445 maximum Health and Taunt's `2,000 (+148 bonus)`.
- [Tooltip after the repeated sequence](evidence/threat-health-bonus-after.webp): the same tooltip after both casts.
- The table contains live server-side `Monster.aggroList` readings, not numbers calculated from source. The source derivation predicts 2,000 + 445 = 2,445 and agrees with all four casts.

The mods read state and drive the game's own `PlayerSkills.CmdUpgrade`, `Player.CmdSetTarget` and `PlayerSkills.CmdUse` commands. The defect is in the tooltip and game logic, not the macOS CrossOver platform.

## Notes

- Instrumentation: the scratch character was moved beside the Dummy. Rage was restored before each Taunt. Neither operation changed maximum Health, the skill's authored threat or the monster's threat list. Skills were learned through the normal upgrade command.
- The session was redirected with `game.useScratchDatabase` before opening the world. It returned `isScratch=true`. The player save SHA-256 was `053a241a1d60551fbfc80914c4afef977c66f98935df86467ab3b3c5a6aeeb0e` before launch and after `game.quit`.
- Screenshot PNG hashes were checked before conversion to WebP. The screenshots show the interface. Threat totals are only visible to the runtime reader.
