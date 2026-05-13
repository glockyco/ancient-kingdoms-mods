# Scroll Mastery UX Rewrite Plan

**Goal:** Make scroll crafting and scroll-use scaling understandable from a player perspective, with special attention to Scroll of Dispel Magic / Dispel confusion.

**Primary player questions to answer:**

1. What does Scroll Mastery do when I craft scrolls?
2. What does Scroll Mastery do when I use scrolls?
3. Which scrolls scale with mastery, and how?
4. Why does Scroll of Dispel Magic benefit from mastery if Dispel already has cooldown scaling?
5. Where do I find scribing tables, recipes, XP rules, and detailed combat formulas?

**Core wording decision:** Do **not** call the Dispel mechanic “success chance” or “monster buff removal bonus.” Use player-facing language that exposes the baseline:

> Monster buffs can have **Dispel Resist**. Scroll of Dispel Magic reduces that resist by 1 percentage point per Dispel rank.

**Mechanic split to preserve everywhere:**

```text
Landing Dispel is a combat check.
Removing each buff after it lands is a Dispel Resist check.
Scroll Mastery helps the second check.
```

---

## Verified / grounded mechanics

### Scroll-cast skill rank

For scroll-triggered multi-rank skills:

```text
scroll skill rank = clamp(round(Scroll Mastery% / 5), 1, skill.max_level)
```

Implications:

- 0% mastery still casts rank 1.
- Rank increases roughly every 5% Scroll Mastery.
- Rank 20 is reached around 98%+ mastery for max-rank-20 scroll skills.
- Single-rank scroll skills, such as Resurrection, do not visibly scale with Scroll Mastery.

### Scroll Mastery gain

Crafting a scroll or using a scroll can raise Scroll Mastery while mastery is below 100%.

Current page source comments already cite:

```text
Mathf.Lerp(0.9, 0.02, scrollMasteryLevel^2) > Random.value
```

Gain amount:

```text
Random.Range(5, 10) / 10000f = +0.05% to +0.09%
```

### Scribing success

Current scribing recipes are all tier 0, so current craft success is always 100%.

The formula still exists and can remain represented, but it should not dominate the page.

### Dispel scroll special case

The Dispel page currently has the relevant formula:

```text
removed if Random.value > probIgnoreCleanse - bonus

bonus (single-target spell):   accuracy * 0.5
bonus (single-target scroll):  clamp(round(Mastery% / 5), 1, 20) * 0.01
bonus (area dispel):           0
```

Player-facing translation:

```text
If Dispel lands, each active monster buff checks its own Dispel Resist.
Scroll of Dispel Magic reduces that Dispel Resist by 1 percentage point per Dispel rank.
```

Example final chance against common Dispel Resist values:

```text
Final per-buff chance = clamp(
  100% - Dispel Resist + Dispel Resist Reduction,
  0%,
  100%
)
```

| Buff Dispel Resist | Rank 1 scroll | Rank 10 scroll | Rank 20 scroll |
| ---: | ---: | ---: | ---: |
| 10% | 91% | 100% | 100% |
| 50% | 51% | 60% | 70% |
| 75% | 26% | 35% | 45% |
| 100% | 1% | 10% | 20% |

Do not show player/pet dispel behavior in scroll-specific UI. Scrolls are player-vs-monster context; player/pet wording is only relevant on the general combat mechanics page.

### Resistance caveat

Do not conflate elemental/stat resist with Dispel Resist.

Player-facing split:

```text
Landing Dispel is governed by normal combat/debuff resistance rules.
After Dispel lands, each monster buff checks its own Dispel Resist.
Scroll Mastery reduces that second check's resist value.
```

Link to:

- `/mechanics/combat#resistance` for combat resist rolls.
- `/mechanics/combat#dispel` for buff removal / Dispel Resist behavior.

---

## Affected surfaces

### Must update

1. `/professions/scroll_mastery`
2. `/skills/dispel`, with shared skill-page changes kept correct for all Dispel variants
3. Multi-rank scroll-triggered skill pages, via shared skill-page logic
4. Scroll item pages, especially `Scroll of Dispel Magic`
5. `/mechanics/combat#dispel`
6. Tests / snapshot-like source assertions for the above where practical

### Should update if already touching adjacent code

1. Scroll item meta descriptions
2. Skill page “Granted by Items” wording when the source is a scroll
3. Skill page scroll detection: use `grantedByItems.some(type === "scroll")`, not `skill.is_scroll`

### Do not do in this pass

- Do not invent a generic scroll “success chance.”
- Do not imply Scroll Mastery affects elemental/stat resistance.
- Do not show noisy player/pet dispel details on scroll-specific pages.
- Do not add unrelated scroll abstractions or broad data model rewrites unless required by the UI.

---

## Page sketches

### `/professions/scroll_mastery`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home / Professions / Scroll Mastery                    │
├────────────────────────────────────────────────────────────────────┤
│ [Scroll icon] Scroll Mastery                                       │
│ Craft scrolls, improve scroll-cast skill rank, and understand      │
│ special scroll effects like Scroll of Dispel Magic.                │
│                                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│ │ 10           │ │ 14           │ │ 5            │ │ 100%       │ │
│ │ Craftable    │ │ Scroll-cast  │ │ Scribing     │ │ Max level  │ │
│ │ recipes      │ │ effects      │ │ tables       │ │            │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ How It Works                                                       │
├────────────────────────────────────────────────────────────────────┤
│ 1  Find a Scribing Table                                           │
│    Craftable scroll recipes are made at Scribing Tables.           │
│    [View table locations ↓]                                        │
│                                                                    │
│ 2  Craft scrolls                                                   │
│    Current scribing recipes are tier 0, so crafting success is     │
│    always 100%. Crafting grants Player Level × 100 XP.             │
│    [Scribing XP → /mechanics/experience#scribing-xp]               │
│                                                                    │
│ 3  Gain Scroll Mastery                                             │
│    Crafting a scroll or using a scroll can raise Scroll Mastery.   │
│    Chance to gain decreases as mastery approaches 100%.            │
│                                                                    │
│ 4  Use scrolls                                                     │
│    Multi-rank scroll skills use:                                   │
│      rank = clamp(round(Scroll Mastery% ÷ 5), 1, max rank)        │
│                                                                    │
│ 5  Special case: Scroll of Dispel Magic                            │
│    If Dispel lands, each monster buff checks its own Dispel Resist.│
│    Scroll Mastery reduces that resist by 1 percentage point per    │
│    Dispel rank.                                                    │
│    [Dispel skill →] [Combat Dispel mechanics →]                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Scroll Mastery Calculator                                          │
├────────────────────────────────────────────────────────────────────┤
│ Scroll Mastery  [────────────●────────────] 50%                    │
│                                                                    │
│ ┌────────────────────────┐ ┌────────────────────────┐             │
│ │ Multi-rank scroll rank │ │ Mastery gain chance    │             │
│ │ 10                     │ │ 68% attempt chance     │             │
│ └────────────────────────┘ └────────────────────────┘             │
│ ┌────────────────────────┐ ┌────────────────────────┐             │
│ │ Dispel Resist Reduction│ │ Gain amount            │             │
│ │ 10 percentage points   │ │ +0.05% – +0.09%        │             │
│ └────────────────────────┘ └────────────────────────┘             │
│                                                                    │
│ Example at selected mastery:                                       │
│   Buff with 50% Dispel Resist → 60% chance to remove per buff      │
│                                                                    │
│ Note: This is not a generic scroll success chance. It only applies │
│ to Scroll of Dispel Magic after Dispel lands.                      │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Craftable Scrolls                                                  │
├────────────────────────────────────────────────────────────────────┤
│ Filter: [All] [Scales with mastery] [Dispel] [Damage] [Buff]       │
│                                                                    │
│ Scroll                 Casts              Rank @ 50%   Key scaling │
│ ────────────────────────────────────────────────────────────────── │
│ Scroll of Dispel      Dispel             10 / 20      Cooldown;   │
│ Magic                 [skill →]                       Dispel      │
│                                                        Resist -10pp│
│                                                                    │
│ Fire Nova Scroll      Fire Nova          10 / 20      Damage      │
│ Runed Scroll of       Lightning Bolt     10 / 20      Damage      │
│ Lightning                                                          │
│ Runed Scroll of       Major Restoration  10 / 20      Healing     │
│ Restoration                                                        │
│ Scroll of             Resurrection       Fixed rank 1 No mastery   │
│ Resurrection                                           scaling     │
│                                                                    │
│ [expand row] Ingredients / How to obtain materials                 │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Scribing Table Locations                                           │
├────────────────────────────────────────────────────────────────────┤
│ Zone                 Sub-zone                  Map                 │
│ ────────────────────────────────────────────────────────────────── │
│ ...                  ...                       [Map]               │
└────────────────────────────────────────────────────────────────────┘
```

Implementation notes:

- Preserve current ingredient expansion behavior.
- Add cast skill data to the loader for each recipe.
- Add scroll effect count / recipe count / table count stats.
- Keep crafting success visible but secondary.
- Link XP column and How It Works step to `/mechanics/experience#scribing-xp`.
- Link Dispel-specific explanation to `/skills/dispel` and `/mechanics/combat#dispel`.

---

### `/skills/dispel`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Dispel                                                             │
│ [Spell] [Scroll-cast] [Dungeon allowed]                            │
│ Max Level 20                                                       │
└────────────────────────────────────────────────────────────────────┘

Page links:
Description | Cost & Timing | Level Scaling | Mechanics | Cast by Scrolls

┌────────────────────────────────────────────────────────────────────┐
│ Level Scaling                                                      │
├────────────────────────────────────────────────────────────────────┤
│ Skill Level | Scroll Mastery Needed | Cooldown | Dispel Resist     │
│             |                       |          | Reduction          │
│ ────────────────────────────────────────────────────────────────── │
│ 1           | 0%+                   | ...      | 1 pp               │
│ 2           | ~8%                   | ...      | 2 pp               │
│ 3           | ~13%                  | ...      | 3 pp               │
│ ...                                                                  │
│ 20          | ~98%                  | ...      | 20 pp              │
│                                                                    │
│ Scroll of Dispel Magic uses Scroll Mastery to choose the Dispel    │
│ rank above. If Dispel lands, each active monster buff checks its   │
│ own Dispel Resist; the value shown reduces that resist.            │
│                                                                    │
│ Example: against a buff with 50% Dispel Resist, rank 1 has a 51%   │
│ chance to remove it; rank 20 has a 70% chance.                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Mechanics                                                          │
├────────────────────────────────────────────────────────────────────┤
│ Dispel                                                             │
│                                                                    │
│ Landing Dispel is a combat check.                                  │
│ [Combat resistance rules → /mechanics/combat#resistance]           │
│                                                                    │
│ After Dispel lands, each active monster buff checks Dispel Resist: │
│                                                                    │
│ remove chance = clamp(100% - buff Dispel Resist + resist reduction,│
│                         0%, 100%)                                  │
│ Single-target spell:  resist reduction = accuracy × 50 pp          │
│ Single-target scroll: resist reduction = Dispel rank × 1 pp        │
│ Area dispel:          no resist reduction                          │
│                                                                    │
│ [Full combat Dispel mechanics → /mechanics/combat#dispel]          │
│ [Scroll Mastery → /professions/scroll_mastery]                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Cast by Scrolls                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Scroll of Dispel Magic                                             │
│ Uses Scroll Mastery for Dispel rank. Higher rank reduces monster   │
│ buffs' Dispel Resist by 1 percentage point per rank.               │
└────────────────────────────────────────────────────────────────────┘
```

Implementation notes:

- Add a scaling-table column only when the skill is both scroll-triggered and `is_dispel`.
- Column label: `Dispel Resist Reduction`.
- Values: `1 pp` through `max_level pp`.
- Add `Scroll Mastery Needed` only for scroll-triggered multi-rank skills.
- Use `grantedByItems.some((item) => item.type === "scroll")` for scroll-triggered detection.
- Do not rely on `skill.is_scroll` for page behavior.

---

### Other multi-rank scroll-triggered skill pages

Example: `/skills/fire_nova`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Fire Nova                                                          │
│ [Spell] [Scroll-cast]                                              │
│ Max Level 20                                                       │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Level Scaling                                                      │
├────────────────────────────────────────────────────────────────────┤
│ Skill Level | Scroll Mastery Needed | Damage                       │
│ ────────────────────────────────────────────────────────────────── │
│ 1           | 0%+                   | ...                          │
│ 2           | ~8%                   | ...                          │
│ ...                                                                  │
│ 20          | ~98%                  | ...                          │
│                                                                    │
│ Fire Nova Scroll uses Scroll Mastery to choose the skill rank      │
│ shown here.                                                        │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Cast by Scrolls                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Fire Nova Scroll                                                   │
│ Multi-rank scroll skill; rank scales with Scroll Mastery.          │
└────────────────────────────────────────────────────────────────────┘
```

Implementation notes:

- Add `Scroll Mastery Needed` to the level scaling table for all multi-rank scroll-triggered skills.
- Keep existing effect columns unchanged.
- Add a short scroll note below the table.

---

### Single-rank scroll-triggered skill pages

Example: `/skills/resurrection`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Resurrection                                                       │
│ [Spell]                                                            │
│ Max Level 1                                                        │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Cast by Scrolls                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Scroll of Resurrection                                             │
│ Fixed-rank scroll effect. Scroll Mastery does not change this      │
│ skill because Resurrection has only one rank.                      │
└────────────────────────────────────────────────────────────────────┘
```

Implementation notes:

- Avoid a full Scroll Mastery card for single-rank skills.
- The source section should still make clear that the skill is cast by a scroll.

---

### Scroll item pages

#### `Scroll of Dispel Magic`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Scroll of Dispel Magic                                             │
│ [Scroll] [Consumable]                                              │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Use Effects                                                        │
├────────────────────────────────────────────────────────────────────┤
│ Casts                  Dispel [skill →]                            │
│ Consumed on Use         Yes                                        │
│ Recharge Time           30s                                        │
│ Scroll Mastery          Sets Dispel rank. Higher rank reduces      │
│                         monster buffs' Dispel Resist by 1 pp per   │
│                         rank, up to 20 pp.                         │
│                                                                    │
│                         Example: against 50% Dispel Resist, rank 1 │
│                         has 51% chance per buff; rank 20 has 70%.  │
│                                                                    │
│                         [Scroll Mastery →] [Dispel scaling →]      │
│                         [Combat Dispel mechanics →]                │
└────────────────────────────────────────────────────────────────────┘
```

#### Other multi-rank scroll items

Example: `Fire Nova Scroll`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Fire Nova Scroll                                                   │
│ [Scroll] [Consumable]                                              │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Use Effects                                                        │
├────────────────────────────────────────────────────────────────────┤
│ Casts                  Fire Nova [skill →]                         │
│ Consumed on Use         Yes                                        │
│ Recharge Time           30s                                        │
│ Scroll Mastery          Sets Fire Nova rank for damage scaling.    │
│                         [Scroll Mastery →] [Fire Nova scaling →]   │
└────────────────────────────────────────────────────────────────────┘
```

#### Single-rank scroll items

Example: `Scroll of Resurrection`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Scroll of Resurrection                                             │
│ [Scroll] [Consumable]                                              │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Use Effects                                                        │
├────────────────────────────────────────────────────────────────────┤
│ Casts                  Resurrection [skill →]                      │
│ Consumed on Use         Yes                                        │
│ Recharge Time           60s                                        │
│ Scroll Mastery          Resurrection has one rank, so Scroll       │
│                         Mastery does not change this effect.       │
│                         Using the scroll can still raise Scroll    │
│                         Mastery. [Scroll Mastery →]                │
└────────────────────────────────────────────────────────────────────┘
```

Implementation notes:

- Add scroll-specific use-effect text only for `item_type = 'scroll'` and `scroll_skill_id IS NOT NULL`.
- Use skill metadata from the item page server load if needed: max level, `is_dispel`, current scaling indicators.
- Keep the card concise; link out for details.

---

### `/mechanics/combat#dispel`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Dispel                                                             │
├────────────────────────────────────────────────────────────────────┤
│ Dispel has two separate parts:                                     │
│                                                                    │
│ 1. The skill must land.                                            │
│    This follows normal combat resistance rules where applicable.   │
│    [Resistance rules → #resistance]                                │
│                                                                    │
│ 2. If Dispel lands on a monster, each active buff checks its own    │
│    Dispel Resist.                                                  │
│                                                                    │
│ remove chance = 100% - buff Dispel Resist + resist reduction       │
│                                                                    │
│ Source                    Resist reduction                         │
│ ────────────────────────────────────────────────────────────────── │
│ Single-target spell       accuracy × 50 percentage points          │
│ Single-target scroll      scroll Dispel rank × 1 percentage point  │
│ Area dispel               none                                     │
│                                                                    │
│ Scroll Dispel rank comes from Scroll Mastery:                      │
│   clamp(round(Scroll Mastery% ÷ 5), 1, 20)                         │
│                                                                    │
│ [Dispel skill →] [Scroll Mastery →]                                │
└────────────────────────────────────────────────────────────────────┘
```

Implementation notes:

- Keep all-target behavior if the combat page wants comprehensive mechanics, but structure it after the two-part player model.
- Add links to `/skills/dispel` and `/professions/scroll_mastery`.
- Avoid wording that suggests elemental resist modifies the post-land buff removal check.

---

### `/mechanics/experience#scribing-xp`

No full rewrite needed. Add / preserve backlinks from Scroll Mastery.

Potential small improvement if not already clear:

```text
Scribing XP
Crafting scrolls grants Player Level × 100 XP.
[Scroll Mastery recipes → /professions/scroll_mastery#craftable-scrolls]
```

---

## Data / implementation plan

### 1. Expand Scroll Mastery profession loader

File:

- `website/src/routes/professions/scroll_mastery/+page.server.ts`

Add recipe fields:

- `scroll_skill_id`
- `scroll_skill_name`
- `scroll_skill_type`
- `scroll_skill_max_level`
- `scroll_skill_is_dispel`
- enough linear fields or precomputed summary to describe key scaling

Add page stats:

- craftable recipe count
- scroll-cast effect count
- scribing table count
- max level

Require all scroll-cast effects on the page, not only craftable recipes. Current data includes craftable scribing scrolls plus non-craftable scroll-cast items. Visually separate them:

- `Craftable Scrolls`
- `Other Scroll Effects`

Do not mix repair kits into scroll-cast effects.

### 2. Rewrite Scroll Mastery page layout

File:

- `website/src/routes/professions/scroll_mastery/+page.svelte`

Follow the Treasure Hunter / Adventuring pattern:

- hero card
- stat tiles
- How It Works
- calculator
- craftable scroll table
- other scroll effects table
- scribing table locations

Keep current useful pieces:

- ingredient expansion
- `ItemLink`
- `ObtainabilityTree`
- `MapLink`
- XP link to mechanics
- mastery gain formulas

Demote / reframe:

- scribing success formula, because current recipes are all 100% success

### 3. Fix skill page scroll detection and scaling table

Files:

- `website/src/routes/skills/[id]/+page.server.ts`
- `website/src/routes/skills/[id]/+page.svelte`
- `website/src/lib/types/skills.ts` if a typed helper field is added

Changes:

- Derive `isScrollTriggered` from `grantedByItems` where `type === 'scroll'`.
- Stop using `skill.is_scroll` for page-level scroll explanations.
- Add `Scroll Mastery Needed` column when `isScrollTriggered && skill.max_level > 1`.
- Add `Dispel Resist Reduction` column when `isScrollTriggered && skill.is_dispel && skill.max_level > 1`.
- Add a concise explanatory note below the level scaling table.
- Adjust “Granted by Items” copy for scroll sources. Prefer a source-grouped section:

```text
Cast by Scrolls
Granted by Relics
Weapon Proc Sources
Food / Potion Buffs
```

If grouping is too large for this pass, at least display scroll source type as `Cast by scroll` instead of raw `(scroll)`.

### 4. Update item page scroll use text

Files:

- `website/src/routes/items/[id]/+page.server.ts`
- `website/src/routes/items/[id]/+page.svelte`
- item type definitions if needed

Add skill metadata to item page load for scroll items:

- `scroll_skill_max_level`
- `scroll_skill_is_dispel`
- maybe `scroll_skill_has_scaling` / key summary if easy

Render in Use Effects:

- For multi-rank non-dispel scrolls: “Scroll Mastery sets [skill] rank for [damage/healing/effect] scaling.”
- For Dispel scroll: include Dispel Resist explanation and links.
- For single-rank scrolls: “This effect has one rank; Scroll Mastery does not change it. Using the scroll can still raise Scroll Mastery.”

### 5. Update combat mechanics Dispel section

File:

- `website/src/routes/mechanics/combat/+page.svelte`

Rewrite the Dispel block around the two-part model:

1. Skill landing / resistance.
2. Per-buff Dispel Resist after landing.

Add links:

- `/skills/dispel`
- `/professions/scroll_mastery`
- local `#resistance`

### 6. Meta descriptions / SEO copy

File:

- `website/src/lib/server/meta-description.ts`

Current scroll item wording says:

```text
Casts X. Spell rank scales with the Scroll Mastery profession.
```

This is misleading for single-rank scroll skills. Change to something like:

```text
Casts X. Multi-rank scroll effects scale with Scroll Mastery; using scrolls can raise Scroll Mastery.
```

Or, if item context includes skill max level:

- max level > 1: `Casts X. Rank scales with Scroll Mastery.`
- max level = 1: `Casts X. Using the scroll can raise Scroll Mastery.`

### 7. Tests / verification

Add or update focused tests rather than broad brittle snapshots.

Candidate tests:

1. Scroll Mastery page source/discoverability test
   - Asserts “Dispel Resist” appears.
   - Asserts links to `/mechanics/combat#dispel` and `/mechanics/experience#scribing-xp`.
   - Asserts text does not say generic “success chance” for scroll use.

2. Skill page source test
   - Asserts scroll detection uses `grantedByItems` / `type === "scroll"`, not only `skill.is_scroll`.
   - Asserts `Dispel Resist Reduction` column exists in source.

3. Item page source test
   - Asserts scroll use effects link to `/professions/scroll_mastery`.
   - Asserts Dispel item path has Dispel Resist wording.

Run focused website tests:

```bash
pnpm test -- --run <focused test file>
```

Then run typecheck for touched Svelte/TS if implementing:

```bash
pnpm run check
```

`pnpm run check` is whole-app `svelte-check`; keep it as implementation verification, not a substitute for focused behavior/source tests.

---

## Acceptance criteria

- `/professions/scroll_mastery` explains both crafting and scroll use.
- The page makes clear that current scribing craft success is always 100%, while Scroll Mastery still matters for scroll use and mastery progression.
- Scroll of Dispel Magic is explained in terms of Dispel Resist reduction, with a baseline example.
- `/skills/dispel` level scaling table includes the scroll-derived Dispel Resist Reduction column.
- Multi-rank scroll skill pages show Scroll Mastery rank mapping in level scaling.
- Single-rank scroll skill pages do not imply visible Scroll Mastery scaling.
- Scroll item pages link to Scroll Mastery and, for Dispel, combat Dispel mechanics.
- Combat mechanics distinguishes skill landing resistance from post-land Dispel Resist checks.
- Experience mechanics remains linked for scribing XP.
- No UI uses the misleading phrase “scroll success chance” for Dispel buff removal.
- Scroll-triggered detection is based on actual item linkage, not `skills.is_scroll` alone.
