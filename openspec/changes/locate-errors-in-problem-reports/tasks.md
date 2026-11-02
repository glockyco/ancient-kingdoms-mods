# Tasks

## 1. Errors and their circumstances

- [x] 1.1 Give `Log.Error` the exception as its own argument, record each error with the play setting and world count of its moment in a session record that keeps five, and update every call site, with the registry's message reduced to `<feature> stopped after an error`. Count a world entry when the game's network starts, and name the world's number in the entry's log line. Verify in game that the log says `Entered world 2` after leaving and entering again, and that HotRepl reads the recorded errors with their setting and world.
- [x] 1.2 Build the details from the record: a `Worlds entered` line, an error list with what failed, the circumstances, the first line and the frames, and a count of errors beyond five. Make the link leave out frames before it shortens lines further. Cover the frame selection with exception texts captured from the game, an Il2CppException and a managed exception with symbols, and the circumstances, the count and the link length with unit tests. Verify with `dotnet test tests/PocketCompendium.Tests`.
- [ ] 1.3 Embed the symbols with the repository root mapped to `/_/`. Verify that failures forced in game, one in a feature's update and one in a patch of a game method, log Pocket Compendium frames with file names and lines, that the DLL holds no `/Users/` path, and record the DLL's growth in the design.

## 2. Patches

- [x] 2.1 Catch every exception in `UIBestiaryDetailPatch` and both `GamepadLootNavigation` patches, and stop Bestiary pages through `Feature.Fail` for any failure outside one page's drawing. Verify in game that an exception forced into the page update logs one error, stops Bestiary pages and leaves the game's page.

## 3. Problem form

- [x] 3.1 Show the details field as plain text with `render: text`. Verify with `dotnet test tests/PocketCompendium.Tests`, whose form test reads the field.

## 4. Wording

- [ ] 4.1 Choose how an error's circumstances and the error list read through a comparison (compare-options) on the details of a real failure, and apply the answer. Verify that the answer is recorded in the vault's Ancient Kingdoms Compendium note.

## Workflow follow-up

- After the release push, post a report with frames through the problem form and check that the issue shows them as text.
