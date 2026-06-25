---
title: "Ko-fi Support CTA Design"
type: spec
status: implemented
created: 2026-06-12
parent:
superseded_by:
archived: 2026-06-25
---

# Ko-fi Support CTA Design

## Goal

Make Ko-fi support more visible without adding intrusive third-party overlay UI or blocking core browsing/map interactions.

## Decision

Use a native Svelte CTA instead of Ko-fi's injected widget scripts. The button links to the existing Ko-fi URL in a new tab and uses existing site components/constants.

## Copy

Primary desktop label: **Support the Compendium**.

Compact/mobile label: **Support**, with `aria-label="Support the Compendium on Ko-fi"`.

## Visual treatment

Use a subtle icon + text link with the existing Ko-fi icon. Keep the text in the site's muted navigation style and keep the icon white/inherited at the original utility size so the CTA is visible without dominating the hero.

## Placement

- Homepage: place the visible CTA in a leading top-left hero action slot, separate from Steam/Discord/theme controls on the top-right.
- Normal content pages: add the CTA to a breadcrumb/action row, right-aligned.
- Map desktop: place the CTA in the map sidebar/control surface, not over the map.
- Map mobile: place the CTA inside the map controls drawer, not as an additional floating button.

## Non-goals

- Do not load Ko-fi widget scripts globally.
- Do not rebuild Ko-fi's donation panel.
- Do not add another floating mobile map control.
