<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { resolve } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import { STATS_METADATA_FIELDS } from "$lib/constants/items";
  import { parseTooltip } from "$lib/utils/tooltip";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const qualityColors = [
    "bg-quality-0",
    "bg-quality-1",
    "bg-quality-2",
    "bg-quality-3",
    "bg-quality-4",
  ];

  const qualityNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

  function parseJson<T>(json: string | null): T | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  // Percentage stats that should be displayed as percentages (0.05 → 5%)
  const percentageStats = new Set([
    "block_chance",
    "accuracy",
    "critical_chance",
    "haste",
    "spell_haste",
  ]);

  function formatStatName(stat: string): string {
    return stat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function formatStatValue(
    stat: string,
    value: number | boolean | string,
  ): string {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string") return value;

    // Format percentage stats with +/- prefix
    if (percentageStats.has(stat)) {
      const percentage = (value * 100).toFixed(1);
      return `${value > 0 ? "+" : ""}${percentage}%`;
    }

    // Add +/- prefix for all numeric stats
    return `${value > 0 ? "+" : ""}${value}`;
  }

  // Compute all derived values from item data
  const computed = $derived.by(() => {
    // Stats include both numeric stats and metadata fields
    const allStats = parseJson<Record<string, number | boolean | string>>(
      data.item.stats,
    );

    // Extract metadata fields
    const maxDurability = allStats?.max_durability as number | undefined;
    const hasSerenity = allStats?.has_serenity as boolean | undefined;
    const isCostume = allStats?.is_costume as boolean | undefined;
    const augmentBonusSet = allStats?.augment_bonus_set as string | undefined;

    // Filter stats for display: remove zeros and metadata fields
    const stats = allStats
      ? Object.fromEntries(
          Object.entries(allStats).filter(([key, value]) => {
            if ((STATS_METADATA_FIELDS as readonly string[]).includes(key)) {
              return false;
            }
            return value !== 0 && value !== 0.0 && value !== false;
          }),
        )
      : null;

    return {
      allStats,
      maxDurability,
      hasSerenity,
      isCostume,
      augmentBonusSet,
      stats,
      classRequired: parseJson<string[]>(data.item.class_required) || [],
      droppedBy: parseJson<
        Array<{
          monster_id: string;
          monster_name: string;
          monster_level: number;
          rate: number;
        }>
      >(data.item.dropped_by),
      soldBy: parseJson<
        Array<{
          npc_id: string;
          npc_name: string;
          price: number;
          currency_item_id: string | null;
          currency_item_name: string | null;
        }>
      >(data.item.sold_by),
      rewardedBy: parseJson<
        Array<{
          quest_id: string;
          quest_name: string;
          level_required: number;
          level_recommended: number;
        }>
      >(data.item.rewarded_by),
      craftedFrom: parseJson<
        Array<{
          recipe_id: string;
          result_amount: number;
          materials: Array<{ item_id: string; item_name: string; amount: number }>;
        }>
      >(data.item.crafted_from),
      gatheredFrom: parseJson<
        Array<{
          gather_item_id: string;
          gather_item_name: string;
          rate: number;
          type: "resource" | "chest";
          zone_id?: string;
          zone_name?: string;
          key_required_id?: string;
          key_name?: string;
          amount_min?: number;
          amount_max?: number;
        }>
      >(data.item.gathered_from),
      createdFromMerge: parseJson<
        Array<{
          item_id: string;
          item_name: string;
        }>
      >(data.item.created_from_merge),
      foundInChests: parseJson<
        Array<{
          chest_id: string;
          chest_name: string;
          rate: number;
        }>
      >(data.item.found_in_chests),
      usedInRecipes: parseJson<
        Array<{
          recipe_id: string;
          result_item_id: string;
          result_item_name: string;
          amount: number;
        }>
      >(data.item.used_in_recipes),
      neededForQuests: parseJson<
        Array<{
          quest_id: string;
          quest_name: string;
          level_required: number;
          level_recommended: number;
          purpose: string;
          amount: number;
        }>
      >(data.item.needed_for_quests),
      armorSetSkillBonuses: parseJson<
        Array<{ skill_id: string; level_bonus: number }>
      >(data.item.augment_skill_bonuses),
      armorSetMembers: parseJson<string[]>(
        data.item.augment_armor_set_item_ids,
      ),
      chestRewards: parseJson<
        Array<{
          item_id: string;
          item_name: string;
          probability: number;
          actual_drop_chance: number;
        }>
      >(data.item.chest_rewards),
    };
  });
</script>

<svelte:head>
  <title>{data.item.name} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Items", href: "/items" },
      { label: data.item.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-start gap-4">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <h1 class="text-4xl font-bold">{data.item.name}</h1>
          <span
            class="px-3 py-1 rounded text-sm font-medium {qualityColors[
              data.item.quality
            ]}"
          >
            {qualityNames[data.item.quality]}
          </span>
        </div>
        <p class="text-xl text-muted-foreground">
          {data.item.item_type || "Unknown type"}
        </p>
      </div>
    </div>
  </div>

  <!-- Basic Info -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Basic Information</Card.Title>
    </Card.Header>
    <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
      {#if data.item.level_required > 0}
        <div>
          <div class="text-sm text-muted-foreground">Level Required</div>
          <div class="font-medium">{data.item.level_required}</div>
        </div>
      {/if}

      {#if computed.classRequired.length > 0}
        <div>
          <div class="text-sm text-muted-foreground">Class Required</div>
          <div class="font-medium">{computed.classRequired.join(", ")}</div>
        </div>
      {/if}

      {#if data.item.slot}
        <div>
          <div class="text-sm text-muted-foreground">Equipment Slot</div>
          <div class="font-medium">{data.item.slot}</div>
        </div>
      {/if}

      {#if data.item.max_stack > 1}
        <div>
          <div class="text-sm text-muted-foreground">Max Stack</div>
          <div class="font-medium">{data.item.max_stack}</div>
        </div>
      {/if}

      {#if computed.maxDurability}
        <div>
          <div class="text-sm text-muted-foreground">Max Durability</div>
          <div class="font-medium">{computed.maxDurability}</div>
        </div>
      {/if}

      {#if computed.hasSerenity}
        <div>
          <div class="text-sm text-muted-foreground">Special Effect</div>
          <div class="font-medium text-green-600 dark:text-green-400">
            Serenity
          </div>
        </div>
      {/if}

      {#if computed.isCostume}
        <div>
          <div class="text-sm text-muted-foreground">Item Type</div>
          <div class="font-medium text-purple-600 dark:text-purple-400">
            Cosmetic
          </div>
        </div>
      {/if}

      {#if computed.augmentBonusSet}
        <div>
          <div class="text-sm text-muted-foreground">Set Bonus</div>
          <div class="font-medium text-blue-600 dark:text-blue-400">
            {computed.augmentBonusSet}
          </div>
        </div>
      {/if}

      {#if data.item.buy_price > 0}
        <div>
          <div class="text-sm text-muted-foreground">Buy Price</div>
          <div class="font-medium text-yellow-600 dark:text-yellow-400">
            {data.item.buy_price}g
          </div>
        </div>
      {/if}

      {#if data.item.sell_price > 0}
        <div>
          <div class="text-sm text-muted-foreground">Sell Price</div>
          <div class="font-medium text-yellow-600 dark:text-yellow-400">
            {data.item.sell_price}g
          </div>
        </div>
      {/if}

      <div>
        <div class="text-sm text-muted-foreground">Tradable</div>
        <div class="font-medium">{data.item.tradable ? "Yes" : "No"}</div>
      </div>

      <div>
        <div class="text-sm text-muted-foreground">Sellable</div>
        <div class="font-medium">{data.item.sellable ? "Yes" : "No"}</div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Tooltip and Stats/Merge side-by-side -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Tooltip (don't show for augments - they're metadata items never shown to players) -->
    {#if data.item.tooltip && data.item.item_type !== "augment"}
      <Card.Root>
        <Card.Header>
          <Card.Title>Tooltip</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-sm whitespace-pre-wrap tooltip-content">
            {@html parseTooltip(data.item.tooltip, data.item)}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Stats -->
    {#if (computed.stats && Object.keys(computed.stats).length > 0) || data.item.weapon_delay > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Stats</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-2 gap-3">
            {#if data.item.weapon_delay > 0}
              <div class="flex justify-between items-center p-2 rounded bg-muted">
                <span class="text-sm font-medium">Attack Delay</span>
                <span class="text-sm font-bold">{data.item.weapon_delay}</span>
              </div>
            {/if}
            {#if computed.stats}
              {#each Object.entries(computed.stats) as [stat, value] (stat)}
                <div class="flex justify-between items-center p-2 rounded bg-muted">
                  <span class="text-sm font-medium">{formatStatName(stat)}</span>
                  <span class="text-sm font-bold"
                    >{formatStatValue(stat, value)}</span
                  >
                </div>
              {/each}
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {:else if data.item.merge_result_item_id && data.item.merge_items_needed}
      <!-- Merge Quest (shown when no stats) -->
      {@const mergeItems = JSON.parse(data.item.merge_items_needed)}
      <Card.Root>
        <Card.Header>
          <Card.Title>Merge Quest</Card.Title>
          <Card.Description>Collect all pieces to create the complete item.</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div>
            <div class="text-sm text-muted-foreground mb-2">Items Needed ({mergeItems.length})</div>
            <div class="grid grid-cols-1 gap-2">
              {#each mergeItems as mergeItem}
                <a
                  href="/items/{mergeItem.item_id}"
                  class="text-sm hover:underline text-blue-600 dark:text-blue-400"
                >
                  {mergeItem.item_name}
                </a>
              {/each}
            </div>
          </div>

          <div>
            <div class="text-sm text-muted-foreground mb-2">Creates</div>
            <a
              href="/items/{data.item.merge_result_item_id}"
              class="font-medium hover:underline text-blue-600 dark:text-blue-400"
            >
              {data.item.merge_result_item_name || data.item.merge_result_item_id}
            </a>
          </div>
        </Card.Content>
      </Card.Root>
    {:else if computed.createdFromMerge && computed.createdFromMerge.length > 0}
      <!-- Created From Merge (shown when no stats and not a merge item) -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Created From Merge</Card.Title>
          <Card.Description>Collect and combine these items to create this item.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid grid-cols-1 gap-2">
            {#each computed.createdFromMerge as mergeItem}
              <a
                href="/items/{mergeItem.item_id}"
                class="text-sm hover:underline text-blue-600 dark:text-blue-400"
              >
                {mergeItem.item_name}
              </a>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  <!-- Armor Set Bonuses -->
  {#if computed.armorSetSkillBonuses && computed.armorSetSkillBonuses.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>
          {data.item.augment_armor_set_name || "Set Bonuses"}
        </Card.Title>
        {#if computed.armorSetMembers && computed.armorSetMembers.length > 0}
          <Card.Description>
            Requires {computed.armorSetMembers.length} pieces
          </Card.Description>
        {/if}
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Skill Bonuses -->
        <div>
          <h4 class="text-sm font-semibold mb-2">Skill Bonuses</h4>
          <div class="space-y-2">
            {#each computed.armorSetSkillBonuses as bonus (bonus.skill_id)}
              <div
                class="flex items-center justify-between p-2 rounded bg-muted"
              >
                <span class="text-sm font-medium"
                  >{bonus.skill_id.replace(/_/g, " ")}</span
                >
                <span
                  class="text-sm font-bold text-green-600 dark:text-green-400"
                >
                  +{bonus.level_bonus} level{bonus.level_bonus !== 1 ? "s" : ""}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Set Members -->
        {#if computed.armorSetMembers && computed.armorSetMembers.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">
              Set Pieces ({computed.armorSetMembers.length})
            </h4>
            <div class="grid grid-cols-2 gap-2">
              {#each computed.armorSetMembers as memberId (memberId)}
                <a
                  href="/items/{memberId}"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {memberId.replace(/_/g, " ")}
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Use Effects -->
  {#if data.item.usage_health > 0 || data.item.usage_mana > 0 || data.item.usage_energy > 0 || data.item.food_buff_id || data.item.relic_buff_id}
    <Card.Root>
      <Card.Header>
        <Card.Title>Use Effects</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if data.item.usage_health > 0}
          <div>
            <div class="text-sm text-muted-foreground">Restores Health</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.usage_health} HP
            </div>
          </div>
        {/if}

        {#if data.item.usage_mana > 0}
          <div>
            <div class="text-sm text-muted-foreground">Restores Mana</div>
            <div class="font-medium text-blue-600 dark:text-blue-400">
              +{data.item.usage_mana} MP
            </div>
          </div>
        {/if}

        {#if data.item.usage_energy > 0}
          <div>
            <div class="text-sm text-muted-foreground">Restores Energy</div>
            <div class="font-medium text-yellow-600 dark:text-yellow-400">
              +{data.item.usage_energy} Energy
            </div>
          </div>
        {/if}

        {#if data.item.food_buff_id}
          <div>
            <div class="text-sm text-muted-foreground">Grants Buff</div>
            <div class="font-medium">
              <a
                href="/skills/{data.item.food_buff_id}"
                class="hover:underline"
              >
                {data.item.food_buff_name || data.item.food_buff_id.replace(/_/g, " ")}
              </a>
            </div>
          </div>
        {/if}

        {#if data.item.relic_buff_id}
          <div>
            <div class="text-sm text-muted-foreground">Activates</div>
            <div class="font-medium">
              <a
                href="/skills/{data.item.relic_buff_id}"
                class="hover:underline"
              >
                {data.item.relic_buff_name || data.item.relic_buff_id.replace(/_/g, " ")}
              </a>
            </div>
          </div>
        {/if}

        <div>
          <div class="text-sm text-muted-foreground">Consumed on Use</div>
          <div class="font-medium">{data.item.infinite_charges ? "No" : "Yes"}</div>
        </div>

        {#if data.item.cooldown > 0}
          <div>
            <div class="text-sm text-muted-foreground">Recharge Time</div>
            <div class="font-medium">{data.item.cooldown}s</div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Book Effects (Permanent Stat Gains) -->
  {#if data.item.book_strength_gain > 0 || data.item.book_dexterity_gain > 0 || data.item.book_constitution_gain > 0 || data.item.book_intelligence_gain > 0 || data.item.book_wisdom_gain > 0 || data.item.book_charisma_gain > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Permanent Stat Gains</Card.Title>
        <Card.Description>Reading this book grants permanent stat increases</Card.Description>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if data.item.book_strength_gain > 0}
          <div>
            <div class="text-sm text-muted-foreground">Strength</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.book_strength_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_dexterity_gain > 0}
          <div>
            <div class="text-sm text-muted-foreground">Dexterity</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.book_dexterity_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_constitution_gain > 0}
          <div>
            <div class="text-sm text-muted-foreground">Constitution</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.book_constitution_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_intelligence_gain > 0}
          <div>
            <div class="text-sm text-muted-foreground">Intelligence</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.book_intelligence_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_wisdom_gain > 0}
          <div>
            <div class="text-sm text-muted-foreground">Wisdom</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.book_wisdom_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_charisma_gain > 0}
          <div>
            <div class="text-sm text-muted-foreground">Charisma</div>
            <div class="font-medium text-green-600 dark:text-green-400">
              +{data.item.book_charisma_gain}
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Fatecharm Fragment -->
  {#if data.item.luck_token_drop_chance && data.item.fragment_result_item_id}
    <Card.Root>
      <Card.Header>
        <Card.Title>Fatecharm Fragment</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <div class="text-sm text-muted-foreground">Zone</div>
          <div class="font-medium">{data.item.luck_token_zone_name || "Unknown"}</div>
        </div>

        <div>
          <div class="text-sm text-muted-foreground">Amount Needed</div>
          <div class="font-medium">{data.item.fragment_amount_needed}</div>
        </div>

        <div>
          <div class="text-sm text-muted-foreground">Creates</div>
          <div class="font-medium">
            <a
              href="/items/{data.item.fragment_result_item_id}"
              class="hover:underline"
            >
              {data.item.fragment_result_item_name || "Unknown"}
            </a>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Fatecharm -->
  {#if data.item.luck_token_bonus}
    <Card.Root>
      <Card.Header>
        <Card.Title>Fatecharm</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <div class="text-sm text-muted-foreground">Zone</div>
          <div class="font-medium">{data.item.luck_token_zone_name || "Unknown"}</div>
        </div>

        <div>
          <div class="text-sm text-muted-foreground">Boss Drop Bonus</div>
          <div class="font-medium text-green-600 dark:text-green-400">
            +{(data.item.luck_token_bonus * 100).toFixed(0)}%
          </div>
        </div>

        {#if data.item.luck_token_fragment_id && data.item.luck_token_fragment_name}
          <div>
            <div class="text-sm text-muted-foreground">Created From</div>
            <div class="font-medium">
              <a
                href="/items/{data.item.luck_token_fragment_id}"
                class="hover:underline"
              >
                {data.item.luck_token_fragment_name}
              </a>
              {#if data.item.luck_token_fragments_needed}
                <span class="text-muted-foreground"> (x{data.item.luck_token_fragments_needed})</span>
              {/if}
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Relationships -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Dropped By -->
    {#if computed.droppedBy && computed.droppedBy.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Dropped By</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.droppedBy as drop, index (`${drop.monster_id}_${index}`)}
              <div class="flex justify-between items-center text-sm">
                <a
                  href={resolve("/monsters/[id]", { id: drop.monster_id })}
                  class="hover:underline font-medium"
                >
                  {drop.monster_name}
                  <span class="text-muted-foreground font-normal"
                    >(Lv {drop.monster_level})</span
                  >
                </a>
                <span class="text-muted-foreground"
                  >{(drop.rate * 100).toFixed(1)}%</span
                >
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Sold By -->
    {#if computed.soldBy && computed.soldBy.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Sold By</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.soldBy as vendor, index (`${vendor.npc_id}_${index}`)}
              <div class="flex justify-between items-center text-sm">
                <a
                  href={resolve("/npcs/[id]", { id: vendor.npc_id })}
                  class="hover:underline font-medium"
                >
                  {vendor.npc_name}
                </a>
                <span class="text-yellow-600 dark:text-yellow-400">
                  {#if vendor.currency_item_id}
                    {vendor.price}
                    <a
                      href={resolve("/items/[id]", { id: vendor.currency_item_id })}
                      class="hover:underline"
                    >
                      {vendor.currency_item_name}
                    </a>
                  {:else}
                    {vendor.price}g
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Quest Reward -->
    {#if computed.rewardedBy && computed.rewardedBy.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Quest Reward</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.rewardedBy as quest, index (`${quest.quest_id}_${index}`)}
              <div class="text-sm">
                <a
                  href={resolve("/quests/[id]", { id: quest.quest_id })}
                  class="hover:underline font-medium"
                >
                  {quest.quest_name}
                  <span class="text-muted-foreground font-normal"
                    >(Lv {quest.level_required})</span
                  >
                </a>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Crafted From -->
    {#if computed.craftedFrom && computed.craftedFrom.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Crafted From Recipe</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-1">
            {#each computed.craftedFrom[0].materials as material}
              <div class="flex justify-between items-center text-sm">
                <a
                  href={resolve("/items/[id]", { id: material.item_id })}
                  class="hover:underline"
                >
                  {material.item_name}
                </a>
                <span class="text-muted-foreground">x{material.amount}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Gathered From -->
    {#if computed.gatheredFrom && computed.gatheredFrom.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Gathered From</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.gatheredFrom as gather, index (`${gather.gather_item_id}_${index}`)}
              {#if gather.type === "chest"}
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between items-center">
                    <span class="font-medium">Chest</span>
                    <span class="text-muted-foreground"
                      >{(gather.rate * 100).toFixed(1)}%</span
                    >
                  </div>
                  <div class="text-xs text-muted-foreground pl-2 space-y-0.5">
                    {#if gather.zone_name}
                      <div>Zone: {gather.zone_name}</div>
                    {/if}
                    {#if gather.key_name}
                      <div>Key: {gather.key_name}</div>
                    {/if}
                  </div>
                </div>
              {:else}
                <div class="flex justify-between items-center text-sm">
                  <span class="font-medium">{gather.gather_item_name}</span>
                  <span class="text-muted-foreground">
                    {(gather.rate * 100).toFixed(1)}%
                    {#if gather.amount_min !== undefined && gather.amount_max !== undefined}
                      ({gather.amount_min}-{gather.amount_max}×)
                    {/if}
                  </span>
                </div>
              {/if}
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Found In Chests -->
    {#if computed.foundInChests && computed.foundInChests.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Found In Chests</Card.Title>
          <p class="text-sm text-muted-foreground mt-1">
            Drop chances calculated via simulation (100k trials).
          </p>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.foundInChests as chest, index (`${chest.chest_id}_${index}`)}
              <div class="flex justify-between items-center text-sm">
                <a
                  href="/items/{chest.chest_id}"
                  class="font-medium hover:underline"
                >
                  {chest.chest_name}
                </a>
                <span class="text-muted-foreground"
                  >{(chest.rate * 100).toFixed(1)}%</span
                >
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Chest Rewards -->
    {#if computed.chestRewards && computed.chestRewards.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Chest Rewards</Card.Title>
          <p class="text-sm text-muted-foreground mt-1">
            Gives up to {data.item.chest_num_items} {data.item.chest_num_items === 1 ? 'item' : 'items'} per opening. Each item can only appear once. Drop chances calculated via simulation (100k trials).
          </p>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.chestRewards as reward, index (`${reward.item_id}_${index}`)}
              <div class="flex justify-between items-center text-sm">
                <a
                  href="/items/{reward.item_id}"
                  class="font-medium hover:underline"
                >
                  {reward.item_name}
                </a>
                <span class="text-muted-foreground"
                  >{(reward.actual_drop_chance * 100).toFixed(1)}%</span
                >
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Used In Recipes -->
    {#if computed.usedInRecipes && computed.usedInRecipes.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Used In Recipes</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.usedInRecipes as recipe, index (`${recipe.recipe_id}_${index}`)}
              <div class="flex justify-between items-center text-sm">
                <a
                  href={resolve("/items/[id]", { id: recipe.result_item_id })}
                  class="hover:underline"
                >
                  {recipe.result_item_name}
                </a>
                <span class="text-muted-foreground">x{recipe.amount}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Needed For Quests -->
    {#if computed.neededForQuests && computed.neededForQuests.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title>Needed For Quests</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.neededForQuests as quest, index (`${quest.quest_id}_${quest.purpose}_${index}`)}
              <div class="flex justify-between items-center text-sm">
                <a
                  href={resolve("/quests/[id]", { id: quest.quest_id })}
                  class="hover:underline font-medium"
                >
                  {quest.quest_name}
                  <span class="text-muted-foreground font-normal"
                    >(Lv {quest.level_required})</span
                  >
                </a>
                <span class="text-muted-foreground"
                  >{quest.purpose} (x{quest.amount})</span
                >
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
</div>

<style>
  :global(.tooltip-content) {
    /* Semi-transparent dark blue-gray background matching game */
    background: rgba(20, 25, 35);
    border: 2px solid rgba(60, 70, 85, 0.8);
    border-radius: 6px;
    padding: 14px 18px;
    color: #f0f0f0;
  }
</style>
