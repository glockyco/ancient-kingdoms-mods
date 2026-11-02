# Proposal

## Why

Game 0.10.2.3 gives each rank 5 virtue its own blessing timer, and the six blessing skills no longer share a buff category, so a rank 5 blessing stays alongside the blessing of another shrine instead of replacing it or being replaced. The shrine also skips its Honesty and Valor checks for a rank 5 virtue. The Virtues page requirement still says that one blessing is active at a time and that receiving another replaces the active one.

## What Changes

- The Virtues page's getting-started steps say in Rise in rank that a rank 5 blessing stays alongside the others, and Do its deeds no longer says that another blessing replaces the active one.
- The Honesty note's return rule and the Valor note's refusal apply below rank 5.
- The blessing requirement names the rank 5 exception.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `virtue-system`: blessings below rank 5 replace each other, and a rank 5 blessing stays alongside the others.

## Impact

- `website/src/routes/mechanics/virtues/+page.svelte` and `website/src/routes/mechanics/virtues/earn.ts`.
