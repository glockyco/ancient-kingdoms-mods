## 1. Verify shared presentation

- [x] 1.1 Verify the name, category, conditional achievement, and four-section jump-list threshold in `website/src/lib/components/professions/ProfessionHeader.svelte:39-72`; record the current header requirement.
- [x] 1.2 Verify the curve, reader marker, floor, and no-gain bands in `website/src/lib/components/professions/MasteryCurve.svelte:57-82,85-218`; record the current calculator requirement.
- [x] 1.3 Verify typed formulas, caps, starting bonuses, and symbol citations in `website/src/lib/data/professions/mechanics.ts:22-47,49-173`; keep new behavior outside this shipped specification.

## 2. Verify migrated routes

- [x] 2.1 Verify Mining's header, curve, pickaxe action, ore inventory, locations, gems, and uses in `website/src/routes/professions/mining/+page.svelte:30-112,114-167,226-309,311-539`; record the shipped Mining requirement.
- [x] 2.2 Verify Radiant Seeker's 5%–25% chance, no-tool spark action, respawn, location link, and combat section in `website/src/routes/professions/radiant_seeker/+page.svelte:20-48,66-205,231-338`; record the shipped Radiant Seeker requirement.
- [x] 2.3 Verify Slayer's account rule, damage curve, and hydrated target controls in `website/src/routes/professions/slayer/+page.svelte:33-53,302-331,348-363,434-561`; exclude unshipped full static target rendering.
- [x] 2.4 Verify the Slayer data inventory of 143 in `website/src/routes/professions/slayer/slayer-page-data.db.test.ts:5-20` and the current static slice in `website/src/lib/components/ui/data-table/data-table.svelte:657-664`; assign the static gate to `complete-profession-page-system`.
