# A potion refused inside a dungeon still ends invisibility and starts its recharge

## Summary

The Elixir of the Wildstride does not work inside dungeons. Trying to drink it in one shows `Cannot use this potion inside a dungeon` and leaves the potion in the bag, but the attempt still ends invisibility and starts the elixir's 10-second recharge. In both trials, a character hidden by a Scroll of Invisibility became visible.

## Build

- Game version 0.9.35.1
- Steam build 25863605
- `Assembly-CSharp` SHA-256 `342a45d0fb266a00f75795a525bb7e1c4e907839e8769563333cc8cf0adb5cfc`

## Impact

A hidden player who tries the elixir in a dungeon becomes visible to the monsters around them, and the refusal message does not say so. Source shows the attempt removes every invisibility buff, including a Rogue's Cloak of Shadows. The recharge blocks only this elixir, the one item in its cooldown category, for 10 seconds. The Elixir of the Wildstride is the only potion whose buff disallows dungeons in this build.

## Steps to reproduce

No mods are needed.

1. Carry an Elixir of the Wildstride and a Scroll of Invisibility on a character of level 30 or higher. Both items require level 30.
2. Enter a dungeon, for example Sunken Temple through its portal in Crescent Coast.
3. Read the Scroll of Invisibility. The character turns invisible for 5 seconds.
4. Within those 5 seconds, use the Elixir of the Wildstride.
5. The game shows `Cannot use this potion inside a dungeon`, the character is visible again, and the bag still holds the same number of elixirs. A developer reading `Player.GetItemCooldown("Spirit Wolf")` will see the elixir's recharge running.

## Observed

A level-50 Human Ranger entered Sunken Temple through the Crescent Coast portal. Each trial read a Scroll of Invisibility, waited until the character was invisible, and used the Elixir of the Wildstride. The after values were read 0.34 seconds after the drink.

| Trial | Invisible before | Invisible after | Elixirs before → after | Elixir recharge after | Spirit of the Wild buff after |
|---|---|---|---|---:|---|
| 1 | Yes, Invisibility buff with 5.0 s left | No, Invisibility buff gone | 2 → 2 | 9.67 s | No |
| 2 | Yes, Invisibility buff with 5.0 s left | No, Invisibility buff gone | 2 → 2 | 9.67 s | No |

Trial 2 ran 156 seconds after trial 1, once the scroll's 120-second recharge had ended. The elixir's recharge was 0 s before each drink.

## Expected

A refused drink should have no effect, as the game's other potion refusals already do. The `You are full health` and `No valid target` refusals return before invisibility ends or the recharge starts.

## Cause

`server-scripts/PotionItem.cs:Use` returns early for full Health, full Mana and a missing or full-Health pet target, before it calls `base.Use`. `server-scripts/UsableItem.cs:Use` removes invisibility through `Skills.RemoveInvisibility` and sets the item's cooldown. Only after that call does `PotionItem.Use` compare the buff's `allowDungeon` with `ZoneInfo.isDungeon`, send the refusal message and return, before it adds the buff and decreases the stack.

The same ordering ends the active buffs of the potion buff's category before the dungeon check. The elixir's buff has no category, so no buff is lost in this build, but a dungeon-refused potion with a category would also end the player's buff of that category.

## Evidence

- [Refusal in Sunken Temple](evidence/dungeon-potion-refusal.webp): `Cannot use this potion inside a dungeon` with the character visible, taken during trial 1.
- The table contains live server-side readings of `Player.isInvisible`, the player's buffs, the inventory stack and `Player.GetItemCooldown("Spirit Wolf")`, not numbers calculated from source.

The mods read state and drive the game's own `Player.CmdSetTarget` and `PlayerInventory.CmdUseItem` commands. The character reached the dungeon through the portal's own trigger. The defect is in game logic, not the macOS CrossOver platform.

## Notes

- Instrumentation: the CombatVerification fixture builder raised the scratch character to level 50 through the game's experience setter and added two elixirs and two Scrolls of Invisibility to its inventory. The character was moved onto the portal in Crescent Coast, which teleported it into the dungeon.
- The session was redirected with `game.useScratchDatabase` before opening the world. It returned `isScratch=true`. The player save SHA-256 was `daddc764f792ea75be91ee4f8d335053ec41de7678bd641a6192225248631b00` before launch and after `game.quit`.
