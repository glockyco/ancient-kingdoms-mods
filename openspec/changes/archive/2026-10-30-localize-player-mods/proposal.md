# Proposal

## Why

The published player mods were written before Ancient Kingdoms gained Spanish, Chinese and Japanese. BetterBestiary replaces the game's Bestiary page update, so a player in another language loses even the translations and CJK fonts the game itself applies on that page. BossTracker and BossSkillTracker show English names and use fonts without CJK glyphs. A player report about missing loot stats also exposed gaps that apply in every language: a boss with more than 12 drops hides the rest, a gamepad cannot reach loot tooltips, and one failed page turns the whole mod off for the session.

## What Changes

- BetterBestiary shows the Bestiary page in the player's language wherever the game has a translation: monster names, names inside lore, the level label, player classes, zone names, the durability line, the Skills button and title, and skill names. Mod-made text gets the game's CJK fonts. The skill effect summaries and the terms the game never translates stay English.
- BetterBestiary shows every drop a monster can list, shrinking the loot icons when there are more than 12.
- BetterBestiary lets a gamepad move from the monster grid to the loot icons and the Skills button, and shows the focused item's tooltip.
- BetterBestiary falls back to the game's own page only for a monster whose page fails to render, and keeps working for every other monster.
- BetterBestiary hides the Skills button whenever it is not rendering the page, and shows no kill count for monsters the game does not count.
- **BREAKING** BetterBestiary removes the `AutoAddMissingBestiaryEntries` setting and its grid icon fallback. The game now lists every boss, elite and fabled monster, so the setting added nothing.
- BossTracker shows translated monster names, labels fabled monsters as fabled, gives distances in yd, drops the player coordinate line, renders CJK names, and by default sits clear of the game's monster hover panel.
- BossSkillTracker shows translated monster and skill names and renders CJK text.
- Each published mod writes its version and build commit to the MelonLoader log at start, so a player's log identifies the build.

## Capabilities

### New Capabilities

- `player-mods`: in-game behavior of the published player mods: what BetterBestiary, BossTracker and BossSkillTracker show, in which language, and how they degrade.

### Modified Capabilities

None.

## Impact

- `mods/BetterBestiary`, `mods/BossTracker`, `mods/BossSkillTracker`, and new shared source under `mods/Shared` linked into them.
- `tests/BetterBestiary.Tests` gains tests for the loot layout and zone-name matching.
- Mod READMEs. The published downloads change on the next `pnpm cf-deploy`.
