## Purpose

Records the shipped website contract for shared entity identity, navigable links, search participation, artwork metadata, and sitemap routes without owning map marker behavior.

## ADDED Requirements

### Requirement: Entity identity and presentation metadata have one website source

Each entity family SHALL have a unique identity in the website manifest. The typed registry SHALL read labels, display order, overview link, detail-link behavior, searchability, artwork domain and kind, and source table from that entry. It SHALL assign the family's icon within the typed registry.

#### Scenario: A declared entity family is used

- **WHEN** a consumer resolves an entity family from the registry
- **THEN** its identity and declared presentation metadata come from that family's manifest entry
- **AND** its icon comes from the typed registry's icon mapping

#### Scenario: A known entity is linked

- **WHEN** an entity has a normal detail route
- **THEN** its detail link includes an encoded entity ID
- **AND** map-only families link to their map overview instead

### Requirement: Search and sitemap participants follow entity declarations

Searchable entity families SHALL be selected from the registry's searchable declarations in display order. Sitemap-enabled families with source tables SHALL yield the corresponding entity routes. A family whose sitemap declaration is false SHALL not yield a detail-route collection from the registry.

#### Scenario: A searchable family is declared

- **WHEN** a family is marked searchable
- **THEN** it participates in the ordered searchable family list

#### Scenario: A family has no sitemap detail route

- **WHEN** the family is marked as excluded from detail sitemap generation
- **THEN** the registry does not generate a detail-route collection for it
