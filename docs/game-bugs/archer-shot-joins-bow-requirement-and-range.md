# Archer Shot joins its bow requirement and range

## Summary

Archer Shot displays `Requires Bow8 yd range` in the Skills window. There is no separator between the weapon requirement and the range.

## Build

- Game version 0.9.35.5
- Steam build 25927597
- `Assembly-CSharp.dll` SHA-256 `92e750550488928ce34298db50d76d5cf9481ec46c94b6719108f08871d4eaf2`

## Impact

The bow requirement and the eight-yard range read as one phrase. A player has to infer where the requirement ends and the number begins.

## Steps to reproduce

1. Enter the world with a Ranger.
2. Open the Skills window.
3. Hover Archer Shot, or select it with a controller.
4. Close and reopen the window, then inspect the skill again.

## Observed

The game's own `Skill.ToolTip(false)` returned the following line on both readings:

```text
Requires Bow8 yd range
```

The Skills window displayed the same joined text before and after reopening it. Both tooltip readings showed rank 1. The skill did not need to be learned to expose the defect.

## Expected

A separator distinguishes the bow requirement from `8 yd range`.

## Cause

Archer Shot's authored tooltip template contains `Requires Bow{CASTRANGE} yd range` with no separator.

`server-scripts/ScriptableSkill.cs:ToolTip` replaces `{CASTRANGE}` using `AlignCastRangeWithResourceCost`. `server-scripts/ScriptableSkill.cs:AlignCastRangeWithResourceCost` returns the range unchanged when the template contains neither `{MANACOSTS}` nor `{ENERGYCOSTS}`. Archer Shot has neither token, so the replacement contributes no padding.

`server-scripts/UISkills.cs:Update` uses the generated skill tooltip for the visible slot tooltip.

## Suggested fix

Put an explicit separator in Archer Shot's template rather than relying on resource-column padding.

## Evidence

- [Tooltip on the first inspection](evidence/archer-shot-joined-range-before.webp).
- [Tooltip after reopening Skills](evidence/archer-shot-joined-range-after.webp).
- The quoted text was read from the running game's own tooltip method. It is not a string reconstructed from exported data.

The mods read the tooltip and drove the window's own `UISkills.ShowSkills` and `UIShowToolTip.ShowToolTip` methods. This is an interface defect in game logic, not a CrossOver rendering issue. It is visible without mods.

## Notes

- Instrumentation: an existing level-50 scratch Ranger was selected. Controller mode and the selected skill slot were set to keep the game's normal tooltip visible for capture. No skill or asset text was changed.
- The session was redirected with `game.useScratchDatabase` before world entry. It returned `isScratch=true`.
- The player save SHA-256 was `19d7665fd542a59f3d5f65167df4888d8ae4892d2956aaf37eaef8fb3ab4bd97` before launch and after `game.quit`.
- Screenshot PNG SHA-256 values were checked before WebP conversion: `51e8fc15255a211ca42a525e7acd0b467bc2d08ab661c67e32d24e4b6826f4d5` and `0b5fef2f51c468bbcba5370a421dbf7e055066b5cb705680dd35c0404b2e441d`.
