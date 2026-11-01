# Spec Delta

## Purpose

Defines what the Skills panel beside a Bestiary page shows, where it sits, and how it matches the in-fight skill cards, so a player can prepare a fight from the Bestiary.

## ADDED Requirements

### Requirement: The panel sits beside the page

The Skills panel SHALL sit beside the Bestiary page at the page's height, framed like the game's own windows. It SHALL open with the page. Once the player closes it, later pages SHALL open without it until the player opens it again, also after a restart. The player SHALL be able to drag the panel by its frame, and it SHALL stay where it was dragged, also after a restart.

#### Scenario: Opening a boss's page

- **WHEN** the player opens Nyxarion's Bestiary page for the first time
- **THEN** the Skills panel shows beside the page at the same height

#### Scenario: Closing the panel

- **WHEN** the player closes the panel and then opens Xylevis's page
- **THEN** the page opens without the panel

#### Scenario: Moving the panel

- **WHEN** the player drags the panel by its frame, closes the Journal and opens another page
- **THEN** the panel shows where it was dragged to

### Requirement: A summary comes first

The panel SHALL begin with two lines. The first SHALL name the damage types the monster deals, each with the largest amount the monster deals of it. The second SHALL name the attacks and effects a player prepares for: area and frontal attacks, summons, stuns, fears and knockbacks, debuffs no cleanse removes, heals and enrages. Reach and numbers SHALL stay on the cards, and the summary SHALL NOT mention cast bars.

#### Scenario: Nyxarion's summary

- **WHEN** the panel shows Nyxarion
- **THEN** its summary names physical damage of 1,720 and cold damage of 4,650
- **AND** it names the summon, the frontal breath, the fear, the knockback and the stuns, without mentioning a cast bar

### Requirement: One card per special skill

Each special skill SHALL have a card with its icon and its name, its cast time and cooldown on the same line in the game's own form, such as "1s cast    10s cooldown", and one sentence below that gives its shape and reach in yd, its damage at the monster's level by type, and its effects with chance and duration. The basic attack and each passive or aura SHALL take one line each.

#### Scenario: A frontal attack

- **WHEN** the panel shows Nyxarion's Dragon Ice Breath
- **THEN** the card's top line reads "1s cast    10s cooldown", and its sentence says it hits everyone in a 5 yd square in front for 4,650 cold damage with a 75% chance to stun for 1.5 s

#### Scenario: A monster without special skills

- **WHEN** the panel shows an elite that has only a basic attack
- **THEN** it says "No special skills.", shows the basic attack's line, and the summary still names its damage type

### Requirement: Damage matches the website

A skill that lists damage or a damage percentage SHALL show a damage amount: the monster's damage or magic damage stat, whichever the game adds for the skill's class and damage type, plus the listed damage, multiplied by the damage percentage when that is above zero. The amount SHALL be the one before the target's armor, resistances and random variation, and SHALL equal the website's amount for the same monster and skill.

#### Scenario: A skill with no listed damage

- **WHEN** an area skill lists no damage and no damage percentage
- **THEN** its card shows no damage amount

### Requirement: Details on hover

Hovering or focusing a card SHALL show the skill's full mechanics: how the target resists or avoids it, whether and how a cleanse removes its debuff, its durations, chances and limits, in the terms the website uses for the same mechanics.

#### Scenario: A debuff no cleanse removes

- **WHEN** the player hovers a card whose debuff ignores cleanses
- **THEN** the details say that no cleanse removes it

### Requirement: The same skills as in a fight

The panel's special skills SHALL have the same names, icons and order as the in-fight skill cards.

#### Scenario: Fighting after reading the panel

- **WHEN** the player fights Nyxarion after reading his Skills panel
- **THEN** the in-fight cards list his special skills in the panel's order with the same names and icons
