# Spec Delta

## Purpose

Lets a player find every reproduced defect in Ancient Kingdoms itself, understand how it affects them and how to avoid it, and lets the developer confirm it without this repository.

## ADDED Requirements

### Requirement: Every reproduced game defect has an entry on the Known Bugs page

The site SHALL publish a Known Bugs page with one entry for each defect in the game itself that has been reproduced against a running game. A defect in this repository's data or code SHALL NOT appear there.

#### Scenario: A reproduced defect is listed

- **WHEN** a game defect has been reproduced and recorded
- **THEN** the Known Bugs page shows an entry for it with its own anchor

#### Scenario: A repository defect is not listed

- **WHEN** published data disagrees with the game because of an exporter or curated source
- **THEN** the defect is fixed in the repository
- **AND** the Known Bugs page gains no entry

### Requirement: An entry stands on its own

Each entry SHALL state what happens, which players it affects, how to avoid it where a way exists, steps that reproduce it in a game without mods, the expected behaviour, the cause in the game's code, and the game version it was last confirmed on. Screenshots that show the defect SHALL be served by the site. An entry SHALL NOT link to repository files.

#### Scenario: A developer reads an entry

- **WHEN** the game's developer opens an entry
- **THEN** they can reproduce the defect from its steps without mods
- **AND** they can find the cause from the named game members without the repository

#### Scenario: A defect has screenshots

- **WHEN** an entry's defect is visible in the game's interface
- **THEN** the entry shows the screenshots from the site's own assets

### Requirement: The Known Bugs page is reachable

The home page footer SHALL link to the Known Bugs page. The page SHALL appear in the sitemap and in site search.

#### Scenario: A player looks for known bugs

- **WHEN** a player searches the site for "bug" or follows the home page footer
- **THEN** they reach the Known Bugs page

### Requirement: Pages warn about defects in context through one shared note

A page that describes behaviour a known defect changes SHALL warn about it with the shared defect note, which SHALL look the same on every page and link to the defect's entry. The note MAY carry text specific to its page.

#### Scenario: A page mentions a defect

- **WHEN** a page describes a rule that a known defect changes
- **THEN** the page shows the shared defect note beside that rule
- **AND** the note links to the defect's entry on the Known Bugs page

#### Scenario: A defect entry is removed

- **WHEN** an entry is removed because the game fixed the defect
- **THEN** no page still shows a note for it

### Requirement: Entries are rechecked on every game update

On each game update, every entry SHALL be checked against the changed game code. An entry whose defect the update fixes SHALL be removed together with its notes. An entry whose defect remains SHALL show the new game version it was confirmed on.

#### Scenario: An update fixes a defect

- **WHEN** a game update changes the code that caused a defect so that it no longer occurs
- **THEN** the entry and every note that links to it are removed in the same change

#### Scenario: An update leaves a defect in place

- **WHEN** a game update does not change the defect's cause
- **THEN** the entry's confirmed version names the new game version
