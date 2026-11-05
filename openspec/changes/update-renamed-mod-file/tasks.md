## 1. Fix

- [x] 1.1 Find the installed mod by its MelonInfo name, the usual file name first
- [x] 1.2 Regression test: a mod saved as `PocketCompendium (1).dll` is updated
- [x] 1.3 Install under the usual name and remove every other copy
- [x] 1.4 Regression test: two installed copies leave one after an update

## 2. Verification

- [x] 2.1 In game: 1.2.0 as `PocketCompendium (1).dll` reproduced the endless download
- [x] 2.2 In game: with the fix, the next start installed 1.2.1 and ran it
- [x] 2.3 In game: with 1.2.0 as `PocketCompendium (1).dll` and 1.2.1 as `PocketCompendium.dll`, the start installed 1.2.2, removed the other copy and ran 1.2.2
