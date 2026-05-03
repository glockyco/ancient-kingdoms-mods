# Treasure Hunter Profession Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/professions/treasure_hunter` into an Adventuring-style mechanics page with a Treasure Hunter skill calculator, random-map acquisition context, treasure map/dig-site data, and a clear relic reward bonus explanation.

**Architecture:** Keep the visible feature scoped to the profession page, but first preserve Buried Treasure Chest reward roll order in the build pipeline so the calculator can model the game's 3-unique-reward selection behavior truthfully. The server loader will return section-shaped data: profession metadata, treasure map rows, Random Map source summaries, and Buried Treasure Chest reward rows. The Svelte page will own interactive calculator state and render skill-adjusted chest reward chances without modifying item pages yet.

**Tech Stack:** SvelteKit 2 static prerender, Svelte 5 runes, TypeScript, Tailwind 4, `better-sqlite3`, existing `ItemLink` and `MapLink` components.

---

## Source Context to Preserve

### User decisions

- Build the Treasure Hunter profession page first.
- Refine the profession page through discussion after the first implementation.
- Decide later whether to implement item page changes for Buried Treasure Chest and relic pages.
- Header stats should show the number of relic rewards instead of the number of chest maps.
- Add a map link for the `random_map` item so users can see all Random Map drop locations on the map.
- Achievement display should match Adventuring: show Max Level and Achievement in the final How It Works metadata row, not as a hero title badge.
- Do not run validation commands unless explicitly requested; user will do manual validation and wants review targets called out.

### Verified mechanics

- Regular treasure maps come from `Random Map`; `Random Map` selects one of 8 regular maps uniformly at 12.5% each.
- Red Scabbard Map is intentionally excluded from this profession page. It is a one-time quest artifact, not a repeatable source of Treasure Hunter progression, and it does not share the Buried Treasure Chest reward mechanics.
- A successful repeatable treasure dig consumes the matching treasure map and grants Buried Treasure Chest.
- Successful digs grant +0.5% Treasure Hunter until 100%.
- Buried Treasure Chest grants 3 unique rewards from its reward table.
- Treasure Hunter modifies only relic reward rolls from Buried Treasure Chest:

```text
relic roll chance = base roll chance + treasureHunterLevel * 0.1
```

At 100% Treasure Hunter, relic raw roll chances get +10 percentage points. Non-relic rewards, map drops, and Random Map outcome selection are unchanged.

### Source references

- `server-scripts/TreasureLocation.cs:87-90` — +0.5% skill gain per successful treasure.
- `server-scripts/ChestItem.cs:24-31` — chest reward rolling, unique item prevention, relic-only Treasure Hunter bonus.
- `server-scripts/ChestItem.cs:15-16` — free-slot requirement for chest opening.
- `server-scripts/uMMORPG.Scripts.ScriptableItems/TreasureMapItem.cs:8-15` — map reward/image fields and map use behavior.
- `server-scripts/Player.cs:7172-7189` — map clue display behavior.
- `server-scripts/TreasureLocation.cs:61-100,105-160` — required map, shovel check, dig flow, reward, map consumption.
- `server-scripts/Monster.cs:2242-2280,3265-3280` — monster drops and RandomItem expansion.
- `website/src/routes/professions/adventuring/+page.svelte` — target layout pattern: hero card, stat tiles, How It Works, section anchors, data-backed controls.
- `website/src/routes/professions/treasure_hunter/+page.server.ts` — current Treasure Hunter loader to replace/expand.
- `website/src/routes/professions/treasure_hunter/+page.svelte` — current Treasure Hunter page to rebuild.
- `website/src/lib/components/MapLink.svelte` — use `entityType="item"` for `random_map` and `entityType="treasure"` for dig sites.

---

## File Structure

### Modify: `build-pipeline/src/compendium/denormalizers/items/special_types.py`

Responsibilities:

- Preserve original chest reward roll order in each denormalized `chest_rewards` JSON entry before display sorting.
- Keep existing baseline probability simulation unchanged.
- Allow the Treasure Hunter page to re-simulate Buried Treasure Chest rewards at selected skill levels in the same reward order the game uses.

### Modify: `website/src/routes/professions/treasure_hunter/+page.server.ts`

Responsibilities:

- Query profession metadata.
- Query all treasure maps, including source summary, destination, sub-zone, map image key, reward item, and treasure location ID.
- Query Random Map source summary and highest-drop examples.
- Query Buried Treasure Chest reward rows with raw base probabilities, baseline simulated probabilities, reward type, quality, and whether the Treasure Hunter relic bonus applies.
- Return stat counts for hero tiles: map count, relic reward count, zone count, skill gain amount.

### Modify: `website/src/routes/professions/treasure_hunter/+page.svelte`

Responsibilities:

- Replace legacy header/tables with Adventuring-style hero, How It Works, calculator, acquisition summary, treasure map list, and Random Map source summary.
- Hold calculator state with Svelte 5 runes: `let skillLevel = $state(0)`.
- Use `MapLink entityId="random_map" entityType="item"` in the Random Map acquisition card.
- Use `MapLink entityId={map.treasure_location_id} entityType="treasure"` for dig locations.
- Label calculated values truthfully. Baseline chances remain baseline. Skill-adjusted values are calculator outputs for the selected skill.

### Defer: Item pages

Do not modify item pages in this first implementation. Keep these future changes captured for discussion after the profession page is visible:

- `website/src/routes/items/[id]/+page.svelte`: add Buried Treasure Chest baseline caveat and relic-source notes.
- `website/src/routes/items/[id]/+page.server.ts`: optionally add helper booleans for Treasure Hunter scaling notes.
- Item-page behavior should link to `/professions/treasure_hunter#calculator` rather than replacing static source rates.

---

## Data Contracts

### `TreasureMapRow`

```ts
interface TreasureMapRow {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  treasure_map_image_location: string | null;
  treasure_location_id: string;
  destination_zone_id: string;
  destination_zone_name: string;
  destination_sub_zone_name: string | null;
  position_x: number;
  position_y: number;
  reward_item_id: string;
  reward_item_name: string;
  reward_item_type: string | null;
  reward_item_tooltip: string | null;
}
```

### `ChestRewardRow`

```ts
interface ChestRewardRow {
  item_id: string;
  item_name: string;
  item_type: string | null;
  quality: number;
  tooltip_html: string | null;
  roll_order: number;
  base_roll_chance: number;
  baseline_open_chance: number;
  scales_with_treasure_hunter: boolean;
}
```

### `TreasureHunterStats`

```ts
interface TreasureHunterStats {
  map_count: number;
  relic_reward_count: number;
  zone_count: number;
  skill_gain_percent: number;
}
```

---

## Calculator Design

### First implementation

Implement a deterministic in-browser calculator that computes skill-adjusted **per-opening** chances from the full chest reward table for the selected skill, then displays only relic rewards. This preserves the full Buried Treasure Chest selection behavior while keeping the visible calculator focused on the rewards that Treasure Hunter actually changes.

Use the same game behavior observed in `ChestItem.Use`:

- Iterate reward rows in stored order.
- Each pass rolls each reward once unless already selected.
- Stop once 3 unique rewards are selected.
- Stop after 10 passes.
- Relic rows from Buried Treasure Chest use `base_roll_chance + skillFraction * 0.1`.
- Non-relic rows use `base_roll_chance`.
- The displayed table filters to relic rows only; non-relic rewards still participate in the simulation because they can occupy one of the 3 reward slots.

Because exact closed-form probability is unnecessary for a UI calculator, run a deterministic seeded simulation per selected skill. Use a fixed seed so the page is stable and repeatable. Use enough trials for display stability without freezing the page; start at `50_000` trials and keep the function isolated so the trial count can be tuned after verification.

### Calculator state and derived values

```ts
let skillLevel = $state(0);

const skillFraction = $derived(skillLevel / 100);
const relicRollBonus = $derived(skillFraction * 0.1);
const successfulDigsToCap = $derived(Math.ceil((100 - skillLevel) / 0.5));
```

Use slider attributes:

```svelte
<input
  id="treasure-hunter-skill-slider"
  type="range"
  min="0"
  max="100"
  step="0.5"
  bind:value={skillLevel}
/>
```

### Display labels

Use these labels to avoid ambiguity:

- `Baseline` = current DB `actual_drop_chance`, based on baseline chest reward simulation.
- `At selected skill` = calculator result for current slider value.
- `Change` = selected-skill chance minus baseline chance.
- `Relic chance bonus` = raw per-roll percentage-point bonus before the chest selects its 3 unique rewards.

Visible copy:

```text
The selected-skill chance is per opened Buried Treasure Chest. The chest grants 3 unique rewards, so the final chance is calculated from the full chest selection behavior rather than by adding the roll bonus directly to the baseline chance.
```

---

## Task 1: Preserve Chest Reward Roll Order

**Files:**

- Modify: `build-pipeline/src/compendium/denormalizers/items/special_types.py`
- Generated by verification: `website/static/compendium.db`

- [ ] **Step 1: Add `roll_order` to denormalized chest rewards**

In `_denormalize_chest_rewards`, change the reward loop to enumerate the original `chest_rewards` list before it is sorted for display.

Use this structure:

```python
for roll_order, reward in enumerate(chest_rewards):
    item_id = reward.get("item_id")
    probability = reward.get("probability", 0.0)

    if item_id:
        item_name_cursor = conn.cursor()
        item_result = item_name_cursor.execute(
            "SELECT name FROM items WHERE id = ?", (item_id,)
        ).fetchone()
        item_name = item_result[0] if item_result else "Unknown"

        updated_rewards.append(
            {
                "item_id": item_id,
                "item_name": item_name,
                "probability": probability,
                "roll_order": roll_order,
            }
        )
```

Keep the existing `actual_drop_chance` calculation and the final display sort. The important invariant is that every reward object retains its original `roll_order` after sorting.

- [ ] **Step 2: Rebuild the compendium database**

From `build-pipeline/`, run:

```bash
uv run compendium build
```

Expected: build succeeds and writes `website/static/compendium.db`.

- [ ] **Step 3: Verify roll order exists in the built DB**

Read/query `website/static/compendium.db` for `buried_treasure_chest.chest_rewards` and confirm every parsed reward object has numeric `roll_order`.

A quick SQL query for the raw JSON is enough:

```sql
SELECT chest_rewards FROM items WHERE id = 'buried_treasure_chest'
```

Expected: each reward object includes `"roll_order"`.

---

## Task 2: Expand Treasure Hunter Server Data

**Files:**

- Modify: `website/src/routes/professions/treasure_hunter/+page.server.ts`

- [ ] **Step 1: Replace narrow page interfaces with section-shaped interfaces**

Add the `TreasureMapRow`, `ChestRewardRow`, `TreasureHunterStats`, `KeyItem`, and updated `TreasureHunterPageData` interfaces from the Data Contracts section.

The resulting `TreasureHunterPageData` shape should be:

```ts
interface KeyItem {
  id: string;
  name: string;
  tooltip_html: string | null;
}

interface TreasureHunterPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  stats: TreasureHunterStats;
  treasureMaps: TreasureMapRow[];
  buriedChestRewards: ChestRewardRow[];
  keyItems: Record<"random_map" | "buried_treasure_chest" | "shovel", KeyItem>;
}
```

- [ ] **Step 2: Query treasure map rows with source labels**

Replace the current `rawMaps` query with a query that includes sub-zone, map image key, reward item type, and source classification.

Use this SQL structure:

```sql
SELECT
  i.id,
  i.name,
  i.quality,
  i.tooltip_html,
  i.treasure_map_image_location,
  tl.id as treasure_location_id,
  tl.zone_id,
  z.name as zone_name,
  zt.name as sub_zone_name,
  tl.position_x,
  tl.position_y,
  tl.reward_id,
  reward.name as reward_name,
  reward.item_type as reward_item_type,
  reward.tooltip_html as reward_tooltip
FROM items i
JOIN treasure_locations tl ON tl.required_map_id = i.id
JOIN zones z ON z.id = tl.zone_id
LEFT JOIN zone_triggers zt ON zt.id = tl.sub_zone_id
LEFT JOIN items reward ON reward.id = tl.reward_id
WHERE tl.reward_id = 'buried_treasure_chest'
ORDER BY i.quality DESC, i.name
```

Map each row to:

```ts
return {
  id: row.id,
  name: row.name,
  quality: row.quality,
  tooltip_html: row.tooltip_html,
  treasure_map_image_location: row.treasure_map_image_location,
  treasure_location_id: row.treasure_location_id,
  destination_zone_id: row.zone_id,
  destination_zone_name: row.zone_name,
  destination_sub_zone_name: row.sub_zone_name,
  position_x: row.position_x,
  position_y: row.position_y,
  reward_item_id: row.reward_id,
  reward_item_name: row.reward_name ?? "Unknown",
  reward_item_type: row.reward_item_type,
  reward_item_tooltip: row.reward_tooltip,
};
```

- [ ] **Step 3: (removed) Random Map summary queries**

Earlier iterations queried Random Map source counts and drop rate groups for a Map Acquisition card. The profession page now relies on the Random Map item page for that detail and only needs `data.keyItems.random_map` (loaded in Task 6) plus the `MapLink` shortcut in How It Works. No Random Map source query is needed in this loader.

- [ ] **Step 4: Query Buried Treasure Chest rewards**

Read and parse `items.chest_rewards` for `buried_treasure_chest`. Join each reward ID back to `items` for type, quality, and tooltip.

Use this query:

```sql
SELECT chest.chest_rewards
FROM items chest
WHERE chest.id = 'buried_treasure_chest'
```

For each parsed reward, query:

```sql
SELECT id, name, item_type, quality, tooltip_html
FROM items
WHERE id = ?
```

Use the denormalized `reward.roll_order` added in Task 1. Fail fast during implementation if it is missing, because the calculator must not simulate selected-skill chances in display-sorted order.

Before returning each row, assert the field exists:

```ts
if (typeof reward.roll_order !== "number") {
  throw new Error("Buried Treasure Chest reward is missing roll_order; rebuild compendium data after Task 1.");
}
```

Then map to:

```ts
{
  item_id: reward.item_id,
  item_name: reward.item_name,
  item_type: item.item_type,
  quality: item.quality,
  tooltip_html: item.tooltip_html,
  roll_order: reward.roll_order,
  base_roll_chance: reward.probability,
  baseline_open_chance: reward.actual_drop_chance,
  scales_with_treasure_hunter: item.item_type === "relic",
}
```

Return `buriedChestRewards` in `roll_order` order. Apply display sorting in the Svelte page after the calculator has produced adjusted chances.

- [ ] **Step 5: Compute hero stats**

Compute:

```ts
const stats = {
  map_count: treasureMaps.length,
  relic_reward_count: buriedChestRewards.filter((r) => r.scales_with_treasure_hunter).length,
  zone_count: new Set(treasureMaps.map((map) => map.destination_zone_id)).size,
  skill_gain_percent: 0.5,
};
```

Expected current values from observed data:

```text
map_count: 8
relic_reward_count: 7
zone_count: 5
skill_gain_percent: 0.5
```

- [ ] **Step 6: Manual review checkpoint**

Do not run validation commands unless the user asks. Ask the user to manually check that server-loaded counts match the visible page after page edits.

---

## Task 3: Add Calculator Utilities and Derived State

**Files:**

- Modify: `website/src/routes/professions/treasure_hunter/+page.svelte`

- [ ] **Step 1: Add imports**

Add:

```ts
import ItemLink from "$lib/components/ItemLink.svelte";
import MapLink from "$lib/components/MapLink.svelte";
import CalculatorIcon from "@lucide/svelte/icons/calculator";
```

Keep existing `Seo`, `Breadcrumb`, `Trophy`, `MapIcon`, and `Gem` imports as needed.

- [ ] **Step 2: Add calculator state and helpers**

Add inside `<script lang="ts">`:

```ts
let skillLevel = $state(0);

const skillFraction = $derived(skillLevel / 100);
const relicRollBonus = $derived(skillFraction * 0.1);
const successfulDigsToCap = $derived(Math.ceil((100 - skillLevel) / 0.5));
const adjustedChestRewards = $derived.by(() =>
  calculateAdjustedChestRewards(data.buriedChestRewards, skillFraction),
);
const displayedChestRewards = $derived(
  adjustedChestRewards
    .filter((reward) => reward.scales_with_treasure_hunter)
    .sort(sortChestRewardsForDisplay),
);

function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatPercentagePoints(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)} pp`;
}
```

- [ ] **Step 3: Add deterministic RNG**

Add a small local deterministic RNG. Keep it private to this page because no other page currently needs Treasure Hunter chest simulation.

```ts
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
}
```

- [ ] **Step 4: Add simulation function**

Add:

```ts
function calculateAdjustedChestRewards(
  rewards: typeof data.buriedChestRewards,
  skill: number,
) {
  const trials = 50_000;
  const targetRewards = 3;
  const maxPasses = 10;
  const random = new SeededRandom(0x7a3c_2026 + Math.round(skill * 200));
  const counts = new Map(rewards.map((reward) => [reward.item_id, 0]));

  for (let trial = 0; trial < trials; trial++) {
    const selected = new Set<string>();
    let passes = 0;

    while (selected.size < targetRewards && passes < maxPasses) {
      for (const reward of rewards) {
        if (selected.has(reward.item_id)) continue;

        const rollChance = reward.scales_with_treasure_hunter
          ? Math.min(1, reward.base_roll_chance + skill * 0.1)
          : reward.base_roll_chance;

        if (random.next() < rollChance) {
          selected.add(reward.item_id);
          counts.set(reward.item_id, (counts.get(reward.item_id) ?? 0) + 1);
        }

        if (selected.size >= targetRewards) break;
      }

      passes++;
    }
  }

  return rewards
    .map((reward) => {
      const adjusted_open_chance = (counts.get(reward.item_id) ?? 0) / trials;
      return {
        ...reward,
        adjusted_open_chance,
        change_from_baseline: adjusted_open_chance - reward.baseline_open_chance,
      };
    })
    .sort((a, b) => a.roll_order - b.roll_order);
}

function sortChestRewardsForDisplay(
  a: ReturnType<typeof calculateAdjustedChestRewards>[number],
  b: ReturnType<typeof calculateAdjustedChestRewards>[number],
): number {
  if (a.scales_with_treasure_hunter !== b.scales_with_treasure_hunter) {
    return a.scales_with_treasure_hunter ? -1 : 1;
  }

  return (
    b.quality - a.quality ||
    b.adjusted_open_chance - a.adjusted_open_chance ||
    a.item_name.localeCompare(b.item_name)
  );
}
```

- [ ] **Step 5: Re-read call site as a maintainer**

Confirm labels in template never call `adjusted_open_chance` a raw roll chance. It must be described as per opened Buried Treasure Chest.

---

## Task 4: Rebuild Hero and Mechanics Sections

**Files:**

- Modify: `website/src/routes/professions/treasure_hunter/+page.svelte`

- [ ] **Step 1: Replace legacy header with Adventuring-style hero card**

Use this structure:

```svelte
<section class="rounded-lg border p-6 md:p-8">
  <div class="flex flex-wrap items-start gap-4">
    <div class="rounded-lg bg-amber-500/10 p-3">
      <MapIcon class="h-7 w-7 text-amber-500 dark:text-amber-400" />
    </div>
    <div class="min-w-0 flex-1">
      <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
        {data.profession.name}
      </h1>
      <p class="mt-2 max-w-3xl text-muted-foreground">
        Find treasure maps, follow their clues, dig up buried rewards, and improve relic odds from Buried Treasure Chests.
      </p>
    </div>
  </div>

  <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-lg border p-4">
      <div class="text-2xl font-semibold">{data.stats.map_count}</div>
      <div class="text-sm text-muted-foreground">Treasure maps</div>
    </div>
    <div class="rounded-lg border p-4">
      <div class="text-2xl font-semibold">{data.stats.relic_reward_count}</div>
      <div class="text-sm text-muted-foreground">Relic rewards</div>
    </div>
    <div class="rounded-lg border p-4">
      <div class="text-2xl font-semibold">{data.stats.zone_count}</div>
      <div class="text-sm text-muted-foreground">Destination zones</div>
    </div>
    <div class="rounded-lg border p-4">
      <div class="text-2xl font-semibold">+{data.stats.skill_gain_percent.toFixed(1)}%</div>
      <div class="text-sm text-muted-foreground">Skill per treasure</div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add How It Works section**

Add a numbered section after the hero:

```svelte
<section class="rounded-lg border p-5">
  <h2 class="text-xl font-semibold">How It Works</h2>
  <div class="mt-4 divide-y">
    <!-- obtain map, read clue, find site, dig, open reward -->
  </div>
</section>
```

Use visible copy:

Each unique target should be linked once in the most semantically appropriate spot. Avoid repeating the same link in multiple steps.

1. `Find Random Map drops` — Heading: `Find <ItemLink random_map> drops.` Body: `Monsters drop Random Map. Each drop gives one of <a href="#treasure-maps">{n} treasure maps</a>, and each treasure map leads to a Buried Treasure Chest.` (Random Map and Buried Treasure Chest are not re-linked here.)
2. `Open the map clue` — Body: `Use the treasure map to see its dig-site clue.` No links in this step.
3. `Find the matching dig site` — Body: `Each treasure map points to one dig site. Use the clue or the map links below to find it.` No links in this step.
4. `Dig with a shovel` — Heading: `Dig with a <ItemLink shovel>.` Body: `Bring a Shovel and at least one free inventory slot. A successful dig awards the treasure and gives +0.5% Treasure Hunter.`
5. `Open the Buried Treasure Chest` — Heading: `Open the <ItemLink buried_treasure_chest>.` Body: `Each chest gives 3 unique rewards. <a href="#calculator">Treasure Hunter</a> improves the chance that those rewards include relics.`

Add invisible source comments near claims:

```svelte
<!-- Source: server-scripts/TreasureMapItem.cs:12-15 and Player.cs:7172-7189 — using a treasure map opens the clue image. -->
<!-- Source: server-scripts/TreasureLocation.cs:61-100,105-160 — digging requires the matching map and shovel, consumes one map on success, and grants the configured reward. -->
<!-- Source: server-scripts/ChestItem.cs:24-31 — Buried Treasure Chest grants unique rewards and applies Treasure Hunter bonus to relic rolls only. -->
```

---

## Task 5: Add Calculator and Reward Table UI

**Files:**

- Modify: `website/src/routes/professions/treasure_hunter/+page.svelte`

- [ ] **Step 1: Add calculator section anchor**

Add:

```svelte
<section id="calculator" class="space-y-4">
  <h2 class="flex items-center gap-2 text-xl font-semibold">
    <CalculatorIcon class="h-5 w-5 text-cyan-500" />
    Calculator
  </h2>
  <!-- controls and output -->
</section>
```

- [ ] **Step 2: Add slider and summary cards**

Use:

```svelte
<div class="rounded-lg border bg-muted/15 p-4">
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <label for="treasure-hunter-skill-slider" class="shrink-0">
      Treasure Hunter Skill
    </label>
    <input
      id="treasure-hunter-skill-slider"
      type="range"
      min="0"
      max="100"
      step="0.5"
      bind:value={skillLevel}
      class="h-2 w-48 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
    />
    <span class="w-16 font-mono">{skillLevel.toFixed(1)}%</span>
  </div>

  <div class="mt-4 grid gap-3 sm:grid-cols-3">
    <div class="rounded-lg border bg-background p-3">
      <div class="text-sm text-muted-foreground">Relic chance bonus</div>
      <div class="text-xl font-semibold">+{formatPercentagePoints(relicRollBonus)}</div>
    </div>
    <div class="rounded-lg border bg-background p-3">
      <div class="text-sm text-muted-foreground">Treasures to cap</div>
      <div class="text-xl font-semibold">{successfulDigsToCap}</div>
    </div>
    <div class="rounded-lg border bg-background p-3">
      <div class="text-sm text-muted-foreground">Skill gain</div>
      <div class="text-xl font-semibold">+0.5% per treasure</div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add a Change-column footnote, no other explainer copy**

Earlier iterations included a paragraph below the summary cards explaining "+10 pp" and "the table focuses on relics". Skip that paragraph — the live `Relic chance bonus` tile already shows the bonus value, the `At selected skill` column header already names what the column does, and step 5 of How It Works already states that Treasure Hunter improves relic odds. The one targeted exception is a short footnote inside the table's bordered container that explains why the `Change` values do not equal the per-roll `+10 pp` bonus tile (per-chest vs per-roll, plus the up-to-3 unique-reward slot competition). Keep the footnote ≤2 sentences with no semicolons.

- [ ] **Step 4: Add desktop reward table**

Use an actual table for desktop/tablet. The table is relic-only; do not render Diamond, potions, scrolls, or other unchanged random drops in this calculator.

```svelte
<div class="overflow-hidden rounded-lg border">
  <div class="overflow-x-auto">
    <table class="w-full whitespace-nowrap">
      <thead class="bg-muted/50">
        <tr>
          <th class="p-3 text-left font-medium">Reward</th>
          <th class="p-3 text-left font-medium">Type</th>
          <th class="p-3 text-right font-medium">Baseline</th>
          <th class="p-3 text-right font-medium">At selected skill</th>
          <th class="p-3 text-right font-medium">Change</th>
        </tr>
      </thead>
      <tbody>
        {#each displayedChestRewards as reward (reward.item_id)}
          <tr class="border-t hover:bg-muted/25">
            <td class="p-3">
              <ItemLink itemId={reward.item_id} itemName={reward.item_name} tooltipHtml={reward.tooltip_html} />
            </td>
            <td class="p-3 capitalize">{reward.item_type ?? "Item"}</td>
            <td class="p-3 text-right font-mono">{formatPercent(reward.baseline_open_chance)}</td>
            <td class="p-3 text-right font-mono">{formatPercent(reward.adjusted_open_chance)}</td>
            <td class="p-3 text-right font-mono">
              {#if Math.abs(reward.change_from_baseline) < 0.0005}
                <span class="text-muted-foreground">—</span>
              {:else}
                +{formatPercentagePoints(reward.change_from_baseline)}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
```

- [ ] **Step 5: Verify behavior manually in browser or built HTML**

Run the dev server or build preview and check:

- slider changes selected skill label,
- relic rows increase,
- non-relic reward names are absent from the visible calculator,
- `0%` selected skill matches baseline within simulation noise,
- no visible source-code file names appear in page content.

---

## Task 6: Treasure Maps Table and Scope Boundary

**Files:**

- Modify: `website/src/routes/professions/treasure_hunter/+page.svelte`

- [ ] **Step 1: Do not add Map Acquisition / Treasure Hunter Bonus sections**

Earlier iterations added separate `Map Acquisition` and `Treasure Hunter Bonus` cards. Review removed them: the How It Works section (with the Random Map ItemLink and `MapLink entityType="item"` shortcut in step 1, and the Treasure Hunter anchor link to `#calculator` in step 5) plus the Calculator card already cover the same content. Drop rate detail belongs on the Random Map item page, not on this profession page.

- [ ] **Step 2: Add treasure map table**

Add:

```svelte
<section id="treasure-maps" class="space-y-4">
  <h2 class="flex items-center gap-2 text-xl font-semibold">
    <MapIcon class="h-5 w-5 text-amber-500" />
    Treasure Maps ({data.treasureMaps.length})
  </h2>
  <!-- table -->
</section>
```

Columns:

- Map: `ItemLink` to the map item.
- Destination: zone link plus sub-zone name when present.
- Reward: `ItemLink` to Buried Treasure Chest.
- Location: `MapLink entityType="treasure"`.

No filters in the first implementation. There are 8 repeatable rows; scanability is better than extra controls. Revisit filters only if the discussion after first build asks for them.

- [ ] **Step 3: Do not add a Random Map Sources section**

Random Map source detail belongs on the Random Map item page. The Random Map `MapLink` in step 1 of How It Works covers map-only spelunking.

- [ ] **Step 4: Keep one-time treasure artifacts off the page**

Do not render Red Scabbard Map or a `Unique Treasure` section. This page is scoped to repeatable Treasure Hunter mechanics: Random Map outcomes, Buried Treasure Chest rewards, skill gain, and relic odds.

---

## Task 7: Verification and Review Prep

**Files:**

- Verify: `website/src/routes/professions/treasure_hunter/+page.server.ts`
- Verify: `website/src/routes/professions/treasure_hunter/+page.svelte`

- [ ] **Step 1: Do not run automated validation by default**

The user asked to stop running validation commands and will validate manually. Do not run `pnpm check`, `pnpm lint`, `pnpm build`, or browser QA unless explicitly requested.

- [ ] **Step 2: Prepare manual review targets**

Ask the user to open `/professions/treasure_hunter` and verify:

- hero stat tiles show `8 treasure maps`, `7 relic rewards`, `5 destination zones`, `+0.5% skill per treasure`,
- calculator slider works at 0%, 50%, and 100%,
- relic rows change with the slider,
- non-relic reward names are absent from the visible calculator,
- Random Map card has both an item link and a map link,
- the removed Random Map Sources section is absent,
- treasure location rows use treasure map links, not hand-built map URLs,
- Red Scabbard Map and Unique Treasure are absent from page content,
- no visible file names or internal identifiers appear in player-facing copy.

- [ ] **Step 3: Prepare refinement notes for user discussion**

After implementation, report these explicit open questions:

1. Should the calculator use 50k, 100k, or precomputed build-time simulations for smoother values?
2. Should the Treasure Maps section gain filters, or is 8 rows readable enough?
3. Should item page changes be implemented next?

---

## Deferred Item Page Plan

Do not implement this until the user approves after seeing the profession page.

### Buried Treasure Chest item page

Future layout:

```text
Treasure Hunter Bonus
Treasure Hunter improves relic reward chances from this chest.
Listed reward chances are baseline chances at 0% Treasure Hunter.
[Calculate skill-adjusted chances]
```

Modify `Chest Rewards` rows to include a note only for relic rewards:

```text
Dawnstone    0.7% baseline    Scales with Treasure Hunter
Diamond     27.2% baseline    Unchanged
```

### Relic item pages

For relics that have `Buried Treasure Chest` as a source, annotate only that source row:

```text
Buried Treasure Chest    baseline chance    Scales with Treasure Hunter
```

Link to `/professions/treasure_hunter#calculator`.

### Random Map and treasure map item pages

Possible lightweight future links:

- `Random Map`: link to `/professions/treasure_hunter#treasure-maps`.
- Treasure maps: link to `/professions/treasure_hunter` mechanics and show +0.5% skill gain note.

---

## Self-Review Notes

- Spec coverage: The plan covers the profession page first, with user-requested relic count header and Random Map map link. It also includes the necessary build-pipeline support to preserve chest reward roll order for truthful selected-skill simulation. Item page work is captured as deferred and intentionally out of scope for the first build.
- Placeholder scan: No placeholder markers or vague implementation placeholders remain.
- Type consistency: Interfaces use snake_case fields consistent with existing page data and current Treasure Hunter loader style. `roll_order` is added to the denormalized chest reward JSON and consumed by the profession-page calculator.
- Risk to verify during implementation: The deterministic simulation must not cause visible UI lag. If it does, reduce trials, memoize by half-percent skill value, or move simulation to server-side precomputed data in a follow-up change.
