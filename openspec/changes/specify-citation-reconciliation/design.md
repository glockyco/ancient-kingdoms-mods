## Context

See `proposal.md` for motivation. Three properties of the current system shape the approach.

The pre-commit gate is a tree predicate. It runs the citation check over the whole repository whenever a commit touches website source, pipeline source, the pipeline schema, mod source, or the ledger. It is skipped only when no snapshot is present.

The ledger holds one version stamp for all of its anchors. Re-anchoring is therefore a whole-file act, and the reconciliation of a new snapshot is one unit of work by construction.

The lifecycle had no spec, so `skill://update-game-version` was its only description. The skill ordered reconciliation after the work that reconciliation unblocks.

## Goals / Non-Goals

**Goals:**

- Enforce the order of relocation and re-anchoring in the tool, where a mistake is detectable.
- Give the lifecycle a spec, so guidance can reference it instead of restating it.
- State the limit of a passing verification, so an operator does not read it as claim verification.

**Non-Goals:**

- Narrowing the pre-commit gate to staged files.
- Recording a version for each anchor.
- Making the claim test stronger.
- Repeating the anchor corrections that the 0.9.31.0 update already carries.

## Decisions

### A new capability rather than a delta on `decompiled-source`

`decompiled-source` owns the snapshot store, the stable path a reference resolves through, the refusal to write outside ignored paths, and retention. This change owns whether the resolved region still carries the claim. That question has its own artifact, its own commands, and its own gate.

Alternative: add requirements to `decompiled-source`. Rejected because the capability would then answer two questions, and the repository requires each fact to have exactly one home. The boundary is stated in the proposal and in the new spec purpose.

### Enforce the order in the tool, not in prose

Re-anchoring a tree that still holds moved locators records an anchor for the region that now sits at the old position. Verification compares content only, so the result reports as unchanged from then on. The mistake is silent at the moment it is made and undetectable afterwards.

Alternative: document the order in the skill. Rejected because prose cannot enforce an order, and this failure produces no later signal. The tree already holds two references that name unrelated code for this reason.

### Reject a scoped re-anchor

A scoped re-anchor would let each concern carry its own ledger delta and would allow smaller commits during an update.

Rejected because the ledger states which snapshot its anchors describe. A ledger holding anchors from two snapshots could not carry that statement, and adding a version to every anchor would trade a single verified fact for 546 unverified ones.

### Keep the gate on the whole tree

A gate scoped to staged files would let unrelated work commit while citations are pending.

Rejected because a reference that names the wrong code is a defect wherever it sits, and the ledger is a whole-tree artifact in any case. The cost of the tree gate is that reconciliation must come first, which the skill reorder addresses directly.

### Record a deferred claim in the commit body

A claim that the new snapshot falsified is a defect in the code that carries it, not in the citation. The truthful fix removes the claim and the code together, which belongs with the mechanic, not with the reconciliation.

The reconciliation commit therefore records the new anchor and states which claims remain false. The repository rule already requires a record when the whole fix cannot land, and every commit already carries a causal body. Publication of the version is last, so an abandoned update publishes nothing.

Alternatives: a second ledger for deferred claims, rejected because a ledger needs its own drift check and duplicates the history; and an OpenSpec change for each game patch, rejected because a patch is routine maintenance and no archived change has that shape.

### Verify anchors during the update diff

The update already requires focused reading of the diff for every field the exporter reads and every mechanic the changelog names. An operator reading that diff has the context to judge whether an anchor still names the code its claim describes.

Alternative: a scheduled audit. Rejected because a scheduled reader has no context, and the decompiler bump note in `scripts/update-server-scripts.sh` already rejects schedule-driven maintenance for the same reason.

### Keep the claim test conservative

The claim test feeds a blocking gate. A stronger test that reported every claim it cannot confirm would stop all work on false findings. The spec records the limit instead, so the result is not mistaken for proof.

## Risks / Trade-offs

- The guard refuses a re-anchor that an operator considers ready → the refusal names the pending references, and relocation resolves them in one command.
- An operator publishes a version while a recorded claim is still false → publication is a single step and the skill requires the check there. An abandoned update leaves the previous published version in place.
- The new capability overlaps `decompiled-source` in a later reading → the boundary is stated in both the proposal and the spec purpose.
- The skill grows past its size budget → the reorder replaces the current step 4 rather than adding a section, and the gate contract moves from prose into the spec the skill references.

## Migration Plan

No data migration. The ledger format does not change.

An operator who is part way through an update runs the relocation command before the next re-anchor. The refusal states this. The reordered skill applies from the next game patch.
