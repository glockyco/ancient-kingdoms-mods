## 1. Updater

- [x] 1.1 Count every DLL that names itself Pocket Compendium as installed
- [x] 1.2 Settle the Mods folder before mods load: newest copy or waiting download under the usual name, other copies removed
- [x] 1.3 Install a download an earlier start left before checking again
- [x] 1.4 Treat a copy without a readable version as the oldest
- [x] 1.5 Report what the updater did in every start, and a download only once it is fully kept
- [x] 1.6 Turn any error in the check into its result

## 2. Pocket Compendium

- [x] 2.1 Remove older copies beside the running one, and announce a newer one that waits
- [x] 2.2 Show "Couldn't install" for a failed install and for a waiting download the updater did not install
- [x] 2.3 Cancel the old answer's check when the answer changes

## 3. Website

- [x] 3.1 Serve the mod list and its signature without caching
- [x] 3.2 Publish each version's DLL at an address of its own and name it in the list

## 4. Verification

- [x] 4.1 Tests: settling renamed, duplicate, newer renamed, broken and removed copies, damaged and incomplete downloads
- [x] 4.2 In game: 1.2.0 as `PocketCompendium (1).dll` reproduced the endless download on the old updater
- [x] 4.3 In game: a renamed-only 1.2.1 became `PocketCompendium.dll` 1.2.2 in one start
- [x] 4.4 In game: an older copy loading first, with a newer one beside it and no updater, settles at the next start
- [x] 4.5 In game: a waiting download with no updater shows "Couldn't install", and the next start with the updater installs it
- [ ] 4.6 On Windows: a renamed install updates in one start
