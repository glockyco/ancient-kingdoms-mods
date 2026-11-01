# Observations

Observed on 2026-11-01 in game 0.10.2.0, Steam build 26359493, in a single player world on the scratch database. The character stood next to each boss until it had aggro, and the boss's health was then set to zero so it died at once. The corpse's inventory was cleared before each kill, so every corpse read is that kill's own roll.

## A boss's corpse holds an equipment piece

Xylevis, killed 8 times with aggro: every corpse held at least one equipment piece, 6 times one and twice two, such as Amulet of the False King, Shiny Ring and Raw Silk Headband. A kill without aggro left an empty corpse.

## A Fatecharm gives two pieces and is used up

Captain Aerendyl in the Forgotten Catacombs, killed 3 times with one Catacombs Fatecharm in the main inventory: each corpse held two equipment pieces, such as Captain's Band and Iron Buckler, and each kill used up the charm. Killed once more without a charm, the corpse held one piece.

## Opening a corpse records its drops as found

Xylevis, a drop not found yet: taking Amulet of the False King from a corpse with the game's take command left the record unchanged. Opening the next corpse added its Raw Silk Headband to the record at once, as `Monster.CmdLootMonster` does for every item a boss or elite corpse holds (`Monster.cs:4645-4662`). The page then showed the gold check on Raw Silk Headband only.
