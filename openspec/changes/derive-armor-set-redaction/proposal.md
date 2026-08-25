## Why

Version 0.9.31.0 published two items that belong to unreleased Old Valorath content: `gloomwarden_armor_bonus_set` and `hallowed_keeper_armor_bonus_set`. Each names an armour set whose five member pieces the configuration already removes, and each exposes the set name, item level 125, its attribute bonuses and its skill bonuses.

The leak is a class, not an oversight. `redactions.toml` records a fact rather than a rule:

> Ashen Magus, Deathwhisper, Dreadguard and Elderthorn each bring their own set bonus, which is named with the pieces. Gloomwarden grants Wildshade Battlegear and Hallowed Keeper grants Dawnforged Battlegear. Both of those bonuses belong to released sets and stay.

That was true of 0.9.30.0. In 0.9.31.0 the game gave Gloomwarden and Hallowed Keeper their own bonus entities, whose members are exclusively unreleased pieces, while `wildshade_armor_bonus_set` and `dawnforged_armor_bonus_set` remain separate entities over released pieces. The configuration cannot expire a fact, so the two new entities passed straight through.

The reachability graph already carries the relation, classified in the one direction that cannot help. `items.augment_armor_set_item_ids` sits in `JSON_PROVIDES`, and the closure reads that as "the row provides what it names", so the bonus set counts as the source of its own pieces. Removing every piece therefore leaves the set standing and only blanks its member array, which is why the published row carries `augment_armor_set_item_ids` of `[]`.

A player obtains a set bonus by wearing its pieces. The pieces provide the bonus, not the reverse.

Nothing detected the leak. `redactions verify` scans published surfaces for identifiers of removed entities, and the set names no removed identifier once its member array is blanked.

## What Changes

- Add a reference kind for a row that the rows it names provide, so removal propagates from a member to the aggregate that only its members reach.
- Declare armour set membership under that kind, so a set with no surviving member is removed by the existing fixpoint and recorded with the pieces it followed.
- Remove the four hand-named `*_armor_bonus_set` identifiers from `[entities.exclude]`, because the rule now derives them.
- Remove the configuration comment that records which bonus belongs to which released set, because the rule decides it from the members.

## Capabilities

### Modified Capabilities

- `compendium-redaction`: an aggregate entity that only its members reach is removed with them, rather than surviving with its references blanked.

## Impact

- **Changed:** the reference declarations and the closure in `build-pipeline/src/compendium/redactions/`, and `redactions.toml`.
- **Published data:** `gloomwarden_armor_bonus_set` and `hallowed_keeper_armor_bonus_set` leave the compendium. Published item count returns from 1680 to 1678, and the generated home counts follow.
- **Ledger:** six armour set bonuses become cascade entries that name their member pieces, rather than four named entries and two absences.
- **Unchanged:** every released set bonus, including `wildshade_armor_bonus_set` and `dawnforged_armor_bonus_set`, whose members are published.
