---
title: "Mercenary Mechanics Page Plan"
type: plan
status: abandoned
created: 2026-05-13
parent:
superseded_by:
archived: 2026-06-25
---

# Mercenary Mechanics Page Plan

## Approval status

- [x] Planning-only constraint recorded after user correction.
- [x] Confirmed no `/mechanics/mercenaries` implementation file exists after the aborted attempt.
- [x] Diary created and updated at `docs/superpowers/plans/2026-05-13-mercenary-mechanics-page-diary.md`.
- [x] Source verification complete for the mechanics planned below.
- [ ] User approval received to start implementation.
- [ ] Mechanics page implemented.
- [ ] Existing compendium pages connected.
- [ ] Validation complete.

No implementation should begin until the user approves this plan.

## Summary

Add a source-backed `/mechanics/mercenaries` reference page and connect it to the existing compendium surfaces where users encounter mercenaries: mechanics index, mercenary pet detail pages, pet overview, map/recruiter navigation, and related combat references.

The new page is the canonical deep reference for mercenary generation and scaling. Individual mercenary pet pages stay focused on the specific mercenary: class, skills, recruiter list, short mechanics summary, and a link to the full formulas.

## Constraints

- Use existing mechanics page conventions: `Seo`, breadcrumb, `h1`, compact section nav, `Card.Root`, responsive tables.
- Use Svelte 5 patterns and strict TypeScript.
- Visible page copy must not expose source file names, method names, database fields, or internal identifiers.
- Hardcoded mechanics must have source comments in implementation.
- Do not add a separate "Misconceptions" section. State facts directly in the relevant sections.
- No JS-only explanation. Static HTML tables and links must carry the core information.
- Prefer precise tables and small worked examples over decorative charting.
- Avoid a single "mercenary score" or quality abstraction; the mechanics have independent rolls and role-specific tradeoffs.

## Verified mechanics facts

### Hire flow and persistence

Verified behavior:

- Hiring selects the requested mercenary prefab by class.
- A character generator chooses race/cosmetics from class and zone inputs.
- Three independent combat-relevant generated values are rolled and saved with the mercenary:
  - HP multiplier
  - resource multiplier
  - base combat value
- Saved values are reused when the mercenary is recalled/reloaded.
- Equipment and inventory are persisted separately from the generated mercenary row.

Implementation source-comment anchors:

- Hire roll and spawn path: `server-scripts/Player.cs:7683-7791`
- Save RPC and saved fields: `server-scripts/Player.cs:3725-3742`, `server-scripts/Player.cs:7842-7844`
- Stored mercenary fields: `server-scripts/Database.cs:118-147`, `server-scripts/Database.cs:663-685`
- Recall/reload path: `server-scripts/Player.cs:7859-7931`

### Race pools and recruitment zone

Class race pools:

| Mercenary class | Possible races |
| --- | --- |
| Warrior | Human, Elf, Dark Elf, Dwarf, Fire Goblin, Felarii |
| Cleric | Human, Elf, Dark Elf, Dwarf, Fire Goblin |
| Rogue | Human, Dark Elf, Dwarf, Fire Goblin, Felarii |
| Wizard | Human, Elf, Dark Elf, Fire Goblin, Felarii |
| Druid | Human, Elf, Fire Goblin, Felarii |
| Ranger | Human, Elf, Dark Elf, Dwarf, Fire Goblin, Felarii |

Zone-constrained race choices:

| Zone id | Race preference |
| ---: | --- |
| 1 | Elf |
| 3 | Dwarf |
| 4 | Human |
| 5 | Dark Elf or Fire Goblin |
| 22 | Felarii |

Rule:

- If at least one zone-preferred race is valid for the selected mercenary class, the race is selected uniformly from that filtered list.
- If none are valid, the race is selected uniformly from the full class race pool.
- Zone changes race availability; it does not directly apply a separate stat quality bonus.

Implementation source-comment anchors:

- `server-scripts/Utils.cs:553-588`

### Race roll bands

Rolls are generated from the selected race:

| Race | HP multiplier | Warrior/Rogue resource roll | Mana-user resource roll | Base combat factor |
| --- | ---: | ---: | ---: | ---: |
| Human | 0.95 to <1.00 | 0.95 to <1.00 | 0.95 to <1.00 | 0.90 |
| Elf | 0.90 to <0.95 | 0.90 to <0.95 | 1.00 to <1.05 | 0.70 |
| Dwarf | 1.00 to <1.05 | 1.00 to <1.05 | 0.90 to <0.95 | 0.70 |
| Dark Elf | 0.90 to <0.95 | 0.90 to <0.95 | 1.00 to <1.05 | 0.90 |
| Fire Goblin | 0.95 to <1.00 | 1.00 to <1.05 | 0.90 to <0.95 | 0.90 |
| Felarii | 0.90 to <0.95 | 1.00 to <1.05 | 0.90 to <0.95 | 0.95 |

Base combat roll:

```text
baseCombat = random integer from 0 through round(ownerLevel × factor) - 1
```

Notes:

- The plan will describe float ranges as half-open ranges where appropriate, because the script uses `Random.Range(float, float)` for multipliers. The exact practical UI text can use “0.95–1.00” with a footnote that the upper endpoint is not rolled exactly.
- The integer base combat roll is max-exclusive.
- The three generated values are rolled independently; there is no shared budget.

Implementation source-comment anchors:

- `server-scripts/Player.cs:7704-7736`

### Class attribute scaling

Attributes are deterministic by mercenary class and owner regular level. At level `L`, each listed divisor contributes `floor(L / divisor)` points.

| Class | STR | CON | DEX | INT | WIS | CHA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Warrior | floor(L/3) | floor(L/2) | floor(L/4) | floor(L/5) | floor(L/6) | floor(L/6) |
| Ranger | floor(L/4) | floor(L/3) | floor(L/2) | floor(L/6) | floor(L/5) | floor(L/6) |
| Cleric | floor(L/5) | floor(L/4) | floor(L/6) | floor(L/3) | floor(L/2) | floor(L/6) |
| Rogue | floor(L/3) | floor(L/4) | floor(L/2) | floor(L/5) | floor(L/6) | floor(L/6) |
| Wizard | floor(L/6) | floor(L/5) | floor(L/3) | floor(L/2) | floor(L/4) | floor(L/6) |
| Druid | floor(L/6) | floor(L/5) | floor(L/4) | floor(L/3) | floor(L/2) | floor(L/6) |

Implementation source-comment anchors:

- `server-scripts/Player.cs:6487-6671`

### Base mercenary HP data

Use exported pet data for per-class base HP values rather than duplicating them manually when possible.

Verified exported base HP formulas:

| Class | Base HP before multiplier/attributes |
| --- | ---: |
| Warrior | `110 × level` |
| Ranger | `80 × level` |
| Cleric | `80 × level` |
| Rogue | `60 × level` |
| Druid | `55 × level` |
| Wizard | `50 × level` |

Implementation source-comment/data anchors:

- `exported-data/pets.json:245-563`

### Final stat formulas and attribute effects

HP:

```text
baseHp = classHpPerLevel × level
rolledLayerHp = round(baseHp × effectiveHpMultiplier)
maxHp = rolledLayerHp + flatHealthBonuses + round(percentHealthBonuses × (rolledLayerHp + flatHealthBonuses))
```

where:

```text
effectiveHpMultiplier = storedHpRoll + veteranPoints × 0.0025
```

and CON contributes `CON × 25` as a flat health bonus.

Mana users:

```text
baseManaLayer = round(baseMana(level) × effectiveManaMultiplier)
maxMana = baseManaLayer + flatManaBonuses + round(percentManaBonuses × (baseManaLayer + flatManaBonuses))
effectiveManaMultiplier = storedResourceRoll + veteranPoints × 0.0025
```

Warrior/Rogue resource nuance:

- The hire/reload code assigns the stored resource roll and veteran resource bonus to the Energy component for Warrior/Rogue mercenaries.
- The inspected Energy `max` formula does not use that multiplier; it returns base energy plus energy bonuses.
- Therefore the page should not claim the rolled resource multiplier increases visible Warrior/Rogue max Rage unless another source is found later. Recommended visible wording: “Warrior/Rogue resource rolls are generated and saved, but current max Rage calculation appears to come from base Rage plus bonuses rather than the multiplier.” This is a factual mechanics note, not a warning/misconception section.

Damage:

```text
baseDamage = storedBaseCombat
baseMagicDamage = storedBaseCombat
physical damage includes STR × 1
magic damage includes round(INT × 1.5)
```

Other attribute effects worth listing:

| Attribute | Relevant effects |
| --- | --- |
| STR | +1 physical damage, +10 energy bonus |
| CON | +25 HP, poison resist, block chance |
| DEX | accuracy, critical chance, ranged/poison formulas where relevant |
| INT | +20 mana, +1.5 magic damage rounded |
| WIS | healing and buff scaling |
| CHA | merchant discounts/sell prices for players; mercenary-facing buff helpers exist in code but should only be included if tied to visible mercenary behavior |

Implementation source-comment anchors:

- HP formula: `server-scripts/Health.cs:28-40`
- Mana formula: `server-scripts/Mana.cs:28-40`
- Energy formula: `server-scripts/Energy.cs:27-38`
- Damage formulas: `server-scripts/Combat.cs:84-143`
- Attribute effects: `server-scripts/Strength.cs`, `Constitution.cs`, `Dexterity.cs`, `Intelligence.cs`, `Wisdom.cs`, `uMMORPG.Scripts.PlayerAttributes/Charisma.cs`

### Veteran and skill scaling

Verified behavior:

- On spawn/reload, HP and caster mana multipliers add `veteranPoints × 0.0025`.
- On veteran level-up while mercenaries are active, mercenaries gain:
  - +0.01 HP multiplier
  - +0.01 resource multiplier assigned to mana/energy depending on class
  - +1 base damage
  - +1 base magic damage
- Mercenary skill level is:

```text
min(skill max level, floor(regular level / 5) + floor(veteran points / 10))
```

Implementation source-comment anchors:

- Spawn/reload veteran multiplier: `server-scripts/Player.cs:7777-7790`, `server-scripts/Player.cs:7918-7931`
- Veteran level-up and skill level formula: `server-scripts/Player.cs:3545-3588`

### Equipment and inventory layering

Verified behavior:

- Equipment bonuses add to STR, CON, DEX, CHA, INT, and WIS.
- Augment bonuses also add to those attributes when present.
- On reload, saved equipment is reattached and equipment attributes are applied.
- Mercenaries with equipment cannot be deleted until gear is removed.

Implementation source-comment anchors:

- Equipment callback: `server-scripts/MercenaryEquipment.cs:113-183`
- Reload equipment application: `server-scripts/Player.cs:7932-7963`
- Equipment persistence: `server-scripts/Database.cs:1304-1338`
- Delete restriction: `server-scripts/UIMercenaries.cs:430-480`

### Hiring, roster limits, cost, and death

Verified behavior:

- Stored mercenary cap: 6.
- Active mercenary cap by level:

| Player regular level | Active mercenary cap |
| ---: | ---: |
| 10–19 | 1 |
| 20–29 | 2 |
| 30–49 | 3 |
| 50+ | 4 |

- Active cap is also limited by party size: active mercenary capacity is reduced so total party members do not exceed 5.
- Hire cost formula before merchant price modifiers:

```text
clampedLevel = clamp(playerLevel, 10, 50)
levelProgress = (clampedLevel - 10) / 40
baseCost = round(50 + 450 × levelProgress² + veteranPoints × 10)
```

- The UI applies the normal purchase price calculation on top of that base cost.
- Resurrection uses the same calculated purchase price per mercenary.
- Dead mercenaries stay in the stored roster until resurrected or deleted.

Implementation source-comment anchors:

- Active/stored caps and hire cost: `server-scripts/UIMercenaries.cs:127-163`, `server-scripts/UIMercenaries.cs:212-222`
- Active cap/party limit on recall: `server-scripts/Player.cs:7859-7876`
- Resurrection cost: `server-scripts/UIMercenaries.cs:396-418`, `server-scripts/UIMercenaries.cs:594-612`
- Death persistence/resurrection state: `server-scripts/Player.cs:11868-11985`

### Stance and combat behavior

Verified behavior:

- Mercenaries have aggressive/defensive stance.
- Aggressive stance lets mercenaries acquire/attack targets; defensive stance clears hostile target when switched off.
- Players can command mercenaries to attack current targets.
- Warrior mercenaries have a special death-prevention interaction at owner level 50+, if enough resource is available and the cooldown has expired.

Implementation source-comment anchors:

- Stance field and command: `server-scripts/Pet.cs:35-36`, `server-scripts/Pet.cs:2188-3217`
- Player target handoff: `server-scripts/Player.cs:3109-3124`
- Attack command/tutorial text: `server-scripts/UIMercenaries.cs:175-179`, `server-scripts/Pet.cs:2360-2363`
- Warrior death prevention: `server-scripts/Combat.cs:864-884`

### Map/recruiter URL behavior

Verified behavior:

- Map URL state supports `layers=` with layer IDs.
- Mercenary recruiter layer key is `npcMercenaryRecruiters`.
- A stable link can point to `/map?layers=tiles,npcMercenaryRecruiters` if implementation chooses to include map navigation.

Implementation source-comment anchors:

- Map layer key/defaults: `website/src/lib/map/url-state.ts:53-102`
- URL layer parsing: `website/src/lib/map/url-state.ts:127-159`, `website/src/lib/map/url-state.ts:201-258`

## Page contract

The `/mechanics/mercenaries` page must answer:

- What determines a mercenary's final stats?
- Which parts are deterministic?
- Which parts are rolled randomly?
- Which parts can players influence?
- What recruitment zone changes.
- What race changes.
- How class and level affect attributes.
- How veteran points and equipment layer onto generated stats.
- How to compare two mercenaries of the same class without inventing a single score.
- Which related pages provide per-mercenary stats, skills, maps, and combat details.

## Information architecture

### 1. Overview

Purpose: give the mental model immediately.

Content:

- Compact pipeline:

```text
Class + owner level -> zone-filtered race pool -> random race -> independent rolls -> veteran bonuses -> equipment
```

- State directly that there is no shared stat budget.
- State that two same-class mercenaries at the same level can differ because race and multiple generated values are independent.
- Mention that the page is about generation/scaling; skill-specific effects remain on pet/skill/combat pages.

UI:

- One `Card.Root` with a short paragraph and responsive pipeline chips.
- Quick facts grid: stored cap, active cap, independent rolls, zone affects race pool.

### 2. Hiring & Roster Limits

Purpose: answer ownership questions before formulas.

Content:

- Active cap by level table.
- Stored cap.
- Party size interaction.
- Hire/resurrection cost formula.
- Death behavior.
- Link to recruiter locations via map and/or mercenary pet pages.

UI:

- `Card.Root` with a table and compact formula block.

### 3. Controlled vs Rolled

Purpose: separate player decisions from random outcomes.

Content table:

| Player controls/influences | Rolled/generated |
| --- | --- |
| Mercenary class | Race from current pool |
| Recruitment zone | HP multiplier |
| Owner level and veteran progression | Resource multiplier |
| Equipment and augments | Base combat value |
| Keep/recall/delete decisions | Cosmetics/name/gender details |

UI:

- Two-column card or responsive table.

### 4. Race Selection

Purpose: explain recruitment-zone effects.

Content:

- Class race pool table.
- Zone preference table.
- Fallback rule.
- Plain statement: zone filters race choices; it is not a direct hidden stat-quality bonus.

UI:

- Responsive tables with compact race chips.

### 5. Race Stat Bands

Purpose: show race tradeoffs.

Content:

- Race band matrix.
- Base combat roll formula.
- Note that the saved HP/resource/base combat values persist with the mercenary.
- Note the Warrior/Rogue resource multiplier nuance separately in the resource/formula section, not hidden here.

UI:

- Matrix table.
- Optional subtle color for high/medium/low bands, without presenting a single “best” race.

### 6. Class Attribute Scaling

Purpose: expose deterministic class identity.

Content:

- Formula table by class/attribute.
- Checkpoint table at levels 10/20/30/40/50 generated from formulas.
- Attribute contribution summary.

UI:

- Main table.
- If too large, use `<details>` for checkpoint rows per class while keeping formula table always visible.

### 7. Final Stat Formulas

Purpose: connect generated values to visible stats.

Content:

- HP formula.
- Mana formula for caster mercenaries.
- Warrior/Rogue resource nuance.
- Damage/magic damage formulas.
- Attribute effect table.
- Skill level formula.
- Layering order:
  1. template/base class stats
  2. owner level class attributes
  3. generated race roll values
  4. veteran bonuses
  5. gear/augments
  6. skills/buffs/combat rules

UI:

- Formula blocks using compact monospace styling.
- Layering table.

### 8. Class Roles & Per-Mercenary Links

Purpose: connect the deep mechanics page back to entity pages.

Content:

- One row per mercenary class:
  - pet link
  - resource type
  - primary deterministic attributes
  - broad role from skills
  - notable special rules, e.g. Warrior death prevention
- Link to Combat Mechanics for damage, mitigation, healing, buffs, debuffs, haste, crit, and block.

UI:

- Class comparison table.
- Related card linking to `/mechanics/combat`.

### 9. Worked Examples

Purpose: make independent rolls and scaling understandable.

Examples to include:

1. Same class, same level, different race rolls.
2. Level 50 base combat range comparison: Dwarf/Elf factor 0.70 vs Felarii factor 0.95.
3. HP calculation for one class using a sample multiplier and CON.
4. Zone selection example: zone 5 gives Dark Elf/Fire Goblin where valid; otherwise fallback.

UI:

- 2–4 compact example cards.
- Keep examples static and source-backed.

### 10. Related Pages

Purpose: make the compendium graph coherent.

Content:

- Mercenary pet pages: exact class, skills, recruiter list.
- Map: mercenary recruiter locations.
- Combat Mechanics: combat and skill formula details.
- Class pages: player class context where relevant.

UI:

- Small related-links card.

## Holistic integration plan

### Mechanics index

Planned change:

- Add a Mercenaries card to `/mechanics`.
- Use an appropriate icon such as Users.
- Description: recruitment, race pools, random rolls, scaling, and roster limits.

### Mercenary pet detail pages

Current observed state:

- Mercenary pet detail pages already include a Mechanics section with resource, level bonuses, skill levels, veteran bonuses, active limit, stored limit, stance, equipment, recruit cost, Warrior death prevention, and death behavior.

Planned change:

- Add a prominent link at the top of the mercenary Mechanics card:

```text
For race pools, generated stat rolls, and full scaling formulas, see Mercenary Mechanics.
```

- Keep per-pet facts concise.
- Do not expand pet pages with race-roll tables.
- Consider tightening any existing pet-page resource wording so it does not overstate the Warrior/Rogue resource multiplier effect.

### Pet overview page

Current observed state:

- The pet overview includes Mercenary/Familiar/Companion kind filtering and a recruiter summary.

Planned change:

- Add a small contextual line near the page header or table:

```text
Mercenary stat rolls and roster rules are explained in Mercenary Mechanics.
```

- Avoid adding the same mechanics link to every row.

### Combat mechanics page

Planned change:

- Add a small cross-link where mercenary-specific formulas are already mentioned, or in a related reference block if one exists.
- Do not duplicate mercenary generation formulas there.

### Skill detail pages

Current observed state:

- Skill detail page server data resolves mercenary/pet users, but no visible used-by section was found in the inspected page component.

Planned change:

- Do not expand scope by adding a new used-by section just for this task.
- If future work adds visible mercenary-user sections, link those contexts to Mercenary Mechanics where useful.

### Recruiter/map/NPC navigation

Planned change:

- Link from Mercenary Mechanics to `/map?layers=tiles,npcMercenaryRecruiters` for recruiter locations.
- Keep recruiter NPC/zone details on mercenary pet pages unless a compact mechanics-page recruiter table is judged necessary during implementation.
- Do not duplicate a large recruiter table in multiple places.

### SEO and metadata

Planned change:

- Add `Seo` metadata for `/mechanics/mercenaries`.
- No hidden SEO-only text.

## Data strategy

Use the least duplicated source that remains maintainable:

| Data | Strategy |
| --- | --- |
| Race pools | hardcoded constants with source comments |
| Zone preferences | hardcoded constants with source comments |
| Race roll bands | hardcoded constants with source comments |
| Active/stored caps | hardcoded constants with source comments |
| Class attribute schedule | hardcoded constants/functions with source comments |
| Base mercenary HP | use exported pet data if available in page load; otherwise hardcode from exported data with comments |
| Mercenary skill/pet links | use existing pet pages/data |
| Recruiter map link | static map URL with documented layer key |
| Worked examples | derived from constants/functions, not hand-written magic values where practical |

No new exporter/schema work is planned unless implementation shows the page would otherwise duplicate too much data.

## Implementation tasks after approval

### Task group 1: Source-backed constants and helper functions

- [ ] Add mercenary mechanics constants/functions in the page or a colocated module.
- [ ] Add source comments for every hardcoded game value.
- [ ] Generate checkpoint rows and example numbers from formulas.
- [ ] Represent half-open roll ranges accurately in code and readable copy.

### Task group 2: New mechanics route

- [ ] Add `/mechanics/mercenaries/+page.svelte`.
- [ ] Add `/mechanics/mercenaries/+page.server.ts` only if using DB/exported data for mercenary base stats or recruiter data.
- [ ] Build section nav and cards.
- [ ] Add all planned tables and examples.
- [ ] Add related-links section.

### Task group 3: Existing page integration

- [ ] Add Mercenaries card to `/mechanics` index.
- [ ] Add canonical mechanics link to mercenary pet detail Mechanics card.
- [ ] Add lightweight pet overview link.
- [ ] Add Combat Mechanics cross-link only if it improves navigation without duplication.

### Task group 4: Review and validation

- [ ] Run website Svelte/TypeScript check.
- [ ] Run website lint.
- [ ] Run website production build.
- [ ] Manually inspect or browser-check:
  - mechanics index
  - mercenary mechanics page
  - one mercenary pet detail page
  - pet overview page
  - combat mechanics page if changed

## UX acceptance criteria

- [ ] Page is scannable on desktop and mobile.
- [ ] Top section answers the mental model without formulas.
- [ ] Deep formulas are available lower on the page.
- [ ] Tables are responsive and readable.
- [ ] No section is named or framed as "Misconceptions".
- [ ] No visible page copy references source files, methods, database fields, or internal flags.
- [ ] Links connect mercenary pet pages to the mechanics page.
- [ ] Links connect the mechanics page back to pet, map/recruiter, and combat detail surfaces.
- [ ] Page remains useful without JavaScript.
- [ ] Warrior/Rogue resource roll nuance is handled accurately and plainly.

## Planned commits after approval

1. `feat(website): add mercenary mechanics reference`
   - Add source-backed constants and `/mechanics/mercenaries`.
   - Include formulas, race pools, roll bands, class scaling, limits, examples, and related links.

2. `feat(website): connect mercenary pages to mechanics reference`
   - Add mechanics index card.
   - Link mercenary pet detail pages to the mechanics page.
   - Add low-clutter pet overview / combat cross-links if warranted.

3. `test(website): verify mercenary mechanics integration`
   - Run website validation.
   - Fix check/lint/build issues.
   - Manually inspect affected routes.
