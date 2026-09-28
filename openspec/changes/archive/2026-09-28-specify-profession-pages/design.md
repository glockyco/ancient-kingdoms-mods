## Context

Mining, Radiant Seeker, and Slayer share `ProfessionHeader` and `MasteryCurve`. Their current page content and interactive calculators are defined by the three route components. The remaining route migrations belong to `complete-profession-page-system`.

## Goals / Non-Goals

**Goal:** Record only behavior available on the three migrated routes.

**Non-goal:** Declare the full Slayer target inventory available without JavaScript, or require changes to any route.

## Decisions

### Keep the shipped presentation scope narrow

`ProfessionHeader` shows profession identity, the introductory payoff, a conditional achievement link, and section links when four sections exist. `MasteryCurve` draws the initial curve, floor, current position, and applicable no-gain regions. The Mining, Radiant Seeker, and Slayer routes supply their current mechanics and outcomes. This specification does not require the other profession routes to use these components.

### Distinguish interactive navigation from static completeness

Slayer's target table supports hydrated search and filters. Its static HTML currently contains only the first 20 targets, although the data query yields 143. `complete-profession-page-system` owns the full static inventory and the remaining page migrations. This documentation change does not claim that the static table is complete.
