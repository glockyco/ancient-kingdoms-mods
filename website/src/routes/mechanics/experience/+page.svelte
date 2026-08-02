<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import * as Card from "$lib/components/ui/card";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { getQualityTextColorClass } from "$lib/utils/format";

  let { data } = $props();

  const fmt = (value: number) => value.toLocaleString("en-US");

  // Every section on the page, in document order. Drives the jump list.
  // The ids match each Card.Root below.
  const SECTIONS = [
    { id: "levels", label: "Levels" },
    { id: "level-rewards", label: "Level Rewards" },
    { id: "veteran-points", label: "Veteran Points" },
    { id: "kill-xp", label: "Kill XP" },
    { id: "death-xp", label: "Death XP" },
    { id: "scroll-xp", label: "Scroll XP" },
    { id: "gathering-xp", label: "Gathering XP" },
    { id: "alchemy-xp", label: "Alchemy XP" },
    { id: "scribing-xp", label: "Scribing XP" },
    { id: "cooking-xp", label: "Cooking XP" },
    { id: "crafting-xp", label: "Crafting XP" },
    { id: "quest-xp", label: "Quest XP" },
    { id: "zone-discovery-xp", label: "Zone Discovery XP" },
  ];

  const LEVEL_CAP = 50;
  const LATE_GAME_START = 40;
  const XP_BASE_GROWTH = 1.258;

  // Source: server-scripts/Experience.cs:26-36,375-383 and server-scripts/ExponentialLong.cs:11-14
  // — required XP is Convert.ToInt64(78 * 1.258^(level-1)) up to level 40, then the
  // level-40 value grown by 1.18 per level. The game evaluates both in 32-bit floats,
  // so the values are listed rather than recomputed in double precision.
  const XP_TO_NEXT_LEVEL = [
    78, 98, 123, 155, 195, 246, 309, 389, 489, 615, 774, 974, 1225, 1541, 1939,
    2440, 3069, 3861, 4857, 6110, 7686, 9669, 12164, 15302, 19250, 24216, 30464,
    38324, 48212, 60650, 76298, 95983, 120747, 151899, 191089, 240390, 302411,
    380433, 478585, 602060, 710431, 838308, 989204, 1167260, 1377367, 1625293,
    1917846, 2263058, 2670408,
  ];

  let running = 0;
  const LEVEL_ROWS = XP_TO_NEXT_LEVEL.map((cost, index) => {
    running += cost;
    return { level: index + 1, cost, total: running };
  });
  const TOTAL_TO_CAP = running;

  /** Experience already earned by the time a character reaches `level`. */
  const earnedAt = (level: number) =>
    level <= 1 ? 0 : LEVEL_ROWS[level - 2].total;

  let pickedLevel = $state(20);
  const xpToNext = $derived(XP_TO_NEXT_LEVEL[pickedLevel - 1]);
  const xpBehind = $derived(earnedAt(pickedLevel));
  const xpAhead = $derived(TOTAL_TO_CAP - xpBehind);
  const journeyDone = $derived((xpBehind / TOTAL_TO_CAP) * 100);

  // Log-scale plot of the per-level cost. The curve visibly bends at level 40,
  // where the growth factor drops from 1.258 to 1.18.
  const CHART = { w: 720, h: 250, left: 66, right: 710, top: 16, bottom: 202 };
  const logMin = Math.log10(XP_TO_NEXT_LEVEL[0]);
  const logMax = Math.log10(XP_TO_NEXT_LEVEL[XP_TO_NEXT_LEVEL.length - 1]);
  const chartX = (level: number) =>
    CHART.left + ((level - 1) / (LEVEL_CAP - 2)) * (CHART.right - CHART.left);
  const chartY = (cost: number) =>
    CHART.bottom -
    ((Math.log10(cost) - logMin) / (logMax - logMin)) *
      (CHART.bottom - CHART.top);
  const pointsFor = (from: number, to: number) =>
    LEVEL_ROWS.slice(from - 1, to)
      .map(
        (row) =>
          `${chartX(row.level).toFixed(1)},${chartY(row.cost).toFixed(1)}`,
      )
      .join(" ");
  const EARLY_POINTS = pointsFor(1, LATE_GAME_START);
  const LATE_POINTS = pointsFor(LATE_GAME_START, LEVEL_CAP - 1);
  // The same 1.258 growth carried past level 40, drawn for contrast with the eased curve.
  const UNEASED_POINTS = Array.from(
    { length: LEVEL_CAP - LATE_GAME_START },
    (_, index) => {
      const level = LATE_GAME_START + index;
      const cost =
        XP_TO_NEXT_LEVEL[LATE_GAME_START - 1] * XP_BASE_GROWTH ** index;
      return `${chartX(level).toFixed(1)},${chartY(cost).toFixed(1)}`;
    },
  ).join(" ");
  const Y_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];
  const X_TICKS = [1, 10, 20, 30, 40, 49];

  // Source: server-scripts/Experience.cs:110-280 — every class raises one attribute on
  // each of the level multiples below, and two on every sixth level.
  const ATTRIBUTE_GAINS = [
    {
      className: "Warrior",
      gains: [
        "Constitution",
        "Strength",
        "Dexterity",
        "Intelligence",
        "Wisdom, Charisma",
      ],
    },
    {
      className: "Ranger",
      gains: [
        "Dexterity",
        "Constitution",
        "Strength",
        "Wisdom",
        "Intelligence, Charisma",
      ],
    },
    {
      className: "Cleric",
      gains: [
        "Wisdom",
        "Intelligence",
        "Constitution",
        "Strength",
        "Dexterity, Charisma",
      ],
    },
    {
      className: "Rogue",
      gains: [
        "Dexterity",
        "Strength",
        "Constitution",
        "Intelligence",
        "Wisdom, Charisma",
      ],
    },
    {
      className: "Wizard",
      gains: [
        "Intelligence",
        "Dexterity",
        "Wisdom",
        "Constitution",
        "Strength, Charisma",
      ],
    },
    {
      className: "Druid",
      gains: [
        "Wisdom",
        "Intelligence",
        "Dexterity",
        "Constitution",
        "Strength, Charisma",
      ],
    },
  ];

  // Source: server-scripts/Experience.cs:88-108 — tutorial messages fired on these levels.
  const MILESTONES = [
    { level: 10, unlock: "Hire your first mercenary at any tavern." },
    { level: 20, unlock: "A second mercenary can be active." },
    { level: 30, unlock: "A third mercenary can be active." },
    {
      level: 40,
      unlock:
        "A fourth mercenary can be active, and the Adventurer's Guild opens its quests and augment merchant.",
    },
    {
      level: LEVEL_CAP,
      unlock: "Maximum level. Further experience earns Veteran Points.",
    },
  ];

  // Source: server-scripts/Experience.cs:38,51-52,306-334 — the veteran cap and the
  // experience each Veteran Point costs.
  const MAX_VETERAN_POINTS = 200;
  const VETERAN_BASE_COST = 1_000_000;
  const VETERAN_COST_PER_POINT = 20_000;

  /** Experience for the point that takes the total from `points` to `points + 1`. */
  const veteranStepCost = (points: number) =>
    VETERAN_BASE_COST + VETERAN_COST_PER_POINT * points;
  /** Experience spent by the time a character holds `points` Veteran Points. */
  const veteranSpent = (points: number) =>
    points * VETERAN_BASE_COST +
    (VETERAN_COST_PER_POINT * points * (points - 1)) / 2;
  const VETERAN_TOTAL = veteranSpent(MAX_VETERAN_POINTS);

  let pickedVeteran = $state(50);
  const veteranNext = $derived(veteranStepCost(pickedVeteran));
  const veteranBehind = $derived(veteranSpent(pickedVeteran));
  const veteranRuns = $derived(veteranBehind / TOTAL_TO_CAP);

  const VET_CHART = {
    w: 720,
    h: 250,
    left: 66,
    right: 710,
    top: 16,
    bottom: 202,
  };
  const vetX = (points: number) =>
    VET_CHART.left +
    (points / MAX_VETERAN_POINTS) * (VET_CHART.right - VET_CHART.left);
  const vetY = (spent: number) =>
    VET_CHART.bottom -
    (spent / VETERAN_TOTAL) * (VET_CHART.bottom - VET_CHART.top);
  const VET_POINTS = Array.from({ length: 41 }, (_, index) => {
    const points = index * 5;
    return `${vetX(points).toFixed(1)},${vetY(veteranSpent(points)).toFixed(1)}`;
  }).join(" ");
  const VET_Y_TICKS = [0, 150_000_000, 300_000_000, 450_000_000, 600_000_000];
  const VET_X_TICKS = [0, 50, 100, 150, 200];
  const millions = (value: number) => `${Math.round(value / 1_000_000)}M`;

  // Source: server-scripts/Experience.cs:453-489 — BalanceExperienceReward.
  // The switch is keyed on your level minus the monster's level.
  const ABOVE_MULTIPLIERS: Record<number, number> = {
    1: 0.99,
    2: 0.97,
    3: 0.95,
    4: 0.9,
    5: 0.8,
    6: 0.7,
    7: 0.6,
    8: 0.5,
    9: 0.4,
    10: 0.3,
    11: 0.25,
    12: 0.2,
    13: 0.15,
    14: 0.14,
    15: 0.13,
    16: 0.12,
    17: 0.11,
    18: 0.1,
    19: 0.08,
    20: 0.05,
  };
  const levelDiffMultiplier = (diff: number) => {
    if (diff > 20) return 0;
    if (diff < 0) return 1 + Math.min(-diff, 10) * 0.05;
    if (diff === 0) return 1;
    return ABOVE_MULTIPLIERS[diff];
  };
  const DIFF_ROWS = Array.from({ length: 32 }, (_, index) => {
    const diff = index - 10;
    const label =
      diff === -10
        ? "10+ below"
        : diff === 21
          ? "21+ above"
          : diff === 0
            ? "same"
            : `${Math.abs(diff)} ${diff < 0 ? "below" : "above"}`;
    return { diff, label, multiplier: levelDiffMultiplier(diff) };
  });

  const DIFF_CHART = {
    w: 720,
    h: 220,
    left: 44,
    right: 712,
    top: 14,
    bottom: 176,
  };
  const DIFF_MAX = 1.5;
  const diffBandWidth = (DIFF_CHART.right - DIFF_CHART.left) / DIFF_ROWS.length;
  const diffX = (index: number) =>
    DIFF_CHART.left + index * diffBandWidth + diffBandWidth * 0.15;
  const diffBarWidth = diffBandWidth * 0.7;
  const diffY = (multiplier: number) =>
    DIFF_CHART.bottom -
    (multiplier / DIFF_MAX) * (DIFF_CHART.bottom - DIFF_CHART.top);
  const DIFF_Y_TICKS = [0, 0.5, 1, 1.5];
</script>

<Seo
  title="Experience Mechanics - Ancient Kingdoms"
  description="Level requirements to 50, what each level grants, veteran points past the cap, and every experience source — kills, death, scrolls, professions, quests, and zone discovery."
  path="/mechanics/experience"
/>

<div class="container mx-auto p-8 space-y-8 max-w-4xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Experience" },
    ]}
  />

  <h1 class="text-4xl font-bold">Experience Mechanics</h1>

  <PageSections sections={SECTIONS} />

  <!-- Levels -->
  <Card.Root id="levels" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Levels</Card.Title>
      <Card.Description>
        How much experience each level takes on the way to {LEVEL_CAP}.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Experience.cs:26-36,60-100,375-383 — each full experience bar consumes its own cost and advances the level, and the requirement curve changes shape at level 40. -->
        Each level needs its own amount of experience, and the requirement grows by
        25.8% per level. That growth eases to 18% per level once you pass 40, so the
        last ten levels are far cheaper than the curve would otherwise make them.
        Overflow experience carries into the next level.
      </p>

      <div class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 class="font-semibold">Experience per level</h3>
          <span class="text-xs text-muted-foreground"
            >Log scale &middot; <span class="text-emerald-500">green</span> is the
            eased curve past 40, dashed is the same growth carried on</span
          >
        </div>
        <svg
          class="level-chart"
          viewBox="0 0 {CHART.w} {CHART.h}"
          role="img"
          aria-label="Experience required for each level, on a logarithmic scale"
        >
          {#each Y_TICKS as tick (tick)}
            <line
              class="grid"
              x1={CHART.left}
              y1={chartY(tick)}
              x2={CHART.right}
              y2={chartY(tick)}
            />
            <text
              class="tick"
              x={CHART.left - 8}
              y={chartY(tick) + 3}
              text-anchor="end">{fmt(tick)}</text
            >
          {/each}
          {#each X_TICKS as tick (tick)}
            <text
              class="tick"
              x={chartX(tick)}
              y={CHART.bottom + 18}
              text-anchor="middle">{tick}</text
            >
          {/each}
          <line
            class="axis"
            x1={CHART.left}
            y1={CHART.top}
            x2={CHART.left}
            y2={CHART.bottom}
          />
          <line
            class="axis"
            x1={CHART.left}
            y1={CHART.bottom}
            x2={CHART.right}
            y2={CHART.bottom}
          />
          <polyline class="curve-early" points={EARLY_POINTS} />
          <polyline class="curve-uneased" points={UNEASED_POINTS} />
          <polyline class="curve-late" points={LATE_POINTS} />
          <line
            class="marker-line"
            x1={chartX(pickedLevel)}
            y1={chartY(xpToNext)}
            x2={chartX(pickedLevel)}
            y2={CHART.bottom}
          />
          <circle
            class="marker"
            cx={chartX(pickedLevel)}
            cy={chartY(xpToNext)}
            r="4.5"
          />
          <text
            class="tick"
            x={(CHART.left + CHART.right) / 2}
            y={CHART.h - 4}
            text-anchor="middle">character level</text
          >
        </svg>
      </div>

      <div class="space-y-3 rounded-md border border-border bg-muted/20 p-4">
        <label
          class="flex flex-wrap items-baseline gap-x-3 text-sm"
          for="level-picker"
        >
          <span class="font-semibold">At level</span>
          <span class="font-mono text-lg font-medium text-foreground"
            >{pickedLevel}</span
          >
        </label>
        <input
          id="level-picker"
          type="range"
          min="1"
          max={LEVEL_CAP - 1}
          bind:value={pickedLevel}
          class="w-full accent-emerald-500"
        />
        <dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-xs text-muted-foreground">
              To level {pickedLevel + 1}
            </dt>
            <dd class="font-mono text-foreground">{fmt(xpToNext)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Earned so far</dt>
            <dd class="font-mono text-foreground">{fmt(xpBehind)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Left to {LEVEL_CAP}</dt>
            <dd class="font-mono text-foreground">{fmt(xpAhead)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Of the way there</dt>
            <dd class="font-mono text-foreground">
              {journeyDone < 1
                ? journeyDone.toFixed(2)
                : journeyDone.toFixed(1)}%
            </dd>
          </div>
        </dl>
      </div>

      <details class="group">
        <summary
          class="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
          >Every level, in full</summary
        >
        <div class="mt-3 overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Level</th>
                <th class="text-right p-2 font-medium">XP to next level</th>
                <th class="text-right p-2 font-medium">Total XP earned</th>
              </tr>
            </thead>
            <tbody>
              {#each LEVEL_ROWS as row (row.level)}
                <tr class="border-b hover:bg-muted/30">
                  <td class="p-2">{row.level} &rarr; {row.level + 1}</td>
                  <td class="p-2 text-right font-mono">{fmt(row.cost)}</td>
                  <td class="p-2 text-right font-mono">{fmt(row.total)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    </Card.Content>
  </Card.Root>

  <!-- Level Rewards -->
  <Card.Root id="level-rewards" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Level Rewards</Card.Title>
      <Card.Description>What every level gives your character.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:281-291 — every level grants one attribute point, one skill point, and a full heal while alive. -->
          Every level grants one attribute point and one skill point, and refills
          health and mana as long as your character is alive.
        </p>
        <p class="text-sm text-muted-foreground">
          Your class also raises attributes on its own schedule. Every sixth
          level raises two attributes at once.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2 font-medium">Class</th>
              <th class="text-left p-2 font-medium">Every 2nd</th>
              <th class="text-left p-2 font-medium">Every 3rd</th>
              <th class="text-left p-2 font-medium">Every 4th</th>
              <th class="text-left p-2 font-medium">Every 5th</th>
              <th class="text-left p-2 font-medium">Every 6th</th>
            </tr>
          </thead>
          <tbody>
            {#each ATTRIBUTE_GAINS as row (row.className)}
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2 font-medium">{row.className}</td>
                {#each row.gains as gain (gain)}
                  <td class="p-2">{gain}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Milestones</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Level</th>
                <th class="text-left p-2 font-medium">Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {#each MILESTONES as row (row.level)}
                <tr class="border-b hover:bg-muted/30">
                  <td class="p-2 font-mono">{row.level}</td>
                  <td class="p-2">{row.unlock}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Veteran Points -->
  <Card.Root id="veteran-points" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Veteran Points</Card.Title>
      <Card.Description
        >Where experience goes after the level cap.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:300-330 — at the cap a filled bar grants a Veteran Point, an attribute point, a full heal, and a veteran level-up for your mercenaries. -->
          At level {LEVEL_CAP} a filled bar grants one Veteran Point and one attribute
          point instead of a level, refills health and mana, and levels up your mercenaries
          as veterans.
        </p>
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:44-53 — the max-level bar costs 1,000,000 plus 20,000 per total Veteran Point. -->
          Each Veteran Point costs
          <span class="font-mono font-medium"
            >{fmt(VETERAN_BASE_COST)} + {fmt(VETERAN_COST_PER_POINT)} &times; points</span
          >, so the first costs {fmt(VETERAN_BASE_COST)} and every further point costs
          {fmt(VETERAN_COST_PER_POINT)} more than the last.
        </p>
      </div>

      <div class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 class="font-semibold">Experience spent on Veteran Points</h3>
          <span class="text-xs text-muted-foreground"
            >Dashed line marks all {LEVEL_CAP} levels for scale</span
          >
        </div>
        <svg
          class="level-chart"
          viewBox="0 0 {VET_CHART.w} {VET_CHART.h}"
          role="img"
          aria-label="Total experience spent to reach a given number of Veteran Points"
        >
          {#each VET_Y_TICKS as tick (tick)}
            <line
              class="grid"
              x1={VET_CHART.left}
              y1={vetY(tick)}
              x2={VET_CHART.right}
              y2={vetY(tick)}
            />
            <text
              class="tick"
              x={VET_CHART.left - 8}
              y={vetY(tick) + 3}
              text-anchor="end">{millions(tick)}</text
            >
          {/each}
          {#each VET_X_TICKS as tick (tick)}
            <text
              class="tick"
              x={vetX(tick)}
              y={VET_CHART.bottom + 18}
              text-anchor="middle">{tick}</text
            >
          {/each}
          <line
            class="axis"
            x1={VET_CHART.left}
            y1={VET_CHART.top}
            x2={VET_CHART.left}
            y2={VET_CHART.bottom}
          />
          <line
            class="axis"
            x1={VET_CHART.left}
            y1={VET_CHART.bottom}
            x2={VET_CHART.right}
            y2={VET_CHART.bottom}
          />
          <line
            class="curve-uneased"
            x1={VET_CHART.left}
            y1={vetY(TOTAL_TO_CAP)}
            x2={VET_CHART.right}
            y2={vetY(TOTAL_TO_CAP)}
          />
          <polyline class="curve-late" points={VET_POINTS} />
          <line
            class="marker-line"
            x1={vetX(pickedVeteran)}
            y1={vetY(veteranBehind)}
            x2={vetX(pickedVeteran)}
            y2={VET_CHART.bottom}
          />
          <circle
            class="marker"
            cx={vetX(pickedVeteran)}
            cy={vetY(veteranBehind)}
            r="4.5"
          />
          <text
            class="tick"
            x={(VET_CHART.left + VET_CHART.right) / 2}
            y={VET_CHART.h - 4}
            text-anchor="middle">Veteran Points</text
          >
        </svg>
      </div>

      <div class="space-y-3 rounded-md border border-border bg-muted/20 p-4">
        <label
          class="flex flex-wrap items-baseline gap-x-3 text-sm"
          for="veteran-picker"
        >
          <span class="font-semibold">At</span>
          <span class="font-mono text-lg font-medium text-foreground"
            >{pickedVeteran}</span
          >
          <span class="font-semibold">Veteran Points</span>
        </label>
        <input
          id="veteran-picker"
          type="range"
          min="0"
          max={MAX_VETERAN_POINTS}
          bind:value={pickedVeteran}
          class="w-full accent-emerald-500"
        />
        <dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs text-muted-foreground">Next point costs</dt>
            <dd class="font-mono text-foreground">
              {pickedVeteran < MAX_VETERAN_POINTS ? fmt(veteranNext) : "—"}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">Spent to get here</dt>
            <dd class="font-mono text-foreground">{fmt(veteranBehind)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Runs from 1 to {LEVEL_CAP}
            </dt>
            <dd class="font-mono text-foreground">
              {veteranRuns.toFixed(1)}&times;
            </dd>
          </div>
        </dl>
        <p class="text-xs text-muted-foreground">
          Filling all {MAX_VETERAN_POINTS} Veteran Points takes {fmt(
            VETERAN_TOTAL,
          )}
          experience, roughly {(VETERAN_TOTAL / TOTAL_TO_CAP).toFixed(0)} times the
          climb from level 1 to {LEVEL_CAP}.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Spending and Counting</h3>
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/PlayerSkills.cs:333-343 — the total counts unspent points plus the base levels of learned veteran skills. -->
          Veteran Points buy levels in veteran skills. Your veteran total counts unspent
          points plus the levels you already put into veteran skills, so spending
          them never lowers it.
        </p>
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Player.cs:9365-9400 and server-scripts/Npc.cs:1774-1792 — a veteran master refunds spent veteran skill points for gold and a token. -->
          A veteran master refunds every spent Veteran Point for 10,000 gold and a
          {#if data.redemptionToken}
            <ItemLink
              itemId={data.redemptionToken.id}
              itemName={data.redemptionToken.name}
              colorClass={getQualityTextColorClass(
                data.redemptionToken.quality,
              )}
              tooltipHtml={data.redemptionToken.tooltip_html}
            />
          {:else}
            Token of Redemption
          {/if}.
        </p>
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:306-334 — earning stops at 200 total points and pays out the max-level reward item instead. -->
          The total caps at {MAX_VETERAN_POINTS}. After that, every filled bar
          pays out a
          {#if data.maxLevelReward}
            <ItemLink
              itemId={data.maxLevelReward.id}
              itemName={data.maxLevelReward.name}
              colorClass={getQualityTextColorClass(data.maxLevelReward.quality)}
              tooltipHtml={data.maxLevelReward.tooltip_html}
            />
          {:else}
            reward item
          {/if}
          instead.
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Kill XP -->
  <Card.Root id="kill-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Kill XP</Card.Title>
      <Card.Description>
        Experience earned by killing monsters.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <h3 class="font-semibold">Base XP</h3>
        <p class="text-sm text-muted-foreground">
          Each monster has a base XP value shown on its page. This is the XP you
          receive when fighting it at the same level as you, solo, outside of a
          dungeon. The following modifiers are then applied on top.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Level Difference Scaling</h3>
        <p class="text-sm text-muted-foreground">
          Your XP is multiplied by how your level compares to the monster's.
          Monsters above your level give up to 150% XP, and a monster 21 or more
          levels below you gives none.
        </p>
        <!-- Source: server-scripts/Experience.cs:453-489 — BalanceExperienceReward -->
        <svg
          class="level-chart"
          viewBox="0 0 {DIFF_CHART.w} {DIFF_CHART.h}"
          role="img"
          aria-label="Experience multiplier by the difference between your level and the monster's level"
        >
          {#each DIFF_Y_TICKS as tick (tick)}
            <line
              class="grid"
              x1={DIFF_CHART.left}
              y1={diffY(tick)}
              x2={DIFF_CHART.right}
              y2={diffY(tick)}
            />
            <text
              class="tick"
              x={DIFF_CHART.left - 8}
              y={diffY(tick) + 3}
              text-anchor="end">{Math.round(tick * 100)}%</text
            >
          {/each}
          {#each DIFF_ROWS as row, index (row.diff)}
            <rect
              class={row.multiplier > 1
                ? "bar-bonus"
                : row.multiplier < 1
                  ? "bar-penalty"
                  : "bar-even"}
              x={diffX(index)}
              y={diffY(row.multiplier)}
              width={diffBarWidth}
              height={DIFF_CHART.bottom - diffY(row.multiplier)}
            >
              <title>{row.label}: {Math.round(row.multiplier * 100)}%</title>
            </rect>
            {#if row.diff % 5 === 0}
              <text
                class="tick"
                x={diffX(index) + diffBarWidth / 2}
                y={DIFF_CHART.bottom + 15}
                text-anchor="middle"
                >{row.diff > 0 ? `+${row.diff}` : row.diff}</text
              >
            {/if}
          {/each}
          <line
            class="curve-uneased"
            x1={DIFF_CHART.left}
            y1={diffY(1)}
            x2={DIFF_CHART.right}
            y2={diffY(1)}
          />
          <line
            class="axis"
            x1={DIFF_CHART.left}
            y1={DIFF_CHART.bottom}
            x2={DIFF_CHART.right}
            y2={DIFF_CHART.bottom}
          />
          <text
            class="tick"
            x={(DIFF_CHART.left + DIFF_CHART.right) / 2}
            y={DIFF_CHART.h - 3}
            text-anchor="middle">your level − monster level</text
          >
        </svg>

        <details class="group">
          <summary
            class="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
            >Every step, in full</summary
          >
          <div class="mt-3 overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="border-b">
                  <th class="text-left p-2 font-medium"
                    >Your level vs monster</th
                  >
                  <th class="text-right p-2 font-medium">XP multiplier</th>
                </tr>
              </thead>
              <tbody>
                {#each DIFF_ROWS as row (row.diff)}
                  <tr class="border-b hover:bg-muted/30">
                    <td class="p-2">{row.label}</td>
                    <td
                      class="p-2 text-right font-mono {row.multiplier > 1
                        ? 'text-green-600 dark:text-green-400'
                        : row.multiplier < 1
                          ? 'text-red-600 dark:text-red-400'
                          : ''}">{Math.round(row.multiplier * 100)}%</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Additional Modifiers</h3>
        <p class="text-sm text-muted-foreground">
          These are applied on top of the level-scaled value:
        </p>
        <!-- Source: server-scripts/Experience.cs:446-453 — dungeon +10% bonus -->
        <!-- Source: server-scripts/Monster.cs:2409 — double XP skill (solo kill) -->
        <!-- Source: server-scripts/Monster.cs:2739 — Forgotten Altar ×1.4 (solo kill) -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Modifier</th>
                <th class="text-right p-2 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Dungeon kill</td>
                <td class="p-2 text-right font-mono">+10% flat</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Forgotten Altar event</td>
                <td class="p-2 text-right font-mono">×1.4</td>
              </tr>
              {#if data.doubleExpSkills.length > 0}
                {#each data.doubleExpSkills as skill, i (skill.id)}
                  <tr
                    class="{i < data.doubleExpSkills.length - 1
                      ? 'border-b'
                      : ''} hover:bg-muted/30"
                  >
                    <td class="p-2">
                      <a
                        href="/skills/{skill.id}"
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >{skill.name}</a
                      >
                      <span class="text-muted-foreground text-xs">(buff)</span>
                    </td>
                    <td class="p-2 text-right font-mono">×2</td>
                  </tr>
                {/each}
              {:else}
                <tr class="hover:bg-muted/30">
                  <td class="p-2">Double XP buff</td>
                  <td class="p-2 text-right font-mono">×2</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/Monster.cs:2409 — double XP applies to kills -->
        <!-- Source: server-scripts/GatherItem.cs:582 — double XP applies to gathering -->
        <!-- Source: server-scripts/Player.cs:12057 — double XP applies to alchemy -->
        <!-- Source: server-scripts/Player.cs:12057 — double XP applies to scribing -->
        <!-- Source: server-scripts/Player.cs:12292 — double XP applies to crafting and cooking -->
        <!-- Source: server-scripts/PlayerQuests.cs:390-391 — no double XP for quests -->
        <!-- Source: server-scripts/ZoneTrigger.cs — no double XP for zone discovery -->
        <p class="text-sm text-muted-foreground">
          Double XP buffs apply to kills, gathering, alchemy, scribing, cooking,
          and crafting. They do not apply to XP scrolls, quests, or zone
          discovery.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Party XP</h3>
        <!-- Source: server-scripts/Experience.cs:468-474 — CalculateExperienceShare -->
        <!-- Source: server-scripts/Monster.cs:2367-2425 — party kill XP award loop -->
        <!-- Source: server-scripts/Party.cs:9 — Capacity = 5 -->
        <!-- Source: server-scripts/Party.cs:11 — BonusExperiencePerMember = 1.25f -->
        <!-- Source: server-scripts/Monster.cs:2415 — 1.25f passed as bonusPercentagePerMember -->
        <p class="text-sm text-muted-foreground">
          XP is split evenly among nearby party members, but a bonus more than
          compensates: each member in a larger party earns more than a solo
          player would. Level scaling uses the highest-level member's level
          difference to the monster, applied equally to everyone. Mercenaries
          are not counted as party members.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Party size</th>
                <th class="text-right p-2 font-medium">XP per member</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">1 (solo)</td>
                <td class="p-2 text-right font-mono">100%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">2</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >112.5%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">3</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >116.7%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">4</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >118.75%</td
                >
              </tr>
              <tr class="hover:bg-muted/30">
                <td class="p-2">5</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >120%</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Death XP -->
  <Card.Root id="death-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Death XP</Card.Title>
      <Card.Description>
        Experience lost on death, and how to recover it.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Source: server-scripts/Experience.cs:32 — deathLossPercent = 0.1f -->
      <!-- Source: server-scripts/Experience.cs:477-486 — Death() = max * 0.1f -->
      <!-- Source: server-scripts/Player.cs:3289-3290 — lossExp capped at experience.current -->
      <p class="text-sm text-muted-foreground">
        On death, you lose 10% of the current level's XP cap. The loss cannot
        drop you below zero XP for your level.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2 font-medium">Recovery method</th>
              <th class="text-right p-2 font-medium">XP recovered</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/Player.cs:12898 — CmdGetExpFromRemains: 0.5f * lossExp -->
            <tr class="border-b hover:bg-muted/30">
              <td class="p-2">
                <a
                  href="/mechanics/inventory#equipment-and-death"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Retrieve from corpse</a
                >
              </td>
              <td class="p-2 text-right font-mono">50%</td>
            </tr>
            <!-- Source: server-scripts/Player.cs:10308 — CmdResurrect: 0.75f * lossExp -->
            <tr class="hover:bg-muted/30">
              <td class="p-2"
                ><a
                  href="/skills/resurrection"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Resurrection</a
                > (cast by another player)</td
              >
              <td class="p-2 text-right font-mono">75%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Scroll XP -->
  <Card.Root id="scroll-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Scroll XP</Card.Title>
      <Card.Description>
        Experience earned by using XP scrolls. No multipliers apply.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/PotionItem.cs:102-105 — usageExperience field -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Scroll</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_i"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge I</a
              ></td
            >
            <td class="p-2 text-right font-mono">250</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_ii"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge II</a
              ></td
            >
            <td class="p-2 text-right font-mono">1,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_iii"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge III</a
              ></td
            >
            <td class="p-2 text-right font-mono">5,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_iv"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge IV</a
              ></td
            >
            <td class="p-2 text-right font-mono">25,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_v"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge V</a
              ></td
            >
            <td class="p-2 text-right font-mono">100,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_illumination"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Illumination</a
              ></td
            >
            <td class="p-2 text-right font-mono">1,500,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Gathering XP -->
  <Card.Root id="gathering-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Gathering XP</Card.Title>
      <Card.Description>
        Experience earned by gathering herbs, minerals, radiant sparks, other
        resources, and fish at fishing spots.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/GatherItem.cs:531-544 — gathering XP by tier (plants/minerals/sparks/other). -->
      <!-- Source: server-scripts/GatherItem.cs:809-819 — fishing XP by spot tier; same 15 / 150 / 750 / 4000 / 10000 table. -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">15</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">750</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">4,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier V</td>
            <td class="p-2 text-right font-mono">10,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Alchemy XP -->
  <Card.Root id="alchemy-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Alchemy XP</Card.Title>
      <Card.Description>
        Experience earned by brewing potions at an alchemy table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10528-10535 — alchemy XP by recipe tier -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">300</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">2,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">5,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">12,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Scribing XP -->
  <Card.Root id="scribing-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Scribing XP</Card.Title>
      <Card.Description>
        Experience earned by crafting scrolls at a scribing table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10600-10603 — isScribingTable overrides num5 = level.current * 100 -->
      <p class="text-sm text-muted-foreground">
        Each successful craft awards <span class="font-mono font-medium"
          >Player Level &times; 100</span
        > XP.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Cooking XP -->
  <Card.Root id="cooking-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Cooking XP</Card.Title>
      <Card.Description>
        Experience earned by cooking food at a cooking oven.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:12284-12290 — cooking XP by item quality (same table as crafting) -->
      <!-- Source: server-scripts/Player.cs:10772-10797 — cooking branch awards XP on success only -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">750</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">3,500</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">10,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Crafting XP -->
  <Card.Root id="crafting-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Crafting XP</Card.Title>
      <Card.Description>
        Experience earned by crafting items at a forge.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:12284-12290 — crafting XP by item quality -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">750</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">3,500</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">10,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Quest XP -->
  <Card.Root id="quest-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Quest XP</Card.Title>
      <Card.Description>
        Experience earned by completing <a
          href="/quests"
          class="text-blue-600 dark:text-blue-400 hover:underline">quests</a
        >.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/PlayerQuests.cs:390-391 — rewardExperience added directly, no multipliers -->
      <p class="text-sm text-muted-foreground">
        XP varies per quest and is shown on each quest's page. No multipliers
        apply.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Zone Discovery XP -->
  <Card.Root id="zone-discovery-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Zone Discovery XP</Card.Title>
      <Card.Description>
        Experience earned the first time you discover a zone.
      </Card.Description>
      <!-- Source: server-scripts/ZoneTrigger.cs — no multipliers apply to zone discovery XP -->
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Source: server-scripts/ZoneTrigger.cs:148-174 — discovery XP amounts -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Zone type</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Dungeon</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">City / Village</td>
            <td class="p-2 text-right font-mono">10</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">All other zones</td>
            <td class="p-2 text-right font-mono">25</td>
          </tr>
        </tbody>
      </table>
      <p class="text-sm text-muted-foreground">No multipliers apply.</p>
    </Card.Content>
  </Card.Root>
</div>

<style>
  .level-chart {
    width: 100%;
    height: auto;
    font-size: 11px;
  }
  .level-chart .axis {
    stroke: var(--border);
    stroke-width: 1;
  }
  .level-chart .grid {
    stroke: var(--border);
    stroke-width: 1;
    opacity: 0.45;
  }
  .level-chart .tick {
    fill: var(--muted-foreground);
  }
  .level-chart .curve-early {
    fill: none;
    stroke: var(--muted-foreground);
    stroke-width: 2;
    opacity: 0.7;
  }
  .level-chart .curve-uneased {
    fill: none;
    stroke: var(--muted-foreground);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    opacity: 0.55;
  }
  .level-chart .curve-late {
    fill: none;
    stroke: var(--color-emerald-500, #10b981);
    stroke-width: 2.5;
  }
  .level-chart .bar-bonus {
    fill: var(--color-emerald-500, #10b981);
    opacity: 0.85;
  }
  .level-chart .bar-even {
    fill: var(--muted-foreground);
    opacity: 0.7;
  }
  .level-chart .bar-penalty {
    fill: var(--color-red-500, #ef4444);
    opacity: 0.7;
  }
  .level-chart .marker-line {
    stroke: var(--color-emerald-500, #10b981);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.7;
  }
  .level-chart .marker {
    fill: var(--color-emerald-500, #10b981);
  }
</style>
