## ADDED Requirements

### Requirement: The header switches between the game compendiums

The site header SHALL keep the compendium's logo and name as the link to its home page and SHALL offer a separate control, directly left of the Ko-fi link, that opens a panel. The panel SHALL list Afallon, Ancient Kingdoms, Erenshor and The Bloodline in the order compendiums.org lists them, each with its logo, SHALL mark Ancient Kingdoms as the current compendium and SHALL end with a link to About this Compendium. The panel SHALL stay within the screen at every width.

#### Scenario: A visitor opens the switcher

- WHEN a visitor activates the switcher control
- THEN the panel lists the four compendiums with Ancient Kingdoms marked
- AND it links `/about` as About this Compendium

#### Scenario: A visitor closes the switcher

- WHEN the visitor presses Escape, clicks outside the panel or follows a link
- THEN the panel closes

### Requirement: Every page but the map ends with the shared footer

Every page except the map SHALL end with a footer whose bands are This Site, Project, Game & Community and Other Compendiums, followed by the version the data is updated for and the unofficial and artwork notices. Game & Community SHALL start with Ancient Kingdoms on Steam and Ancient Kingdoms Discord. Other Compendiums SHALL show Afallon, Erenshor and The Bloodline as equal cards with their logos.

#### Scenario: A visitor reaches the end of a list page

- WHEN a visitor scrolls to the end of `/items`
- THEN the footer links the site's main pages, the code, Ko-fi, the game's pages and the other compendiums

#### Scenario: The map fills the screen

- WHEN a visitor opens `/map`
- THEN no footer is shown

### Requirement: An About page describes the compendium

The site SHALL have an About page at `/about` that says the compendium is a fan-made wiki, world map and game database generated from the game's files, describes the game, says how the compendium is made with a link to its code, says it is an unofficial fan project, links the other compendiums as equal cards and lists the game's Steam page, the compendium guide on Steam, the game's Discord and Ko-fi.

#### Scenario: A visitor opens the About page

- WHEN a visitor opens `/about`
- THEN the page has the sections About Ancient Kingdoms, How the Compendium Is Made, Unofficial Fan Project and More Compendiums, and a More Links panel
