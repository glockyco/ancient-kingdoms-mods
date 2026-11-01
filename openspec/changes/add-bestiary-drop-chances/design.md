# Design

## Context

- A monster's table is `Monster.dropChances`, entries of an item and a probability (`Monster.cs:120`, `ItemDropChance.cs`). One roll per kill fills one corpse that everyone with loot rights shares.
- A boss rolls every entry, then tops up equipment by weighted picks until it has one piece, or two when a Fatecharm was used (`Monster.cs:3059-3124`). The kill uses up the zone's Fatecharm from the main inventory, the first 24 slots, of the player with the most aggro, or else of the first party member within 40 yd who has one, even when it cannot change the outcome (`Monster.cs:3062-3098`, `PlayerInventory.cs:40`). Elites and other monsters roll every entry on its own, with no guarantee and no Fatecharm (`Monster.cs:3126-3177`).
- Each dungeon zone has its own Fatecharm in `GameManager.luckTokensDict`, which every client builds at start (`GameManager.cs:668-685`).
- The website computes chances per kill with `calculateBossLootChance` for bosses (`website/src/lib/calculation/boss-loot.ts`) and an independent-roll formula for the rest (`website/src/lib/acquisition/rules.ts`). Its baseline assumes no Fatecharm, no Hunting bonus and no quest need. For Xylevis, Amulet of the False King is 30% in the table and 49.2% per kill.
- The website shows the chance without a Fatecharm and gives the chance with it, naming the Fatecharm, on hover (`DropChance.svelte`). Its monster pages add a "With Fatecharm" column.
- The game keeps each character's found drops per monster and loads them at login into `UIJournal.listBossesLootDiscovered` (`Player.cs:1680`, `Database.cs:3527-3534`). Its Bestiary shows a drop not found yet as a black silhouette without a tooltip (`UIBestiaryDetail.cs:153-163`). Pocket Compendium draws every drop in full colour with its tooltip, so the record no longer shows (`BestiaryLootRenderer.cs:216-229`).

## Goals / Non-Goals

**Goals:**

- The chance a player can expect from one kill, equal to the website's.
- A Fatecharm's value visible where a player decides whether to bring one.
- Which drops a player still needs, without hiding drops they have not found.

**Non-Goals:**

- Chances that depend on who gets the kill, such as a party member's Fatecharm or quest.
- Tables that the host changes at run time for event and invasion spawns, which a client cannot see.
- A drop log or luck measure, which a later change adds.

## Decisions

### Port the website's calculation and hold it equal with a corpus

The boss calculation and the independent-roll formula are ported to C# as pure code. A script beside the skill effect corpus generates a case for every drop of every Bestiary monster from the website's code, and a C# test computes each case and compares. The pattern exists for skill summaries and has caught drift before.

Alternative: compute the chances on the website and ship them with the mod. The mod would then show the export's tables, while it should show the tables of the game build it runs in.

### Read the inputs from the game, check them against the export

The mod builds the calculation's inputs from the monster's own table: whether an item counts as equipment (an `EquipmentItem` of quality above 0 that is no augment, `Monster.cs:4321-4328`), repeated entries, random items and quest flags. A HotRepl run compares these inputs with the export for every monster with a drop table before the feature ships, so a difference in reading the game shows as a list.

### The chance on the slot, details in the tooltip

The chance per kill without a Fatecharm sits on each drop's slot. A drop the zone's Fatecharm raises carries the Fatecharm's icon, and its tooltip adds both chances, the Fatecharm's name and that the kill uses it up. This keeps the website's order, the baseline first and the Fatecharm on demand, and lets a player compare drops at a glance.

Alternatives, compared on screenshots before anything ships: the chance only in the tooltip, which hides the comparison between drops, and a page-wide Fatecharm switch, which is easy to leave on and misread.

The look of the chance, its rounding, the Fatecharm mark, the tooltip lines and whether the player's own Hunting bonus shows are chosen through comparisons (compare-options). References: the website's own drop tables, the Old School RuneScape wiki's drop tables and the Terraria wiki's drop boxes. Pages with 13 to 17 drops shrink their slots, so the screenshots include the smallest slot a real table produces.

### One slot per item while chances show

A chance of at least one copy belongs to the item, so an item listed several times shows once, where its first entry stands, and its tooltip says how many copies one kill can give. Six Bestiary pages have such an item. With chances off, the page lists every entry as the game does.

### Forgotten Altar variants

The page already adds an altar elite's Magic, Epic and Legendary rewards, which replace its normal reward by the activator's level and veteran points (`DefaultEvent.cs:229-243`). Each variant shows the entry's chance with its condition, in the wording the website uses (`formatAltarRequirement`).

### Found drops get a mark

A drop in the game's record for this character carries a mark, and the rest stay as they are. The mark's look is chosen with the chance's.

### Observed before it ships

The rules the page relies on are observed in a scratch session: a boss's corpse always holds an equipment piece, a dungeon boss killed with a Fatecharm in the main inventory gives two pieces and uses the charm, and looting a drop not found yet adds it to the record and the mark.

## Risks / Trade-offs

- [A client of another server sees its own build's tables] → The chances describe the game build the player runs. A server with changed tables is out of reach for any client.
- [Chance labels covering item art on small slots] → The comparison shows the smallest slot. A label that cannot stay readable moves into the tooltip for those pages.
- [The corpus and the game drift after an update] → The update procedure regenerates the corpus and repeats the HotRepl comparison.
