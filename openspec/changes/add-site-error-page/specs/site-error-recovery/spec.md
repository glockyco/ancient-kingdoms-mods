## Purpose

Give visitors a useful recovery path after a missing document or a server error without hiding the original HTTP failure.

## ADDED Requirements

### Requirement: Missing documents offer navigation

An unknown document URL SHALL return HTTP 404 and display a site-branded error page. The page SHALL explain that the page was not found, link to the home page and main indexes, and provide access to the existing global search when JavaScript is available.

#### Scenario: Visitor opens a removed item URL

- **WHEN** a visitor opens an unknown item URL directly
- **THEN** the response status is 404 and the page offers search, home, items, monsters, zones, and map navigation

#### Scenario: Static asset lookup misses a document

- **WHEN** the static-asset layer has no HTML document for a requested path
- **THEN** the response remains a 404 document with the same recovery navigation

#### Scenario: JavaScript is unavailable

- **WHEN** a visitor reads the 404 response with JavaScript disabled
- **THEN** the explanation and direct navigation links remain usable
- **AND** there is no search control that cannot work

### Requirement: Server failures do not masquerade as missing pages

A Worker-rendered server failure SHALL retain its error status and use the site's error page. The message SHALL distinguish server failure from a missing page and SHALL not disclose internal error details.

#### Scenario: Worker page load fails

- **WHEN** the server cannot render a requested page
- **THEN** the response is a server error, not a 404
- **AND** the page offers the same recovery navigation without exposing a stack trace
