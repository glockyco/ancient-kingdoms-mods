<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import { getClassConfig } from "$lib/utils/classes";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Trophy from "@lucide/svelte/icons/trophy";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Store from "@lucide/svelte/icons/store";

  let { data } = $props();

  type PlayerClass =
    | "Warrior"
    | "Cleric"
    | "Ranger"
    | "Rogue"
    | "Wizard"
    | "Druid";

  type SortMode = "queue" | "level" | "name" | "adventuring";

  const allClasses: PlayerClass[] = [
    "Warrior",
    "Cleric",
    "Ranger",
    "Rogue",
    "Wizard",
    "Druid",
  ];

  const msPerDay = 24 * 60 * 60 * 1000;

  let selectedClass = $state<PlayerClass>("Warrior");
  let selectedDate = $state(toUtcDateInput(new Date()));
  let selectedSort = $state<SortMode>("queue");
  let selectedType = $state("All");
  let selectedUnlockRequirement = $state("All");
  let currentTime = $state(new Date());
  let mounted = $state(false);

  // Source: server-scripts/Utils.cs:521-524 — adventurer quest selection is seeded by DateTime.UtcNow.DayOfYear, so UTC midnight starts a new queue day.
  const queueResetTime = "00:00 UTC";

  onMount(() => {
    selectedDate = toUtcDateInput(new Date());
    currentTime = new Date();
    mounted = true;

    const interval = window.setInterval(() => {
      currentTime = new Date();
    }, 30_000);

    return () => window.clearInterval(interval);
  });

  class DotNetRandom {
    private static readonly mbig = 2_147_483_647;
    private static readonly mseed = 161_803_398;
    private seedArray = new Array<number>(56).fill(0);
    private inext = 0;
    private inextp = 21;

    constructor(seed: number) {
      const subtraction = Math.abs(seed);
      let mj = DotNetRandom.mseed - subtraction;

      if (mj < 0) mj += DotNetRandom.mbig;

      this.seedArray[55] = mj;

      let mk = 1;
      for (let i = 1; i < 55; i++) {
        const ii = (21 * i) % 55;
        this.seedArray[ii] = mk;
        mk = mj - mk;
        if (mk < 0) mk += DotNetRandom.mbig;
        mj = this.seedArray[ii];
      }

      for (let k = 1; k < 5; k++) {
        for (let i = 1; i < 56; i++) {
          this.seedArray[i] -= this.seedArray[1 + ((i + 30) % 55)];
          if (this.seedArray[i] < 0) this.seedArray[i] += DotNetRandom.mbig;
        }
      }
    }

    next(maxExclusive: number): number {
      return Math.floor(this.sample() * maxExclusive);
    }

    private sample(): number {
      return this.internalSample() * (1.0 / DotNetRandom.mbig);
    }

    private internalSample(): number {
      let locInext = this.inext + 1;
      let locInextp = this.inextp + 1;

      if (locInext >= 56) locInext = 1;
      if (locInextp >= 56) locInextp = 1;

      let retVal = this.seedArray[locInext] - this.seedArray[locInextp];

      if (retVal === DotNetRandom.mbig) retVal--;
      if (retVal < 0) retVal += DotNetRandom.mbig;

      this.seedArray[locInext] = retVal;
      this.inext = locInext;
      this.inextp = locInextp;

      return retVal;
    }
  }

  const questLevelRange = $derived.by(() => {
    const levels = data.quests.map((quest) => quest.level_recommended);
    const min = Math.min(...levels);
    const max = Math.max(...levels);

    return min === max ? String(min) : `${min}-${max}`;
  });

  const typeOptions = $derived([
    "All",
    ...Array.from(
      new Set(data.quests.map((quest) => quest.display_type)),
    ).sort(),
  ]);

  const unlockRequirementOptions = $derived([
    "All",
    ...Array.from(
      new Set(
        data.vendorUnlocks.map((unlock) =>
          formatPercent(unlock.adventuring_level_needed),
        ),
      ),
    ).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)),
  ]);

  const selectedQueueOrder = $derived(
    shuffleWithDotNetRandom(data.questPoolOrder, utcDayOfYear(selectedDate)),
  );

  const queueRank = $derived(
    new SvelteMap(
      selectedQueueOrder.map((questId, index) => [questId, index + 1]),
    ),
  );

  const displayedQuests = $derived.by(() => {
    const quests = data.quests.filter(
      (quest) => selectedType === "All" || quest.display_type === selectedType,
    );

    return [...quests].sort((a, b) => {
      if (selectedSort === "queue") {
        return (
          (queueRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (queueRank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        );
      }

      if (selectedSort === "level") {
        return (
          a.level_recommended - b.level_recommended ||
          a.name.localeCompare(b.name)
        );
      }

      if (selectedSort === "adventuring") {
        return (
          b.reward_adventuring_skill - a.reward_adventuring_skill ||
          a.name.localeCompare(b.name)
        );
      }

      return a.name.localeCompare(b.name);
    });
  });

  const filteredVendorUnlocks = $derived(
    selectedUnlockRequirement === "All"
      ? data.vendorUnlocks
      : data.vendorUnlocks.filter(
          (unlock) =>
            formatPercent(unlock.adventuring_level_needed) ===
            selectedUnlockRequirement,
        ),
  );

  const vendorUnlockGroups = $derived.by(() => {
    const groups = new SvelteMap<string, typeof data.vendorUnlocks>();

    for (const unlock of filteredVendorUnlocks) {
      const requirement = formatPercent(unlock.adventuring_level_needed);
      groups.set(requirement, [...(groups.get(requirement) ?? []), unlock]);
    }

    return Array.from(groups, ([requirement, unlocks]) => ({
      requirement,
      unlocks,
    })).sort(
      (a, b) =>
        Number.parseFloat(a.requirement) - Number.parseFloat(b.requirement),
    );
  });

  const nextQueueReset = $derived(nextUtcMidnight(currentTime));
  const timeUntilReset = $derived(formatDuration(nextQueueReset, currentTime));
  const localResetTime = $derived(formatLocalTime(nextQueueReset));

  function setDateOffset(days: number) {
    selectedDate = toUtcDateInput(new Date(Date.now() + days * msPerDay));
    selectedSort = "queue";
  }

  function toUtcDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  function utcDayOfYear(dateInput: string): number {
    const [year, month, day] = dateInput.split("-").map(Number);
    const date = Date.UTC(year, month - 1, day);
    const start = Date.UTC(year, 0, 1);

    return Math.floor((date - start) / msPerDay) + 1;
  }

  function nextUtcMidnight(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
      ),
    );
  }

  function formatDuration(target: Date, from: Date): string {
    const remainingMs = Math.max(0, target.getTime() - from.getTime());
    const totalMinutes = Math.floor(remainingMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  }

  function formatLocalTime(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  function formatPercent(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
  }

  function sellerLabel(sellerCount: number): string | null {
    return sellerCount === data.merchants.length
      ? "All Adventurer Vendors"
      : null;
  }

  // Source: server-scripts/Utils.cs:534-550 — adventurer quest order uses Unity/Mono's seeded System.Random with a Fisher-Yates shuffle.
  function shuffleWithDotNetRandom<T>(items: T[], seed: number): T[] {
    const shuffled = [...items];
    const random = new DotNetRandom(seed);

    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = random.next(index + 1);
      const current = shuffled[swapIndex];
      shuffled[swapIndex] = shuffled[index];
      shuffled[index] = current;
    }

    return shuffled;
  }
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} View Adventurer taskgivers, vendor unlocks, and quest availability rules.`}
  path="/professions/adventuring"
/>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <section class="rounded-lg border p-6 md:p-8">
    <div class="flex flex-wrap items-start gap-4">
      <div class="rounded-lg bg-orange-500/10 p-3">
        <Backpack class="h-7 w-7 text-orange-500 dark:text-orange-400" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
            {data.profession.name}
          </h1>
        </div>
        <p class="mt-2 max-w-3xl text-muted-foreground">
          Complete Adventurer's Guild tasks to raise Adventuring progress and
          unlock special vendor purchases.
        </p>
      </div>
    </div>

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.quests.length}</div>
        <div class="text-sm text-muted-foreground">Adventurer quests</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.questGivers.length}</div>
        <div class="text-sm text-muted-foreground">Taskgivers</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.merchants.length}</div>
        <div class="text-sm text-muted-foreground">Vendors</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{questLevelRange}</div>
        <div class="text-sm text-muted-foreground">Quest levels</div>
      </div>
    </div>
  </section>

  <section class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How It Works</h2>

    <div class="mt-4 divide-y">
      <div class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>
            Visit any
            <a
              href="#adventurer-taskgivers"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Adventurer Taskgiver</a
            > to accept an Adventurer quest.
          </div>
          <!-- Source: server-scripts/Utils.cs:521-524 — adventurer quest selection reads the shared npcAdventurerReference quest list. -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            All taskgivers use the same shared quest pool, so NPC choice does
            not affect the available quest list.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>
            The shared Adventurer
            <a
              href="#adventurer-quests"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >quest queue</a
            >
            resets daily.
          </div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Queue days start at {queueResetTime}.
            {#if mounted}
              Next reset: {timeUntilReset}, at {localResetTime}.
            {/if}
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div>
            <!-- Source: server-scripts/PlayerQuests.cs:50-51,169-174,376 — completed adventurer quests use DateTime.UtcNow ticks and remain completed for 24 hours. -->
            Each Adventurer quest has its own per-character 24-hour cooldown.
          </div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            The taskgiver offers the first quest in today's queue that your
            character has not completed in the last 24 hours.<br
              class="hidden xl:block"
            /><span class="xl:hidden">&nbsp;</span>Completing one quest puts
            only that quest on cooldown, then reveals the next eligible quest in
            the daily queue.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 last:pb-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>
            Adventurer
            <a
              href="#adventurer-vendor-unlocks"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >vendor purchases</a
            >
            unlock by Adventuring percentage.
          </div>
          <p
            class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-muted-foreground"
          >
            <span>Max Level: {data.profession.max_level}%</span>
            {#if data.profession.steam_achievement_id}
              <span class="flex items-center gap-1">
                Achievement:
                <Trophy class="h-4 w-4" />
                {data.profession.steam_achievement_name}
              </span>
            {/if}
          </p>
        </div>
      </div>
    </div>
  </section>

  <section id="adventurer-quests" class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="flex items-center gap-2 text-xl font-semibold">
          <Scroll class="h-5 w-5 text-orange-500" />
          Adventurer Quests ({data.quests.length})
        </h2>
      </div>
      <div class="flex flex-wrap gap-1">
        {#each allClasses as playerClass (playerClass)}
          {@const config = getClassConfig(playerClass)}
          <button
            type="button"
            class="rounded px-2 py-1 text-xs transition-colors"
            title={`Show ${playerClass} class rewards`}
            style="background-color: {selectedClass === playerClass
              ? config.color
              : 'transparent'}; color: {selectedClass === playerClass
              ? 'white'
              : config.color}; border: 1px solid {config.color};"
            onclick={() => (selectedClass = playerClass)}
          >
            {config.abbrev}
          </button>
        {/each}
      </div>
    </div>

    <div class="rounded-lg border bg-muted/15 p-4">
      <div
        class="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-center"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm">Queue date</span>
            <button
              type="button"
              class="rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              onclick={() => setDateOffset(0)}
            >
              Today
            </button>
            <button
              type="button"
              class="rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              onclick={() => setDateOffset(1)}
            >
              Tomorrow
            </button>
            <input
              type="date"
              bind:value={selectedDate}
              onchange={() => (selectedSort = "queue")}
              class="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>

          <label class="flex items-center gap-2 text-sm">
            <span class="text-muted-foreground">Sort</span>
            <select
              bind:value={selectedSort}
              class="rounded-md border bg-background px-2 py-1"
            >
              <option value="queue">Selected Queue Order</option>
              <option value="level">Level</option>
              <option value="name">Name</option>
              <option value="adventuring">Adventuring Gain</option>
            </select>
          </label>

          <label class="flex items-center gap-2 text-sm">
            <span class="text-muted-foreground">Type</span>
            <select
              bind:value={selectedType}
              class="rounded-md border bg-background px-2 py-1"
            >
              {#each typeOptions as type (type)}
                <option value={type}>{type}</option>
              {/each}
            </select>
          </label>
        </div>

        <div
          class="text-sm text-muted-foreground 2xl:justify-self-end 2xl:text-right"
        >
          Resets daily at {queueResetTime}{#if mounted}<span class="ml-1"
              >· next reset in {timeUntilReset} · local time {localResetTime}</span
            >{/if}
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-right font-medium">#</th>
              <th class="p-3 text-left font-medium">Type</th>
              <th class="p-3 text-left font-medium">Quest</th>
              <th class="p-3 text-left font-medium">Objective</th>
              <th class="p-3 text-left font-medium">Rewards</th>
              <th class="p-3 text-left font-medium">Class Reward</th>
              <th class="p-3 text-right font-medium">Adventuring</th>
              <th class="p-3 text-right font-medium">Level</th>
            </tr>
          </thead>
          <tbody>
            {#each displayedQuests as quest (quest.id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3 text-right text-muted-foreground">
                  {queueRank.get(quest.id) ?? "—"}
                </td>
                <td class="p-3">
                  <QuestTypeBadge type={quest.display_type} />
                </td>
                <td class="p-3">
                  <a
                    href="/quests/{quest.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {quest.name}
                  </a>
                </td>
                <td class="p-3">
                  {#if quest.objective}
                    {#if quest.objective.type === "kill"}
                      <a
                        href="/monsters/{quest.objective.target_id}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {quest.objective.target_name}
                      </a>
                      <span class="text-muted-foreground">
                        ×{quest.objective.amount}
                      </span>
                    {:else}
                      <a
                        href="/items/{quest.objective.target_id}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {quest.objective.target_name}
                      </a>
                      <span class="text-muted-foreground">
                        ×{quest.objective.amount}
                      </span>
                    {/if}
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="p-3">
                  {#each quest.reward_items.filter((i) => i.class_specific === null) as item (item.item_id)}
                    <a
                      href="/items/{item.item_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {item.item_name}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/each}
                </td>
                <td class="p-3">
                  {#each quest.reward_items.filter((i) => i.class_specific === selectedClass) as item (item.item_id)}
                    <a
                      href="/items/{item.item_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {item.item_name}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/each}
                </td>
                <td class="p-3 text-right">
                  {#if quest.reward_adventuring_skill > 0}
                    <span
                      class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-300"
                    >
                      +{(quest.reward_adventuring_skill * 100).toFixed(2)}%
                    </span>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="p-3 text-right">{quest.level_recommended}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="adventurer-vendor-unlocks" class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-xl font-semibold">
          <Store class="h-5 w-5 text-amber-500" />
          Adventurer Vendor Unlocks ({data.vendorUnlocks.length})
        </h2>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">Requirement</span>
        <select
          bind:value={selectedUnlockRequirement}
          class="rounded-md border bg-background px-2 py-1"
        >
          {#each unlockRequirementOptions as requirement (requirement)}
            <option value={requirement}>{requirement}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      {#each vendorUnlockGroups as group (group.requirement)}
        <div class="rounded-lg border p-4">
          <div class="flex items-center justify-between gap-3">
            <h3>{group.requirement} Adventuring</h3>
            <span
              class="rounded-full border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {group.unlocks.length} items
            </span>
          </div>

          <div class="mt-4 space-y-3">
            {#each group.unlocks as unlock (unlock.item_id)}
              <div class="rounded-md border bg-muted/10 p-3">
                <ItemLink
                  itemId={unlock.item_id}
                  itemName={unlock.item_name}
                  tooltipHtml={unlock.tooltip_html}
                />
                {#if !sellerLabel(unlock.sold_by.length)}
                  <div class="mt-1 text-xs text-muted-foreground">
                    Sold by
                    {#each unlock.sold_by as seller, index (seller.npc_id)}
                      <a
                        href="/npcs/{seller.npc_id}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {seller.npc_name}</a
                      >{index < unlock.sold_by.length - 1 ? ", " : ""}
                    {/each}
                  </div>
                {/if}
                <div class="mt-2 flex flex-wrap gap-1.5">
                  {#each unlock.currencies as currency (currency.item_id ?? currency.item_name)}
                    {#if currency.item_id}
                      <a
                        href="/items/{currency.item_id}"
                        class="rounded-full border bg-muted/40 px-2 py-0.5 text-xs text-blue-600 transition-colors hover:bg-muted hover:underline dark:text-blue-400"
                      >
                        {currency.item_name}
                      </a>
                    {:else}
                      <span
                        class="rounded-full border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {currency.item_name}
                      </span>
                    {/if}
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="grid gap-6 lg:grid-cols-2">
    {#if data.questGivers.length > 0}
      <div id="adventurer-taskgivers" class="space-y-4">
        <h2 class="flex items-center gap-2 text-xl font-semibold">
          <MapPin class="h-5 w-5 text-emerald-500" />
          Adventurer Taskgivers ({data.questGivers.length})
        </h2>
        <div class="grid gap-3">
          {#each data.questGivers as giver (giver.npc_id)}
            <article
              class="rounded-lg border p-4 transition-colors hover:bg-muted/15"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <a
                    href="/npcs/{giver.npc_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {giver.npc_name}
                  </a>
                  <div class="mt-1 text-sm text-muted-foreground">
                    <a
                      href="/zones/{giver.zone_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {giver.zone_name}
                    </a>
                    <span> / {giver.sub_zone_name ?? "Unknown area"}</span>
                  </div>
                </div>
                <MapLink entityId={giver.npc_id} entityType="npc" compact />
              </div>
            </article>
          {/each}
        </div>
      </div>
    {/if}

    {#if data.merchants.length > 0}
      <div id="adventurer-vendors" class="space-y-4">
        <h2 class="flex items-center gap-2 text-xl font-semibold">
          <Store class="h-5 w-5 text-amber-500" />
          Adventurer Vendors ({data.merchants.length})
        </h2>
        <div class="grid gap-3">
          {#each data.merchants as merchant (merchant.npc_id)}
            <article
              class="rounded-lg border p-4 transition-colors hover:bg-muted/15"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <a
                    href="/npcs/{merchant.npc_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {merchant.npc_name}
                  </a>
                  <div class="mt-1 text-sm text-muted-foreground">
                    <a
                      href="/zones/{merchant.zone_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {merchant.zone_name}
                    </a>
                    <span> / {merchant.sub_zone_name ?? "Unknown area"}</span>
                  </div>
                </div>
                <MapLink entityId={merchant.npc_id} entityType="npc" compact />
              </div>
            </article>
          {/each}
        </div>
      </div>
    {/if}
  </section>
</div>
