# Proposal

## Why

Pocket Compendium presents GitHub as the place to report problems and ideas and offers the game's Discord only to players without a GitHub account. Players ask whether they may message the author directly, and reports are welcome in all three places. Only the GitHub route carries the setup's details today, so a report on Discord arrives without them.

## What Changes

- The About page names three equal places to report: a form on GitHub, the #compendium channel on the game's Discord and a direct message to wow_much.
- **Report a problem** copies the setup's details first and then offers the three places as rows. The GitHub row opens the problem form with the details filled in. The Discord Server row opens the server invite. The Discord DM row opens wow_much's Discord profile through the website's `/contact` redirect.
- **Suggest an idea** offers the same three rows without copying anything. Its GitHub row opens the ideas form.
- The **Report** button on a stopped feature's card and on its settings row opens the About page with the details copied and the three places shown, instead of opening GitHub directly.
- The README's problems and ideas section, the intro of both GitHub forms and the closing of the install guide on `/mods` name the three places instead of "No GitHub account? Post in the compendium channel".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mod-feedback`: the report action copies the details and offers three places instead of opening the problem form. The problem form, the README and the stopped-feature card name or reach the three places.
- `mod-about-page`: the page's feedback actions offer the three places.

## Impact

- `mods/PocketCompendium/Core/Feedback/AboutPage.cs`, `ReportAction.cs`, `ModLinks.cs`, `NoticeCard.cs` and the settings row's Report button. `SettingsWindow` gains a way to open on the About page in its reported state.
- `mods/PocketCompendium/README.md`, `.github/ISSUE_TEMPLATE/pocket-compendium-problem.yml`, `.github/ISSUE_TEMPLATE/pocket-compendium-idea.yml`, `website/src/lib/mods/InstallClosing.svelte`.
- A Pocket Compendium release, because the text players see in the game changes.
