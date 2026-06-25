---
title: "Inventory Mechanics Page Implementation Plan"
type: plan
status: implemented
created: 2026-05-07
parent:
superseded_by:
archived: 2026-06-25
---

# Inventory Mechanics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/mechanics/inventory`, a sourced user-facing reference for carry inventory, backpacks, stack movement, banks, house chests, loot, and inventory-adjacent equipment/death rules.

**Architecture:** Build a SvelteKit mechanics page matching existing `/mechanics/combat` and `/mechanics/experience` patterns. Mechanics constants come from current `server-scripts/` and every hardcoded value must have an invisible source comment. The bag-source list is DB-backed at prerender time via `+page.server.ts`, using normalized item source data. Per user instruction, do not add an inventory-page-specific test file.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript, Tailwind 4.

---

## Current Analysis

### Existing mechanics page conventions

- Mechanics pages live at `website/src/routes/mechanics/<topic>/+page.svelte` with optional `+page.server.ts`; inventory now needs server loading for data-driven backpack obtainability.
- Skeleton to mirror: `Seo`, `Breadcrumb`, `Card` imports, `<div class="container mx-auto p-8 space-y-8 max-w-4xl">`, in-page anchor nav, and `Card.Root` sections.
- Breadcrumb shape: `Home` link, non-linked `Mechanics`, topic label.
- SEO shape: `<Seo title="Inventory Mechanics - Ancient Kingdoms" description="..." path="/mechanics/inventory" />`.
- Hardcoded values require invisible source comments in Svelte markup (`<!-- Source: server-scripts/File.cs:line — reason -->`). Source identifiers must not appear in visible page prose.
- Existing sitemap omits `/mechanics/combat` and `/mechanics/experience`; inventory should also be omitted unless all mechanics pages are added together later.
- Existing mechanics snapshots only cover skill detail `#mechanics` blocks, not `/mechanics/*` pages.

### Inventory mechanics from current server scripts

- Carry inventory uses 24 base slots and a raw 156-slot backing list. Backpack header slots are 124-132; extension storage starts at slot 24 and skips header slots.
- Backpack capacity is the sum of equipped backpack slot grants, clamped to 121 extra storage slots; usable carry storage is 24 base slots plus unlocked extension storage, while 9 header slots are for equipped backpacks.
- Backpack header slots only accept backpacks. Duplicate equipped backpacks, downgrades/removals that would strand items, moving equipped backpacks into bank/chest, and moving backpacks into extension storage are blocked.
- Stack limits come from each item’s max stack. Adds prefer topping off existing stacks, then open usable slots. Shift-drag splits half into an empty target; same-item merges respect max stack.
- Mutations are only allowed while the player is idle, moving, or casting for inventory, bank, and chest operations.
- Bank storage has 300 slots, displayed as 10 tabs of 30. Players start with 1 tab. New tabs unlock sequentially using the current-tab price ladder: 1,000; 5,000; 10,000; 25,000; 50,000; 75,000; 100,000; 250,000; 500,000; then 1,000,000 gold.
- Bank gold is separate account-level storage; deposit/withdraw moves gold between carried gold and the bank vault.
- House chest has 240 slots partitioned into 8 fixed 30-slot sections: Wooden Chest, Red Chest, Blue Chest, Stone Chest, Granite Chest, Sturdy Chest, Rustic Chest, Guardian Box.
- Hardcore players cannot pull non-tradable items out of the house chest.
- Equipment has 16 slots in fixed order. Equipment starts with 10 durability, death reduces durability on each equipped item by 1, and broken equipment remains equipped but stops contributing while durability is 0.
- Loot pickup requires being within 2.4 units and an allowed state. Gold goes directly to carried gold and is split among nearby party members; keys go to key storage; quest-only gather items can satisfy quests without entering inventory.
- Loot containers last 120 seconds; player corpses last 900 seconds for self XP recovery and are not general loot bags.

### Backpack source data

- Backpack items are `items.item_type = 'backpack'`; slot capacity is `items.backpack_slots`, exported from `BackpackItem.numSlots`.
- Current DB contains 14 backpacks, ranging from 4 to 14 backpack slots.
- Existing obtainability source display patterns use `SOURCE_TYPE_CONFIG` and links by source type. Class item tables use compact source summaries with `+N more`; item pages use full per-item source data.
- The bag list should live under the existing Backpacks section, show each backpack, its slot count, and compact obtainability sources. Rows with many drops should cap visible names and link to the item detail page for the full list.


---

## Tasks

### Task 1: Source inventory mechanics

**Files:**
- Inspect: `website/src/routes/mechanics/combat/+page.svelte`
- Inspect: `website/src/routes/mechanics/experience/+page.svelte`
- Inspect: `server-scripts/PlayerInventory.cs`
- Inspect: `server-scripts/PlayerBank.cs`
- Inspect: `server-scripts/PlayerChest.cs`
- Inspect: `server-scripts/PlayerLooting.cs`
- Inspect: `server-scripts/PlayerDead.cs`
- Inspect: `server-scripts/EquipmentItem.cs`
- Inspect: `server-scripts/Player.cs`

- [x] Analyze existing mechanics page structure and conventions.
- [x] Analyze inventory, backpack, bank, chest, loot, equipment, and death mechanics in current `server-scripts/`.
- [x] Record sourced mechanics in this plan.

### Task 2: Implement static inventory mechanics page

**Files:**
- Create: `website/src/routes/mechanics/inventory/+page.svelte`

- [x] Add imports for `Breadcrumb`, `Card`, and `Seo`.
- [x] Add SEO metadata for `/mechanics/inventory`.
- [x] Add breadcrumb and anchor nav matching existing mechanics pages.
- [x] Add Card sections:
  - Carry Inventory
  - Backpacks
  - Item Movement & Stacks
  - Bank
  - House Chests
  - Loot Pickup
  - Equipment & Death
- [x] Keep visible prose player-facing; no file names, code identifiers, or internal command names in rendered text.
- [x] Add invisible source comments adjacent to every hardcoded number/value.

### Task 3: Verify and review

**Files:**
- Inspect: `website/src/routes/mechanics/inventory/+page.svelte`

- [x] Confirm no inventory page test file or package test-script change remains.
- [x] Run `pnpm check` in `website/`; observed 0 errors and 0 warnings.
- [x] Run `pnpm lint` in `website/`; observed exit 0.
- [x] Run `pnpm build` in `website/`; observed successful build including `/mechanics/inventory`.
- [x] Request final code review with a reviewer subagent.
- [x] Address Critical/Important review findings: added bank tab layout source comment and removed obsolete test guidance from this plan.
- [x] Re-run changed verification commands after fixes: `pnpm check`, `pnpm lint`, and `pnpm build` all passed.

### Task 4: Add backpack obtainability list

**Files:**
- Create: `website/src/routes/mechanics/inventory/+page.server.ts`
- Modify: `website/src/routes/mechanics/inventory/+page.svelte`

- [x] Analyze existing obtainability display patterns on class and item pages.
- [x] Locate backpack item and source data in `website/static/compendium.db`.
- [x] Add a prerendered server load for all backpacks and compact source summaries.
- [x] Render a “Where to get bags” list under the Backpacks card.
- [x] Keep source identifiers out of visible text and avoid adding tests for this page.
- [x] Re-run `pnpm check`, `pnpm lint`, and `pnpm build`; all passed after the bag list addition.
- [x] Request reviewer subagent for the bag-source addition; no Critical or Important findings.

---

## Non-goals

- Do not add a `/mechanics` index route.
- Do not add mechanics pages to the sitemap unless updating all mechanics routes together.
- Do not add inventory cross-links to item/chest/entity detail pages in this change.
- Do not create or use a git worktree.
- Do not commit this plan file.
