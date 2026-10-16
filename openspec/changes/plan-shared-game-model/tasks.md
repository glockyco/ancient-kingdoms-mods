## 1. Working files

- [x] 1.1 Keep working files in the gitignored `.local/` folder, with `pnpm local:status` and the layout in `CONTRIBUTING.md` (D17, commit `11d13b80`).

## 2. Confirmation

- [x] 2.1 Confirm or revise the Proposed parts of D13: storage engine, cross-tab coordination, durability and backups. Update their status in `design.md`.
- [x] 2.2 Confirm or revise the Proposed parts of D14: transports, short links on D1, and abuse controls. Update their status in `design.md`.
- [x] 2.3 Confirm or revise the Proposed save reader of D12: WebCrypto with the site's sql.js, or SQLite3 Multiple Ciphers.

## 3. In-flight changes

- [x] 3.1 Revise `prune-unread-database-data`: keep the sitemap hash bridge and the dead-column audit, and drop the deletion of the progression tables.
- [ ] 3.2 Fold `show-pack-and-random-sources-in-map-popups` into the acquisition change, then remove it. Its proposal is marked superseded.
- [ ] 3.3 Fold `consolidate-server-read-models` into the read-model change, then remove it. Its proposal is marked superseded.
- [x] 3.4 Add WebAssembly to the content security policy of `add-security-headers`. That change's own tasks verify the database worker under the policy.
- [ ] 3.5 Land `simplify-pipeline-loader-registration` and `harden-export-sessions` before the vocabulary and rules change, which adds a dataset and export fields.

## 4. Verification prerequisites

- [ ] 4.1 Agree with `ancient-kingdoms-sim` on the checks this plan needs: the stat sheet of a character in the D6 format, altar tiers around their thresholds, boss loot over many kills, and fragment eligibility.
- [ ] 4.2 Confirm each defect under "Defects found" in the game before the change that fixes it ships.
- [ ] 4.3 Triage the three suspected game defects with the game-defect-reports skill.

## 5. Spikes

- [x] 5.1 Save spike on a copy of a real save: cipher settings, date encoding, stored quest ids, and opening it in a browser (D12).
- [ ] 5.2 Measure encoded build sizes with 0, 4 and 10 geared mercenaries (D14).
- [ ] 5.3 Keep the previous export at each game update and compare ids, to settle whether ids are stable.

## 6. Follow-up changes

Each follow-up change cites this design by decision number and lists the facts it publishes with their confirmation per D15.

- [ ] 6.1 Stat vocabulary (D2): `unify-stat-vocabulary`, proposed, with the item list fix.
- [ ] 6.2 Game rules (D5): `unify-game-rules`, proposed, with the altar tier, primal essence, item level and chest fixes.
- [ ] 6.3 Acquisition, usage and requirements (D3, D4), with the export gaps, the NPC caster count and the remaining defects.
- [ ] 6.4 Shared read models and relation components (D7).
- [ ] 6.5 Character model, store and share links (D6, D13, D14).
- [ ] 6.6 Reference kinds: stats, effects with the mechanic definitions, armor sets, races and crafting stations (D9).
- [ ] 6.7 Zones by level.
- [ ] 6.8 Character planner with build, stat sheet and mercenaries (D10, D11).
- [ ] 6.9 "Where to Get".
- [ ] 6.10 Save import with progress views and stash search (D12).

## 7. Close

- [ ] 7.1 Archive this change once every follow-up change exists and sections 2 to 5 are done, then delete its working folder as `CONTRIBUTING.md` describes.
