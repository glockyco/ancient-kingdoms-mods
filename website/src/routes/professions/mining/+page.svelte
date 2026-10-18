<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ProfessionHeader from "$lib/components/professions/ProfessionHeader.svelte";
  import MasteryCurve from "$lib/components/professions/MasteryCurve.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import {
    formatGatheringRespawn,
    formatNumber,
    formatPercent,
  } from "$lib/utils/format";
  import {
    DWARF_STARTING_MINING_PERCENT,
    MINING_SUCCESS_FLOOR,
    isMiningEffortless,
    miningSkillGainChancePercent,
    miningSkillGainRange,
  } from "$lib/utils/mining";
  import { professionAttempt } from "$lib/acquisition/rules";
  import PrimaryRewards from "$lib/components/acquisition/PrimaryRewards.svelte";
  import {
    deliveryText,
    quantityText,
    useRoleLabel,
  } from "$lib/components/acquisition/display";

  function probabilityAlternatives(values: readonly (number | null)[]): string {
    return values.length
      ? values
          .map((value) =>
            value === null
              ? "unknown"
              : formatPercent(value, { decimals: 1, trailingZeros: true }),
          )
          .join(" or ")
      : "unknown";
  }

  function rawMiningSuccessChance(
    tier: number,
    quality: number,
    percent: number,
  ): number {
    return professionAttempt("mining", tier, percent / 100, quality).raw;
  }

  function isMineable(tier: number, quality: number, percent: number): boolean {
    return professionAttempt("mining", tier, percent / 100, quality).qualified;
  }

  function miningSuccessPercent(
    tier: number,
    quality: number,
    percent: number,
  ): number {
    return (
      professionAttempt("mining", tier, percent / 100, quality).displayed * 100
    );
  }

  let { data } = $props();

  let skillLevel = $state(0);
  let pickaxeQuality = $state(0);

  const ROMAN = ["I", "II", "III", "IV", "V"];

  const sections = [
    { id: "how-it-works", label: "How Mining works" },
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
        skillLevel < 100 &&
        isMineable(ore.tier, pickaxeQuality, skillLevel) &&
        !isMiningEffortless(ore.tier, skillLevel),
    ),
  );
  const mineableTiers = $derived(
    data.ores.filter((ore) => isMineable(ore.tier, pickaxeQuality, skillLevel)),
  );

  // Source: server-scripts/GatherItem.cs:OnInteractServer — the skill above which
  // each tier stops granting mastery, paired with the tiers it silences.
  const NO_GAIN_BANDS = [
    { from: 0.25, label: "I" },
    { from: 0.5, label: "I–II" },
    { from: 0.75, label: "I–III" },
  ];

  const curveSeries = $derived(
    data.ores.map((ore) => ({
      id: ore.id,
      label: `${ROMAN[ore.tier]} ${ore.name}`,
      chanceAt: (skillPercent: number) =>
        rawMiningSuccessChance(ore.tier, pickaxeQuality, skillPercent),
      // Source: server-scripts/GatherItem.cs:588-596 — no tier grants skill at the cap.
      isEffortlessAt: (skillPercent: number) =>
        skillPercent >= 100 || isMiningEffortless(ore.tier, skillPercent),
    })),
  );

  const maxZoneNodes = $derived(
    Math.max(...data.ores.flatMap((o) => o.zones.map((z) => z.node_count))),
  );
</script>

<Seo
  title={detailTitle(data.profession.name, { family: "Profession" })}
  description={`Mining raises your success chance on higher-tier ore. ${data.ores.length} ores across ${data.totalNodes} nodes, with success odds, respawn timers, bonus gems, and what each ore is used for.`}
  path="/professions/mining"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <ProfessionHeader
    profession={data.profession}
    icon={Pickaxe}
    iconClass="text-amber-500"
    iconBackgroundClass="bg-amber-500/10"
    {sections}
  >
    <!-- Source: server-scripts/Utils.cs:GetSuccessProbMining — success depends on pickaxe quality and Mining skill. -->
    <p>
      Gather ore and gems with a pickaxe. Better pickaxes and higher Mining
      skill improve your success chance.
    </p>
  </ProfessionHeader>

  <section id="how-it-works" class="space-y-4">
    <h2 class="text-xl font-semibold">How Mining works</h2>
    <ol class="divide-y divide-border">
      <!-- Source: server-scripts/Player.cs:TryGetSelectedPickaxe — the gather needs a
           Pickaxe-category weapon that is not broken. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">Carry a pickaxe.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            A better <a
              href="#pickaxes"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >pickaxe</a
            > adds 20 percentage points of success per quality step on Tier II, 15
            on Tier III, 10 on Tier IV and 5 on Tier V, up to 100%. Any pickaxe above
            Rusty always succeeds on Tier I. Broken pickaxes cannot be used.
          </p>
          <!-- Source: server-scripts/Player.cs:10105-10110; server-scripts/PlayerInventory.cs:277-291 — invalid selection falls back to the highest-quality working inventory pickaxe. -->
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Use a pickaxe from your inventory to select it. If the selected
            pickaxe is missing or broken, the game uses your highest-quality
            working pickaxe.
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
            Hover over a node to see your Mining Probability. Below
            {MINING_SUCCESS_FLOOR * 100}%, you cannot mine it. Each try costs 1
            pickaxe durability, even when it fails.
          </p>
        </div>
      </li>
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">3</span>
        <div>
          <p class="font-medium">Collect the ore.</p>
          <!-- Source: server-scripts/GatherItem.cs:383-405,444-455,547-563 — success depletes the node and can give ore and a separate random drop. -->
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Collect ore and possibly a <a
              href="#gems"
              class="text-blue-600 hover:underline dark:text-blue-400">gem</a
            >. Failed attempts leave the node ready to try again.
          </p>
        </div>
      </li>
    </ol>
  </section>

  <section id="pickaxes" class="space-y-4">
    <h2 class="text-xl font-semibold">Pickaxes</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      You need 40% Mining to use a Rusty Pickaxe on a Tier V node. A Draconium
      Pickaxe works at any skill.
    </p>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50 text-left text-xs">
            <th class="whitespace-nowrap p-3 font-medium">Pickaxe</th>
            <th class="whitespace-nowrap p-3 text-right font-medium"
              >Tier V success at 100% Mining</th
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
                  imageAvailable={data.itemIconPaths[pickaxe.id]}
                />
              </td>
              <!-- Source: server-scripts/Utils.cs:GetSuccessProbMining — on tier 4 the
                   chance is quality × 0.05 plus skill × 0.5. -->
              <td class="p-3 text-right tabular-nums"
                >{formatPercent(
                  miningSuccessPercent(4, pickaxe.quality, 100) / 100,
                  { decimals: 0, trailingZeros: true },
                )}</td
              >
              <td class="p-3">
                <details>
                  <summary
                    class="cursor-pointer text-blue-600 dark:text-blue-400"
                    >Acquisition methods</summary
                  >
                  <div class="mt-2">
                    <MethodList
                      methods={pickaxe.sources}
                      items={data.acquisitionItems}
                      names={data.acquisitionNames}
                      selectedItemId={pickaxe.id}
                    />
                  </div>
                </details>
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
      Each 10% Mining adds 5 percentage points of success on Tier V. In the
      shaded bands, nodes still give ore and <MechanicsLink
        section="experience#gathering-xp">experience</MechanicsLink
      >, but no more Mining skill.
    </p>

    <div class="space-y-5 rounded-lg border p-4 md:p-5">
      <div class="flex flex-wrap gap-x-8 gap-y-4">
        <div class="flex items-center gap-3">
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
        <div class="flex items-center gap-3">
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
                imageAvailable={data.itemIconPaths[bestPickaxe.id]}
              />
            {:else}
              Quality {pickaxeQuality}
            {/if}
          </output>
        </div>
      </div>

      <MasteryCurve
        series={curveSeries}
        {skillLevel}
        ariaLabel="Mining success chance against skill, one line per ore tier"
        skillLabel="mining skill"
        floor={MINING_SUCCESS_FLOOR}
        floorLabel="you cannot mine below here"
        unavailableLabel="cannot mine"
        noGainBands={NO_GAIN_BANDS}
      />

      <p class="text-pretty text-sm text-muted-foreground">
        With {bestPickaxe?.name ?? `a quality-${pickaxeQuality} pickaxe`} at {skillLevel}%,
        you can try {mineableTiers.length} of {data.ores.length} ores.
        {#if payingTiers.length === 0}
          None of them gives Mining skill.
        {:else}
          {payingTiers.length}
          of them still {payingTiers.length === 1 ? "gives" : "give"} Mining skill,
          with a {formatPercent(gainChance / 100, {
            decimals: 0,
            trailingZeros: true,
          })} chance per success.
        {/if}
        The dashed lines show what you cannot mine.
      </p>

      <!-- Source: server-scripts/GatherItem.cs:588-597 — successful mines can increase skill below the cap; gain chance is 0.95 − 0.6 × miningLevel², and the amount is Random.Range(1, 4) divided by success chance × 1000. -->
      <p class="text-pretty text-sm text-muted-foreground">
        Mining stops increasing at 100%. Dwarves start at
        {DWARF_STARTING_MINING_PERCENT}%. Every other race starts at 0%.
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
                {#each ore.primaryRewards.filter((reward) => reward.resourceKind === "item" && reward.itemName === ore.name) as reward (`${reward.itemId}:${reward.delivery}`)}
                  {#if reward.quantity.kind !== "unknown"}
                    <span class="text-muted-foreground"
                      >×{quantityText(reward.quantity)}</span
                    >
                  {/if}
                  {#if reward.delivery !== "inventory"}
                    <span class="text-muted-foreground"
                      >{deliveryText(reward.delivery)}</span
                    >
                  {/if}
                {/each}
                <div class="mt-1 space-y-1 text-muted-foreground">
                  <PrimaryRewards
                    rewards={ore.primaryRewards.filter(
                      (reward) =>
                        reward.resourceKind !== "item" ||
                        reward.itemName !== ore.name,
                    )}
                  />
                </div>
              </td>
              <td class="p-3 text-right tabular-nums">
                {#if success === 0}
                  <span
                    class="text-muted-foreground"
                    title="Your chance is less than {MINING_SUCCESS_FLOOR *
                      100}%">cannot mine</span
                  >
                {:else}
                  {formatPercent(success / 100, {
                    decimals: 0,
                    trailingZeros: true,
                  })}
                {/if}
              </td>
              <td class="p-3 text-right tabular-nums text-muted-foreground">
                {#if gain}
                  {formatNumber(gain.min, {
                    decimals: 2,
                    trailingZeros: true,
                    grouping: false,
                  })}–{formatPercent(gain.max / 100, {
                    decimals: 2,
                    trailingZeros: true,
                  })}
                {:else}
                  —
                {/if}
              </td>
              <td class="p-3 text-right tabular-nums"
                >{ore.gathering_exp === null
                  ? "Varies or unpublished"
                  : formatNumber(ore.gathering_exp)}</td
              >
              <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — depleted minerals respawn between half and the full wait. -->
              <td class="p-3 text-right tabular-nums text-muted-foreground">
                {formatGatheringRespawn("Mineral", ore.respawn_time)}
              </td>
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
      Successful mines can also give gems. The chance depends on the ore, not
      your Mining skill.
    </p>
    <details class="group">
      <summary
        class="cursor-pointer text-sm text-blue-600 hover:underline dark:text-blue-400"
        >Gems by ore</summary
      >
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {#each data.ores.filter((ore) => ore.gems.length > 0) as ore (ore.id)}
          <div class="space-y-1.5 rounded-lg border p-3.5">
            <h3 class="text-sm font-medium">
              <span class="text-muted-foreground">{ROMAN[ore.tier]}</span>
              {ore.name}
            </h3>
            <p class="text-sm text-muted-foreground">
              {probabilityAlternatives(ore.gemProbabilities)} chance of any listed
              gem per mine at 100% Mining with a tier V pickaxe.
            </p>
            {#each ore.gems as gem (gem.item_id)}
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <ItemLink
                  itemId={gem.item_id}
                  itemName={gem.item_name}
                  tooltipHtml={gem.tooltip_html}
                  imageAvailable={data.itemIconPaths[gem.item_id]}
                />
                <span class="tabular-nums text-muted-foreground"
                  >{probabilityAlternatives(gem.probabilities)}</span
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
    <ul class="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
      {#each data.ores as ore (ore.id)}
        <li>
          <span class="text-muted-foreground"
            >{ore.primaryRewards
              .flatMap((reward) => (reward.itemName ? [reward.itemName] : []))
              .join(", ") || "Unpublished reward"}</span
          >
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
                  >{useRoleLabel(quest.purpose)} {quest.amount}</td
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

    <p class="text-pretty text-sm text-muted-foreground">
      Ore also goes into <a
        href="/professions/alchemy"
        class="text-blue-600 hover:underline dark:text-blue-400">Alchemy</a
      >
      recipes and at other crafting stations.
    </p>
  </section>
  <details class="space-y-4">
    <summary class="cursor-pointer text-xl font-semibold"
      >Gathering methods and requirements</summary
    >
    <MethodList
      methods={data.oreMethods}
      items={data.acquisitionItems}
      names={data.acquisitionNames}
    />
  </details>
</div>
