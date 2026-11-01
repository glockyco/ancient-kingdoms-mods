# Tasks

## 1. Facts and numbers

- [ ] 1.1 Observe in a scratch session the behaviours the panel will state: the 5 s before a monster's first special, the gap between specials, the 0.3 s cast bar threshold, Nyxarion's pull reach and stun and his fear's duration. Verify that each observation is recorded in the change folder with the build it ran on.
- [x] 1.2 Give the extractor the monster's damage and magic damage and make the formatter print the damage amount in a monster context. Verify with formatter tests for a physical, a magic, a percentage and a zero-damage skill.
- [x] 1.3 Extend `website/scripts/gen-skill-effect-parity.ts` with a case per monster skill carrying the monster's stats, regenerate the corpus and make the C# parity test read it. Verify with `pnpm --filter website gen:skill-effect-parity` and `dotnet test tests/PocketCompendium.Tests`.
- [x] 1.4 Derive each skill's shape, reach, ground zones, projectile homing and cast bar from the skill data, and the summary's damage types and threats from a monster's skills. Verify with tests on Nyxarion's, Xylevis's and Valaark's skill data.

## 2. Choices players see

- [x] 2.1 Choose the layout through a comparison (compare-options) with real screenshots. Decided on 2026-11-01: a window in the frame of the game's Quest Log beside the Journal, a summary of damage types and threats first, one card per special skill in the in-fight order, then the basic attack, over a table without a summary.
- [ ] 2.2 Choose the summary's content and form and the card's structure through a comparison on Nyxarion, a boss with six specials and an elite without specials. Verify that the answer is recorded.
- [ ] 2.3 Choose the labels and the hover text through a comparison, in the website's terms. Verify that the answer is recorded.

## 3. Panel

- [ ] 3.1 Build the window from the Journal's frame sprites, docked beside the page at its height, with a scroll view. Verify in game on a 1920 and a 1280 px window.
- [ ] 3.2 Build the summary, the cards, the one-line basic attack and passives, and the hover details as chosen. Verify in game for Nyxarion, Xylevis, Valaark, an elite without specials and with the game in Japanese.
- [ ] 3.3 Open the panel with the page, remember a close in the Bestiary pages settings and keep the Skills button as a toggle. Verify in game across two pages and a restart.
- [ ] 3.4 Order special skills with the in-fight cards' ordering. Verify in a fight with Nyxarion that both show his specials in the same order.

## 4. Documentation and records

- [ ] 4.1 Update the README's Bestiary section and its screenshot, worded through a comparison. Verify with `pnpm check:docs`.
- [ ] 4.2 Record each comparison's answer as a case in the vault's Ancient Kingdoms Compendium note. Verify that the note holds the cases.
