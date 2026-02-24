<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import QuestChainGraph from "$lib/components/QuestChainGraph.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import * as Tabs from "$lib/components/ui/tabs";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Target from "@lucide/svelte/icons/target";
  import Gift from "@lucide/svelte/icons/gift";
  import User from "@lucide/svelte/icons/user";
  import GitBranch from "@lucide/svelte/icons/git-branch";
  import FileText from "@lucide/svelte/icons/file-text";
  import ListTree from "@lucide/svelte/icons/list-tree";

  let { data } = $props();

  // Check if quest has any requirements (start conditions)
  const hasRequirements = $derived(
    data.quest.race_requirements.length > 0 ||
      data.quest.class_requirements.length > 0 ||
      data.quest.faction_requirements.length > 0,
  );

  // Check if quest has any objectives to display
  const hasObjectives = $derived(
    data.killTargets.length > 0 ||
      data.gatherItems.length > 0 ||
      data.gatherInventoryItems.length > 0 ||
      data.requiredItems.length > 0 ||
      data.equipItems.length > 0 ||
      data.potionItem !== null ||
      data.quest.tracking_quest_location ||
      data.quest.discovered_location ||
      (data.quest.is_find_npc_quest && data.endNpc !== null),
  );

  // Check if quest has any rewards
  const hasRewards = $derived(
    data.quest.rewards.gold > 0 ||
      data.quest.rewards.exp > 0 ||
      data.quest.rewards.items.length > 0 ||
      data.quest.increase_alchemy_skill > 0,
  );

  // Check if quest is part of a chain
  const hasQuestChain = $derived(data.chainGraph !== null);

  // Format large numbers
  function formatNumber(num: number): string {
    return num.toLocaleString();
  }

  // Game tooltip helpers
  type PlayerClass =
    | "Warrior"
    | "Cleric"
    | "Ranger"
    | "Rogue"
    | "Wizard"
    | "Druid";

  // Check if tooltips have class-specific variants (vs just "_default")
  const hasClassSpecificTooltips = $derived(
    data.quest.tooltip_html !== null &&
      !("_default" in data.quest.tooltip_html),
  );

  // Get available classes from tooltip (for class-specific quests)
  const tooltipClasses = $derived(
    hasClassSpecificTooltips && data.quest.tooltip_html
      ? (Object.keys(data.quest.tooltip_html) as PlayerClass[])
      : [],
  );

  // Selected class for tooltip display (for class-specific quests)
  let selectedTooltipClass = $state<PlayerClass>("Warrior");

  // Get the current tooltip HTML based on selection
  const currentTooltipHtml = $derived(() => {
    if (!data.quest.tooltip_html) return null;
    if ("_default" in data.quest.tooltip_html) {
      return data.quest.tooltip_html._default;
    }
    return data.quest.tooltip_html[selectedTooltipClass] || null;
  });

  const currentTooltipCompleteHtml = $derived(() => {
    if (!data.quest.tooltip_complete_html) return null;
    if ("_default" in data.quest.tooltip_complete_html) {
      return data.quest.tooltip_complete_html._default;
    }
    return data.quest.tooltip_complete_html[selectedTooltipClass] || null;
  });
</script>

<svelte:head>
  <title>{data.quest.name} - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Quests", href: "/quests" },
      { label: data.quest.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{data.quest.name}</h1>
      <MapLink entityId={data.quest.id} entityType="quest" />
      <QuestTypeBadge type={data.quest.display_type} />
      <QuestFlagBadges quest={data.quest} />
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {#if data.quest.level_required > 0}
        <span>Required Level: {data.quest.level_required}</span>
      {/if}
      {#if data.quest.level_recommended > 0}
        <span>Recommended Level: {data.quest.level_recommended}</span>
      {/if}
    </div>
  </div>

  <!-- Daily Quest Info -->
  {#if data.quest.is_adventurer_quest}
    <div class="bg-muted/30 rounded-md border p-4">
      <p class="text-sm">
        Repeatable once every 24 hours. Daily quests are shuffled into a random
        order each day and offered one at a time.
      </p>
    </div>
  {/if}

  <!-- Quest Chain (at top for context) -->
  {#if hasQuestChain && data.chainGraph}
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          <GitBranch class="h-5 w-5 text-indigo-500" />
          Quest Chain
        </h2>
        <span class="text-sm text-muted-foreground">
          Step {data.chainGraph.currentDepth + 1} of {data.chainGraph.maxDepth +
            1}
        </span>
      </div>
      <div class="bg-muted/30 rounded-md border p-4">
        <QuestChainGraph graph={data.chainGraph} />
      </div>
      <!-- Quick nav links -->
      <div class="flex items-center justify-between text-sm mt-2 px-1">
        <div>
          {#if data.predecessors.length === 1}
            <a
              href="/quests/{data.predecessors[0].id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              data-sveltekit-preload-data="hover"
            >
              &larr; {data.predecessors[0].name}
            </a>
          {:else if data.predecessors.length > 1}
            <a
              href="/quests/{data.predecessors[0].id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              data-sveltekit-preload-data="hover"
            >
              &larr; {data.predecessors[0].name}
            </a>
            <span class="text-muted-foreground">
              (+{data.predecessors.length - 1} more)</span
            >
          {/if}
        </div>
        <div>
          {#if data.successors.length === 1}
            <a
              href="/quests/{data.successors[0].id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              data-sveltekit-preload-data="hover"
            >
              {data.successors[0].name} &rarr;
            </a>
          {:else if data.successors.length > 1}
            <span class="text-muted-foreground"
              >(+{data.successors.length - 1} more)
            </span>
            <a
              href="/quests/{data.successors[0].id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              data-sveltekit-preload-data="hover"
            >
              {data.successors[0].name} &rarr;
            </a>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  <!-- Tabbed Content: Details vs Game Tooltip -->
  <Tabs.Root value="details" class="w-full">
    <Tabs.List class="grid w-full grid-cols-2 mb-6">
      <Tabs.Trigger value="details">Details</Tabs.Trigger>
      <Tabs.Trigger value="tooltip">Game Tooltip</Tabs.Trigger>
    </Tabs.List>

    <!-- Details Tab -->
    <Tabs.Content value="details" class="space-y-6">
      <!-- Requirements (start conditions) -->
      {#if hasRequirements}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <Scroll class="h-5 w-5 text-amber-500" />
            Requirements
          </h2>
          <div class="bg-muted/30 rounded-md border p-4 space-y-3">
            {#if data.quest.race_requirements.length > 0}
              <div class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground w-16">Race:</span>
                <span class="flex flex-wrap gap-1">
                  {#each data.quest.race_requirements as race (race)}
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {race}
                    </span>
                  {/each}
                </span>
              </div>
            {/if}
            {#if data.quest.class_requirements.length > 0}
              <div class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground w-16">Class:</span>
                <ClassPills classes={data.quest.class_requirements} />
              </div>
            {/if}
            {#if data.quest.faction_requirements.length > 0}
              {#each data.quest.faction_requirements as faction (faction.faction)}
                <div class="flex items-center gap-2">
                  <span class="text-sm text-muted-foreground w-16"
                    >Faction:</span
                  >
                  <span>{faction.faction}</span>
                  {#if faction.tier_name}
                    <span class="text-purple-600 dark:text-purple-400">
                      {faction.tier_name}
                      <span class="text-muted-foreground font-normal"
                        >({faction.faction_value.toLocaleString()})</span
                      >
                    </span>
                  {:else}
                    <span class="text-muted-foreground"
                      >({faction.faction_value.toLocaleString()})</span
                    >
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        </section>
      {/if}

      <!-- NPCs -->
      {#if data.startNpc}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <User class="h-5 w-5 text-blue-500" />
            NPCs
          </h2>
          <div class="bg-muted/30 rounded-md border p-4 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground w-16">Start:</span>
              <a
                href="/npcs/{data.startNpc.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {data.startNpc.name}
              </a>
              {#if data.startNpc.zone_name}
                <span class="text-muted-foreground">
                  in
                  <a
                    href="/zones/{data.startNpc.zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {data.startNpc.zone_name}
                  </a>
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground w-16">End:</span>
              {#if data.endNpc}
                <a
                  href="/npcs/{data.endNpc.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {data.endNpc.name}
                </a>
                {#if data.endNpc.zone_name}
                  <span class="text-muted-foreground">
                    in
                    <a
                      href="/zones/{data.endNpc.zone_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {data.endNpc.zone_name}
                    </a>
                  </span>
                {/if}
              {:else}
                <a
                  href="/npcs/{data.startNpc.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {data.startNpc.name}
                </a>
                {#if data.startNpc.zone_name}
                  <span class="text-muted-foreground">
                    in
                    <a
                      href="/zones/{data.startNpc.zone_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {data.startNpc.zone_name}
                    </a>
                  </span>
                {/if}
              {/if}
            </div>
          </div>
        </section>
      {:else if data.adventurerNpcs.length > 0}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <User class="h-5 w-5 text-blue-500" />
            NPCs
          </h2>
          <div class="bg-muted/30 rounded-md border p-4 space-y-2">
            {#each data.adventurerNpcs as npc (npc.id)}
              <div class="flex items-center gap-2">
                <a
                  href="/npcs/{npc.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {npc.name}
                </a>
                {#if npc.zone_name}
                  <span class="text-muted-foreground">
                    in
                    <a
                      href="/zones/{npc.zone_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {npc.zone_name}
                    </a>
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Given Item on Start -->
      {#if data.givenItemOnStart}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <Gift class="h-5 w-5 text-green-500" />
            Given on Start
          </h2>
          <div class="bg-muted/30 rounded-md border p-4">
            <ItemLink
              itemId={data.givenItemOnStart.id}
              itemName={data.givenItemOnStart.name}
              tooltipHtml={data.givenItemOnStart.tooltip_html}
            />
          </div>
        </section>
      {/if}

      <!-- Objectives -->
      {#if hasObjectives}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <Target class="h-5 w-5 text-red-500" />
            Objectives
          </h2>
          <div class="bg-muted/30 rounded-md border p-4 space-y-2">
            <!-- Kill targets -->
            {#each data.killTargets as target, i (i)}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                >
                  Kill
                </span>
                <MonsterTypeIcon
                  isBoss={target.is_boss}
                  isFabled={target.is_fabled}
                  isElite={target.is_elite}
                />
                <a
                  href="/monsters/{target.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {target.name}
                </a>
                <span class="text-muted-foreground">x{target.amount}</span>
              </div>
            {/each}

            <!-- Gather items (GatherQuest - progress tracked, items never removed) -->
            {#each data.gatherItems as item, i (i)}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  Gather
                </span>
                <ItemLink
                  itemId={item.id}
                  itemName={item.name}
                  tooltipHtml={item.tooltip_html}
                />
                <span class="text-muted-foreground">x{item.amount}</span>
              </div>
            {/each}

            <!-- Gather inventory items (GatherInventoryQuest) -->
            <!-- Have = keep items, Deliver = items consumed -->
            {#each data.gatherInventoryItems as item, i (i)}
              <div class="flex items-center gap-2">
                {#if data.quest.remove_items_on_complete}
                  <span
                    class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  >
                    Deliver
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Have
                  </span>
                {/if}
                <ItemLink
                  itemId={item.id}
                  itemName={item.name}
                  tooltipHtml={item.tooltip_html}
                />
                <span class="text-muted-foreground">x{item.amount}</span>
              </div>
            {/each}

            <!-- Required items (GatherInventoryQuest) - also shown as Deliver since they're consumed -->
            {#each data.requiredItems as item, i (i)}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                >
                  Deliver
                </span>
                <ItemLink
                  itemId={item.id}
                  itemName={item.name}
                  tooltipHtml={item.tooltip_html}
                />
                {#if item.amount > 1}
                  <span class="text-muted-foreground">x{item.amount}</span>
                {/if}
              </div>
            {/each}

            <!-- Equip items (EquipItemQuest) -->
            {#each data.equipItems as item, i (i)}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  Equip
                </span>
                <ItemLink
                  itemId={item.id}
                  itemName={item.name}
                  tooltipHtml={item.tooltip_html}
                />
              </div>
            {/each}

            <!-- Alchemy quest potion -->
            {#if data.potionItem}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                >
                  Brew
                </span>
                <ItemLink
                  itemId={data.potionItem.id}
                  itemName={data.potionItem.name}
                  tooltipHtml={data.potionItem.tooltip_html}
                />
                <span class="text-muted-foreground"
                  >x{data.potionItem.amount}</span
                >
              </div>
            {/if}

            <!-- Location quest objectives -->
            {#if data.quest.is_find_npc_quest && data.endNpc}
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  Find
                </span>
                <a
                  href="/npcs/{data.endNpc.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {data.endNpc.name}
                </a>
                {#if data.endNpc.zone_name}
                  <span class="text-muted-foreground">
                    in
                    <a
                      href="/zones/{data.endNpc.zone_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {data.endNpc.zone_name}
                    </a>
                  </span>
                {/if}
              </div>
            {:else if data.quest.discovered_location}
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium w-16 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                >
                  Discover
                </span>
                {#if data.quest.discovered_location_sub_zone}
                  <span>{data.quest.discovered_location_sub_zone.name}</span>
                {/if}
                {#if data.quest.discovered_location_zone}
                  <span class="text-muted-foreground">in</span>
                  <a
                    href="/zones/{data.quest.discovered_location_zone.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {data.quest.discovered_location_zone.name}
                  </a>
                {/if}
                {#if data.quest.discovered_location_position}
                  <span class="text-muted-foreground text-sm">
                    at ({data.quest.discovered_location_position.x.toFixed(0)}, {data.quest.discovered_location_position.y.toFixed(
                      0,
                    )})
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        </section>
      {/if}

      <!-- How to Obtain Items -->
      {#if data.itemObtainabilityTrees.length > 0}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <ListTree class="h-5 w-5 text-muted-foreground" />
            How to Obtain Items
          </h2>
          <div class="bg-muted/30 rounded-md border p-4 mt-4">
            <div class="bg-background rounded-md p-4 border overflow-x-auto">
              <div class="w-fit pr-2 space-y-4">
                {#each data.itemObtainabilityTrees as tree (tree.item_id)}
                  <ObtainabilityTree node={tree} />
                {/each}
              </div>
            </div>
          </div>
        </section>
      {/if}

      <!-- Rewards -->
      {#if hasRewards}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <Gift class="h-5 w-5 text-amber-500" />
            Rewards
          </h2>
          <div class="bg-muted/30 rounded-md border p-4 space-y-3">
            <div class="flex flex-wrap gap-6">
              {#if data.quest.rewards.exp > 0}
                <div>
                  <span class="text-sm text-muted-foreground"
                    >Experience:
                  </span>
                  <span class="font-medium text-blue-600 dark:text-blue-400">
                    {formatNumber(data.quest.rewards.exp)} XP
                  </span>
                </div>
              {/if}
              {#if data.quest.rewards.gold > 0}
                <div>
                  <span class="text-sm text-muted-foreground">Gold: </span>
                  <span
                    class="font-medium text-yellow-600 dark:text-yellow-400"
                  >
                    {formatNumber(data.quest.rewards.gold)}
                  </span>
                </div>
              {/if}
              {#if data.quest.increase_alchemy_skill > 0}
                <div>
                  <span class="text-sm text-muted-foreground"
                    >Alchemy Skill:
                  </span>
                  <span class="font-medium text-cyan-600 dark:text-cyan-400">
                    +{(data.quest.increase_alchemy_skill * 100).toFixed(1)}%
                  </span>
                </div>
              {/if}
            </div>
            {#if data.quest.rewards.items.length > 0}
              <div class="pt-2 border-t space-y-2">
                <span class="text-sm text-muted-foreground">Items:</span>
                {#each data.quest.rewards.items as item, i (i)}
                  <div class="flex items-center gap-2">
                    {#if item.class_specific}
                      <ClassPills classes={[item.class_specific]} />
                    {/if}
                    <ItemLink
                      itemId={item.item_id}
                      itemName={item.item_name}
                      tooltipHtml={item.tooltip_html}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </section>
      {/if}
    </Tabs.Content>

    <!-- Game Tooltip Tab -->
    <Tabs.Content value="tooltip" class="space-y-6">
      <!-- Class selector for class-specific rewards -->
      {#if hasClassSpecificTooltips}
        <div class="flex flex-wrap gap-2">
          {#each tooltipClasses as playerClass (playerClass)}
            <button
              class="px-3 py-1.5 text-sm rounded-md transition-colors {selectedTooltipClass ===
              playerClass
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'}"
              onclick={() => (selectedTooltipClass = playerClass)}
            >
              {playerClass}
            </button>
          {/each}
        </div>
      {/if}

      {#if currentTooltipHtml()}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <FileText class="h-5 w-5 text-gray-500" />
            Quest Start
          </h2>
          <div class="bg-[#1a1a2e] rounded-md border border-[#3a3a5a] p-4">
            <div
              class="text-sm whitespace-pre-wrap tooltip-content text-[#e0e0e0]"
            >
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html currentTooltipHtml()}
            </div>
          </div>
        </section>
      {/if}

      {#if currentTooltipCompleteHtml() && currentTooltipCompleteHtml() !== currentTooltipHtml()}
        <section>
          <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
            <FileText class="h-5 w-5 text-green-500" />
            Quest Complete
          </h2>
          <div class="bg-[#1a1a2e] rounded-md border border-[#3a3a5a] p-4">
            <div
              class="text-sm whitespace-pre-wrap tooltip-content text-[#e0e0e0]"
            >
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html currentTooltipCompleteHtml()}
            </div>
          </div>
        </section>
      {/if}

      {#if !currentTooltipHtml() && !currentTooltipCompleteHtml()}
        <div class="text-muted-foreground text-center py-8">
          No game tooltip available for this quest.
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
