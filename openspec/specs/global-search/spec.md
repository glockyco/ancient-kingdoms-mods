# global-search Specification

## Purpose
Lets a visitor find any entity, rule, page, or filtered list of the compendium from every page, with results in one relevance order that a judged query set checks.

## Requirements

### Requirement: The search palette opens from every page

The site SHALL provide one search palette on every page. Cmd-K on macOS and Ctrl-K on other systems SHALL open it. The home page search field SHALL open the same palette. On the map page the shortcut SHALL open the map search, which uses the same ranking.

#### Scenario: A visitor presses the shortcut on a detail page

- **WHEN** a visitor presses Ctrl-K on an item page
- **THEN** the search palette opens with the input focused

#### Scenario: A visitor uses the home page field

- **WHEN** a visitor activates the search field on the home page
- **THEN** the same search palette opens

#### Scenario: JavaScript is not available

- **WHEN** a page renders without JavaScript
- **THEN** the page shows no search control, because a search control without JavaScript does nothing

### Requirement: The palette is operable with the keyboard and a screen reader

The palette input SHALL expose combobox semantics with a list of options. Down and Up SHALL move the active result, Enter SHALL open the active result, and Escape SHALL close the palette and return focus to the element that opened it. A polite live region SHALL announce the number of results after each search.

#### Scenario: A visitor opens the second result with the keyboard

- **WHEN** a visitor types a query, presses Down once, and presses Enter
- **THEN** the site opens the second result

#### Scenario: A screen reader user types a query

- **WHEN** a search completes
- **THEN** the live region announces the number of results

### Requirement: Results are one list in relevance order

The palette SHALL show results in one list, in the order that the ranking returns. The palette SHALL NOT group, reorder, or interleave results by type. Each row SHALL show the result name and the result type. A row for a Notable NPC SHALL identify the Notable classification.

#### Scenario: A query matches several types

- **WHEN** a query matches a zone, an item, and a monster
- **THEN** the rows appear in ranking order, and each row states its type

#### Scenario: A visitor searches for notable NPCs

- **WHEN** a visitor searches for "notable"
- **THEN** the results include every Notable NPC
- **AND** each of those rows identifies the Notable classification

### Requirement: The index covers entities, pages, and filtered lists

The palette SHALL return every searchable entity family except the placement families named below, every mechanics page, every overview page, and each tool page. It SHALL contain one filtered-list result for each NPC service role, each item slot, each item type that is not a generic group, and each monster classification. Each filtered-list result SHALL open its list page with that filter applied and SHALL have a reviewed name.

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

### Requirement: Ranking follows one ordered contract

The ranking SHALL apply these rules:

1. A result whose normalized name equals the normalized query ranks first.
2. A result SHALL match every query word. When no result matches every word, results that match some of the words SHALL be returned.
3. The last query word SHALL match as a prefix. Other words SHALL match as whole words.
4. A word of 4 to 7 letters SHALL tolerate one edit, and a word of 8 or more letters SHALL tolerate two edits. A shorter word SHALL match without edits.
5. A match that needs an edit SHALL rank below an equivalent match without edits.
6. A query that equals a full name with two adjacent letters swapped SHALL return that name first.
7. A query word from the reviewed synonym list SHALL also match its listed terms.
8. Normalization SHALL ignore letter case, diacritics, apostrophes, and punctuation, and SHALL treat a singular and a plural form as the same word.
9. Results with an identical destination, including the section anchor, SHALL appear once.

#### Scenario: A visitor types a word from inside a name

- **WHEN** a visitor searches for "sword"
- **THEN** the results include "Iron Sword" and "Rusty Sword"

#### Scenario: A visitor swaps two letters

- **WHEN** a visitor searches for "Depsair"
- **THEN** the first result is the Despair zone

#### Scenario: A visitor uses an abbreviation

- **WHEN** a visitor searches for "xp"
- **THEN** a result opens the Experience mechanics page

#### Scenario: A short query with a similar word

- **WHEN** a visitor searches for "banker"
- **THEN** no barber or soul binder result ranks above the bank results

### Requirement: Search content excludes internal notes

The index SHALL NOT contain item comments or other developer notes that the site does not display as descriptions.

#### Scenario: An item has a developer comment

- **WHEN** an item's comment contains a word that appears nowhere else in its record
- **THEN** a search for that word does not return the item

### Requirement: Guide articles keep their titles and sections

Each Adventurer's Guide article SHALL be a result with its own title, and SHALL open its mapped section. A result for the page that contains the section SHALL NOT replace the article result.

#### Scenario: A visitor searches for a guide title

- **WHEN** a visitor searches for "Need, Greed"
- **THEN** a result titled "Need, Greed, and Pass" opens the loot-roll section

### Requirement: The palette handles empty input and no results

With an empty input, the palette SHALL show the visitor's recent searches, most recent first. Recent searches SHALL be stored only in the visitor's browser. When a query returns no results, the palette SHALL state that no result matches the query.

#### Scenario: A visitor reopens the palette

- **WHEN** a visitor opens a result and later opens the palette again
- **THEN** that query appears as a recent search

#### Scenario: A query matches nothing

- **WHEN** a visitor searches for text that matches no document
- **THEN** the palette states that no result matches

### Requirement: A judged query set checks relevance

The repository SHALL contain a judged query set. Each case SHALL state the query, the accepted destinations, and the rank within which one accepted destination must appear. The set SHALL have a tuning part and a held-out part. The held-out part SHALL NOT be used to select ranking settings.

A check SHALL fail when the number of passing held-out cases falls below the recorded number, or when a guide article title does not return its own article within the first three results.

#### Scenario: A ranking change lowers held-out quality

- **WHEN** a change to ranking or index content causes fewer held-out cases to pass
- **THEN** the check fails and names the failing cases

### Requirement: Search performance is measured in a browser

Before release, the search SHALL be measured in a browser for transfer size, time from opening the palette on a cold cache to the first result, and query latency. The 95th percentile query latency after the index loads SHALL be at most 50 ms. The measurements SHALL be recorded in the change.

#### Scenario: The release measurement runs

- **WHEN** the palette is measured on a production build in a browser
- **THEN** the recorded 95th percentile query latency is at most 50 ms

### Requirement: Search results show recorded entity artwork when available

The search index SHALL carry the recorded artwork path for a searchable entity whose family has an image kind. A result without a recorded image SHALL use its entity-type glyph. Page and filtered-list results SHALL use their own glyphs. The palette SHALL NOT infer artwork existence from an entity identifier.

#### Scenario: A result has recorded artwork

- **WHEN** a search returns an item, monster, NPC, zone, skill, class, chest, gathering resource, mercenary, summon, achievement, or profession with a matching asset row
- **THEN** the result displays that row's image in its fixed-size image slot

#### Scenario: A result lacks recorded artwork

- **WHEN** a search returns an entity without a matching asset row
- **THEN** the result displays the glyph for its entity kind instead of a missing image

#### Scenario: A result represents a page or a filtered list

- **WHEN** a search returns a page or filtered-list result
- **THEN** the result displays its page or list glyph rather than an entity image
