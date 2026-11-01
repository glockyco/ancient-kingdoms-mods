# Tasks

## 1. Details and link

- [ ] 1.1 Add a pure details builder and link builder in `mods/PocketCompendium/Core`, compiled into the test project, with tests for the field order, the absence of addresses, names and paths, the URL encoding, and the length cap that shortens error lines first. Verify with `dotnet test tests/PocketCompendium.Tests`.
- [ ] 1.2 Read the setup in game: versions, the system through the Wine exports, the language, alone, hosting or joined, the loaded mods and plugins, and the switched-off and stopped features. Verify by printing the details through HotRepl in single player, on a LAN host and on its client.

## 2. Issue form

- [ ] 2.1 Choose the form's title prefix and text through a comparison (compare-options), with references from issue forms of popular game mods. Verify that the answer is recorded.
- [ ] 2.2 Add `.github/ISSUE_TEMPLATE/pocket-compendium.yml` with the chosen text and the labels `bug` and `mods`, and a test that every field id in the link exists in the form. Verify with that test and a check of the YAML against GitHub's issue form schema.

## 3. In game

- [ ] 3.1 Choose where the report action sits and the wording of the action and its result through a comparison, with screenshots of the real settings window. Verify that the answer is recorded.
- [ ] 3.2 Implement the action: clipboard, `Application.OpenURL`, the result text and the button that opens the log's folder. Verify under CrossOver that the clipboard holds the details, that a local HTTP listener given as the link receives the request, and that the folder opens.
- [ ] 3.3 Choose the stopped-feature message through a comparison, then show it once per feature and session from the registry's failure path. Verify by forcing a failure in a scratch session and reading the message band and the log.
- [ ] 3.4 Log alone, hosting or joined on each world entry. Verify in `MelonLoader/Latest.log` for single player, a LAN host and its client.

## 4. Documentation and records

- [ ] 4.1 Name the report action in the README's limits, worded through a comparison. Verify with `pnpm check:docs`.
- [ ] 4.2 Record each comparison's answer as a case in the vault's Ancient Kingdoms Compendium note. Verify that the note holds the cases.

## Workflow follow-up

- After the release push, use the report action in game and check that GitHub fills the details field and applies both labels.
