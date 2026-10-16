# Bandages promises twice the healing it delivers

## Summary

Bandages says it restores 250 hitpoints over five seconds. In two measured uses it instead added 125 Health beyond natural regeneration. Each use produced five healing ticks of 25.

## Build

- Game version 0.9.35.5
- Steam build 25927597
- `Assembly-CSharp.dll` SHA-256 `92e750550488928ce34298db50d76d5cf9481ec46c94b6719108f08871d4eaf2`

## Impact

A player planning to recover 250 Health receives only half that amount before Bandages enters its one-minute recharge.

## Steps to reproduce

1. Carry Bandages and lose enough Health that neither natural regeneration nor the item will fill the Health bar during the measurement.
2. Read the item's `Restores 250 hitpoints over 5 secs.` tooltip.
3. Stand somewhere safe and note the Health gained on each natural regeneration tick before using the item.
4. Use Bandages from the inventory.
5. Observe Health throughout the five-second effect. Subtract the natural regeneration contribution for the number of recovery ticks that occurred.
6. Wait for the one-minute recharge and repeat.

No mods are needed to see the tooltip or the Health changes. The measurements below used a frame-by-frame runtime sampler to separate the item from natural regeneration.

## Observed

The level-50 Ranger had 11 Wisdom and 1,455 maximum Health. A separate 6.2-second baseline window gained 30 Health on each of six recovery ticks: `100, 130, 160, 190, 220, 250, 280`. That window sampled 354 frames.

Each successful item window also lasted 6.2 seconds. It included the entire buff and the recovery ticks after expiry.

| Trial | Starting Health | Health after each recovery tick | Ending Health | Natural contribution | Bandages contribution | Frames sampled |
|---|---:|---|---:|---:|---:|---:|
| 1 | 100 | 155, 210, 265, 320, 375, 405, 435 | 435 | 210 | 125 | 352 |
| 2 | 100 | 155, 210, 265, 320, 375, 405, 435 | 435 | 210 | 125 | 373 |

All Health values and frame counts are runtime measurements. The natural contribution is derived from the separately measured 30-Health baseline multiplied by the seven observed recovery ticks in each item window. The starting phase differs between windows, so subtracting the baseline window's total of 180 would be incorrect.

For each use, the first five ticks gained 55 Health each. The final two gained only 30. The buff list gained Bandages on use and lost it before the final two ticks. Subtracting the measured natural regeneration leaves five ticks of 25, or 125 Health.

The inventory count fell from 10 to 9 on the first successful use and from 9 to 8 on the second. An intervening attempt during recharge left the count at 9 and produced only baseline regeneration. It is not counted as a successful trial.

The item tooltip continued to promise 250. The buff's own tooltip also said `Restores 250 hitpoints on 5 secs.`

## Expected

The stated total and the applied healing agree. If the authored five ticks of 25 are intended, the tooltip should state 125 rather than 250.

## Cause

The Bandages skill asset supplies a healing-per-second base value of 25 and a five-second duration, while the item and skill tooltip text hard-code 250.

`server-scripts/NetworkManagerMMO.cs:OnStartServer` schedules `UpdateEnergies` once per second. `server-scripts/NetworkManagerMMO.cs:UpdateEnergies` calls `EnergyResource.Recover`. `server-scripts/EnergyResource.cs:Recover` adds the recovery amount once per call, without multiplying it by two.

`server-scripts/Health.cs:GetRecoveryBonus` obtains the active healing ticks from `Skills.GetHealthRecoveryTickBonus`. `server-scripts/Skills.cs:GetBuffHealthRecoveryBonus` and `server-scripts/Skills.cs:GetFinalHealOverTime` contribute the buff's 25 on each tick.

`server-scripts/PotionItem.cs:Use` constructs this buff with `bonusAttribute=0`. `server-scripts/Wisdom.cs:GetHealingPerSecondBuffBonus` therefore adds zero, despite the character's 11 Wisdom. The measured 125 is not a Wisdom-adjusted total that happened to fall below 250.

The one-second tick interval and the zero attribute contribution are source derivations. The repeated five 25-Health contributions are measured results.

## Evidence

- [Item tooltip before the successful repeat](evidence/bandages-tooltip-before.webp). The recharge from the first use is still visible.
- [Item tooltip after the successful repeat](evidence/bandages-tooltip-after.webp). The same 250-Health promise remains.
- The table is from an in-game coroutine that read Health every frame and recorded each change, not separate shell calls.

The mods read state and used the game's `PlayerInventory.CmdUseItem` command. The defect is the authored tooltip versus the game's recovery logic, not the macOS CrossOver platform.

## Notes

- Instrumentation: ten Bandages were placed in scratch inventory slot 0. Health was set to 100 at the start of each window. The character was kept stationary in a safe corridor. Wisdom, regeneration and the Bandages asset were not changed.
- The successful repeat was scheduled after 61 seconds to let the normal recharge finish. No item cooldown was reset.
- Controller selection and the inventory's own tooltip methods kept the tooltip visible. The screenshots document the interface, not the endpoint of a measurement window. Natural regeneration continued between the windows and the captures.
- The session was redirected with `game.useScratchDatabase` before world entry. It returned `isScratch=true`.
- The player save SHA-256 was `19d7665fd542a59f3d5f65167df4888d8ae4892d2956aaf37eaef8fb3ab4bd97` before launch and after `game.quit`.
- Screenshot PNG SHA-256 values were checked before WebP conversion: `84487191282038a464c6b32f811bc5e73d81ae8fbd8bc971954bdff980e62047` and `6201da920f49c4493298d257e50567636ef4275b087530d8e57d422a910a9419`.
