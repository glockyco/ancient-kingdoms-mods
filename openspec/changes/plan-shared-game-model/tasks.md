## 1. Working files

- [x] 1.1 Keep working files in the gitignored `.local/` folder, with `pnpm local:status` and the layout in `CONTRIBUTING.md` (D17, commit `11d13b80`).

## 2. Confirmation

- [x] 2.1 Confirm or revise the Proposed parts of D13: storage engine, cross-tab coordination, durability and backups. Update their status in `design.md`.
- [x] 2.2 Confirm or revise the Proposed parts of D14: transports, short links on D1, and abuse controls. Update their status in `design.md`.
- [x] 2.3 Confirm or revise the Proposed save reader of D12: WebCrypto with the site's sql.js, or SQLite3 Multiple Ciphers.

## 3. In-flight changes

- [x] 3.1 Revise `prune-unread-database-data`: retain the dead-column audit and progression tables. Publication continuity follows acquisition's private one-time date reconciliation.
- [x] 3.2 Fold the pack/random popup requirements into `unify-acquisition-usage-requirements` and remove the superseded standalone proposal. The successor retains inspection, quantities/probabilities and nonspatial-source behavior.
- [ ] 3.3 Fold `consolidate-server-read-models` into the read-model change, then remove it. Its proposal is marked superseded.
- [x] 3.4 Add WebAssembly to the content security policy of `add-security-headers`. That change's own tasks verify the database worker under the policy.
- [x] 3.5 Land `simplify-pipeline-loader-registration` and `harden-export-sessions` before the vocabulary and rules change, which adds a dataset and export fields. Both are archived.

## 4. Verification prerequisites

- [ ] 4.1 Coordinate the remaining boss-loot/fragment checks and the later D6 stat-sheet contract with `ancient-kingdoms-sim`. Reuse archived altar-threshold evidence instead of treating that completed check as a new blocker.
- [ ] 4.2 Confirm new or changed published game-behavior claims through D15 and record the evidence in their follow-up change. Preserve valid earlier evidence for unchanged rules.
- [ ] 4.3 Triage the unconfirmed suspected game defects with the game-defect-reports skill.

## 5. Spikes

- [x] 5.1 Save spike on a copy of a real save: cipher settings, date encoding, stored quest ids, and opening it in a browser (D12).
- [ ] 5.2 Measure encoded build sizes with 0, 4 and 10 geared mercenaries (D14).
- [ ] 5.3 Keep the previous export at each game update and compare ids, to settle whether ids are stable.

## 6. Follow-up changes

Each follow-up change cites this design by decision number and lists the facts it publishes with their confirmation per D15.

- [x] 6.1 Stat vocabulary (D2): `unify-stat-vocabulary`, with the item list fix. Archived as `2026-10-17-unify-stat-vocabulary`.
- [x] 6.2 Game rules (D5): `unify-game-rules`, with the altar tier, primal essence, item level and chest fixes. Archived as `2026-10-17-unify-game-rules`.
- [x] 6.3 Propose acquisition, usage and requirements (D3, D4) as `unify-acquisition-usage-requirements`, reconciling landed fixes, input gaps, NPC membership and inherited popup scope. Its approved implementation and verification are tracked in that change's `tasks.md`.
- [ ] 6.4 Shared read models and relation components (D7).
- [ ] 6.5 Character model, store and share links (D6, D13, D14).
- [ ] 6.6 Propose reference kinds: stats, effects with full applier/parameter coverage and mechanic definitions, armor sets, races and crafting stations (D2, D3, D9).
- [ ] 6.7 Zones by level.
- [ ] 6.8 Character planner with build, stat sheet and mercenaries (D10, D11).
- [ ] 6.9 "Where to Get".
- [ ] 6.10 Save import with progress views and stash search (D12).

## 7. Close

- [ ] 7.1 Archive this change once every follow-up change exists and sections 2 to 5 are done, then delete its working folder as `CONTRIBUTING.md` describes.
