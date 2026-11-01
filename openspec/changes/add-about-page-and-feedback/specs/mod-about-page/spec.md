# Spec Delta

## Purpose

Defines the settings page about Pocket Compendium itself, so a player can see which version runs, reach the project's website, source and support, and report a problem or suggest an idea.

## ADDED Requirements

### Requirement: The settings window ends with an About page

The settings window SHALL end its page list with a page named About, about Pocket Compendium itself. The page SHALL show the mod's version and build commit. It SHALL have no feature switch, and the window SHALL hide "Reset this page" while it is shown.

#### Scenario: Opening the page

- **WHEN** the player opens the settings window and selects the last page
- **THEN** the page shows Pocket Compendium's version and build commit
- **AND** the footer shows "Done" without "Reset this page"

### Requirement: The page links the project

The page SHALL link the Ancient Kingdoms Compendium website, Pocket Compendium's source on GitHub, the game's Discord and Pocket Compendium's Ko-fi page, at the addresses the website uses where it links the same places. Each link SHALL open in the browser.

#### Scenario: Following the Ko-fi link

- **WHEN** the player clicks the Ko-fi link
- **THEN** the browser opens the Ko-fi page the website's footer links

### Requirement: The page holds the feedback actions

The page SHALL offer the report action and the idea action, each at all times, including while a feature is stopped after an error.

#### Scenario: A stopped feature

- **WHEN** Map pins stopped after an error and the player opens the page
- **THEN** the report action is available
