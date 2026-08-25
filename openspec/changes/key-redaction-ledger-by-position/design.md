## Context

See `proposal.md` for motivation. Four measurements shape the approach.

`(zone, round(x), round(y))` identifies every spawn uniquely: 4572 rows, 4572 keys, no collision, and no collision either at a tenth or a hundredth of a unit. No ordinal or other disambiguator is needed.

The largest coordinate magnitude is 884.86, where a 32-bit float resolves to about `1.1e-4`. Some exported positions carry five to eight decimals, which is that noise. Rounding to whole units absorbs it with four orders of magnitude to spare.

Thirteen tables carry their own position. Eleven of them take their identifier from the runtime object: `monster_spawns`, `npc_spawns`, `traps`, `portals`, `chests`, `altars`, `gathering_resource_spawns`, `crafting_stations`, `alchemy_tables`, `scribing_tables` and `treasure_locations`. The two that do not, `houses` and `zone_triggers`, use authored names.

Every positioned row the ledger records today is in Old Valorath. No row of a suppressed zone appears, because position suppression keeps its entities.

## Goals / Non-Goals

**Goals:**

- A ledger entry per removed row, under an identity that survives a game build.
- A diff in which one added placement is one added line that names what appeared.
- A surviving-reference check that scans the current removals.

**Non-Goals:**

- Changing the identifiers the exporter produces or the database publishes.
- Recording a count in place of an identity. A count reports that something changed without saying what, and the measurement behind this change shows the identity is the part worth keeping.
- Making a placement's position public. The ledger is not a published surface.

## Decisions

### The ledger keys a placement by where it stands

A placement is a position. Keying it by the runtime object the exporter happened to read records an accident of the build, which is why one added spawn rewrote ninety-eight unrelated rows.

Rounding is to whole units, because that is unique in the current data and absorbs the float noise. The recorded precision is part of the contract: a placement moved by less than the rounding does not register.

Alternative: an ordinal over the positions of each entity in each zone. Rejected because inserting one placement renumbers the tail of its group, which is the churn again on a smaller scale, and because it discloses relative order without buying anything the position does not.

### The change stops at the ledger

The published identifiers stay as they are. They are internal join keys, absent from every URL, and the two consumers that matter, the map and the item-source joins, are regenerated whole on each build.

This is also what keeps the change safe. Coordinates in a published identifier would defeat position suppression, which nulls 887 coordinate values across 345 Temple of Valaark rows while keeping the rows themselves. A ledger key cannot leak that, because a suppressed row is never recorded as removed.

Alternative: give the exporter positional identifiers. Rejected for the disclosure above, and because it would require the exporter to know the redaction configuration in order to treat a suppressed zone differently, which inverts the layering.

### The stable part of an identifier, then the position

A key reads `monster_spawns:plague_rat_old_valorath@1234,567`: the row's identifier with its trailing runtime number replaced by the rounded position. The entity is in the key, so a diff names what appeared without a reader consulting anything.

This leans on a convention the exporters share: a placement identifier is a descriptive stem, a zone, and the runtime number. Where an identifier has no trailing number, the whole identifier is kept, which is correct for `houses` and `zone_triggers`.

Alternative: derive the entity from the table's declared forward reference. Rejected because it mislabels `traps`, whose only forward reference is the skill the trap casts rather than anything it places. Alternative: leave the entity out of the key and resolve it when reporting. Rejected because the diff is what a reviewer reads, and a key without the entity is no more informative than a count.

### The check scans the current removals

The surviving-reference check exists to prove no published surface names removed content. Taking its scan set from the ledger makes the proof conditional on the ledger being synced, which is exactly when it is not. It comes from the current removals instead, in the form the published data carries them, which is the published identifier rather than the positional key.

This is a defect today, not only a consequence of the new key: during the 0.9.31.0 update the check reported a clean result while two unreleased armour set bonuses were published, because the recorded set predated them.

## Risks / Trade-offs

- A moved placement reads as one line gone and one line added rather than as a move → accepted. The placement did change, and rounding absorbs a nudge below a unit.
- The key depends on the exporters' identifier convention → the fallback keeps an identifier that has no trailing number, so a table that stops following the convention degrades to its own identifier rather than to a wrong one.
- The ledger and the published data identify the same row differently → stated in the spec, so that a later change does not "unify" them and reintroduce the disclosure.
- A patch that moves a placement and adds another at its old position reads as no change → accepted. The surviving-reference check still tests the published surfaces against the current removals.

## Migration Plan

The ledger is regenerated, not migrated. The change includes one sync that rewrites `redactions.lock.json`, in which 110 of 185 keys take their new form, and the comparison reports nothing afterwards.
