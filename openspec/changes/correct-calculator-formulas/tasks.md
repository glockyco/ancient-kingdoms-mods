## 1. Altar preview

- [x] 1.1 Add a helper that returns `iround(total veteran points / 40)` and test it at 20, 30, 60, and 100 points. Verify with the unit test.
- [x] 1.2 Use the helper in the altar preview, relabel the input "Veteran Points", and state the event's rule in the page text with its source. Verify in the browser at 20 and 30 points.

## 2. Herbalism calculator

- [x] 2.1 Add the herbalism tiers and the 10% gather floor to `PROFESSION_MECHANICS`, and test the five tier formulas. Verify with `mechanics.test.ts`.
- [x] 2.2 Compute the page's success chance with `rawTierSuccessChance` from those tiers. Verify in the browser that tier IV at 60% skill shows 63%.

## 3. Validation

- [x] 3.1 Run the website tests, `pnpm check`, `pnpm lint`, the citation check, and `openspec validate correct-calculator-formulas --strict`.
