## Context

See `proposal.md` — Why. The mechanism in one line: `resistType` is a lowercase string that two
render sites interpret, one by appending `Resist` to it and one by comparing it against the literal
`"melee"`. Both interpretations broke when the value for physical damage changed from `melee` to
`physical`.

Ground truth in the game:

| Damage type (`DamageType`) | Mitigation stat, `Combat.cs:680-697` | Avoidance method, `Combat.cs:501-508` |
| --- | --- | --- |
| `Normal`, exported as `Physical` | `defense` | `GetProbResistMeleeDamage` — reads `blockChance`, which is itself `defense × 0.0001` plus bonuses (`Combat.cs:272-284`) |
| `Magic` | `magicResist` | `GetProbResistMagic` |
| `Fire` | `fireResist` | `GetProbResistFire` |
| `Cold` | `coldResist` | `GetProbResistCold` |
| `Poison` | `poisonResist` | `GetProbResistPoison` |
| `Disease` | `diseaseResist` | `GetProbResistDisease` |

Physical is the only type whose stat does double duty. `defense` reduces the damage at 0.0005 per
point and separately raises the block roll at 0.0001 per point, because `blockChance` is derived
from it and capped at 0.8 before the level and accuracy terms apply. Both physical formulas
therefore name `defense`, which is a further reason the fabricated `physicalResist` was visibly
wrong: it made the mitigation line disagree with the block line on the very same page.

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

### An absent damage type is physical, and stays that way

The existing fallback returns `"melee"` for anything unrecognised, and it is load-bearing:
`isDamageType` keys off `skill_type`, not `damage_type`, so a damage skill whose `damage_type` is
null reaches it. 443 of 561 skills have a null `damage_type`. That fallback is correct, because the
game's enum value is `DamageType.Normal` and `Physical` is only the exported spelling of it, so an
absent type is the physical row rather than a missing one.

The table therefore treats a null damage type as physical explicitly, with a comment saying why.
An unrecognised non-null value is a different case: it means the exported vocabulary grew, and the
card renders no damage-mechanics section rather than guessing. No such value exists today — the
data holds only the six known types and null — so this cannot change current output.

### The snapshots are the acceptance test, and are not to be updated

105 fixtures currently disagree with the build. They encode the pre-regression output, which the
game source confirms is correct. The fix is accepted only when `node scripts/snapshot-mechanics.mjs`
reports zero changed without any fixture edit. This is a stronger test than adding a new assertion,
because it checks all 538 cards including the 433 that must not move.

### Citations are repaired, not merely re-anchored

`website/CLAUDE.md` cites `Combat.cs:480-487` and `:1245-1274` for the Physical-to-Defense mapping.
Those regions are an invulnerability gate and RPC serialization.

The reason nobody caught it is narrower than "a citation hashed green while pointing at the wrong
code". The checker never saw it: `citations.lock.json` holds only `.cs` targets cited from source
files, and it contains no entry for `Combat.cs:480-487` even though that citation existed. Prose
citations in Markdown are unverified, full stop. The citation is repointed to `Combat.cs:680-697`,
and the coverage gap is handed to the agent-docs check in the separate migration change.

## Risks / Trade-offs

- **The table drifts from the game after a patch** → It is cited and covered by the snapshots, so a
  mechanics change surfaces as a snapshot diff during the version-update workflow.
- **Zero-diff is a weaker signal than it looks if the build is stale** → The verification runs a
  full `pnpm build` first, so the snapshots compare against freshly rendered pages.
- **The 433 unaffected snapshots could mask a compensating error** → Any movement in them fails the
  run, which is precisely the guard.

## Migration Plan

No migration. Rendering-only change, no data or URL impact. Rollback is `git revert`.
