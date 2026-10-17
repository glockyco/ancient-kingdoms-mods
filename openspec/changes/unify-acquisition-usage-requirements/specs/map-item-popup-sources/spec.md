## Purpose

Let readers inspect every supported source of a selected map item, including item containers and virtual distribution methods, without confusing those methods with physical map locations or inventory awards.

## ADDED Requirements

### Requirement: Pack sources expose their actual yield

The item popup SHALL show each supported pack source with its name, selected-item quantity and method context, and allow inspection of that pack. It SHALL distinguish using a carried pack from a purchase or recipe that delivers its contents immediately.

#### Scenario: An item comes from a pack

- **WHEN** the selected item occurs in one or more available pack methods
- **THEN** the popup shows every relevant pack and its item quantity
- **AND** selecting a pack opens its item selection

#### Scenario: No pack source

- **WHEN** the selected item has no supported pack methods
- **THEN** the popup does not show an empty pack-source section

### Requirement: Random and portable-container sources retain their event

The popup SHALL show supported random/distribution and portable-chest sources with names and correctly qualified result probabilities. It SHALL use the same method and rule results as item detail pages. A virtual pool SHALL NOT be described as a carryable container merely because it has an item-like definition.

#### Scenario: Portable chest source

- **WHEN** the selected item has a portable-chest source
- **THEN** its probability describes the item outcome per stated opening event
- **AND** duplicate input rows do not create misleading duplicate source percentages

#### Scenario: Distribution source

- **WHEN** a parent award resolves a virtual pool containing the selected item
- **THEN** the popup identifies the pool and parent context without inventing an inventory-opening action
- **AND** the pool remains inspectable through its existing selection identity

#### Scenario: No random source

- **WHEN** the selected item has no applicable random or portable-container source
- **THEN** the popup does not show an empty section for that family

### Requirement: Known virtual sources do not promise a location

The popup SHALL retain known nonspatial sources even when they are the item's only methods. A virtual container, merge, fragment conversion or other nonspatial method alone SHALL NOT enable a physical-source focus action. Available geometry SHALL come from eligible direct provider context.

#### Scenario: Container-only item

- **WHEN** an item has a container source but no qualifying physical source of its own
- **THEN** the popup shows the container source and its inspection link
- **AND** it does not offer physical focus solely because the container exists

#### Scenario: Known source in a position-suppressed zone

- **WHEN** the method remains published but its provider geometry is suppressed
- **THEN** its non-geometric source information remains available
- **AND** no coordinates or misleading focus action are reconstructed

### Requirement: Source inspection preserves map navigation

Selecting a source SHALL inspect its existing entity or virtual-item selection without changing unrelated search, marker or camera contracts. Source rows, quantities, requirements and locations SHALL come from the shared acquisition reader rather than another map-only interpretation.

#### Scenario: Inspect a source container

- **WHEN** a reader selects a container source
- **THEN** its own selection and supported sources are inspectable
- **AND** any focus action uses that selection's real geometry, not a fabricated location for the previous virtual method

#### Scenario: Offered pack has no carried-pack output

- **WHEN** a selected pack definition is offered by a real provider but its purchase directly delivers the contents
- **THEN** the selection retains that offer, provider and actual yield
- **AND** it does not require a fictional carried-pack source before the offer can be inspected

#### Scenario: Source link uses a navigation modifier

- **WHEN** a reader modifier-clicks a source link
- **THEN** its existing URL navigation remains available
- **AND** ordinary selection still opens the source within the map

#### Scenario: Same method on page and map

- **WHEN** an item detail page and map popup show the same source under the same assumptions
- **THEN** quantity, requirement, probability meaning and provider identity agree

### Requirement: Source lists remain usable within the popup

Long method lists SHALL retain the established bounded scrolling and mobile-drawer behavior without hiding source inspection or trapping keyboard navigation. Presentation limits SHALL retain access to the omitted methods rather than truncate the authoritative result.

#### Scenario: Many source methods

- **WHEN** a selected item has more methods than fit in the visible popup or drawer
- **THEN** readers can reach the remaining methods and source links with pointer, touch and keyboard
- **AND** source-list scrolling does not disable the existing popup close and navigation controls

