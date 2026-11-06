# Tasks

## 1. Catalogue

- [ ] 1.1 Add the game-free grouping, readiness, fish listing and nearest-node choice, and verify with tests for ready and growing nodes, always-ready fishing spots, fish named by several spots, sparks not yet out, and the nearest ready node falling back to the soonest growing one
- [ ] 1.2 Build the catalogue from one scene scan and a guarded `GatherItem.Start` postfix, and verify in the game that The Lone-Lands lists 3 herbs, 2 ores, 12 fish and sparks with the counts the scene holds, and that walking the zone adds no recurring long frame

## 2. Panel and button

- [ ] 2.1 Add the feature, its settings page, the Gathering group and the watched types, and verify that the switch removes everything it draws
- [ ] 2.2 Draw the panel with its tabs and tiles, this zone first and the others dimmed with their zones in the tooltip, and verify each tab with a screenshot
- [ ] 2.3 Add the round button on the minimap, hidden list at first start, and verify that it shows and hides the panel, keeps the watched types, and persists across sessions
- [ ] 2.4 Add the Gathering page's part switches, Zones and Growing nodes, and rename General's switch to Undiscovered with silhouettes for ungathered types, and verify each with a screenshot
- [ ] 2.5 Add the tiles' tooltip, and verify it for Chamomile, Azurevein and Ironjaw Catfish with screenshots

## 3. Surfaces

- [ ] 3.1 Add the map pins and the minimap icons for watched types, and verify with screenshots in The Lone-Lands and that Temple of Valaark shows none
- [ ] 3.2 Add the edge arrow to the nearest ready node or the soonest growing one, and verify with screenshots for both cases

## 4. Texts and release

- [ ] 4.1 Show every new text in the built interface in Plannotator, apply the answers, and add the Gathering section to `mods/PocketCompendium/README.md`
- [ ] 4.2 Take the README's and the `/mods` page's Gathering pictures: one in the world with the monster markers and arrows switched off, the list showing, the minimap's gathering icons and the gathering arrow, and one of the local map with the gathering pins, where boss pins may show too
- [ ] 4.3 Measure frames as 1.0.2's stutter investigation did (`.local/research/2026-11-03-pocket-compendium-stutter/`): walk The Lone-Lands with every type watched and the list shown, then with the helper off, and verify that no frame over twice the median recurs from the helper and that Pocket Compendium's mean update rises by less than 0.3 ms
- [ ] 4.4 Run every test project, and check the list with a virtual gamepad as the update question was checked
