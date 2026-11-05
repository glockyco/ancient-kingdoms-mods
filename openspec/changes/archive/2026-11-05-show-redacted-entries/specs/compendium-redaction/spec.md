## ADDED Requirements

### Requirement: References to redacted content stay visible as placeholders

A published entry that refers to redacted content SHALL stay on its page as a placeholder instead of being left out. The placeholder SHALL keep the entry's own facts that do not identify the redacted content, such as an amount or a chance, and SHALL NOT name, link, picture or identify the redacted content.

#### Scenario: A quest gathers a redacted item

- **WHEN** a published quest's objective is an item the game flags `ignore_journal`
- **THEN** its Objectives show "Gather", the placeholder "Redacted item" and the amount
- **AND** its Game Tooltip shows "Redacted item (0/1)" where the game shows the item's name
- **AND** its search description says "Collect a redacted item."

#### Scenario: A monster drops a redacted item

- **WHEN** a monster's loot pool holds a drop whose item is redacted
- **THEN** its loot table lists the placeholder "Redacted item" with the drop's chance

#### Scenario: An item's recipe is redacted

- **WHEN** an item's crafting recipe is hidden by configuration
- **THEN** its page says it is crafted from a "Redacted recipe" and does not say it has no known source
- **AND** the page lists no materials of that recipe

#### Scenario: A material is used in a redacted recipe

- **WHEN** an item is a material or a mold of a recipe hidden by configuration
- **THEN** its Used in Recipes lists the placeholder "Redacted recipe"
- **AND** the row names neither the recipe's product nor the amount

#### Scenario: A portal needs a redacted key

- **WHEN** a published portal's key is redacted
- **THEN** the portal states that it needs a "Redacted item"

#### Scenario: Quest text names redacted content

- **WHEN** a quest's game text names a redacted item
- **THEN** the text stays as the game wrote it

#### Scenario: An NPC offers quests named for exclusion

- **WHEN** an NPC offers and completes two quests that the configuration names for exclusion
- **THEN** the NPC's Quests and Quests Completed Here each list the placeholder "2 redacted quests" and count both quests in the heading
- **AND** an item a quest needs lists the placeholder "Redacted quest" under Required for Quests, and a faction whose standing a quest requires lists it under Quests
- **AND** no placeholder states the quests' levels, needs or required standing
- **AND** no list, search result or page names the quests

### Requirement: A placeholder names the kind of redacted content

A placeholder SHALL read "Redacted" followed by the kind of content, such as "Redacted item", "Redacted monster" or "Redacted recipe". On a page it SHALL show a dashed empty slot where an icon would stand and carry the hover text "Left out of the compendium at the developers' request." Text without room for the slot, such as a game tooltip or a search description, SHALL use the same words.

#### Scenario: A loot row and a tooltip line

- **WHEN** a redacted item appears in a loot table and in a game tooltip
- **THEN** the loot row shows the dashed slot and "Redacted item" with the hover text
- **AND** the tooltip line reads "Redacted item"

### Requirement: A redacted drop keeps its chance and leaves the others known

A loot table SHALL state the chance of every drop, including a redacted one, by the same rules as published drops. A redacted drop SHALL take part in the calculation of the other drops with its retained probability, quest condition and equipment role, so it SHALL NOT make the other drops' chances unknown. A redacted quest drop's chance SHALL assume an unfinished gathering quest, as published quest drops do.

#### Scenario: A boss drops a redacted quest item

- **WHEN** Lord Vaelric's pool holds two redacted quest items at 10%
- **THEN** each redacted row shows 10.0%
- **AND** every other drop shows the chance it would have without the redaction, such as Hood of the Lich at 9.5% and 17.2% with a Fatecharm
- **AND** the item page of Hood of the Lich shows the same 9.5% for Lord Vaelric
