## Context

See `proposal.md` for motivation. `docs/plans/` currently contains thirteen dated records and one index.
The records mix overview, audit, specification, design, and task content. Some describe shipped work,
some contain unfinished work, and several contain claims that current source contradicts.

`documentation-lifecycle` already defines when stale, completed, and superseded documents are deleted
and which rationale can survive deletion. The missing rule is authority: it does not state that main
OpenSpec specifications own current behavior or that active OpenSpec changes own pending behavior work.

Two higher-priority OpenSpec changes are active. This migration has no runtime dependency on them, but
running a broad planning audit beside them would compete for review and could move evidence while their
plans are still being used.

## Goals / Non-Goals

**Goals:**

- Give every legacy planning record a verified, lossless disposition.
- End with one authority for current requirements and one registry for active changes.
- Preserve only rationale that cannot be recovered from code, tests, specifications, or citations.
- Make every retained unfinished subject independently reviewable and implementable.
- Remove the legacy directory, index, pointers, and hooks only after replacements validate.

**Non-Goals:**

- Implement any feature discovered in a legacy plan.
- Start the migration while the combat harness or gear planner change remains active.
- Copy old plans into OpenSpec unchanged.
- Keep a historical mirror of deleted legacy plans.
- Replace product, architecture, setup, or operational documentation whose purpose remains valid.

## Decisions

### Execution waits for both current changes to archive

Planning this migration now prevents it from being forgotten. Applying it waits until
`add-combat-verification-harness` and `add-gear-and-rotation-planner` are complete and archived. The
first task is a hard gate and performs no migration when either change remains active.

This is a priority boundary, not a technical dependency. It prevents a repository-wide documentation
audit from changing context while those two changes are under active review.

### One disposition ledger drives the migration

Implementation begins with a ledger containing one row per legacy file and these fields:

| Field | Purpose |
|---|---|
| Path | Proves every input was enumerated |
| Central premise | Distinguishes correction from deletion |
| Implementation evidence | Records what code and tests currently do |
| Current requirements | Names requirements missing from main specs |
| Unfinished wanted work | Names the scoped replacement change, if any |
| Durable rationale | Names its destination or states that none exists |
| Referrers | Names every live path that must change |
| Disposition | Keep during migration, delete, or blocked with a reason |

The ledger is part of this change while it is active. It is not a new permanent planning database. Its
final state is retained with the archived OpenSpec change as evidence that every input was handled.

### Audit behavior before trusting a checkbox or status label

A legacy frontmatter status, checkbox, title, or prose claim records intent. The audit checks code,
tests, generated output, runtime observations where needed, and current main specs before assigning a
disposition. A plan marked draft can describe shipped work. A plan marked active can describe a problem
that no longer exists.

Each record gets one of four outcomes:

1. **Delete:** no unique valid content remains.
2. **Codify then delete:** shipped behavior is missing from main specs or durable rationale lacks an
   owner.
3. **Propose then delete:** unfinished work remains wanted and receives a scoped OpenSpec change.
4. **Blocked:** evidence or a product decision is missing. Finish all other records, but do not remove
   the legacy hub until the blocker is resolved.

### Replacement work is split by deliverable subject

The migration change owns the inventory, authority cutover, and deletion. It does not become a backlog
container. When a legacy record contains still-wanted work, each independent deliverable receives a
separate OpenSpec change. That replacement must have all workflow-required planning artifacts before
the old record is deleted.

Shipped behavior that lacks a main specification also moves through a scoped documentation-only
OpenSpec change. This keeps capability ownership explicit and lets strict validation catch malformed
deltas. The migration records the replacement change name in its ledger.

### Rationale moves to the decision owner

The existing four permitted rationale classes remain the filter. A source limitation moves beside the
exporter or into the capability design that depends on it. A measurement behind a constant moves beside
the constant or into its source-cited evidence. A rejected alternative or deliberate omission moves to
the design or specification that owns that choice.

Progress narration, task history, screenshots of old status, and duplicated behavior descriptions are
deleted. Git history is sufficient recovery for prose that has no current owner.

### Records migrate in small verified units

Each dated record is one audit unit. The unit verifies implementation evidence, creates any replacement
OpenSpec change, relocates permitted rationale, repairs direct referrers, deletes the source record, and
passes the affected checks before commit. Closely coupled records may share one commit only when neither
has an independent valid state.

The index remains until all dated records are gone because it is part of the legacy system being
removed, not a temporary OpenSpec registry. It is deleted in the final cutover with repository guidance
and any planning-tool integration that expects it.

### The final gate proves absence and authority

The cutover checks four facts:

1. Every original ledger row has a non-blocked final disposition.
2. `docs/plans/` and `docs/plans/INDEX.md` are absent.
3. No live instruction, document, command, hook, or task expects those paths.
4. Every replacement specification and change validates strictly.

A text search alone is not proof of replacement completeness. It proves reference cleanup only after
the ledger proves content disposition.

## Risks / Trade-offs

- A legacy record can contain a requirement not implemented anywhere. Deleting it would lose wanted
  work. → Require a product decision or complete replacement change before deletion.
- Copying prose can preserve contradictions under a new path. → Derive requirements from current
  behavior and evidence, not from wording alone.
- One large replacement change can hide unrelated backlog work. → Split by independently deliverable
  subject and keep the migration change administrative.
- A broad edit can make review impossible. → Commit one verified record or tightly coupled subject at a
  time, then perform the final authority cutover separately.
- The migration can expand without bound when audits discover implementation defects. → Record a game
  or repository defect through its owning workflow. Do not fix unrelated behavior inside this change.
- Removing hooks too early can hide incomplete migration work. → Remove legacy integration only in the
  final cutover after absence and reference checks pass.
