## Why

Three profession routes already use a shared header, cited mechanics, and a mastery curve. The main specifications do not record this shipped behavior. Documenting it separates existing contracts from the remaining migration work.

## What Changes

- Specify the current shared profession header, jump-list threshold, mechanics record, and server-rendered curve.
- Specify the current Mining, Radiant Seeker, and Slayer page content without claiming that Slayer's static target list is complete.
- Verify each requirement against current implementation. This change edits documentation only.

## Capabilities

### New Capabilities

- `profession-pages`: Shipped shared presentation and the three migrated profession routes.

### Modified Capabilities

None.

## Impact

OpenSpec documentation only. Evidence comes from `website/src/lib/components/professions/`, `website/src/lib/data/professions/mechanics.ts`, and the Mining, Radiant Seeker, and Slayer routes. The incomplete Slayer no-JavaScript target list belongs to `complete-profession-page-system`.
