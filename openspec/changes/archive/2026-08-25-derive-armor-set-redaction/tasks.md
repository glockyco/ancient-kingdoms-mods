## 1. Declare the direction

- [x] 1.1 Add a reference direction for a row that the rows it names provide, beside the existing provides and mentions declarations
- [x] 1.2 Build the graph edge from each named entity to the row for that direction, leaving the other directions unchanged
- [x] 1.3 Declare `items.augment_armor_set_item_ids` and `items.augment_armor_set_members` under the new direction
- [x] 1.4 Propagate removal to a row whose every declared member is removed, to a fixpoint, recorded as a cascade that followed the members
- [x] 1.5 Require at least one declared member, so content that nothing reaches is still kept

## 2. Drop what the rule now derives

- [x] 2.1 Remove the four `*_armor_bonus_set` identifiers from `[entities.exclude]` in `redactions.toml`
- [x] 2.2 Remove the comment that records which bonus belongs to which released set, and keep the paragraph that explains why the pieces are named

## 3. Verify

- [x] 3.1 Add a pipeline test that an aggregate whose every member is removed is absent and records the members it followed
- [x] 3.2 Add a pipeline test that an aggregate with one surviving member remains published
- [x] 3.3 Run the pipeline tests, `uv run mypy .`, and `uv run ruff check .`
- [x] 3.4 Rebuild the database and confirm all six Old Valorath set bonuses are absent, including `gloomwarden_armor_bonus_set` and `hallowed_keeper_armor_bonus_set`
- [x] 3.5 Confirm `wildshade_armor_bonus_set` and `dawnforged_armor_bonus_set` remain published, and that the published item count is 1678
- [x] 3.6 Run `uv run compendium redactions check`, then sync with the current game version, and confirm each set bonus is recorded as following its pieces
- [x] 3.7 Run `uv run compendium redactions verify` after a website build
- [x] 3.8 Regenerate the home counts and confirm the item count follows
- [x] 3.9 Confirm in a browser that the two leaked set pages are gone and a released set page still renders
