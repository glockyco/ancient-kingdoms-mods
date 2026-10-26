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

The palette input SHALL expose a meaningful accessible name and combobox semantics with a list of options. Down and Up SHALL move the active result, Enter SHALL open the active result, and Escape SHALL close the palette and return focus to the element that opened it. Keyboard navigation SHALL scroll only the result list and keep the query input visible. A polite live region SHALL announce the number of results after each search.

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

### Requirement: The index covers entities, pages, sections, and filtered lists

The palette SHALL return every searchable entity family except chests, traps, portals, workstations, houses, and treasure locations, every mechanics page, every overview page, and each tool page.

#### Scenario: Indexed pages
- WHEN mechanics, overview and tool pages are published
- THEN the palette returns them

### Requirement: Mechanics sections resolve to reviewed topics
The palette SHALL return each section that a mechanics page lists in its contents, labelled Topic like a guide article. When a guide article opens the same section, the article SHALL represent it, and the section's heading SHALL find the article.

#### Scenario: Guide article represents a section
- WHEN a guide article opens a mechanics section
- THEN the section's heading finds the article instead of a duplicate result

### Requirement: Reviewed filtered lists are indexed
The palette SHALL contain one filtered-list result for each NPC service role, each item slot, each item type that is not a generic group, each monster classification, and each season for monsters, NPCs, quests and items that the season gates. Each filtered-list result SHALL open its list page with that filter applied and SHALL have a reviewed name.

#### Scenario: A visitor searches for a service

- **WHEN** a visitor searches for "banker"
- **THEN** the first result is "Bankers", and it opens the NPC list filtered to bankers

### Requirement: Sub-zone search returns the parent zone
Sub-zone names SHALL match their parent zone.

#### Scenario: A visitor searches for a town

- **WHEN** a visitor searches for "Milldenn"
- **THEN** a result opens the Crescent Coast zone page

### Requirement: Placement families stay out of the palette
Chests, traps, portals, workstations, houses, and treasure locations SHALL NOT appear in the palette, because their names are internal labels or they have no page of their own. Map search SHALL continue to return them.

#### Scenario: A visitor searches for a placement name

- **WHEN** a visitor searches the palette for "Milldenn"
- **THEN** no portal, trap, chest, or workstation result appears
- **AND** the map search for "Milldenn" still returns the Milldenn portals

### Requirement: Mechanics pages and sections remain searchable
Mechanics pages and their indexed sections SHALL be returned by their names and headings.

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

### Requirement: Seasonal list results open their filter
A seasonal filtered-list result SHALL open its list page with that season applied.

#### Scenario: A visitor searches for seasonal items

- **WHEN** a visitor searches for "halloween items"
- **THEN** a result opens the item list filtered to Halloween

### Requirement: Ranking follows one ordered contract

A result whose normalized name equals the normalized query SHALL rank first.

#### Scenario: Exact full name
- WHEN a query equals a result's normalized full name
- THEN that result ranks first

### Requirement: Query words match whole words and the final prefix
A result SHALL match every query word. When no result matches every word, results that match some of the words SHALL be returned. The last query word SHALL match as a prefix. Other words SHALL match as whole words.

#### Scenario: A visitor types a word from inside a name

- **WHEN** a visitor searches for "sword"
- **THEN** the results include "Iron Sword" and "Rusty Sword"

### Requirement: Spelling tolerance follows word length
A word of 4 to 7 letters SHALL tolerate one edit, and a word of 8 or more letters SHALL tolerate two edits. A shorter word SHALL match without edits.

#### Scenario: Short word spelling
- WHEN a query word has three letters
- THEN it matches without edits

### Requirement: Adjacent full-name transpositions rank first
A query that equals a full name with two adjacent letters swapped SHALL return that name first.

#### Scenario: A visitor swaps two letters

- **WHEN** a visitor searches for "Depsair"
- **THEN** the first result is the Despair zone

### Requirement: Reviewed synonyms match their terms
A query word from the reviewed synonym list SHALL also match its listed terms.

#### Scenario: A visitor uses an abbreviation

- **WHEN** a visitor searches for "xp"
- **THEN** the first result opens the Experience mechanics page
- **AND** at most two Experience sections appear

### Requirement: Search normalization ignores spelling presentation
Normalization SHALL ignore letter case, diacritics, apostrophes, and punctuation, and SHALL treat a singular and a plural form as the same word.

#### Scenario: Plural query
- WHEN a visitor searches with the plural form of a result word
- THEN normalization treats it as the same word as its singular form

### Requirement: Destinations appear once in search
Results with an identical destination, including the section anchor, SHALL appear once.

#### Scenario: Duplicate destination
- WHEN two indexed results have the same destination and section anchor
- THEN the destination appears once

### Requirement: Sections rank below matching peers and pages
A section SHALL rank below another result with the same name. A section SHALL rank below its own page when the page matches the query too, unless the section's name equals the query.

#### Scenario: Page and section match
- WHEN a page and its section both match and the query does not equal the section name
- THEN the page ranks above its section

### Requirement: One page contributes at most two sections
At most two sections of one page SHALL appear.

#### Scenario: Several matching page sections
- WHEN more than two sections of one page match
- THEN at most two of those sections appear

### Requirement: Equivalent unedited matches outrank edited matches
A match that needs an edit SHALL rank below an equivalent match without edits.

#### Scenario: A short query with a similar word

- **WHEN** a visitor searches for "banker"
- **THEN** no barber or soul binder result ranks above the bank results

### Requirement: Search content excludes internal notes

The index SHALL NOT contain item comments or other developer notes that the site does not display as descriptions.

#### Scenario: An item has a developer comment

- **WHEN** an item's comment contains a word that appears nowhere else in its record
- **THEN** a search for that word does not return the item

### Requirement: Guide articles keep their titles and sections

Each Adventurer's Guide article SHALL be a result with its own title, and SHALL open its mapped section. A result for the page that contains the section SHALL NOT replace the article result. These results SHALL use the type label "Topic" because their destinations include mechanics and class pages.

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

### Requirement: Seasonal content is found by its season's name

A search for a season's name SHALL return the entities that season gates, and its seasonal section on the Seasonal Events page. Result rows for seasonal entities SHALL name the season. The game's own season vocabulary, including "Christmas" for the Winter Festival, SHALL find the same results.

#### Scenario: A visitor searches for Halloween

- **WHEN** a visitor searches for "halloween"
- **THEN** the results include the Halloween section, Pumpkin Head and Witch
- **AND** the monster rows name Halloween

#### Scenario: A visitor searches for Christmas

- **WHEN** a visitor searches for "christmas"
- **THEN** the results include the Winter Festival section and Santa Claus
