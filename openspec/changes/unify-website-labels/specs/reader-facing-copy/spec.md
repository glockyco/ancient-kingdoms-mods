# Spec Delta

## ADDED Requirements

### Requirement: Website labels and titles use title-style capitalization

Every website label and title SHALL use title-style capitalization: table column headers, field labels, card and section titles, headings, standalone link labels, buttons, tabs, toggles, filter titles and options, chips, and calculation step and input names. Game terms, entity names and quoted game text SHALL keep their own spelling. Running prose SHALL keep sentence case.

#### Scenario: A skill's Rank Scaling table

- **WHEN** a skill's Rank Scaling table shows its damage and mana cost
- **THEN** the columns read "Skill Damage" and "Mana Cost"

#### Scenario: A guide page's table and section title

- **WHEN** the inventory page shows the bank tab table under its section title
- **THEN** the title reads "Bank Tabs and Gold" and the columns read "Unlocking Tab", "Gold Cost" and "Total Slots"

#### Scenario: Short words inside a label

- **WHEN** a label contains an article, a coordinating conjunction, "as", "to" before a verb or a preposition of four letters or fewer
- **THEN** that word is lowercase unless it is the label's first or last word, as in "Heal on Hit" and "Chase Limits and Resets"
- **AND** a preposition of five letters or more is capitalized, as in "Damage Before Defenses"

#### Scenario: A label quotes game text

- **WHEN** a label shows a name from the game, such as the item "Earring of Awakened light" or the zone "The Lone-lands"
- **THEN** the name keeps the game's spelling

### Requirement: A concept keeps one label

A value SHALL carry the same label, with the same words and short form, wherever the website shows it. Level labels SHALL read "Req. Level", "Rec. Level", "Min. Level" and "Max. Level". Text that names a label as a label, such as a sentence about a column or a formula that uses a named step, SHALL write it as the label shows it.

#### Scenario: A skill buffs maximum Hit Points

- **WHEN** a skill's buff fields and its Rank Scaling table both show its maximum Hit Points bonus
- **THEN** both label it "Maximum Hit Points"

#### Scenario: A quest's level requirement

- **WHEN** the quest list, an NPC page and a class page show a quest's required level
- **THEN** each column reads "Req. Level"

#### Scenario: A formula uses an earlier step

- **WHEN** a threat calculation adds its "Skill Threat" step to its "Hit Points Contribution" step
- **THEN** the formula reads "Skill Threat + Hit Points Contribution"

#### Scenario: A drop's chance on different pages

- **WHEN** a monster page, an NPC page and a chest page show the chance of a drop
- **THEN** each column reads "Drop Chance"
