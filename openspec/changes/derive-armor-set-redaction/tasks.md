## 1. Declare the direction

- [ ] 1.1 Add a reference direction for a row that the rows it names provide, beside the existing provides and mentions declarations
- [ ] 1.2 Build the graph edge from each named entity to the row for that direction, leaving the other directions unchanged
- [ ] 1.3 Declare `items.augment_armor_set_item_ids` and `items.augment_armor_set_members` under the new direction

## 2. Drop what the rule now derives

- [ ] 2.1 Remove the four `*_armor_bonus_set` identifiers from `[entities.exclude]` in `redactions.toml`
- [ ] 2.2 Remove the comment that records which bonus belongs to which released set, and keep the paragraph that explains why the pieces are named

## 3. Verify

- [ ] 3.1 Add a pipeline test that an aggregate whose every member is removed is absent and records the members it followed
- [ ] 3.2 Add a pipeline test that an aggregate with one surviving member remains published
- [ ] 3.3 Run the pipeline tests, `uv run mypy .`, and `uv run ruff check .`
- [ ] 3.4 Rebuild the database and confirm all six Old Valorath set bonuses are absent, including `gloomwarden_armor_bonus_set` and `hallowed_keeper_armor_bonus_set`
- [ ] 3.5 Confirm `wildshade_armor_bonus_set` and `dawnforged_armor_bonus_set` remain published, and that the published item count is 1678
- [ ] 3.6 Run `uv run compendium redactions check`, then sync with the current game version, and confirm each set bonus is recorded as following its pieces
- [ ] 3.7 Run `uv run compendium redactions verify` after a website build
- [ ] 3.8 Regenerate the home counts and confirm the item count follows
- [ ] 3.9 Confirm in a browser that the two leaked set pages are gone and a released set page still renders
