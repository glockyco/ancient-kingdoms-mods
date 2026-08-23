## 1. Establish the baseline

- [x] 1.1 Run `pnpm build && node scripts/snapshot-mechanics.mjs` and record the failing count.
      Expect 105 changed, 0 new, out of 538.
- [x] 1.2 Confirm every failing snapshot differs only by `target.defense` becoming
      `target.physicalResist`, or by `Block/Miss Chance` becoming `Resist Chance`. Any other
      difference means a second, unrelated regression is present and must be investigated before
      proceeding.

## 2. Replace the mapping

- [x] 2.1 In `website/src/routes/skills/[id]/+page.svelte`, replace the `resistType` derivation at
      `:851-863` with a table keyed by the exported damage type, giving each entry its mitigation
      stat name and its avoidance kind. Mirror `server-scripts/Combat.cs:680-697` and `:501-508`,
      and cite both.
- [x] 2.2 Physical maps to mitigation stat `defense` and avoidance kind block-and-miss. Magic,
      fire, cold, poison, and disease map to their existing resist stats and the resist-chance
      kind.
- [x] 2.3 Update the mitigation render site at `:2013-2018` to read the mitigation stat from the
      table. Remove the `${resistType}Resist` concatenation so no stat name is assembled from a
      fragment.
- [x] 2.4 Update the avoidance render site at `:2029-2051` to branch on the avoidance kind rather
      than on a string comparison against `"melee"`.
- [x] 2.5 An unmapped damage type renders no damage-mechanics section rather than falling back to a
      plausible formula.

## 3. Verify against the game

- [ ] 3.1 Run `pnpm build && node scripts/snapshot-mechanics.mjs`. It must report zero changed and
      zero new. Do NOT pass `--update`, and do not edit any fixture.
      BLOCKED, and not by this change. The run reports 14 changed, none of them a
      `defense`/`physicalResist` difference. They are a scaling-notation difference introduced by
      `71277e63` and `b109de98`, both of which landed after the last rebaseline `dccb3d63`. This
      task passes once that drift is resolved on its own terms.
- [x] 3.2 Open a physical skill page in a browser and confirm it reads
      `target.defense × 0.0005` under Mitigation and shows the Block/Miss Chance heading.
- [x] 3.3 Open a magic skill page and confirm `target.magicResist` and the Resist Chance heading
      are unchanged.
- [x] 3.4 Run `pnpm check && pnpm lint`.

## 4. Repair the citations

- [x] 4.1 In `website/CLAUDE.md`, repoint the damage-type table's citation from
      `server-scripts/Combat.cs:480-487, 1245-1274` to `server-scripts/Combat.cs:680-682`, which
      contains the actual per-damage-type mitigation switch. Verify the quoted region before
      writing it.
- [x] 4.2 Re-sync the lockfile with `uv run compendium citations sync --game-version <ver>` from
      `build-pipeline/`. Use `sync`, not `fix`: the citation is being repointed to different code,
      not relocated after a line shift.
- [x] 4.3 Run `pnpm check:citations` from the repository root and confirm it passes.
