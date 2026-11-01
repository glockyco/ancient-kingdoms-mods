# Tasks

## 1. Details and link

- [x] 1.1 Add a pure details builder and link builder in `mods/PocketCompendium/Core`, compiled into the test project, with tests for the field order, the absence of addresses, names and paths, the URL encoding, and the length cap that shortens error lines first. Verify with `dotnet test tests/PocketCompendium.Tests`.
- [x] 1.2 Read the setup in game: versions, the system through the Wine exports, the language, alone, hosting or joined, the loaded mods and plugins, and the switched-off and stopped features. Verify by printing the details through HotRepl in single player, on a LAN host and on its client.

## 2. Forms

- [ ] 2.1 Choose both forms' text through a comparison (compare-options), with references from issue forms of popular game mods. The ideas form's fields are decided: what the player wants to do and what gets in the way, required, then the idea, how often and screenshots, optional. Verify that the answer is recorded.
- [ ] 2.2 Add the problem form and the ideas form to `.github/ISSUE_TEMPLATE/` with the chosen text and their labels, and a test that every field id in the report link exists in the problem form. Verify with that test and a check of both files against GitHub's issue form schema.

## 3. About page

- [ ] 3.1 Choose the page's wording, together with the wording of the other pages' summaries and help texts, through comparisons with screenshots of the real settings window. Verify that the answers are recorded. Decided on 2026-11-01: the version and fan-made lines, the link names, the stopped-feature note and the Bestiary summaries. Still open: the texts around the report button, which should be option C made less vague, and the Boss list page, where both Zones choices keep an explanation without a short last line, Sort by gets one, and the Rows heading fits the page's structure.
- [x] 3.2 Add a settings page kind that draws its own content, add Lucide's `info` icon to `website/scripts/generate-mod-icons.mjs`, and build the page as rows like the other pages, as decided on 2026-11-01: version, build and author, the fan-made line, a Links section with one row per address, and a Feedback section with the two buttons, with "Reset this page" hidden. Verify in game at the Mac's full screen of 1800 px, the widest at hand, and in a 1280 px window.
- [x] 3.3 Keep the page's addresses in one class with a test that compares those the website also links with `website/src/lib/constants/links.ts` and `website/src/lib/seo/site.ts`. Verify with `dotnet test tests/PocketCompendium.Tests`.
- [ ] 3.4 Apply the chosen wording of the other pages' summaries and help texts. Verify in game that no text ends with a single word on its last line.

## 4. Actions and messages

- [x] 4.1 Implement the report action: clipboard, `Application.OpenURL`, the result text and the button that opens the log's folder. Verify under CrossOver that the clipboard holds the details, that a local HTTP listener given as the link receives the request, and that the folder opens.
- [x] 4.2 Implement the idea action and the links. Verify under CrossOver that each one opens the browser.
- [x] 4.3 Choose the stopped-feature message through a comparison, then show it once per feature and session from the registry's failure path. Verify by forcing a failure in a scratch session and reading the message band and the log. The current message was kept on 2026-11-01.
- [x] 4.4 Log alone, hosting or joined on each world entry. Verify in `MelonLoader/Latest.log` for single player, a LAN host and its client.

## 5. Documentation and records

- [ ] 5.1 Link the problem form and name the compendium channel on the game's Discord in the README's limits, worded through a comparison. Verify with `pnpm check:docs`.
- [ ] 5.2 Record each comparison's answer as a case in the vault's Ancient Kingdoms Compendium note. Verify that the note holds the cases.

## Workflow follow-up

- After the release push, use both actions in game and check that GitHub fills the details field and applies each form's labels.
