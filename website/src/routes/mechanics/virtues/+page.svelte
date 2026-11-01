<script lang="ts">
  import { onMount } from "svelte";
  import Check from "@lucide/svelte/icons/check";
  import Clock from "@lucide/svelte/icons/clock";
  import Crown from "@lucide/svelte/icons/crown";
  import Info from "@lucide/svelte/icons/info";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import X from "@lucide/svelte/icons/x";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import {
    MAX_VIRTUE_POINTS,
    SACRIFICE_GOLD_PER_POINT,
    SACRIFICE_ITEM_LEVELS_PER_POINT,
    VIRTUE_IDS,
    sacrificeOfferingPoints,
    valorQuarryLevels,
    type VirtueId,
  } from "$lib/calculation/virtues";
  import { entityRegistry } from "$lib/entities/registry";
  import type { VirtueView } from "$lib/queries/virtues.server";
  import type { Calculation as CalculationDef } from "$lib/types/calculation";
  import { formatNumber } from "$lib/utils/format";
  import {
    BLESSING_UNITS,
    VIRTUE_TONES,
    blessingIcon,
    blessingSummary,
    rankEffect,
  } from "$lib/virtues/display";
  import {
    EARN_SUMMARIES,
    VIRTUE_RULES,
    earnMethods,
    type EarnMethod,
    type Reward,
    type RuleGroup,
  } from "./earn";

  let { data } = $props();

  const byId = $derived(
    Object.fromEntries(data.virtues.map((v) => [v.id, v])) as Record<
      VirtueId,
      VirtueView
    >,
  );
  const multipliers = $derived(
    data.virtues[0].ranks.map((rank) => rank.humility_multiplier),
  );
  const maxRank = $derived(multipliers.length - 1);
  const earn = $derived(earnMethods(data.rules));

  let selected = $state<VirtueId>("compassion");
  let level = $state(40);

  const quarryWindow = $derived(valorQuarryLevels(level));
  const quarries = $derived([
    ...new Map(
      data.quarries
        .filter((q) => q.level >= quarryWindow[0] && q.level <= quarryWindow[1])
        .map((q) => [`${q.id}:${q.zone_id}`, q]),
    ).values(),
  ]);

  const isVirtue = (id: string): id is VirtueId =>
    (VIRTUE_IDS as readonly string[]).includes(id);

  onMount(() => {
    const fromHash = () => {
      const id = location.hash.slice(1);
      if (!isVirtue(id)) return;
      selected = id;
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ block: "start" }),
      );
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  });

  function choose(id: VirtueId) {
    selected = id;
    window.history.replaceState(history.state, "", `#${id}`);
  }

  const rankName = (rank: VirtueView["ranks"][number]) =>
    rank.title ?? data.rules.rank_zero_label;

  const GOLD_PER_ITEM_LEVEL =
    SACRIFICE_GOLD_PER_POINT / SACRIFICE_ITEM_LEVELS_PER_POINT;

  const offering: CalculationDef = {
    steps: [
      {
        name: "Offering value",
        expression: `the gold you offer, plus ${GOLD_PER_ITEM_LEVEL} gold for each item level of the equipment you offer`,
      },
      {
        name: "Sacrifice points",
        expression: `offering value divided by ${formatNumber(SACRIFICE_GOLD_PER_POINT)}`,
        rounding: "down",
        limit: `at most the points left to ${formatNumber(MAX_VIRTUE_POINTS)}`,
      },
    ],
    inputs: [
      {
        key: "virtue-offering-gold",
        label: "Gold",
        value: 2500,
        min: 0,
        max: 99_999_999,
        step: 1,
      },
      {
        key: "virtue-offering-item-1",
        label: "First item level",
        value: 120,
        min: 0,
        max: 1000,
        step: 1,
      },
      {
        key: "virtue-offering-item-2",
        label: "Second item level",
        value: 0,
        min: 0,
        max: 1000,
        step: 1,
      },
      {
        key: "virtue-offering-item-3",
        label: "Third item level",
        value: 0,
        min: 0,
        max: 1000,
        step: 1,
      },
    ],
    example: (values) => {
      const gold = values["virtue-offering-gold"];
      const items = [1, 2, 3]
        .map((n) => values[`virtue-offering-item-${n}`])
        .filter((itemLevel) => itemLevel > 0);
      const itemLevels = items.reduce((sum, itemLevel) => sum + itemLevel, 0);
      const value = gold + itemLevels * GOLD_PER_ITEM_LEVEL;
      const points = sacrificeOfferingPoints(items, gold);
      return {
        given: [
          `${formatNumber(gold)} gold`,
          ...items.map((itemLevel) => `item level ${formatNumber(itemLevel)}`),
        ],
        result: `${formatNumber(points)} Sacrifice ${points === 1 ? "point" : "points"}`,
        working: [
          `Offering value: ${[formatNumber(gold), ...items.map((itemLevel) => `${formatNumber(itemLevel)} × ${GOLD_PER_ITEM_LEVEL}`)].join(" + ")} = ${formatNumber(value)} gold`,
          `Sacrifice points: ${formatNumber(value)} ÷ ${formatNumber(SACRIFICE_GOLD_PER_POINT)} = ${formatNumber(points)}, rounded down`,
        ],
      };
    },
  };
</script>

{#snippet virtueIcon(id: VirtueId, size: string)}
  <img
    src={blessingIcon(id)}
    alt=""
    class="{size} shrink-0 rounded-md [image-rendering:pixelated]"
  />
{/snippet}

{#snippet fact(Icon: typeof Clock, title: string, text: string)}
  <div class="rounded-lg border bg-card p-4">
    <Icon class="size-5 text-amber-400" aria-hidden="true" />
    <p class="mt-2 font-semibold text-foreground">{title}</p>
    <p class="mt-1 text-sm text-pretty text-muted-foreground">{text}</p>
  </div>
{/snippet}

{#snippet reward(r: Reward)}
  {#if r.reason}
    <span class="whitespace-nowrap" title={r.reason}
      ><span
        class="font-semibold text-emerald-400 underline decoration-dotted underline-offset-4"
        >{r.value}</span
      >
      <span class="text-sm text-muted-foreground">{r.unit}</span></span
    >
  {:else}
    <span class="whitespace-nowrap"
      ><span class="font-semibold tabular-nums text-emerald-400">{r.value}</span
      >
      <span class="text-sm text-muted-foreground"
        >{r.value === "+1" ? "point" : "points"} {r.unit}</span
      ></span
    >
  {/if}
{/snippet}

{#snippet ruleList(group: RuleGroup)}
  <p class="mb-2.5 text-sm font-semibold text-foreground">{group.title}</p>
  <ul class="space-y-2 text-sm text-muted-foreground">
    {#each group.items as item (item)}
      <li class="flex gap-2.5">
        {#if group.kind === "ok"}
          <Check
            class="mt-0.5 size-4 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
        {:else if group.kind === "no"}
          <X class="mt-0.5 size-4 shrink-0 text-rose-400" aria-hidden="true" />
        {:else}
          <Info
            class="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        {/if}
        <span class="text-pretty">{item}</span>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet methodCard(id: VirtueId, method: EarnMethod)}
  <div class="flex flex-col overflow-hidden rounded-lg border bg-card">
    <div
      class="flex items-center gap-3 border-b px-5 py-3.5 {VIRTUE_TONES[id]
        .soft}"
    >
      <method.icon class="size-5 {VIRTUE_TONES[id].text}" aria-hidden="true" />
      <p class="font-semibold text-balance text-foreground">{method.name}</p>
    </div>
    <ol class="space-y-2.5 px-5 pt-4">
      {#each method.steps as step, index (step.text)}
        <li class="flex gap-3 text-sm text-muted-foreground">
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-foreground"
            >{index + 1}</span
          >
          <span class="text-pretty">{step.text}</span>
        </li>
      {/each}
    </ol>
    <div
      class="flex-1 space-y-1 px-5 pt-3 pb-4 text-sm text-pretty text-muted-foreground/80"
    >
      {#each method.notes as note (note)}<p>{note}</p>{/each}
      {#if method.link}
        <p>
          <a href={method.link.href} class="text-blue-400 hover:underline"
            >{method.link.text}</a
          >
        </p>
      {/if}
    </div>
    <div class="flex items-center gap-3 border-t bg-muted/30 px-5 py-3">
      <span
        class="hidden text-xs font-medium tracking-wide text-muted-foreground uppercase sm:inline"
        >Reward</span
      >
      {@render virtueIcon(id, "size-6")}
      <span class="flex flex-wrap gap-x-4 gap-y-0.5"
        >{#each method.rewards as r (r.unit)}{@render reward(r)}{/each}</span
      >
    </div>
  </div>
{/snippet}

{#snippet shrineCards(id: VirtueId)}
  <section>
    <h3 class="mb-4 text-lg font-semibold">Shrines</h3>
    <div class="grid gap-4 sm:grid-cols-2">
      {#each data.shrines.filter((s) => s.virtue_id === id) as shrine (shrine.id)}
        <div class="overflow-hidden rounded-lg border bg-card">
          {#if shrine.map_path}
            <div class="relative aspect-video overflow-hidden bg-black">
              <img
                src="/{shrine.map_path}"
                alt="Map around the {shrine.name} in {shrine.zone_name}"
                class="size-full object-cover"
                loading="lazy"
              />
              <img
                src={blessingIcon(id)}
                alt=""
                class="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-md shadow-lg ring-2 ring-white/80 [image-rendering:pixelated]"
              />
            </div>
          {/if}
          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <a
                href="/zones/{shrine.zone_id}"
                class="font-semibold text-foreground hover:underline"
                >{shrine.zone_name}</a
              >
              <p class="text-sm text-muted-foreground">{shrine.name}</p>
            </div>
            {#if shrine.x !== null}
              <a
                href={entityRegistry.virtue_shrine.detailHref(shrine.id)}
                class="inline-flex shrink-0 items-center gap-1 text-sm text-blue-400 hover:underline"
                ><MapPin class="size-4" aria-hidden="true" />Map</a
              >
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>
{/snippet}

{#snippet rankCards(virtue: VirtueView)}
  <ol class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
    {#each virtue.ranks as rank (rank.rank)}
      {@const effect = rankEffect(
        virtue.id,
        rank.rank,
        rank.humility_multiplier,
      )}
      <li
        class="rounded-lg border p-3 {rank.rank === maxRank
          ? VIRTUE_TONES[virtue.id].soft
          : 'bg-card'}"
      >
        <p class="text-xs text-muted-foreground">Rank {rank.rank}</p>
        <p class="font-semibold text-foreground">{rankName(rank)}</p>
        <p
          class="mt-2 text-lg font-semibold {effect.negative
            ? 'text-rose-400'
            : VIRTUE_TONES[virtue.id].text}"
        >
          {effect.value}
        </p>
        {#if effect.extra}<p class="text-xs text-muted-foreground">
            {effect.extra}
          </p>{/if}
        <p class="mt-1 text-xs tabular-nums text-muted-foreground">
          {formatNumber(rank.points)} points
        </p>
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet quarryList()}
  <div id="quarries" class="space-y-3 border-t pt-5">
    <div class="flex flex-wrap items-center gap-3">
      <h4 class="font-semibold text-foreground">Quarries at level</h4>
      <Input
        type="number"
        inputmode="numeric"
        min={1}
        max={data.maxLevel}
        value={level}
        aria-label="Your level"
        class="h-8 w-20 tabular-nums"
        oninput={(event) => {
          const typed = event.currentTarget.valueAsNumber;
          if (Number.isInteger(typed) && typed >= 1 && typed <= data.maxLevel)
            level = typed;
        }}
      />
      <span class="text-sm text-muted-foreground"
        >{quarries.length} elites and bosses from level {Math.max(
          1,
          quarryWindow[0],
        )} to {quarryWindow[1]}</span
      >
    </div>
    <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {#each quarries as quarry (`${quarry.id}:${quarry.zone_id}`)}
        <li class="flex items-center gap-3 rounded-lg border bg-card p-2.5">
          {#if quarry.portrait_path}
            <img
              src="/{quarry.portrait_path}"
              alt=""
              class="size-12 rounded-md bg-muted object-cover [image-rendering:pixelated]"
              loading="lazy"
            />
          {/if}
          <div class="min-w-0">
            <a
              href="/monsters/{quarry.id}"
              class="block truncate font-medium text-blue-400 hover:underline"
              >{quarry.name}</a
            >
            <p class="text-sm text-muted-foreground">
              Lv {quarry.level} · {quarry.zone_name}
            </p>
          </div>
          <span
            class="ml-auto rounded px-1.5 py-0.5 text-xs font-medium {quarry.is_boss
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-sky-500/15 text-sky-400'}"
            >{quarry.is_boss ? "Boss" : "Elite"}</span
          >
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

{#snippet escortList()}
  <div id="stranded-adventurers" class="space-y-3 border-t pt-5">
    <h4 class="font-semibold text-foreground">Stranded adventurers</h4>
    <ul class="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {#each data.escorts as escort (escort.zone_id)}
        <li class="rounded-lg border bg-card px-3 py-2.5">
          <a
            href="/zones/{escort.zone_id}"
            class="block font-medium text-blue-400 hover:underline"
            >{escort.zone_name}</a
          >
          <span class="block text-sm tabular-nums text-muted-foreground"
            >Lv {escort.level} · {formatNumber(escort.health)} Health</span
          >
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

{#snippet offeringCalculator()}
  <div id="offering" class="space-y-3 border-t pt-5">
    <h4 class="font-semibold text-foreground">What an offering gives</h4>
    <Calculation calculation={offering} />
  </div>
{/snippet}

{#snippet panel(virtue: VirtueView)}
  <div class="space-y-8">
    <div class="flex items-center gap-4">
      {@render virtueIcon(virtue.id, "size-14")}
      <div>
        <h2 class="text-2xl font-semibold">{virtue.name}</h2>
        <p class="text-muted-foreground">{EARN_SUMMARIES[virtue.id]}</p>
      </div>
    </div>
    {@render shrineCards(virtue.id)}
    <div>
      <h3 class="mb-4 text-lg font-semibold">How to earn it</h3>
      <div class="grid gap-4 lg:grid-cols-2">
        {#each earn[virtue.id] as method (method.name)}{@render methodCard(
            virtue.id,
            method,
          )}{/each}
        {#if VIRTUE_RULES[virtue.id].length}
          <div class="space-y-5 rounded-lg border bg-card p-5">
            {#each VIRTUE_RULES[virtue.id] as group (group.title)}<div>
                {@render ruleList(group)}
              </div>{/each}
          </div>
        {/if}
      </div>
    </div>
    <div>
      <h3 class="mb-4 text-lg font-semibold">
        Ranks and blessing <span
          class="text-sm font-normal text-muted-foreground"
          >· {BLESSING_UNITS[virtue.id]}</span
        >
      </h3>
      {@render rankCards(virtue)}
    </div>
    {#if virtue.id === "valor"}{@render quarryList()}{/if}
    {#if virtue.id === "compassion"}{@render escortList()}{/if}
    {#if virtue.id === "sacrifice"}{@render offeringCalculator()}{/if}
  </div>
{/snippet}

<Seo
  title="Virtues - Ancient Kingdoms"
  description="How the six virtues of Ancient Kingdoms work: their shrines and blessings, every way to earn points, and what each rank gives."
  path="/mechanics/virtues"
/>

<div class="container mx-auto max-w-6xl space-y-8 p-6 sm:p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Virtues" },
    ]}
  />

  <header class="space-y-3">
    <h1 class="text-4xl font-bold">Virtues</h1>
    <p class="text-lg text-pretty text-muted-foreground">
      You earn a virtue's points while its blessing is active. Each rank brings
      a title and a stronger blessing.
    </p>
  </header>

  <!-- Source: server-scripts/Player.cs:BeginVirtueBlessing — one virtue is active at a time, and receiving or renewing a blessing sets 3 hours. -->
  <!-- Source: server-scripts/Player.cs:TickVirtuesServer — the time counts down only while you are connected. -->
  <!-- Source: server-scripts/Skills.cs:OnDeath — death keeps buffs that remain after death, which every Blessing skill does. -->
  <div class="grid gap-2 sm:gap-3 lg:grid-cols-2">
    <div id="shrines" class="grid grid-cols-2 gap-2 sm:gap-3">
      {@render fact(
        Sparkles,
        "One blessing at a time",
        "A new blessing replaces the one you have.",
      )}
      {@render fact(
        Clock,
        "3 hours online",
        "Only time online counts, and dying does not end it. Renewing starts the 3 hours again.",
      )}
    </div>
    <div id="ranks-and-titles" class="grid grid-cols-2 gap-2 sm:gap-3">
      {@render fact(
        TrendingUp,
        "Progress stays",
        "Points and titles stay when a blessing ends or you switch virtues.",
      )}
      {@render fact(
        Crown,
        "A title for every rank",
        "Show any title you have unlocked before your name, or none.",
      )}
    </div>
  </div>

  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Choose a virtue</h2>
    <div class="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
      {#each data.virtues as virtue (virtue.id)}
        <button
          type="button"
          aria-pressed={selected === virtue.id}
          onclick={() => choose(virtue.id)}
          class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-2.5 text-center transition-colors hover:bg-muted/50 sm:flex-row sm:items-start sm:gap-3 sm:p-3 sm:text-left {selected ===
          virtue.id
            ? `bg-muted/60 ring-2 ${VIRTUE_TONES[virtue.id].ring}`
            : `bg-card ${VIRTUE_TONES[virtue.id].hover}`}"
        >
          {@render virtueIcon(virtue.id, "size-12")}
          <span class="min-w-0">
            <span
              class="block text-sm font-semibold text-foreground sm:text-base"
              >{virtue.name}</span
            >
            <span
              class="hidden text-sm text-pretty text-muted-foreground sm:block"
              >{EARN_SUMMARIES[virtue.id]}</span
            >
            <span
              class="mt-1.5 hidden text-sm text-pretty sm:block {VIRTUE_TONES[
                virtue.id
              ].text}">{blessingSummary(virtue.id, maxRank, multipliers)}</span
            >
          </span>
        </button>
      {/each}
    </div>
  </section>

  <!-- Each virtue's anchor is written out, so guide links and the coverage test find it. -->
  <Card.Root id="compassion" hidden={selected !== "compassion"}>
    <Card.Content class="pt-6">{@render panel(byId.compassion)}</Card.Content>
  </Card.Root>
  <Card.Root id="honor" hidden={selected !== "honor"}>
    <Card.Content class="pt-6">{@render panel(byId.honor)}</Card.Content>
  </Card.Root>
  <Card.Root id="sacrifice" hidden={selected !== "sacrifice"}>
    <Card.Content class="pt-6">{@render panel(byId.sacrifice)}</Card.Content>
  </Card.Root>
  <Card.Root id="humility" hidden={selected !== "humility"}>
    <Card.Content class="pt-6">{@render panel(byId.humility)}</Card.Content>
  </Card.Root>
  <Card.Root id="honesty" hidden={selected !== "honesty"}>
    <Card.Content class="pt-6">{@render panel(byId.honesty)}</Card.Content>
  </Card.Root>
  <Card.Root id="valor" hidden={selected !== "valor"}>
    <Card.Content class="pt-6">{@render panel(byId.valor)}</Card.Content>
  </Card.Root>
</div>
