## Context

See `proposal.md` — Why. The mechanism in one line: `resistType` is a lowercase string that two
render sites interpret, one by appending `Resist` to it and one by comparing it against the literal
`"melee"`. Both interpretations broke when the value for physical damage changed from `melee` to
`physical`.

Ground truth in the game:

| Damage type (`DamageType`) | Mitigation stat, `Combat.cs:680-697` | Avoidance method, `Combat.cs:501-508` |
| --- | --- | --- |
| `Normal`, exported as `Physical` | `defense` | `GetProbResistMeleeDamage` — reads `blockChance` |
| `Magic` | `magicResist` | `GetProbResistMagic` |
| `Fire` | `fireResist` | `GetProbResistFire` |
| `Cold` | `coldResist` | `GetProbResistCold` |
| `Poison` | `poisonResist` | `GetProbResistPoison` |
| `Disease` | `diseaseResist` | `GetProbResistDisease` |

## Goals / Non-Goals

**Goals:**

- Restore all 105 failing snapshots to their committed text with no fixture edits.
- Make the defect class unreachable, not just this instance of it.
- Leave a citation that actually supports the claim.

**Non-Goals:**

- Changing the exported damage-type vocabulary. `Physical` is a better public name than `Normal`
  and the export is not at fault.
- Switching the card to player-facing labels such as `AC`. Separate question, noted in the
  proposal.
- Touching any other mechanics formula.

## Decisions

### One table keyed by damage type, replacing a shared lowercase string

`resistType` conflates two independent questions — which stat mitigates, and which roll avoids —
into a single string, then answers each by pattern-matching that string. That is why one mapping
edit broke two render sites.

The replacement is a single table keyed by the exported damage type, giving each type its
mitigation stat and its avoidance kind explicitly. Both render sites read fields instead of
re-deriving meaning from the string. The table mirrors `Combat.cs:680-697` and `:501-508` row for
row, so verifying it against the game is a visual diff.

Alternatives considered:

- **Change `Physical` back to `melee` in the mapping.** One character-level fix, restores the
  snapshots, and leaves the concatenation in place. Rejected: the next damage-type rename
  reproduces the bug, and the value would no longer match the vocabulary the export now uses.
- **Keep the concatenation but special-case `physical` as well.** Rejected for the same reason,
  with the added cost of two literals to keep in step.

### Fail visibly on an unknown damage type

The current fallback returns `"melee"` for anything unrecognised, which is why an unmapped type
silently renders a plausible formula. An unmapped damage type should instead surface as a missing
mechanics section rather than as confident wrong text. A skill with no damage type continues to
render no damage section, as today.

### The snapshots are the acceptance test, and are not to be updated

105 fixtures currently disagree with the build. They encode the pre-regression output, which the
game source confirms is correct. The fix is accepted only when `node scripts/snapshot-mechanics.mjs`
reports zero changed without any fixture edit. This is a stronger test than adding a new assertion,
because it checks all 538 cards including the 433 that must not move.

### Citations are repaired, not merely re-anchored

`website/CLAUDE.md` cites `Combat.cs:480-487` and `:1245-1274` for the Physical-to-Defense mapping.
Those regions are an invulnerability gate and RPC serialization. This is the exact failure mode the
repository's own guidance warns about: a citation that hashes green while pointing at the wrong
code. The citation is repointed to `Combat.cs:680-682`, and the lockfile is re-synced with
`uv run compendium citations sync`, not with `fix`, because the target moves rather than drifts.

## Risks / Trade-offs

- **The table drifts from the game after a patch** → It is cited and covered by the snapshots, so a
  mechanics change surfaces as a snapshot diff during the version-update workflow.
- **Zero-diff is a weaker signal than it looks if the build is stale** → The verification runs a
  full `pnpm build` first, so the snapshots compare against freshly rendered pages.
- **The 433 unaffected snapshots could mask a compensating error** → Any movement in them fails the
  run, which is precisely the guard.

## Migration Plan

No migration. Rendering-only change, no data or URL impact. Rollback is `git revert`.
