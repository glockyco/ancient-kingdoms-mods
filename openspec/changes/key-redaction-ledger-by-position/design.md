## Context

See `proposal.md` for motivation.

The ledger holds a `removed` map keyed by `table:entity_id`, and each value states a mechanism, a reason, a pass number and the chain it followed. The current file holds 185 entries: 39 decisions and 146 derivations, which collapse to 30 distinct chains.

Three commands read that map. The comparison reports what appeared and disappeared. The explanation walks a recorded chain for one entity. The surviving-reference check derives the identifiers it scans by splitting every key in the map.

`decide` already returns every removal with its mechanism, so the information a group needs is present before anything is written.

## Goals / Non-Goals

**Goals:**

- A ledger diff that a reviewer can act on.
- A ledger that does not change when a patch renumbers placements.
- A surviving-reference check that scans the current removals.

**Non-Goals:**

- Changing which content is removed.
- Changing the identifiers the exporter produces. They are stable for one game build, absent from every URL, and a position-derived identifier would defeat the coordinate suppression that Temple of Valaark relies on.
- Recording a per-entity chain for a derivation. That is the churn this change removes.

## Decisions

### Group derivations by mechanism, reason, table and chain

These four values are what a reviewer reads. The count is what changes when a decision starts removing more or fewer rows. Grouping by the chain keeps the seed visible, so a group still answers which decision took the rows.

The 146 derivations in the current data fall into 30 groups. A patch that edits an unreleased zone changes the counts of the groups it touches and nothing else.

Alternative: keep a per-entity row for derivations whose table is not a placement table. Rejected because the pipeline has no honest definition of a placement table, and a rule that keeps some identifiers and drops others by table would need a list to maintain, which is the kind of recorded fact that expires.

### Explanation recomputes rather than reads

Once a derivation has no recorded chain, the explanation cannot come from the file. It comes from `decide`, which the comparison already runs. This is also more truthful than reading the file, because it answers for the current data rather than for whatever the ledger last recorded.

Alternative: keep per-entity chains solely to serve the explanation. Rejected because that reinstates the churn for the sake of a command nobody runs during a patch.

### The check scans the current removals

The surviving-reference check exists to prove that no published surface names removed content. Deriving its scan set from the ledger makes the proof conditional on the ledger being synced, which is exactly when it is not. Taking the set from `decide` removes that condition.

This is not only a consequence of grouping. It is a defect today: during the 0.9.31.0 update the check reported a clean result while two unreleased armour set bonuses were published, because the recorded set predated them.

### A same-size swap is invisible in the ledger

A patch that removes twelve rows and adds twelve others under the same chain leaves the count unchanged, so the ledger shows nothing. This is accepted. The published surfaces are still checked against the current removals by the surviving-reference check, and a swap that changes which decision removes the rows changes the group.

Alternative: record a digest of the covered identifiers. Rejected because the digest changes whenever the placements are renumbered, which reproduces the churn in one line per group.

## Risks / Trade-offs

- A reviewer loses the identifier of an individually named cascaded entity, such as an item left with no source → the explanation names it from the current data, and a decision that removes one row produces a group with a count of one, naming its chain.
- The first sync after this change rewrites the whole file → the change lands with its own sync, and the diff is reviewed as the format change it is.
- Recomputation makes the explanation and the check slower → both already build the database and run the closure, so the cost is one closure rather than none.
- The grouped file could hide a real change behind an unchanged count → stated above and accepted, with the surviving-reference check as the backstop.

## Migration Plan

The ledger is regenerated, not migrated. The change includes one sync that rewrites `redactions.lock.json` in the new shape, and the comparison reports nothing afterwards.
