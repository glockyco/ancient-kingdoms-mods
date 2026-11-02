# virtue-system Specification

## Purpose
Defines how the compendium presents the Virtue System: the virtues, their ranks, titles and blessings, how each virtue earns points, the shrines on the map, the Blessing skill pages, and the naming of a blessing wherever it changes a number a page states.

## Requirements

### Requirement: Virtue facts are read from the export

The compendium SHALL state each virtue's name, rank thresholds, titles, Blessing skill and each rank's effect from the exported virtue data. A page SHALL NOT type these values by hand.

#### Scenario: A game update changes a threshold

- **WHEN** a new export carries a different point threshold for a rank
- **THEN** the Virtues page and the Blessing skill page state the new threshold without a code change

### Requirement: The Virtues page covers shrines, ranks and every virtue

The site SHALL publish a Virtues mechanics page with a section on shrines and blessings, a section on ranks and titles, and one section per virtue. Each Virtues article of the Adventurer's Guide SHALL map to one of these sections.

#### Scenario: A player follows the guide's Valor article

- **WHEN** a player searches for the guide article "Valor"
- **THEN** the result opens the Valor section of the Virtues page

### Requirement: The page states how blessings work

The Shrines section SHALL state that one blessing is active at a time, that it lasts three hours counting only time online, that renewing it restarts the time instead of adding to it, that it lasts through death, and the conditions under which a shrine refuses a blessing.

#### Scenario: A player asks whether blessings stack

- **WHEN** a player reads the Shrines section
- **THEN** it states that receiving another blessing replaces the active one

### Requirement: Each virtue's section states how it earns points

Each virtue section SHALL state the actions that earn its points, the points each action gives, and the conditions the game checks, as the game code implements them. Where a guide article and the code disagree, the section SHALL state the code's behaviour.

#### Scenario: A player plans Honor fights

- **WHEN** a player reads the Honor section
- **THEN** it states the points a qualifying kill gives, including the bonus for a stronger monster, and every condition that ends the trial

### Requirement: The Valor section lists possible quarries

The Valor section SHALL list the elites and bosses a shrine can name for a character of the level the reader enters on the page, from shared data, and SHALL recompute the list when the reader changes the level.

#### Scenario: A level 40 character

- **WHEN** the reader enters level 40
- **THEN** the list holds the dungeon elites and bosses from level 38 to level 45 and no others

### Requirement: The Sacrifice section computes an offering's points

The Sacrifice section SHALL compute the points an offering gives from the gold and the item levels the reader enters, with the game's formula and rounding, and SHALL state which items a shrine accepts.

#### Scenario: Gold and one item

- **WHEN** the reader offers 2,500 gold and an item of item level 120
- **THEN** the section shows 4 points, because the game rounds down 4,900 thousandths of a point

### Requirement: Shrines appear on the map

Each exported shrine SHALL appear on the map in a shrine marker group with its own control, shown by default. Its tooltip and popup SHALL name the shrine, the popup SHALL state the blessing's strongest effect, and the popup's details link SHALL open that virtue's section of the Virtues page. Map search and site search SHALL find each shrine by its name.

#### Scenario: A player looks for the Shrine of Valor

- **WHEN** a player searches for "Shrine of Valor"
- **THEN** the result opens the map at that shrine with its popup

### Requirement: Blessing skill pages state their source and ranks

The page of a Blessing skill SHALL state that the virtue's shrine grants it, that it lasts three hours online, and each rank's title and effect from the export. It SHALL NOT present its ranks as learned or show a skill rank to train.

#### Scenario: A player opens Blessing of Humility

- **WHEN** a player opens the Blessing of Humility skill page
- **THEN** the page lists every rank with its title and the effect the game states for it
- **AND** the page links to the Humility section of the Virtues page

### Requirement: A stated number names the blessing that changes it

Every page that states a number or formula that an active blessing changes SHALL name that blessing and link to its section of the Virtues page. This covers healing a player receives, damage against elites and bosses, maximum Health, Armor Class and resistances, Accuracy, Critical Resist, positive faction gains, and where lost belongings can be stored.

#### Scenario: Lifetap healing

- **WHEN** a page states how much lifetap heals the attacker
- **THEN** it names Compassion as raising that heal and links to the Compassion section

#### Scenario: A monster's faction gain

- **WHEN** a monster page states the faction standing a kill gives
- **THEN** it names Honesty as raising positive gains

### Requirement: Calculators offer an active blessing on their own page

A calculator whose result an active blessing changes SHALL offer that blessing and its rank under its "Use your numbers", defaulting to none and closed until opened, unless its inputs already include the blessing's effect through a value the character window shows. The choice SHALL apply to that page only.

#### Scenario: A reputation calculation with Honesty

- **WHEN** the reader chooses Honesty at rank 3 in a reputation calculation
- **THEN** each faction gain the calculation shows is raised and rounded as the game does

#### Scenario: A calculator that reads Armor Class

- **WHEN** a calculator takes Armor Class as the character window shows it
- **THEN** it offers no Humility input, because that value already includes the blessing

### Requirement: Monster, equipment and dungeon pages show what a virtue gives there

A monster page SHALL show the Honor points a fight against it gives without a level bonus, from its level and Health. An equipment page SHALL show the Sacrifice points the item adds to an offering when a shrine accepts it. A dungeon page SHALL show where its stranded adventurer appears, their level and Health as the game computes them for that dungeon, and the escort rules. Each SHALL link to the virtue's section.

#### Scenario: Troll King Grimlok

- **WHEN** a player opens Troll King Grimlok, a level 38 boss with 30,000 Health
- **THEN** its combat stats show "Honor: 30 points"

#### Scenario: A Common item

- **WHEN** a player opens an equipment page of a Common item
- **THEN** the page shows no Sacrifice value, because a shrine does not accept it

#### Scenario: Trolls Cave

- **WHEN** a player opens the Trolls Cave page
- **THEN** it states that the adventurer there is level 31 with 6,030 Health

### Requirement: The Compassion Escort is not published as an NPC

The compendium SHALL NOT publish the Compassion Escort as an NPC page, list row, search result or map marker, because its exported level and Health are values no player meets. The Compassion section SHALL describe escorts instead.

#### Scenario: A player searches for the escort

- **WHEN** a player searches for "Compassion Escort"
- **THEN** no NPC result appears
- **AND** the Compassion section explains how an escort's level and Health follow its dungeon
