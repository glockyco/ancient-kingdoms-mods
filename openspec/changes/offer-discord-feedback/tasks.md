# Tasks

## 1. Report action and About page

- [x] 1.1 Remove the temporary `AboutPage.Variant` switch and its `Destinations` helper.
- [x] 1.2 Add the Discord DM row's address to `ModLinks`, as the website's `/contact` redirect.
- [x] 1.3 Make `ReportAction` copy the details and open the settings window on the About page in its reported state, with the three rows and the GitHub row opening the filled-in problem form.
- [x] 1.4 Show "You choose where: a form on GitHub, the #compendium channel on the game's Discord, or a message to wow_much." under the buttons, and scroll the window so the rows and the log folder button are visible after the report action.
- [x] 1.5 Choose the line shown after **Suggest an idea** in a comparison, then show the three rows with the GitHub row opening the ideas form.

## 2. Texts outside the game

- [x] 2.1 Rewrite the README section "Problems and ideas" to name the three places and the About page's actions.
- [x] 2.2 Replace the "No GitHub account?" intro of both GitHub forms with the three places.
- [x] 2.3 Replace the closing sentence in `website/src/lib/mods/InstallClosing.svelte` with the three places.

## 3. Check

- [x] 3.1 Build, deploy and check once in the game that Report on a stopped feature's card shows the three rows with the details on the clipboard.

## Workflow follow-up

- Release Pocket Compendium with this change after the review.
- Archive the change.
