<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ItemSourceLinks from "$lib/components/ItemSourceLinks.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Trophy from "@lucide/svelte/icons/trophy";
  import { formatDuration } from "$lib/utils/format";
  import {
    DWARF_STARTING_MINING_PERCENT,
    MINING_SUCCESS_FLOOR,
    isMineable,
    isMiningEffortless,
    miningSkillGainChancePercent,
    miningSkillGainRange,
    miningSuccessPercent,
    rawMiningSuccessChance,
  } from "$lib/utils/mining";

  let { data } = $props();

  let skillLevel = $state(0);
  let pickaxeQuality = $state(0);

  const ROMAN = ["I", "II", "III", "IV", "V"];

  const sections = [
    { id: "how-it-works", label: "How mining works" },
    { id: "pickaxes", label: "Pickaxes" },
    { id: "calculator", label: "Success by skill" },
    { id: "ores", label: "Ores" },
    { id: "where", label: "Where to mine" },
    { id: "gems", label: "Bonus gems" },
    { id: "uses", label: "What ore is for" },
  ];

  const bestPickaxe = $derived(
    data.pickaxes.find((p) => p.quality === pickaxeQuality) ?? null,
  );
  const gainChance = $derived(miningSkillGainChancePercent(skillLevel));
  const payingTiers = $derived(
    data.ores.filter(
      (ore) =>
        isMineable(ore.tier, pickaxeQuality, skillLevel) &&
        !isMiningEffortless(ore.tier, skillLevel),
    ),
  );
  const mineableTiers = $derived(
    data.ores.filter((ore) => isMineable(ore.tier, pickaxeQuality, skillLevel)),
  );

  // The curve plot is drawn once per skill/pickaxe change rather than per tier so
  // the five paths share one coordinate space.
  const PLOT = { w: 720, h: 260, left: 46, right: 14, top: 16, bottom: 34 };
  const plotW = PLOT.w - PLOT.left - PLOT.right;
  const plotH = PLOT.h - PLOT.top - PLOT.bottom;
  const px = (fraction: number) => PLOT.left + fraction * plotW;
  const py = (fraction: number) => PLOT.top + (1 - fraction) * plotH;

  const TIER_STROKE = [
    "var(--stat-hp)",
    "var(--stat-mana)",
    "var(--chart-3)",
    "var(--stat-spell)",
    "var(--chart-5)",
  ];

  // Source: server-scripts/GatherItem.cs:OnInteractServer — the skill above which
  // each tier stops granting mastery, paired with the tiers it silences.
  const NO_GAIN_BANDS = [
    { from: 0.25, label: "I" },
    { from: 0.5, label: "I–II" },
    { from: 0.75, label: "I–III" },
  ];

  const curves = $derived(
    data.ores.map((ore, index) => {
      // The node refuses the attempt below the floor, so the curve is drawn in two
      // segments: a dashed run the game will not let you attempt, and a solid run
      // it will. The success function rises monotonically with skill, so there is
      // at most one crossing.
      const refused: string[] = [];
      const allowed: string[] = [];
      for (let step = 0; step <= 100; step++) {
        const value = rawMiningSuccessChance(ore.tier, pickaxeQuality, step);
        const point = `${px(step / 100)},${py(value)}`;
        if (value < MINING_SUCCESS_FLOOR) refused.push(point);
        else allowed.push(point);
      }
      // Join the segments so the dashed run meets the solid one without a gap.
      if (refused.length > 0 && allowed.length > 0) refused.push(allowed[0]);
      return {
        ore,
        stroke: TIER_STROKE[index % TIER_STROKE.length],
        refusedD: refused.length > 1 ? `M${refused.join("L")}` : null,
        allowedD: allowed.length > 1 ? `M${allowed.join("L")}` : null,
        atSkill: rawMiningSuccessChance(ore.tier, pickaxeQuality, skillLevel),
        effortless: isMiningEffortless(ore.tier, skillLevel),
        mineable: isMineable(ore.tier, pickaxeQuality, skillLevel),
      };
    }),
  );

  const maxZoneNodes = $derived(
    Math.max(...data.ores.flatMap((o) => o.zones.map((z) => z.node_count))),
  );
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`Mining raises your success chance on higher-tier ore. ${data.ores.length} ores across ${data.totalNodes} nodes, with success odds, respawn timers, bonus gems, and what each ore is used for.`}
  path="/professions/mining"
/>

<div class="container mx-auto max-w-4xl space-y-10 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <header class="space-y-4">
    <div class="flex items-center gap-3">
      <div class="rounded-lg bg-amber-500/10 p-2.5">
        <Pickaxe class="h-6 w-6 text-amber-500" />
      </div>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {data.profession.name}
        </h1>
        <p
          class="text-xs uppercase tracking-wider text-muted-foreground"
          aria-label="Category"
        >
          {data.profession.category}
        </p>
      </div>
    </div>

    <!-- Source: server-scripts/Utils.cs:GetSuccessProbMining — tier IV is 0.05 per
         pickaxe quality plus 0.4 per skill, so a Draconium pickaxe alone gives 20%
         and full Mining adds the other 40 points. -->
    <p class="max-w-2xl text-balance leading-relaxed">
      Mine ore from nodes across the world. Your skill and your pickaxe together
      control your chance to get ore from a node.
      <strong class="font-semibold text-foreground"
        >A Draconium node with a Draconium pickaxe gives 20% at 0 Mining and 60%
        at 100.</strong
      >
    </p>

    <PageSections {sections} />
  </header>

  <section id="how-it-works" class="space-y-4">
    <h2 class="text-xl font-semibold">How mining works</h2>
    <ol class="divide-y divide-border">
      <!-- Source: server-scripts/Player.cs:TryGetSelectedPickaxe — the gather needs a
           Pickaxe-category weapon that is not broken. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">Equip a pickaxe.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            A better <a
              href="#pickaxes"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >pickaxe</a
            > gives a better chance on every node. A broken pickaxe does not work.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — below 0.2 the node
           refuses the attempt outright.
           Source: server-scripts/PlayerInventory.cs:DecreaseDurabilityPickaxe — one
           durability is spent before the success roll, so a failure still costs it. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">Click a node.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            If your chance is less than {MINING_SUCCESS_FLOOR * 100}%, you
            cannot mine the node. Each try costs 1 durability. This includes the
            tries that fail.
          </p>
        </div>
      </li>
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">3</span>
        <div>
          <p class="font-medium">Collect the ore.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Every success gives 1 ore and one more roll for a <a
              href="#gems"
              class="text-blue-600 hover:underline dark:text-blue-400">gem</a
            >. If you fail, the node stays ready and you can try again.
          </p>
        </div>
      </li>
    </ol>
  </section>

  <section id="pickaxes" class="space-y-4">
    <h2 class="text-xl font-semibold">Pickaxes</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      You need 50% Mining to use a Rusty Pickaxe on a Tier V node. A Draconium
      Pickaxe works at any skill.
    </p>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50 text-left text-xs">
            <th class="whitespace-nowrap p-3 font-medium">Pickaxe</th>
            <th class="whitespace-nowrap p-3 text-right font-medium"
              >Tier V at 100 Mining</th
            >
            <th class="p-3 font-medium">Where to get it</th>
          </tr>
        </thead>
        <tbody>
          {#each data.pickaxes as pickaxe (pickaxe.id)}
            <tr class="border-b align-top last:border-0">
              <td class="whitespace-nowrap p-3">
                <ItemLink
                  itemId={pickaxe.id}
                  itemName={pickaxe.name}
                  tooltipHtml={pickaxe.tooltip_html}
                />
              </td>
              <!-- Source: server-scripts/Utils.cs:GetSuccessProbMining — on tier 4 the
                   chance is quality x 0.05 plus skill x 0.4. -->
              <td class="p-3 text-right tabular-nums"
                >{miningSuccessPercent(4, pickaxe.quality, 100).toFixed(0)}%</td
              >
              <td class="p-3">
                <ItemSourceLinks
                  groups={pickaxe.source_groups}
                  itemId={pickaxe.id}
                  limit={2}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section id="calculator" class="space-y-4">
    <h2 class="text-xl font-semibold">Success by skill</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Each tier is a straight line from your pickaxe quality to 100%. In the
      shaded bands, the node still gives ore and <MechanicsLink
        section="experience#gathering-xp">experience</MechanicsLink
      >, but no more Mining skill.
    </p>

    <div class="space-y-5 rounded-lg border p-4 md:p-5">
      <div class="flex flex-wrap gap-x-8 gap-y-4">
        <div class="flex items-baseline gap-3">
          <label
            for="skill"
            class="text-xs uppercase tracking-wider text-muted-foreground"
            >Mining skill</label
          >
          <input
            id="skill"
            type="range"
            min="0"
            max="100"
            bind:value={skillLevel}
            class="w-44 accent-amber-500"
          />
          <output class="w-14 text-lg font-semibold tabular-nums"
            >{skillLevel}%</output
          >
        </div>
        <div class="flex items-baseline gap-3">
          <label
            for="pickaxe"
            class="text-xs uppercase tracking-wider text-muted-foreground"
            >Pickaxe</label
          >
          <input
            id="pickaxe"
            type="range"
            min="0"
            max={data.pickaxes.length - 1}
            bind:value={pickaxeQuality}
            class="w-32 accent-amber-500"
          />
          <output class="text-sm font-medium">
            {#if bestPickaxe}
              <ItemLink
                itemId={bestPickaxe.id}
                itemName={bestPickaxe.name}
                tooltipHtml={bestPickaxe.tooltip_html}
              />
            {:else}
              Quality {pickaxeQuality}
            {/if}
          </output>
        </div>
      </div>

      <svg
        viewBox="0 0 {PLOT.w} {PLOT.h}"
        class="w-full"
        role="img"
        aria-label="Mining success chance against skill, one line per ore tier"
      >
        {#each NO_GAIN_BANDS as band, index (band.from)}
          <rect
            x={px(band.from)}
            y={PLOT.top}
            width={plotW * (1 - band.from)}
            height={plotH}
            fill="var(--destructive)"
            opacity={0.05 + index * 0.02}
          />
          <line
            x1={px(band.from)}
            y1={PLOT.top}
            x2={px(band.from)}
            y2={PLOT.top + plotH}
            stroke="var(--destructive)"
            stroke-opacity="0.45"
            stroke-dasharray="3 3"
          />
          <text
            x={px(band.from) + 6}
            y={PLOT.top + plotH - 7}
            class="fill-muted-foreground text-[9.5px]"
            >no skill from {band.label}</text
          >
        {/each}

        {#each [0, 0.25, 0.5, 0.75, 1] as gridline (gridline)}
          <line
            x1={PLOT.left}
            y1={py(gridline)}
            x2={PLOT.w - PLOT.right}
            y2={py(gridline)}
            stroke="currentColor"
            stroke-opacity="0.08"
          />
          <text
            x={PLOT.left - 7}
            y={py(gridline) + 3.5}
            text-anchor="end"
            class="fill-muted-foreground text-[10px]">{gridline * 100}%</text
          >
        {/each}
        {#each [0, 25, 50, 75, 100] as tick (tick)}
          <text
            x={px(tick / 100)}
            y={PLOT.h - 12}
            text-anchor="middle"
            class="fill-muted-foreground text-[10px]">{tick}</text
          >
        {/each}
        <text
          x={PLOT.left + plotW / 2}
          y={PLOT.h - 1}
          text-anchor="middle"
          class="fill-muted-foreground text-[9.5px]">mining skill</text
        >

        <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — the node refuses
             the attempt below 0.2, so anything under this line is unreachable. -->
        <rect
          x={PLOT.left}
          y={py(MINING_SUCCESS_FLOOR)}
          width={plotW}
          height={plotH * MINING_SUCCESS_FLOOR}
          fill="currentColor"
          opacity="0.05"
        />
        <line
          x1={PLOT.left}
          y1={py(MINING_SUCCESS_FLOOR)}
          x2={PLOT.w - PLOT.right}
          y2={py(MINING_SUCCESS_FLOOR)}
          stroke="currentColor"
          stroke-opacity="0.35"
          stroke-dasharray="4 3"
        />
        <text
          x={PLOT.w - PLOT.right - 4}
          y={py(MINING_SUCCESS_FLOOR) - 5}
          text-anchor="end"
          class="fill-muted-foreground text-[9.5px]"
          >you cannot mine below here</text
        >

        {#each curves as curve (curve.ore.id)}
          {#if curve.refusedD}
            <path
              d={curve.refusedD}
              fill="none"
              stroke={curve.stroke}
              stroke-width="2"
              stroke-dasharray="3 4"
              stroke-opacity="0.4"
            />
          {/if}
          {#if curve.allowedD}
            <path
              d={curve.allowedD}
              fill="none"
              stroke={curve.stroke}
              stroke-width="2"
              stroke-linecap="round"
            />
          {/if}
        {/each}

        <line
          x1={px(skillLevel / 100)}
          y1={PLOT.top}
          x2={px(skillLevel / 100)}
          y2={PLOT.top + plotH}
          stroke="currentColor"
          stroke-opacity="0.5"
        />
        {#each curves as curve (curve.ore.id)}
          <circle
            cx={px(skillLevel / 100)}
            cy={py(curve.atSkill)}
            r={curve.effortless || !curve.mineable ? 2.5 : 4}
            fill={curve.effortless || !curve.mineable
              ? "var(--background)"
              : curve.stroke}
            stroke={curve.stroke}
            stroke-width="1.6"
            stroke-opacity={curve.mineable ? 1 : 0.45}
          />
        {/each}
      </svg>

      <div class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {#each curves as curve (curve.ore.id)}
          <span
            class="flex items-center gap-1.5"
            class:opacity-50={curve.effortless || !curve.mineable}
          >
            <span
              class="inline-block h-2 w-2 rounded-[2px]"
              style="background:{curve.stroke}"
            ></span>
            {ROMAN[curve.ore.tier]}
            {curve.ore.name}{!curve.mineable
              ? " \u00b7 cannot mine"
              : curve.effortless
                ? " \u00b7 no skill gain"
                : ""}
          </span>
        {/each}
      </div>

      <p class="text-pretty text-sm text-muted-foreground">
        With {bestPickaxe?.name ?? `a quality-${pickaxeQuality} pickaxe`} at {skillLevel}%,
        you can try {mineableTiers.length} of {data.ores.length} ores.
        {#if payingTiers.length === 0}
          None of them gives Mining skill.
        {:else}
          {payingTiers.length}
          of them still {payingTiers.length === 1 ? "gives" : "give"} Mining skill,
          at {gainChance.toFixed(0)}% for each success.
        {/if}
        The dashed lines show what you cannot mine.
      </p>
    </div>
  </section>

  <section id="ores" class="space-y-4">
    <h2 class="text-xl font-semibold">Ores</h2>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50 text-left text-xs">
            <th class="p-3 font-medium">Tier</th>
            <th class="p-3 font-medium">Ore</th>
            <th class="p-3 text-right font-medium">Success</th>
            <th class="p-3 text-right font-medium">Skill gain</th>
            <th class="p-3 text-right font-medium">XP</th>
            <th class="p-3 text-right font-medium">Respawn</th>
            <th class="p-3 text-right font-medium">Nodes</th>
          </tr>
        </thead>
        <tbody>
          {#each data.ores as ore (ore.id)}
            {@const success = miningSuccessPercent(
              ore.tier,
              pickaxeQuality,
              skillLevel,
            )}
            {@const gain = miningSkillGainRange(
              ore.tier,
              pickaxeQuality,
              skillLevel,
            )}
            <tr class="border-b last:border-0">
              <td class="p-3 text-muted-foreground">{ROMAN[ore.tier]}</td>
              <td class="p-3">
                <a
                  href="/gather-items/{ore.id}"
                  class="text-blue-600 hover:underline dark:text-blue-400"
                  >{ore.name}</a
                >
              </td>
              <td class="p-3 text-right tabular-nums">
                {#if success === 0}
                  <span
                    class="text-muted-foreground"
                    title="Your chance is less than {MINING_SUCCESS_FLOOR *
                      100}%">cannot mine</span
                  >
                {:else}
                  {success.toFixed(0)}%
                {/if}
              </td>
              <td class="p-3 text-right tabular-nums text-muted-foreground">
                {#if gain}
                  {gain.min.toFixed(2)}–{gain.max.toFixed(2)}%
                {:else}
                  —
                {/if}
              </td>
              <td class="p-3 text-right tabular-nums"
                >{ore.gathering_exp.toLocaleString()}</td
              >
              <td class="p-3 text-right tabular-nums text-muted-foreground"
                >{formatDuration(ore.respawn_time)}</td
              >
              <td class="p-3 text-right tabular-nums">{ore.node_count}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section id="where" class="space-y-4">
    <h2 class="text-xl font-semibold">Where to mine</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      There are {data.totalNodes} nodes. Each ore is in two to four zones.
    </p>
    <div class="space-y-5">
      {#each data.ores as ore (ore.id)}
        <div class="space-y-1.5">
          <div class="flex items-baseline justify-between gap-3">
            <h3 class="text-sm font-medium">
              <span class="text-muted-foreground">{ROMAN[ore.tier]}</span>
              {ore.name}
            </h3>
            <MapLink entityId={ore.id} entityType="resource" compact />
          </div>
          {#each ore.zones as zone (zone.zone_id)}
            <div
              class="grid grid-cols-[minmax(7rem,10rem)_1fr_2.5rem] items-center gap-3 text-sm"
            >
              <a
                href="/zones/{zone.zone_id}"
                class="truncate text-blue-600 hover:underline dark:text-blue-400"
                >{zone.zone_name}</a
              >
              <div class="h-1.5 rounded-full bg-muted">
                <div
                  class="h-full rounded-full bg-amber-500/70"
                  style="width:{(zone.node_count / maxZoneNodes) * 100}%"
                ></div>
              </div>
              <span class="text-right tabular-nums text-muted-foreground"
                >{zone.node_count}</span
              >
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </section>

  <section id="gems" class="space-y-4">
    <h2 class="text-xl font-semibold">Bonus gems</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Every success makes one more roll for a gem. The chance is between 0.8%
      and 2.5%. Mining skill does not change it.
    </p>
    <details class="group">
      <summary
        class="cursor-pointer text-sm text-blue-600 hover:underline dark:text-blue-400"
        >Every gem pool</summary
      >
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {#each data.ores.filter((ore) => ore.gems.length > 0) as ore (ore.id)}
          <div class="space-y-1.5 rounded-lg border p-3.5">
            <h3 class="text-sm font-medium">
              <span class="text-muted-foreground">{ROMAN[ore.tier]}</span>
              {ore.name}
            </h3>
            {#each ore.gems as gem (gem.item_id)}
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <ItemLink
                  itemId={gem.item_id}
                  itemName={gem.item_name}
                  tooltipHtml={gem.tooltip_html}
                />
                <span class="tabular-nums text-muted-foreground"
                  >{(gem.chance * 100).toFixed(1)}%</span
                >
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </details>
  </section>

  <section id="uses" class="space-y-4">
    <h2 class="text-xl font-semibold">What ore is for</h2>
    <p class="max-w-2xl text-balance leading-relaxed">
      Ore is a material for crafting.
    </p>
    <ul class="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
      {#each data.ores as ore (ore.id)}
        <li>
          <span class="text-muted-foreground">{ore.reward_item_name}</span>
          {#if ore.recipe_count > 0}
            <a
              href="/recipes"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >{ore.recipe_count}
              {ore.recipe_count === 1 ? "recipe" : "recipes"}</a
            >
          {:else}
            <span class="text-muted-foreground">no recipes</span>
          {/if}
        </li>
      {/each}
    </ul>

    {#if data.quests.length > 0}
      <h3 class="pt-2 text-sm font-medium">Quests that need ore</h3>
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-xs">
              <th class="p-3 font-medium">Quest</th>
              <th class="p-3 font-medium">Ore</th>
              <th class="p-3 text-right font-medium">Amount</th>
              <th class="p-3 text-right font-medium">Level</th>
            </tr>
          </thead>
          <tbody>
            {#each data.quests as quest (quest.quest_id + quest.ore_id)}
              <tr class="border-b last:border-0">
                <td class="p-3">
                  <a
                    href="/quests/{quest.quest_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{quest.quest_name}</a
                  >
                </td>
                <td class="p-3 text-muted-foreground">{quest.ore_name}</td>
                <td class="p-3 text-right tabular-nums"
                  >{quest.amount}
                  <span class="text-xs text-muted-foreground"
                    >{quest.purpose.toLowerCase()}</span
                  ></td
                >
                <td class="p-3 text-right tabular-nums text-muted-foreground"
                  >{quest.level_recommended}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if data.vendors.length > 0}
      <p class="text-pretty text-sm text-muted-foreground">
        {#each data.vendors as vendor, index (vendor.npc_id + vendor.ore_name)}
          {index > 0 ? " " : ""}<a
            href="/npcs/{vendor.npc_id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{vendor.npc_name}</a
          >
          sells {vendor.ore_name}.
        {/each}
      </p>
    {/if}
  </section>

  <section class="space-y-3 border-t pt-6">
    <h2 class="text-sm font-medium">Progression</h2>
    <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — gain fires when
         Random.value > 0.1 + miningLevel/2, and the amount is Random.Range(1, 4)
         divided by the success chance, so unreliable nodes pay more per success. -->
    <p
      class="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground"
    >
      Mining is a value from 0% to 100%. There is no experience bar. Each
      success has a
      {miningSkillGainChancePercent(0).toFixed(0)}% chance to give skill at 0%,
      and {miningSkillGainChancePercent(100).toFixed(0)}% at 100%. A node with a
      low success chance gives more skill for each success. Dwarves start at {DWARF_STARTING_MINING_PERCENT}%.
      Every other race starts at 0%.
      {#if data.profession.steam_achievement_name}
        At 100% you get
        <span class="inline-flex items-baseline gap-1 text-foreground">
          <Trophy class="h-3.5 w-3.5 translate-y-0.5 text-amber-500" />
          {data.profession.steam_achievement_name}</span
        >.
      {/if}
    </p>
    <p class="text-pretty text-sm text-muted-foreground">
      Ore is also a material for <a
        href="/professions/alchemy"
        class="text-blue-600 hover:underline dark:text-blue-400">Alchemy</a
      >
      and for the crafting stations. All gathering uses the same experience rules,
      in
      <MechanicsLink section="experience#gathering-xp">Experience</MechanicsLink
      >.
    </p>
  </section>
</div>
