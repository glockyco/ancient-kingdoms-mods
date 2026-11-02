# Proposal

## Why

The home page leads to the mods page only through the site bar's Mods link. The mods page lists Map pins before Boss skills and its introduction leaves skill tracking out, although players install Pocket Compendium for respawn timers, spawn markers and boss skill cooldowns, the jobs of BossTracker, BossSkillTracker and BetterBestiary, which it replaces. No page shows the settings window that the install steps tell players to open.

## What Changes

- The title-screen home page gets a third button, "Get the Mod", beside Open the Map and Browse Items. Phones show it as "Mod" in a row of three.
- The classic home page puts a Pocket Compendium card beside the Interactive World Map card on wide screens, and under it on narrow ones.
- The mods page holds the whole install, from one file that also becomes the MelonLoader zip's README.txt, with a direct download of the zip.
- The mods page introduction names skill cooldowns, Boss skills moves up to the third feature, and the install steps end with a picture of the settings window.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-mods`: the home page leads to the mods page, and the mods page leads with what players install the mod for.

## Impact

- `website/src/lib/components/home/TitleScreenHero.svelte` and `website/src/lib/components/home/ClassicHome.svelte`.
- `website/src/routes/mods/+page.svelte` and a new picture, `website/static/mod-pictures/settings-window.webp`.
