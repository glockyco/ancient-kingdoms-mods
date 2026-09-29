## Why

The site published an auto-attack DPS simulator at `/tools/combat-simulator`. It had no tests, no target model, and no randomness, and the verified combat engine models far more. On 2026-09-29 the owner chose a clean cut: remove the page now rather than keep it until a replacement exists.

## What Changes

- **BREAKING** `/tools/combat-simulator` is no longer published and has no redirect.
- The page leaves search, the sitemap, and every internal link.
- Skill pages keep the shared formula evaluator.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-calculators`: State that the site publishes no auto-attack simulator until an engine-backed calculator replaces it.

## Impact

Commit 9d7b55c5 removed the route, `website/src/lib/utils/combat-sim.ts`, the search document and synonym, the sitemap entry, and the link on `/mechanics/combat`.
