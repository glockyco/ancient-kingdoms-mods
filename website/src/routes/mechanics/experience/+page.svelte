<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import { achievementAnchor } from "$lib/data/achievements/relationships";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import * as Card from "$lib/components/ui/card";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import {
    getQualityTextColorClass,
    formatNumber,
    formatPercent,
  } from "$lib/utils/format";
  import { getQualityName } from "$lib/constants/quality";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    levelExperience,
    veteranExperience,
    killExperience,
    deathExperience,
  } from "$lib/calculation/experience";

  let { data } = $props();

  const LEVEL_CAP = $derived(data.maxLevel);
  const LATE_GAME_START = 40;
  const XP_BASE_GROWTH = 1.258;

  // Source: server-scripts/Experience.cs:26-36,464-472 and server-scripts/ExponentialLong.cs:11-14
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
  const LATE_POINTS = $derived(pointsFor(LATE_GAME_START, LEVEL_CAP - 1));
  // The same 1.258 growth carried past level 40, drawn for contrast with the eased curve.
  const UNEASED_POINTS = $derived(
    Array.from({ length: LEVEL_CAP - LATE_GAME_START }, (_, index) => {
      const level = LATE_GAME_START + index;
      const cost =
        XP_TO_NEXT_LEVEL[LATE_GAME_START - 1] * XP_BASE_GROWTH ** index;
      return `${chartX(level).toFixed(1)},${chartY(cost).toFixed(1)}`;
    }).join(" "),
  );
  const Y_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];
  const X_TICKS = [1, 10, 20, 30, 40, 49];

  // Source: server-scripts/Npc.cs:OnInteract; server-scripts/Experience.cs:current; server-scripts/UISkills.cs:DualSpecButton2; server-scripts/Utils.cs:GetDailyAdventurerQuest — recruitment, daily quests, and specialization unlocks.
  const MILESTONES = $derived([
    {
      level: 10,
      unlock: "Hire your first mercenary from a recruiter.",
      href: "/mercenaries#recruiters",
    },
    {
      level: 20,
      unlock: "A second mercenary can be active.",
      href: "/mercenaries",
    },
    {
      level: 30,
      unlock: "A third mercenary can be active.",
      href: "/mercenaries",
    },
    {
      level: 40,
      unlock: "A fourth mercenary can be active.",
      href: "/mercenaries",
      extra: "The Adventurer's Guild offers its daily quests.",
      extraHref: "/professions/adventuring",
    },
    {
      level: LEVEL_CAP,
      unlock: "Further experience earns veteran points.",
      href: "#veteran-points",
      extra: "Unlock a second specialization for 10 000 gold.",
      extraHref: "/mechanics/character#skills-and-specializations",
    },
  ]);

  // Source: server-scripts/Experience.cs:UserCode_TargetShowLevelUpChat__Int32__Int32__Int32 — leveling to 10, 30 and 50 unlocks these achievements.
  // Source: server-scripts/Experience.cs:372-394 — each veteran point unlocks VETERAN_EDGE, so the first one earns it.
  const MILESTONE_ACHIEVEMENTS: Record<
    string,
    { level: number; lead: string }
  > = {
    FIRST_STEPS: { level: 10, lead: "Unlocks the" },
    CHAMPION_RISE: { level: 30, lead: "Unlocks the" },
    TRUE_HERO: { level: 50, lead: "Unlocks the" },
    VETERAN_EDGE: { level: 50, lead: "Your first veteran point unlocks the" },
  };
  const milestoneRows = $derived(
    MILESTONES.map((row) => ({
      level: row.level,
      links: [
        { text: row.unlock, href: row.href },
        ...(row.extra && row.extraHref
          ? [{ text: row.extra, href: row.extraHref }]
          : []),
        ...data.achievements
          .filter(
            (achievement) =>
              MILESTONE_ACHIEVEMENTS[achievement.id]?.level === row.level,
          )
          .map((achievement) => ({
            text: `${MILESTONE_ACHIEVEMENTS[achievement.id].lead} ${achievement.name} achievement.`,
            href: `/achievements#${achievementAnchor(achievement.id)}`,
          })),
      ],
    })),
  );

  // Source: server-scripts/Experience.cs:38,51-52,372-407 — experience cost per Veteran Point.
  const MAX_VETERAN_POINTS = $derived(data.maxVeteranPoints);
  const VETERAN_BASE_COST = 1_000_000;
  const VETERAN_COST_PER_POINT = 20_000;

  /** Experience for the point that takes the total from `points` to `points + 1`. */
  const veteranStepCost = (points: number) =>
    VETERAN_BASE_COST + VETERAN_COST_PER_POINT * points;
  /** Total XP to this Veteran Level, excluding the two-point-rank counting defect. */
  const veteranSpent = (points: number) =>
    points * VETERAN_BASE_COST +
    (VETERAN_COST_PER_POINT * points * (points - 1)) / 2;
  const VETERAN_TOTAL = $derived(veteranSpent(MAX_VETERAN_POINTS));

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
  const VET_POINTS = $derived(
    Array.from({ length: 41 }, (_, index) => {
      const points = (index * MAX_VETERAN_POINTS) / 40;
      return `${vetX(points).toFixed(1)},${vetY(veteranSpent(points)).toFixed(1)}`;
    }).join(" "),
  );
  const VET_Y_TICKS = [0, 150_000_000, 300_000_000, 450_000_000, 600_000_000];
  const VET_X_TICKS = $derived(
    Array.from({ length: 5 }, (_, index) => (index * MAX_VETERAN_POINTS) / 4),
  );
  const millions = (value: number) =>
    `${formatNumber(Math.round(value / 1_000_000))}M`;

  // Source: server-scripts/Experience.cs:BalanceExperienceReward — BalanceExperienceReward selects the level-gap multiplier.
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
        ? "10+ higher"
        : diff === 21
          ? "21+ lower"
          : diff === 0
            ? "same"
            : `${Math.abs(diff)} ${diff < 0 ? "higher" : "lower"}`;
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
  description={`XP needed for each level up to ${LEVEL_CAP}, what each level grants, veteran points past the cap, XP lost on death, and every XP source: kills, scrolls, professions, quests, and zone discovery.`}
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

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/experience"]} />

  <!-- Levels -->
  <Card.Root id="levels" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Levels</Card.Title>
      <Card.Description>
        Experience needed for each level through {LEVEL_CAP}.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Experience.cs:current and GetRequiredExperience — each full experience bar consumes its own cost and advances the level, and the requirement curve changes shape at level 40. -->
        <span class="block"
          >Extra experience after a level-up counts toward the next level.</span
        >
      </p>
      <Calculation calculation={levelExperience(XP_TO_NEXT_LEVEL)} />

      <div class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 class="font-semibold">Experience per level</h3>
          <span class="text-xs text-muted-foreground"
            >Log scale &middot; <span class="text-emerald-500">green</span>: 18%
            more XP per level after level 40 &middot; dashed: the earlier 25.8%
            growth, continued for comparison</span
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
              text-anchor="end">{formatNumber(tick)}</text
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
            <dd class="font-mono text-foreground">{formatNumber(xpToNext)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Total XP to reach level {pickedLevel}
            </dt>
            <dd class="font-mono text-foreground">{formatNumber(xpBehind)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              XP left to level {LEVEL_CAP}
            </dt>
            <dd class="font-mono text-foreground">{formatNumber(xpAhead)}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Progress from level 1 to {LEVEL_CAP}
            </dt>
            <dd class="font-mono text-foreground">
              {formatPercent(journeyDone / 100, {
                decimals: journeyDone < 1 ? 2 : 1,
                trailingZeros: true,
              })}
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
                <th class="text-right p-2 font-medium"
                  >Total XP at next level</th
                >
              </tr>
            </thead>
            <tbody>
              {#each LEVEL_ROWS as row (row.level)}
                <tr class="border-b hover:bg-muted/30">
                  <td class="p-2">{row.level} &rarr; {row.level + 1}</td>
                  <td class="p-2 text-right font-mono"
                    >{formatNumber(row.cost)}</td
                  >
                  <td class="p-2 text-right font-mono"
                    >{formatNumber(row.total)}</td
                  >
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
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:349-357 — every level grants one attribute point, one skill point, and a full heal while alive. -->
          <span class="block"
            >Each level grants one attribute point and one class skill point.</span
          >
          <span class="block"
            >If you are alive, leveling also refills your Hit Points and Mana.</span
          >
        </p>
        <!-- Source: server-scripts/Experience.cs:current — each class-growth column applies independently when the level is divisible by its number. -->
        <p class="text-sm text-muted-foreground">
          Your class also grants the attribute increases below. At level 10, for
          example, you receive both the "Every 2nd" and "Every 5th" increases.
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
            {#each data.attributeGains as row (row.className)}
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
              {#each milestoneRows as row (row.level)}
                <tr class="border-b hover:bg-muted/30">
                  <td class="p-2 font-mono">{row.level}</td>
                  <td class="p-2">
                    {#each row.links as link, i (link.href)}{i > 0 ? " " : ""}<a
                        href={link.href}
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >{link.text}</a
                      >{/each}
                  </td>
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
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:372-390 — at the cap a filled bar grants a Veteran Point, an attribute point, a full heal, and a veteran bonus refresh for mercenaries. -->
          <span class="block"
            >At level {LEVEL_CAP}, filling the experience bar grants one veteran
            point and one attribute point instead of another level.</span
          >
          <!-- Source: server-scripts/Experience.cs:current; server-scripts/Player.cs:LevelUpMercenaries — living players refill Health and Mana; summoned mercenaries gain their veteran bonuses and heal. -->
          <span class="block">
            If you are alive, it also refills your Hit Points and Mana. Your
            summoned mercenaries gain their <a
              href="/mercenaries#how-it-works"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >veteran bonuses</a
            >. Living summoned mercenaries return to full Hit Points.
          </span>
        </p>
        <Calculation calculation={veteranExperience()} />
      </div>

      <div class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 class="font-semibold">Total XP by total veteran points</h3>
          <span class="text-xs text-muted-foreground"
            >Dashed line: total XP from level 1 to {LEVEL_CAP}</span
          >
        </div>
        <!-- Source: server-scripts/Experience.cs:max; server-scripts/PlayerSkills.cs:GetTotalVeteranPoints — the chart sums successive point costs without ranks that cost 2 points. -->
        <svg
          class="level-chart"
          viewBox="0 0 {VET_CHART.w} {VET_CHART.h}"
          role="img"
          aria-label="Total XP by total veteran points without learning ranks that cost 2 veteran points"
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
              text-anchor="middle">{formatNumber(tick)}</text
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
            text-anchor="middle">Total veteran points</text
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
            >{formatNumber(pickedVeteran)}</span
          >
          <span class="font-semibold">total veteran points</span>
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
              {pickedVeteran < MAX_VETERAN_POINTS
                ? formatNumber(veteranNext)
                : "At cap"}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Total XP to reach this point count
            </dt>
            <dd class="font-mono text-foreground">
              {formatNumber(veteranBehind)}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">
              Times the XP from level 1 to {LEVEL_CAP}
            </dt>
            <dd class="font-mono text-foreground">
              {formatNumber(veteranRuns, {
                decimals: 1,
                trailingZeros: true,
              })}&times;
            </dd>
          </div>
        </dl>
        <!-- Source: server-scripts/Experience.cs:max; server-scripts/PlayerSkills.cs:GetTotalVeteranPoints — these totals sum each point's XP cost without ranks that cost 2 points. -->
        <p class="text-sm text-muted-foreground">
          If you never learn a rank that costs 2 points, reaching {formatNumber(
            MAX_VETERAN_POINTS,
          )}
          total veteran points takes
          {formatNumber(VETERAN_TOTAL)} XP, roughly {formatNumber(
            VETERAN_TOTAL / TOTAL_TO_CAP,
            { decimals: 0, trailingZeros: true },
          )}
          times the XP from level 1 to {LEVEL_CAP}.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Spending and counting</h3>
        <p class="text-sm text-muted-foreground">
          Veteran points buy ranks in veteran skills. Your total is your unspent
          points plus your learned veteran ranks.
        </p>
        <!-- Source: server-scripts/PlayerSkills.cs:GetTotalVeteranPoints,ResetVeteranSkillPoints; server-scripts/Experience.cs:max — two-point ranks count and refund only one point. -->
        <!-- Observed: docs/game-bugs/two-point-veteran-skills-lose-points-and-progression.md — two-point ranks lower VT and XP cost; paid resets lose the second point. -->
        <p class="text-sm text-muted-foreground">
          Your total includes only 1 point per learned veteran skill rank, even
          if the rank costs 2 points. This bug lowers your total by 1 for each
          2-point rank you learn and cuts the next point's XP cost by
          20&#8239;000 XP. Resetting refunds only 1 of the 2 points.
        </p>
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Player.cs:11367-11402; server-scripts/Npc.cs:1832-1850; server-scripts/PlayerSkills.cs:1931-1958 — the paid veteran reset clears ranks and refunds one point per learned rank. -->
          {#if data.veteranMaster}
            <a
              href="/npcs/{data.veteranMaster.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{data.veteranMaster.name}</a
            >, the Veteran Master,
          {:else}
            The Veteran Master
          {/if}
          resets your learned veteran skill ranks for 10&#8239;000 gold and a
          {#if data.redemptionToken}
            <ItemLink
              itemId={data.redemptionToken.id}
              itemName={data.redemptionToken.name}
              colorClass={getQualityTextColorClass(
                data.redemptionToken.quality,
              )}
              tooltipHtml={data.redemptionToken.tooltip_html}
              imageAvailable={data.redemptionToken.visual_public_path}
            />
          {:else}
            Token of Redemption
          {/if}.
        </p>
        <p class="text-sm text-muted-foreground">
          <!-- Source: server-scripts/Experience.cs:372-407 — earning stops at 200 total points and pays out the max-level reward item instead. -->
          <span class="block"
            >You can earn up to {formatNumber(MAX_VETERAN_POINTS)} total veteran points.</span
          >
          <span class="block"
            >At that total, each filled experience bar grants a
            {#if data.maxLevelReward}
              <ItemLink
                itemId={data.maxLevelReward.id}
                itemName={data.maxLevelReward.name}
                colorClass={getQualityTextColorClass(
                  data.maxLevelReward.quality,
                )}
                tooltipHtml={data.maxLevelReward.tooltip_html}
                imageAvailable={data.maxLevelReward.visual_public_path}
              />
            {:else}
              reward item
            {/if}
            instead.</span
          >
          <!-- Source: server-scripts/Experience.cs:current — the filled bar is spent before inventory capacity is checked for the reward. -->
          <span class="block"
            >If your inventory is full, the bar is used up without a scroll.</span
          >
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Kill XP -->
  <Card.Root id="kill-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Kill XP</Card.Title>
      <Card.Description>
        Experience earned by killing monsters or hostile NPCs.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <h3 class="font-semibold">Base XP</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Each <a
              href="/monsters"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >monster's page</a
            > shows its base XP.</span
          >
          <span class="block"
            >When you fight alone outside a dungeon, a same-level monster grants
            its base XP before bonuses.</span
          >
          <!-- Source: server-scripts/Monster.cs:OnDeath — the highest-level nearby party player determines the level adjustment. -->
          <span class="block"
            >In a party, the highest-level nearby player determines the level
            adjustment.</span
          >
        </p>
        <!-- Source: server-scripts/Npc.cs:CalculateRewardExp,OnDeath — NPC base XP is rounded before halving and rounding again; sharing, level, dungeon, and Double XP rules follow. -->
        <p class="text-sm text-muted-foreground">
          Hostile NPC XP starts at 15 XP and is multiplied by 112% for each
          level above 1. The game rounds that amount, halves it, then rounds
          again to get base XP. Level differences, dungeon kills, party sharing,
          and Double XP change your reward just as they do for monsters.
          Forgotten Altars give no bonus for NPC kills.
        </p>
        <!-- Source: server-scripts/PlayerParty.cs:GetMembersInProximity — party players observing the credited player and within 40 yd share rewards. -->
        <!-- Mirror.dll and Mirror.Components.dll in the server build of Steam build 25863605: NetworkServer.RebuildObserversCustom adds a player's own connection to its observers, so the credited player always counts. SpatialHashingInterestManagement (visRange 96 at runtime, 48-unit cells, 3×3 neighbourhood) makes every player closer than 40 yd an observer, rebuilt once per second. -->
        <p class="text-sm text-muted-foreground">
          You share kill XP with <a
            href="/mechanics/party#shared-rewards"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >nearby party players</a
          >. When alone, enter your own level and 1 player in the calculator.
        </p>
      </div>
      <Calculation calculation={killExperience()} />

      <div class="space-y-2">
        <h3 class="font-semibold">Level difference scaling</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Monsters 10 or more levels above you award 150% of their base XP.</span
          >
          <span class="block"
            >Monsters 21 or more levels below you award no XP.</span
          >
        </p>
        <!-- Source: server-scripts/Experience.cs:BalanceExperienceReward — BalanceExperienceReward -->
        <svg
          class="level-chart"
          viewBox="0 0 {DIFF_CHART.w} {DIFF_CHART.h}"
          role="img"
          aria-label="Level-difference percentage by how far the monster's level is from yours"
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
              text-anchor="end">{formatPercent(tick, { decimals: 0 })}</text
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
              <title
                >{row.label}: {formatPercent(row.multiplier, {
                  decimals: 0,
                })}</title
              >
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
                    >Monster level compared with yours</th
                  >
                  <th class="text-right p-2 font-medium"
                    >Level-difference percentage</th
                  >
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
                          : ''}"
                      >{formatPercent(row.multiplier, { decimals: 0 })}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Additional modifiers</h3>
        <p class="text-sm text-muted-foreground">
          Dungeon kills, the Forgotten Altar event, and Double XP buffs change
          the level-scaled XP award:
        </p>
        <!-- Source: server-scripts/Experience.cs:573-577 — dungeon +10% bonus -->
        <!-- Source: server-scripts/Monster.cs:OnDeath — Double XP applies once to solo and party kills, before the Forgotten Altar multiplier of 1.4 is rounded. -->
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
                <td class="p-2 text-right">Adds 10% to the level adjustment</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2"
                  >Monsters from a <a
                    href="/altars"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Forgotten Altar event</a
                  ></td
                >
                <td class="p-2 text-right">40% more XP, rounded</td>
              </tr>
              <!-- Source: server-scripts/PotionItem.cs:CanUse — a Double XP potion cannot be used while the season's Double XP buff is active. -->
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2"
                  >Double XP buff: use an <a
                    href="/items/elixir_of_enlightened_learning"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Elixir of Enlightened Learning</a
                  > (not during Halloween or the Winter Festival)</td
                >
                <td class="p-2 text-right">100% more XP</td>
              </tr>
              <!-- Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents; server-scripts/Player.cs:Start — during Halloween and the Winter Festival every online player gets the season's Double XP buff. -->
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2"
                  >Double XP buff: <a
                    href="/mechanics/seasonal-events#double-xp"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Halloween or the Winter Festival</a
                  > gives it to all online players</td
                >
                <td class="p-2 text-right">100% more XP</td>
              </tr>
              <!-- Source: server-scripts/Monster.cs:3205-3208,3242-3245; server-scripts/RegionalEvents.cs:188-195,363-375; server-scripts/RegionalEventProgress.cs:157-164 — Prosperity adds 15% monster XP in the region and its dungeons after the other multipliers, rounded down. -->
              <tr class="hover:bg-muted/30">
                <td class="p-2"
                  ><a
                    href="/mechanics/regional-events#prosperity"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Prosperity</a
                  > after a regional event</td
                >
                <td class="p-2 text-right"
                  >15% more XP in that region and its dungeons</td
                >
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/Skills.cs:hasDoubleExp; server-scripts/Monster.cs:OnDeath — any Double XP buff doubles the award once, then the Forgotten Altar multiplier applies. -->
        <p class="text-sm text-muted-foreground">
          Multiple Double XP buffs do not stack. Forgotten Altar monsters give
          40% more XP after Double XP, rounded to the nearest whole XP.
          <!-- Source: server-scripts/Monster.cs:3205-3208,3242-3245; server-scripts/RegionalEventProgress.cs:157-164 — Prosperity multiplies the award after Double XP and the Forgotten Altar bonus, then floors it. -->
          Prosperity comes last and rounds down.
        </p>
        <!-- Source: server-scripts/Monster.cs:OnDeath — double XP applies to kills -->
        <!-- Source: server-scripts/GatherItem.cs:640,826 — double XP applies to gathering -->
        <!-- Source: server-scripts/Player.cs:13861-13874 — double XP applies to alchemy -->
        <!-- Source: server-scripts/Player.cs:13869-13874 — double XP applies to scribing -->
        <!-- Source: server-scripts/Player.cs:UserCode_CmdCraftItem__NetworkIdentity__Int32 — double XP applies to crafting and cooking -->
        <!-- Source: server-scripts/Player.cs:UserCode_CmdCraftAugment__NetworkIdentity__String__String — Double XP applies to attaching augments. -->
        <!-- Source: server-scripts/PlayerQuests.cs:399-400 — no double XP for quests -->
        <!-- Source: server-scripts/ZoneTrigger.cs — no double XP for zone discovery -->
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Double XP buffs double the XP you earn from kills, gathering,
            alchemy, scribing, cooking, crafting, and attaching augments.</span
          >
          <span class="block"
            >They give no bonus to XP scrolls, quests, or zone discovery.</span
          >
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Party XP</h3>
        <!-- Source: server-scripts/Experience.cs:CalculateExperienceShare -->
        <!-- Source: server-scripts/Monster.cs:3180-3209 — party kill XP award loop -->
        <!-- Source: server-scripts/Party.cs:9 — Capacity = 5 -->
        <!-- Source: server-scripts/Party.cs:11 — BonusExperiencePerMember = 1.25f -->
        <!-- Source: server-scripts/Monster.cs:OnDeath, Experience.cs:CalculateExperienceShare — the kill passes 1.25f as bonusPercentagePerMember. -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Nearby party players</th>
                <th class="text-right p-2 font-medium">XP per living player</th>
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
                  >116.67%</td
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
        <!-- Source: server-scripts/Monster.cs:3180-3209 — the award loop counts and pays party players in proximity, not their mercenaries. -->
        <p class="text-sm text-muted-foreground">
          Mercenaries take none of your kill XP and do not count toward party
          sharing.
        </p>
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
      <!-- Source: server-scripts/Experience.cs:Death — Death() = max * 0.1f -->
      <!-- Source: server-scripts/Player.cs:OnDeath — lossExp capped at experience.current -->
      <Calculation calculation={deathExperience()} />
      <p class="text-sm text-muted-foreground">
        <a
          href="/mechanics/death#death"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Death and Remains</a
        > explains how to recover XP through your remains or Resurrection.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Scroll XP -->
  <Card.Root id="scroll-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Scroll XP</Card.Title>
      <Card.Description>
        Experience earned by using XP scrolls. No bonus or penalty changes it.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/PotionItem.cs:Use — usageExperience is added to player experience. -->
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
            <td class="p-2 text-right font-mono">1&#8239;000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_iii"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge III</a
              ></td
            >
            <td class="p-2 text-right font-mono">5&#8239;000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_iv"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge IV</a
              ></td
            >
            <td class="p-2 text-right font-mono">25&#8239;000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_v"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge V</a
              ></td
            >
            <td class="p-2 text-right font-mono">100&#8239;000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_illumination"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Illumination</a
              ></td
            >
            <td class="p-2 text-right font-mono">1&#8239;500&#8239;000</td>
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
        <!-- Source: server-scripts/GatherItem.cs:630-645,818-830 — qualifying resources and successful catch rolls award XP, other objects do not. -->
        You earn XP each time you gather an herb, mineral, or radiant spark, or make
        a successful catch at a fishing spot. Resources that give only quest items
        give no XP.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/GatherItem.cs:630-639 — gathering XP by tier for non-quest plants, minerals, and sparks. -->
      <!-- Source: server-scripts/GatherItem.cs:818-830 — levelItem selects 15 / 150 / 750 / 4000 / 10000 XP. -->
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
            <td class="p-2 text-right font-mono">4&#8239;000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier V</td>
            <td class="p-2 text-right font-mono">10&#8239;000</td>
          </tr>
        </tbody>
      </table>
      <!-- Source: server-scripts/GatherItem.cs:640-642,826-828; server-scripts/RegionalEvents.cs:363-375; server-scripts/RegionalEventProgress.cs:157-164 — Prosperity adds 15% gathering and fishing XP outdoors in its region, after Double XP, rounded down. -->
      <p class="mt-3 text-sm text-muted-foreground">
        After a regional event,
        <a
          href="/mechanics/regional-events#prosperity"
          class="text-blue-600 dark:text-blue-400 hover:underline">Prosperity</a
        >
        gives 15% more gathering and fishing XP in that region, after Double XP and
        rounded down. Gathering and fishing in its dungeons get no bonus.
      </p>
      <p class="mt-3 text-sm text-muted-foreground">
        Each resource's tier is on its <a
          href="/gather-items"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Gathering Resources page</a
        >.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Alchemy XP -->
  <Card.Root id="alchemy-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Alchemy XP</Card.Title>
      <Card.Description>
        <!-- Source: server-scripts/Player.cs:UserCode_CmdMakePotion__Int32 — successful brews award XP by recipe level. -->
        Experience for each successful brew at an Alchemy Table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:13861-13868 — alchemy XP by recipe tier -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          {#each [20, 300, 2000, 5000, 12000] as xp, index (index)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="p-2">Tier {["I", "II", "III", "IV", "V"][index]}</td>
              <td class="p-2 text-right font-mono">{formatNumber(xp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="mt-3 text-sm text-muted-foreground">
        Each <a
          href="/recipes"
          class="text-blue-600 dark:text-blue-400 hover:underline">recipe</a
        > shows its tier and XP.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Scribing XP -->
  <Card.Root id="scribing-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Scribing XP</Card.Title>
      <Card.Description>
        Experience earned by crafting scrolls at a Scribing Table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:UserCode_CmdMakePotion__Int32 — isScribingTable overrides num5 = level.current * 100 -->
      <p class="text-sm text-muted-foreground">
        Each successful craft gives 100 XP per character level: 4&#8239;000 XP
        at level 40. Double XP buffs double that reward.
      </p>
      <p class="text-sm text-muted-foreground">
        Find scroll recipes in <a
          href="/recipes"
          class="text-blue-600 dark:text-blue-400 hover:underline">Recipes</a
        >
        and their mastery requirements in
        <a
          href="/professions/scroll_mastery"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Scroll Mastery</a
        >.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Cooking XP -->
  <Card.Root id="cooking-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Cooking XP</Card.Title>
      <Card.Description>
        <!-- Source: server-scripts/Player.cs:UserCode_CmdCraftItem__NetworkIdentity__Int32 — food awards XP only after a successful cook. -->
        Experience for each successful cook at a Cooking Oven.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:14109-14115 — cooking XP by item quality (same table as crafting) -->
      <!-- Source: server-scripts/Player.cs:14125-14160 — cooking branch awards XP on success only -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          {#each [15, 150, 750, 3500, 10000] as xp, index (index)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="p-2">Tier {["I", "II", "III", "IV", "V"][index]}</td>
              <td class="p-2 text-right font-mono">{formatNumber(xp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="mt-3 text-sm text-muted-foreground">
        Each <a
          href="/recipes"
          class="text-blue-600 dark:text-blue-400 hover:underline">recipe</a
        > shows its tier and XP.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Crafting XP -->
  <Card.Root id="crafting-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Crafting XP</Card.Title>
      <Card.Description>
        Experience earned by crafting items at a <a
          href="/mechanics/crafting#crafting"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Craft Station</a
        >.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:14109-14115 — crafting XP by item quality -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          {#each [15, 150, 750, 3500, 10000] as xp, index (index)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="p-2">Tier {["I", "II", "III", "IV", "V"][index]}</td>
              <td class="p-2 text-right font-mono">{formatNumber(xp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="mt-3 text-sm text-muted-foreground">
        Each <a
          href="/recipes"
          class="text-blue-600 dark:text-blue-400 hover:underline">recipe</a
        > shows its tier and XP.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="augment-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Augment XP</Card.Title>
      <Card.Description>
        Experience earned by <a
          href="/mechanics/crafting#augments"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >attaching an augment</a
        > at a Craft Station.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:UserCode_CmdCraftAugment__NetworkIdentity__String__String — augment quality 0–3 gives 15/150/750/3500 XP; Double XP applies. -->
      <table class="w-full text-sm border-collapse">
        <thead
          ><tr class="border-b"
            ><th class="text-left p-2 font-medium">Augment quality</th><th
              class="text-right p-2 font-medium">XP</th
            ></tr
          ></thead
        >
        <tbody>
          {#each [15, 150, 750, 3500] as xp, index (index)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="p-2">{getQualityName(index)}</td>
              <td class="p-2 text-right font-mono">{formatNumber(xp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="mt-3 text-sm text-muted-foreground">
        Each augment's quality is shown on its <a
          href="/items"
          class="text-blue-600 dark:text-blue-400 hover:underline">item page</a
        >.
      </p>
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
      <!-- Source: server-scripts/PlayerQuests.cs:399-400 — rewardExperience added directly, no multipliers -->
      <p class="text-sm text-muted-foreground">
        XP varies per quest and is shown on each quest's page. No bonus or
        penalty changes it.
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
      <!-- Source: server-scripts/ZoneTrigger.cs:NewZoneDiscovered — discovery XP amounts -->
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
            <td class="p-2">
              City (
              {#each data.discoveryCities as city, index (city.id)}
                {index > 0 ? ", " : ""}{#if city.zoneId}<a
                    href="/zones/{city.zoneId}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{city.name}</a
                  >{:else}{city.name}{/if}
              {/each}
              )
            </td>
            <td class="p-2 text-right font-mono">10</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">All other zones</td>
            <td class="p-2 text-right font-mono">25</td>
          </tr>
        </tbody>
      </table>
      <p class="text-sm text-muted-foreground">
        No bonus or penalty changes zone discovery XP. See <a
          href="/zones"
          class="text-blue-600 dark:text-blue-400 hover:underline">Zones</a
        > for each zone's discovery XP.
      </p>
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
