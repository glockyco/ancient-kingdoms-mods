## ADDED Requirements

### Requirement: Every indexable page title is unique and truthful

Every prerendered, indexable page SHALL have a title distinct from all other prerendered, indexable pages. A detail title SHALL state the entity name or page subject, a truthful distinguishing context, and the ` - Ancient Kingdoms` brand suffix. It SHALL not turn an internal asset category into a more specific game claim. A missing or ambiguous field SHALL not be presented as known.

#### Scenario: A name belongs to an item and a skill

- **WHEN** both the Winter Orange food item and the Winter Orange skill are indexed
- **THEN** their titles distinguish the food item from the skill without claiming the skill has a player class

#### Scenario: A raw equipment category is broad

- **WHEN** a weapon has `WeaponDagger` as its internal category but is a spear
- **THEN** the title describes a light one-handed weapon, not a dagger

### Requirement: Detail titles distinguish every family and repeated placement

Titles SHALL use verified family labels and relevant, available context for items, skills, monsters, NPCs, quests, zones, summons, mercenaries, altars, gathering resources, factions, classes, chests, recipes, and professions. Identical names within a family SHALL receive additional truthful context. Each canonical placement page SHALL identify its specific placement. An alias that canonicalizes to the first placement SHALL not need a separate title.

#### Scenario: Several chests share one zone

- **WHEN** fifteen chests occur in Everfrost
- **THEN** all fifteen titles identify distinct chests without asserting unsupported chest tiers or names

#### Scenario: A fishing family has several canonical spot routes

- **WHEN** the canonical pages for individual Calm Fishing Spot placements render
- **THEN** each distinct placement has a distinct title

#### Scenario: A quest and a zone share a name

- **WHEN** Despair is both a quest and a zone
- **THEN** the two titles identify which page concerns the quest and which concerns the zone

### Requirement: Titles limit avoidable length without hiding identity

The title SHALL put the useful entity name first where possible and prefer a concise descriptor. It SHOULD remain at most 60 characters and SHALL not exceed 70 when a shorter truthful unique form exists. When verified context cannot remove a collision, it SHALL use a stable, canonical entity identity as a last resort. It SHALL not truncate an entity name, invent a numeric level, or omit the brand merely to meet the budget. A title may exceed 70 characters if all shorter truthful, unique forms would lose required identity.

#### Scenario: Context does not distinguish two placements

- **WHEN** two placements share a name, zone, and usable descriptive fields
- **THEN** a stable placement identifier makes their titles different

#### Scenario: An entity name is unusually long

- **WHEN** its full name and the shortest truthful unique context exceed 70 characters with the brand
- **THEN** the full name and identity remain present rather than being cut to an arbitrary length

### Requirement: The title collision gate checks rendered output

The prerender verification SHALL compare the decoded HTML `<title>` of every self-canonical, indexable page against every other self-canonical, indexable page. It SHALL fail on an empty title, a duplicate title, a missing brand suffix, or avoidably long titles. Noncanonical fishing aliases SHALL not count as separate indexed pages. The verification SHALL report colliding canonical paths so missing families cannot hide behind passing generator-unit tests.

#### Scenario: Two distinct URLs render the same title

- **WHEN** the prerendered pages contain duplicate titles
- **THEN** the verification fails and reports both page URLs
