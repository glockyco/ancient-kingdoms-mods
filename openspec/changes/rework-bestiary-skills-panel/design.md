# Design

## Context

- The panel lists `monster.skills.skillTemplates` in template order, slot 0 (the basic attack) included. Each row has a 36 px icon and fixed cells for name, summary, cooldown and cast time. `SkillEffectExtractor` supplies the monster's combat stats and rank-resolved input to `SkillEffectFormatter`, which prints a damage amount. The panel is a flat box 660 px wide, as tall as the Journal, with no scroll view (`SkillsPanel.cs`, `SkillsPanelRenderer.cs`).
- The formatter is a port of the website's `formatSkillEffect`, kept equal by a parity corpus covering both formula output and every monster skill with its caster's stats (`website/src/lib/skills/skillEffectParity.ts`, `SkillEffectFormatterTests.cs`). The website passes the monster's damage and magic damage at its level and prints one number (`website/src/routes/monsters/[id]/+page.svelte`, `formatSkillEffect.ts`).
- The in-fight skill cards leave out slot 0, passives and auras, and order the rest by cooldown, longest first (`SkillReader.cs`, `SkillOrdering.cs`).
- Bosses have up to 6 special skills, 3.0 on average, and elites up to 4, 1.1 on average. With the basic attack, a page has at most 7 skills, passives included (`compendium.db`, `monster_skills`).
- The game shows a cast bar for special skills whose cast takes more than 0.3 s, and only for the player's target (`.decompiled/steam-26302989-532b02784df9/Monster.cs:1085-1108`, called by `UICastBarMonster.cs:30`). Slot 0 never gets this bar. The threshold uses the unadjusted cast time, before haste and the non-spell half-cast display window. Of the attacks, only ground zones mark the ground before they hit, as far as the code shows (`AreaObjectSpawnSkill.cs:35-47`). A monster casts no special in the first 5 s of a fight (`Monster.cs:1497-1500`). In melee range its next special is due 6 to 12 s after each special's cast (`MonsterSkills.cs:31-37`, `:162-182`), but a target out of reach or just pulled in can draw the next special within about 1 s, and bosses and elites use only their basic attack for 12.5 s after stepping behind their target (`Monster.cs:1452-1475`, `:1880-1898`). `observations.md` records what the game showed for each of these.
- Players ask how much resistance a fight needs ([Steam](https://steamcommunity.com/app/2241380/discussions/1/569300839164031509/)), for cast bars on every monster ([Steam](https://steamcommunity.com/app/2241380/discussions/1/833872326144571439/)) and, on Discord, for a warning not to stand in danger. Grim Tools' cards for Grim Dawn enemy attacks, with the attack and its cadence on the left and its numbers on the right, are the reference closest to this panel.

## Goals / Non-Goals

**Goals:**

- A player who reads a monster's Skills panel knows which damage types to resist, what to stay out of and what lands without warning.
- Numbers a player can use, equal to the website's.
- A panel that looks like part of the game.

**Non-Goals:**

- Damage after the player's own armor and resistances. That is the resistance check, which follows this change.
- Cast bars over monsters in the world. That is a later change.
- Changes to the in-fight skill cards beyond sharing the order.

## Decisions

### A facing page in the game's frame

The panel keeps its place beside the Journal, at the Journal's height, and takes the frame of the game's own windows. The mod reads the frame's sprites from the Journal at run time, so the frame follows the game's art. Content that does not fit scrolls.

The player can drag the window by its frame like the game's own windows, and it remembers where it was put. It uses the game's `UIWindow`, which the Quest Log frame already carries and which stores the position in PlayerPrefs under the window's hierarchy path, so the window gets a fixed name before that path is read. As a child of the Journal it moves along when the Journal moves.

Alternatives: a tab inside the Bestiary page, which has no free space for seven cards, and the current flat box, which looks foreign to the game. The layout comparison settles the width with a narrower and a wider variant, on screenshots at 1280 and 1920 px.

### Open with the page

The panel opens with every page until the player closes it, and that choice persists in the Bestiary pages settings. The Skills button below the page keeps toggling it. Today the button is the only way in, and it is easy to miss.

### Summary, then special skills, then the rest

The questions a player brings to the Bestiary decide the order: which resistance to bring, then what each attack does, then the details. The summary has two lines. The first lists each damage type with the largest amount of it. The second, "Threats", under the heading "AT A GLANCE", names the threats without numbers: area and frontal attacks, summons, stuns, fears, knockbacks, debuffs no cleanse removes, heals below 75% health and enrage below 10%. It leaves out cast bars, which the review of 2026-11-01 found useless there. Special skills follow as cards in the in-fight cards' order. A card has the icon, the name, and the cast time and cooldown on its top line in the game's own form, "1s cast    10s cooldown", with no mark for a cast without a cast bar, then one sentence that says who gets hit and how. One line for the basic attack and one for each passive or aura close the panel. A monster without special skills says "No special skills." above its basic attack.

### Damage at the monster's level

The extractor already knows which stat a skill class adds for each damage type. It now also receives the monster's `combat.damage` and `combat.magicDamage`, which the Bestiary reads from the same object as its other stats, and the formatter prints the sum, multiplied by the damage percentage when that is above zero, as the website's `formatDamage` does. All 143 bosses and elites have a fixed level, so one number per skill is exact before mitigation. The parity corpus gains a case per monster skill with the monster's stats, generated by the website's script, so the two stay equal.

### Reach, shape and warning from the skill data

- Area attacks reach `castRange` yd around the monster.
- Frontal attacks hit a square of `castRange` yd in front of it.
- Ground zones give their random count plus the additional target zone, diameter and warning time (`AreaObjectSpawnSkill.cs:35-47,159`).
- Projectiles home in on the target, so moving does not dodge them.
- Target attacks give their range.
- A special skill whose cast takes 0.3 s or less gets no cast bar (`Monster.cs:1085-1108`). Basic attacks, passives and auras are not special skills.

### Hover details in the website's terms

The card's tooltip carries the full mechanics: the reach, the damage with the resist that lowers or avoids it, each effect's rules such as a fear blocking a stun, Armor Class for melee debuffs, cleanse rules with Cleanse Resist, durations and limits, and when the cast bar shows. It uses the terms of the website's skill mechanics cards (`website/src/lib/components/skill-mechanics/`), so a player meets one vocabulary on both. A summon is written with the game's word: the game tells its victim "You have been summoned!", and the website says "summons" too.

### Stated behaviour is observed first

Every behaviour the panel states beyond the skill data is observed in a scratch session before it ships: the 5 s before the first special, the gap between specials, the 0.3 s cast bar threshold, the summon's reach and stun, and the fear's duration. A claim that fails in game is corrected or left out.

### Choices players see go through comparisons

The layout, the summary's content and form, the card's structure and every label are chosen through comparisons (compare-options), with screenshots of real pages for Nyxarion, a boss with six specials and an elite without any. References: the World of Warcraft Adventure Guide's ability lists, Grim Tools' enemy cards, and large wikis' boss ability sections such as the Old School RuneScape wiki's.

## Risks / Trade-offs

- [The facing page covers the world on narrow screens] → The layout comparison includes 1280 px screenshots, and the player can close the panel.
- [The parity corpus grows by several hundred cases] → It is generated, and only cases that differ fail.
- [Game updates move the cast bar threshold or the special timing] → These facts are observed per game build, and the update procedure checks them again.
- [Translated names change line lengths, and Chinese and Japanese use the game's CJK font] → The comparisons include a screenshot with the game in Japanese.
