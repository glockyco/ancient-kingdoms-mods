## Context

See `proposal.md` for motivation.

The closure builds one reachability graph from declared references. A reference is classified in `references.py` as `PROVIDES` or `JSON_PROVIDES`, which `closure.py` reads as "the row provides what it names", or as `MENTIONS`, which carries no reachability. `items.augment_armor_set_item_ids` sits in `JSON_PROVIDES`, so the graph holds an edge from the bonus set to each piece.

`redactions.toml` names four `*_armor_bonus_set` identifiers in `[entities.exclude]` and explains in a comment which bonuses belong to released sets.

## Goals / Non-Goals

**Goals:**

- Decide an aggregate's fate from its members rather than from a list.
- Keep one declaration per reference, so no pass carries its own classification.

**Non-Goals:**

- Changing which armour set pieces are excluded.
- Changing how a dangling reference in a surviving row is scrubbed.
- Revisiting how the ledger records cascade entries. That is a separate concern.

## Decisions

### A third direction, not a rule about armour sets

The relation is already declared. What is wrong is its direction: the data says the set is composed of the pieces, and the declaration says the set provides them.

A third direction keeps every pass reading one declaration, which is an existing requirement of this capability. It also covers the next composed entity without another edit.

Alternative: a special case in the closure for armour sets, or a derived rule in the configuration loader. Rejected because it would put a second classification of the same column beside the declaration, which is the defect that requirement exists to prevent.

### Removal propagates over the member edges, because the closure cannot reach them

The inverted direction is necessary but not sufficient. Removal is the difference of two closures rooted at zones, `reached_all - reached_kept - seeds`, and an armour set piece has no source at all: no drop table, vendor, chest or recipe names it, which is why the pieces are named seeds in the first place. The pieces are therefore in neither closure, so an aggregate whose only parents are those pieces never enters `reached_all` and the subtraction can never select it. Declaring the direction alone left all six set bonuses published.

The aggregate rule is therefore a second propagation over the removed set: a row that declares members, all of which are removed, is removed too, recorded as a cascade that followed them. It runs to a fixpoint, because one aggregate can name another.

The predicate is "declares at least one member and every member is removed", not "has no surviving parent". The closure deliberately keeps content that nothing reaches, including 96 items with no source, so a rule phrased over absent parents would remove them.

Alternative: keep naming each aggregate in the configuration. Rejected because that is the fact that expired. Alternative: a threshold matching set bonuses that require three or five pieces. Rejected as speculative: the data states no threshold, and one surviving member is the conservative reading.

### The configuration loses four identifiers and a fact

The four hand-named identifiers become derivable, so they go. The comment that records which bonus belongs to which released set goes with them, because it states a fact that a patch can change and that the rule now computes. The pieces stay named, since nothing in their rows says Old Valorath and no reference reaches them.

## Risks / Trade-offs

- An aggregate that the data reaches through some other published reference would now survive where the configuration used to remove it → the four sets are verified individually after the change: each must be absent, and each must be recorded as following its pieces.
- Inverting a shared declaration could change unrelated entities → the published entity count is compared before and after, and the only expected difference is the two leaked sets.
- A future composed relation could be declared in the old direction by habit → the requirement states the three directions, and the spec scenario names the composed case.
