## ADDED Requirements

### Requirement: Seasonal content is found by its season's name

A search for a season's name SHALL return the entities that season gates, and its seasonal section on the Seasonal Events page. Result rows for seasonal entities SHALL name the season. The game's own season vocabulary, including "Christmas" for the Winter Festival, SHALL find the same results.

#### Scenario: A visitor searches for Halloween

- **WHEN** a visitor searches for "halloween"
- **THEN** the results include the Halloween section, Pumpkin Head and Witch
- **AND** the monster rows name Halloween

#### Scenario: A visitor searches for Christmas

- **WHEN** a visitor searches for "christmas"
- **THEN** the results include the Winter Festival section and Santa Claus

## MODIFIED Requirements

### Requirement: The index covers entities, pages, sections, and filtered lists

The palette SHALL return every searchable entity family except the placement families named below, every mechanics page, every overview page, and each tool page. It SHALL return each section that a mechanics page lists in its contents, labelled Topic like a guide article. When a guide article opens the same section, the article SHALL represent it, and the section's heading SHALL find the article. It SHALL contain one filtered-list result for each NPC service role, each item slot, each item type that is not a generic group, each monster classification, and each season for monsters, NPCs, quests and items that the season gates. Each filtered-list result SHALL open its list page with that filter applied and SHALL have a reviewed name.

Sub-zone names SHALL match their parent zone. Chests, traps, portals, workstations, houses, and treasure locations SHALL NOT appear in the palette, because their names are internal labels or they have no page of their own. Map search SHALL continue to return them.

#### Scenario: A visitor searches for a service

- **WHEN** a visitor searches for "banker"
- **THEN** the first result is "Bankers", and it opens the NPC list filtered to bankers

#### Scenario: A visitor searches for a town

- **WHEN** a visitor searches for "Milldenn"
- **THEN** a result opens the Crescent Coast zone page

#### Scenario: A visitor searches for a placement name

- **WHEN** a visitor searches the palette for "Milldenn"
- **THEN** no portal, trap, chest, or workstation result appears
- **AND** the map search for "Milldenn" still returns the Milldenn portals

#### Scenario: A visitor searches for a mechanics page

- **WHEN** a visitor searches for "experience"
- **THEN** a result opens the Experience mechanics page

#### Scenario: A visitor searches for healing

- **WHEN** a visitor searches for "healing"
- **THEN** the Healing skill ranks first
- **AND** a result opens the Combat healing section

#### Scenario: A visitor searches for a rule inside a mechanics page

- **WHEN** a visitor searches for "wisdom heal bonus"
- **THEN** the first result opens the Combat Wisdom Heal Bonus section

#### Scenario: A visitor searches for seasonal items

- **WHEN** a visitor searches for "halloween items"
- **THEN** a result opens the item list filtered to Halloween
