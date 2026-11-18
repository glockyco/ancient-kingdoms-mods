# Design

## Context

`ReportAction.Open` copies the details and opens the GitHub problem form. Three places call it: the About page's **Report a problem** button, the stopped-feature card's **Report** button (`NoticeCard`) and the settings row of a stopped feature (`SettingsWindow`). The About page shows its after-report state (`ShowReported`) only when its own button is used. The settings window has a scroll offset that only the mouse wheel changes.

The wording and layout were chosen in a comparison in the game (option P). The rows reuse the Links section's `LinkRow`.

## Decisions

- **One report action, one place that offers the choice.** `ReportAction` copies the details and asks the settings window to open on the About page in its reported state. The card and the settings row call the same action, so every report reaches the same choice. The alternative, three rows on the card itself, would crowd a card meant to be small and would duplicate the About page.
- **The GitHub row builds the form link when clicked.** It uses the details the action copied, so the form and the clipboard hold the same text. The link keeps today's length limit (`ProblemReport.Link`).
- **Rows open the invite and the profile.** The Discord Server row opens the server invite (`ModLinks.Discord`), because a channel link fails for players who aren't on the server yet. The Discord DM row opens the website's `/contact`, which redirects to the author's Discord profile. Discord has no link that opens a direct message by name, and the profile has a Message button. The user ID is the Worker secret `DISCORD_USER_ID`, so neither the repository nor the published mod carries it.
- **The page scrolls the rows into view.** After the report action the content is taller than the window, so the window scrolls to the end of the page. Without that, the log line and its button sit below the fold.
- **The idea action shows the rows without copying.** It keeps whatever the player has on the clipboard.

## Risks / Trade-offs

- [Details longer than one Discord message, which allows 2,000 characters] → Without errors the details are about 500 characters. A longer paste is the player's to split or attach.
- [The line shown after Suggest an idea is new player text] → Choose it in a comparison before release.
