<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { resolve } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { STATS_METADATA_FIELDS } from "$lib/constants/items";
  import { formatItemType } from "$lib/utils/format";
  import { formatClassName } from "$lib/utils/classes";
  import { formatStatName, formatResourceName } from "$lib/terminology";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  import { QUALITY_NAMES, QUALITY_IDS } from "$lib/constants/quality";

  const qualityColors = QUALITY_IDS.map((id) => `bg-quality-${id}`);

  // Consistent styling patterns - use these throughout the page
  const styles = {
    // All links (base size = 16px, blue color for visibility)
    link: "text-blue-600 dark:text-blue-400 hover:underline",
    // Labels for data fields
    label: "text-sm text-muted-foreground",
    // Regular values
    value: "",
    // Positive values (bonuses, gains, health/mana)
    valuePositive: "text-green-600 dark:text-green-400",
    // Currency/gold values
    valueCurrency: "text-yellow-600 dark:text-yellow-400",
  } as const;

  function parseJson<T>(json: string | null): T | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  const romanNumerals = ["I", "II", "III", "IV", "V"];
  function formatTier(tier: number): string {
    return romanNumerals[tier] ?? String(tier);
  }

  // Percentage stats that should be displayed as percentages (0.05 → 5%)
  const percentageStats = new Set([
    "block_chance",
    "accuracy",
    "critical_chance",
    "haste",
    "spell_haste",
    "resist_fear_chance",
  ]);

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

  /**
   * Format gold amounts with narrow space thousands separator (U+202F).
   * Examples: 1234 → "1 234", 10000 → "10 000"
   */
  function formatGold(amount: number): string {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  }

  // Compute all derived values from item data and server-loaded sources/usages
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

    // Armor set information (from denormalized fields)
    const armorSetId = data.item.augment_armor_set_id;
    const armorSetName = data.item.augment_armor_set_name;

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
      armorSetId,
      armorSetName,
      stats,
      classRequired: parseJson<string[]>(data.item.class_required) || [],

      // SOURCES - Transform normalized types to template-expected format
      droppedBy:
        data.sources.monsters?.map((m) => ({
          ...m,
          rate: m.drop_rate, // Rename for template compatibility
        })) || [],

      soldBy: data.sources.vendors || [],

      rewardedBy:
        data.sources.quests
          ?.filter((q) => q.source_type === "reward")
          .map((q) => ({
            ...q,
            level_recommended: q.quest_level_recommended,
            level_required: q.quest_level_required,
            class_restrictions: q.class_restriction
              ? JSON.parse(q.class_restriction)
              : null,
          })) || [],

      providedByQuests:
        data.sources.quests
          ?.filter((q) => q.source_type === "provided")
          .map((q) => ({
            ...q,
            level_recommended: q.quest_level_recommended,
            level_required: q.quest_level_required,
            class_restrictions: q.class_restriction
              ? JSON.parse(q.class_restriction)
              : null,
          })) || [],

      rewardedByAltars:
        data.sources.altars?.map((a) => ({
          ...a,
          boss_monster_id: a.final_wave_boss_id,
          boss_monster_name: a.final_wave_boss_name,
        })) || [],

      craftedFrom:
        data.sources.recipes?.map((r) => ({
          ...r,
          materials: data.recipeMaterials[r.recipe_id] || [],
        })) || [],

      gatheredFrom:
        data.sources.gathers?.map((g) => ({
          gather_item_id: g.resource_id,
          gather_item_name: g.resource_name,
          rate: g.actual_drop_chance,
          amount_min: g.amount_min,
          amount_max: g.amount_max,
          // Source: server-scripts/GatherItem.cs:381 — Radiant Spark drop rate: 5% base + up to 25% from Radiant Seeker level
          rate_note: g.is_radiant_spark
            ? "5-30% based on Radiant Seeker level"
            : undefined,
        })) || [],

      foundInChests:
        data.sources.chests?.map((c) => ({
          chest_id: c.chest_id,
          chest_name: c.chest_name,
          rate: c.actual_drop_chance,
          zone_id: c.zone_id,
          zone_name: c.zone_name,
          key_id: c.key_required_id,
          key_name: c.key_name,
        })) || [],

      foundInPacks:
        data.sources.packs?.map((p) => ({
          pack_id: p.pack_item_id,
          pack_name: p.pack_item_name,
          amount: p.amount,
        })) || [],

      createdFromMerge:
        data.sources.merges?.flatMap((merge) =>
          merge.component_item_ids.map((id, i) => ({
            item_id: id,
            item_name: merge.component_item_names[i],
          })),
        ) || [],

      foundInRandomLoot: data.sources.randoms || [],

      rewardedByTreasureMaps:
        data.sources.treasureMaps?.map((t) => ({
          map_id: t.map_item_id,
          map_name: t.map_item_name,
          zone_id: t.zone_id,
          zone_name: t.zone_name,
        })) || [],

      // USAGES - Transform normalized types to template-expected format
      requiredForAltars: data.usages.altars || [],

      requiredForPortals: data.usages.portals || [],

      opensChests: data.usages.chests || [],

      usedInRecipes: data.usages.recipes || [],

      neededForQuests:
        data.usages.quests?.map((q) => ({
          ...q,
          level_recommended: q.quest_level_recommended,
          level_required: q.quest_level_required,
          class_restrictions: q.class_restrictions
            ? JSON.parse(q.class_restrictions)
            : null,
        })) || [],

      usedAsCurrencyFor: Object.values(
        (data.usages.currency || []).reduce(
          (acc, c) => {
            // Deduplicate by item_id (same item may be sold by multiple NPCs)
            if (!acc[c.purchasable_item_id]) {
              acc[c.purchasable_item_id] = {
                item_id: c.purchasable_item_id,
                item_name: c.purchasable_item_name,
                price: c.price,
              };
            }
            return acc;
          },
          {} as Record<
            string,
            { item_id: string; item_name: string; price: number }
          >,
        ),
      ),

      // Still parsed from item (not obtainability data)
      armorSetSkillBonuses: parseJson<
        Array<{ skill_id: string; skill_name: string; level_bonus: number }>
      >(data.item.augment_skill_bonuses_with_names),
      armorSetMembers: parseJson<
        Array<{ item_id: string; item_name: string; tooltip_html?: string }>
      >(data.item.augment_armor_set_members),
      armorSetAttributeBonuses: parseJson<
        Array<{ attribute: string; bonus: number }>
      >(data.item.augment_attribute_bonuses),
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

<Seo
  title={data.title}
  description={data.description}
  path={`/items/${data.item.id}`}
/>

<div class="container mx-auto p-8 space-y-4 max-w-5xl">
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
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-4xl font-bold">{data.item.name}</h1>
          <MapLink entityId={data.item.id} entityType="item" />
          <span
            class="px-3 py-1 rounded text-sm font-medium text-white {qualityColors[
              data.item.quality
            ]}"
          >
            {QUALITY_NAMES[data.item.quality]}
          </span>

          {#if (data.item.item_type === "potion" && !data.item.potion_buff_allow_dungeon) || (data.item.item_type === "food" && !data.item.food_buff_allow_dungeon) || (data.item.item_type === "scroll" && !data.item.scroll_skill_allow_dungeon) || (data.item.item_type === "relic" && !data.item.relic_buff_allow_dungeon) || data.item.mount_speed > 0}
            <DungeonRestrictionBadge allowDungeon={false} />
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Basic Info -->
  <Card.Root class="bg-muted/30">
    <Card.Header>
      <Card.Title>Basic Information</Card.Title>
    </Card.Header>
    <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <div class={styles.label}>Type</div>
        <div class={styles.value}>{formatItemType(data.item.item_type)}</div>
      </div>

      {#if data.item.level_required > 1}
        <div>
          <div class={styles.label}>Level Required</div>
          <div class={styles.value}>{data.item.level_required}</div>
        </div>
      {/if}

      {#if computed.classRequired.length > 0 && computed.classRequired.length < 6 && !computed.classRequired.includes("all")}
        <div>
          <div class={styles.label}>Class Required</div>
          <div class={styles.value}>
            {computed.classRequired.map(formatClassName).join(", ")}
          </div>
        </div>
      {/if}

      {#if data.item.slot}
        <div>
          <div class={styles.label}>Equipment Slot</div>
          <div class={styles.value}>{data.item.slot}</div>
        </div>
      {/if}

      {#if data.item.max_stack > 1}
        <div>
          <div class={styles.label}>Max Stack</div>
          <div class={styles.value}>{data.item.max_stack}</div>
        </div>
      {/if}

      {#if data.item.backpack_slots > 0}
        <div>
          <div class={styles.label}>Backpack Slots</div>
          <div class={styles.value}>{data.item.backpack_slots}</div>
        </div>
      {/if}

      {#if computed.maxDurability}
        <div>
          <div class={styles.label}>Max Durability</div>
          <div class={styles.value}>{computed.maxDurability}</div>
        </div>
      {/if}

      {#if data.item.mount_speed > 0}
        <div>
          <div class={styles.label}>Mount Speed</div>
          <div class={styles.value}>{data.item.mount_speed}</div>
        </div>
      {/if}

      {#if data.item.food_type}
        <div>
          <div class={styles.label}>Food Type</div>
          <div class={styles.value}>{data.item.food_type}</div>
        </div>
      {/if}

      {#if computed.hasSerenity}
        <div>
          <div class={styles.label}>Special Effect</div>
          <a href="/skills/serenity" class={styles.link}>Serenity</a>
        </div>
      {/if}

      {#if computed.isCostume}
        <div>
          <div class={styles.label}>Item Type</div>
          <div class="text-purple-600 dark:text-purple-400">Cosmetic</div>
        </div>
      {/if}

      {#if computed.armorSetName && computed.armorSetId}
        <div>
          <div class={styles.label}>Set Bonus</div>
          <a href="/items/{computed.armorSetId}" class={styles.link}>
            {computed.armorSetName}
          </a>
        </div>
      {/if}

      {#if data.item.buy_price > 0 && computed.soldBy && computed.soldBy.length > 0}
        <div>
          <div class={styles.label}>Buy Price</div>
          <div class={styles.valueCurrency}>
            {#if computed.soldBy[0].currency_item_id}
              {formatGold(data.item.buy_price)}
              <a
                href={resolve("/items/[id]", {
                  id: computed.soldBy[0].currency_item_id,
                })}
                class={styles.link}
              >
                {computed.soldBy[0].currency_item_name}
              </a>
            {:else}
              {formatGold(data.item.buy_price)}g
            {/if}
          </div>
        </div>
      {/if}

      {#if data.item.sell_price > 0 && data.item.sellable}
        <div>
          <div class={styles.label}>Sell Price</div>
          <div class={styles.valueCurrency}>
            {formatGold(data.item.sell_price)}g
          </div>
        </div>
      {/if}

      {#if data.item.primal_essence_value}
        <div>
          <div class={styles.label}>Primal Essence</div>
          <div class={styles.value}>
            <a href="/items/primal_essence" class={styles.link}>
              {data.item.primal_essence_value}
            </a>
          </div>
        </div>
      {/if}

      {#if data.item.item_type !== "augment"}
        <div>
          <div class={styles.label}>Tradable</div>
          <div class={styles.value}>{data.item.tradable ? "Yes" : "No"}</div>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Tooltip and Stats/Merge/Currency side-by-side (hide entire section if all would be empty) -->
  {#if (data.item.tooltip_html && data.item.item_type !== "augment") || ((data.item.item_type !== "augment" || !data.item.augment_armor_set_name) && ((computed.stats && Object.keys(computed.stats).length > 0) || data.item.weapon_delay > 0)) || (computed.createdFromMerge && computed.createdFromMerge.length > 0) || (computed.usedAsCurrencyFor && computed.usedAsCurrencyFor.length > 0) || data.item.id === "primal_essence" || data.item.id === "radiant_aether" || data.item.id === "adventurers_essence" || (data.item.item_type === "augment" && !data.item.augment_armor_set_name && data.augmenters.length > 0) || data.packContents.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Tooltip (don't show for augments - they're metadata items never shown to players) -->
      {#if data.item.tooltip_html && data.item.item_type !== "augment"}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Tooltip</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="text-sm whitespace-pre-wrap tooltip-content">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html data.item.tooltip_html}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Fatecharm -->
      {#if data.item.luck_token_bonus}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Fatecharm</Card.Title>
          </Card.Header>
          <Card.Content class="flex flex-col gap-4">
            <div>
              <div class={styles.label}>Zone</div>
              <div class={styles.value}>
                {data.item.luck_token_zone_name || "Unknown"}
              </div>
            </div>

            {#if data.item.luck_token_fragment_id && data.item.luck_token_fragment_name}
              <div>
                <div class={styles.label}>Created From</div>
                <div>
                  <a
                    href="/items/{data.item.luck_token_fragment_id}"
                    class={styles.link}
                  >
                    {data.item.luck_token_fragment_name}
                  </a>
                  {#if data.item.luck_token_fragments_needed}
                    <span class={styles.label}>
                      (x{data.item.luck_token_fragments_needed})</span
                    >
                  {/if}
                </div>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Fatecharm Fragment -->
      {#if data.item.luck_token_drop_chance && data.item.fragment_result_item_id}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Fatecharm Fragment</Card.Title>
          </Card.Header>
          <Card.Content class="flex flex-col gap-4">
            <div>
              <div class={styles.label}>Zone</div>
              <div class={styles.value}>
                {data.item.luck_token_zone_name || "Unknown"}
              </div>
            </div>
            <div>
              <div class={styles.label}>Creates</div>
              <a
                href="/items/{data.item.fragment_result_item_id}"
                class={styles.link}
              >
                {data.item.fragment_result_item_name || "Unknown"}
              </a>
            </div>
            <div>
              <div class={styles.label}>Amount Needed</div>
              <div class={styles.value}>{data.item.fragment_amount_needed}</div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Pack Contents -->
      {#if data.packContents.length > 0}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Pack Contents</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each data.packContents as item (item.item_id)}
                <div class="flex justify-between items-center">
                  <a href="/items/{item.item_id}" class={styles.link}>
                    {item.item_name}
                  </a>
                  <span class={styles.value}>&times;{item.amount}</span>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Stats (hidden for set bonus augments since those stats are shown as set bonuses) -->
      {#if (data.item.item_type !== "augment" || !data.item.augment_armor_set_name) && ((computed.stats && Object.keys(computed.stats).length > 0) || data.item.weapon_delay > 0 || data.item.weapon_proc_effect_id)}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Stats</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="grid grid-cols-2 gap-3">
              {#if data.item.weapon_proc_effect_id}
                <div
                  class="flex justify-between items-center p-2 rounded bg-muted col-span-2"
                >
                  <span class="text-sm font-medium">On-Hit Effect</span>
                  <span class="text-sm">
                    <a
                      href="/skills/{data.item.weapon_proc_effect_id}"
                      class={styles.link}
                    >
                      {data.item.weapon_proc_effect_name ||
                        data.item.weapon_proc_effect_id}
                    </a>
                    <span class={styles.label}>
                      ({(
                        data.item.weapon_proc_effect_probability * 100
                      ).toFixed(0)}% chance)
                    </span>
                  </span>
                </div>
              {/if}
              {#if data.item.weapon_delay > 0}
                <div
                  class="flex justify-between items-center p-2 rounded bg-muted"
                >
                  <span class="text-sm font-medium">Attack Delay</span>
                  <span class="text-sm font-bold">{data.item.weapon_delay}</span
                  >
                </div>
              {/if}
              {#if computed.stats}
                {#each Object.entries(computed.stats) as [stat, value] (stat)}
                  <div
                    class="flex justify-between items-center p-2 rounded bg-muted"
                  >
                    <span class="text-sm font-medium"
                      >{formatStatName(stat)}</span
                    >
                    <span class="text-sm font-bold"
                      >{formatStatValue(stat, value)}</span
                    >
                  </div>
                {/each}
              {/if}
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.usages.merges && data.usages.merges.length > 0}
        <!-- Combine To Create (shown when no stats) -->
        {@const mergeTarget = data.usages.merges[0]}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Combine to Create</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div>
              <div class="{styles.label} mb-2">Components</div>
              <div class="grid grid-cols-1 gap-2">
                {#each mergeTarget.all_components as component, index (`${component.item_id}_${index}`)}
                  <a href="/items/{component.item_id}" class={styles.link}>
                    {component.item_name}
                  </a>
                {/each}
              </div>
            </div>

            <div>
              <div class="{styles.label} mb-2">Creates</div>
              <a href="/items/{mergeTarget.result_item_id}" class={styles.link}>
                {mergeTarget.result_item_name}
              </a>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if computed.createdFromMerge && computed.createdFromMerge.length > 0}
        <!-- Created From (shown when no stats and not a merge item) -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Created from</Card.Title>
          </Card.Header>
          <Card.Content>
            <div>
              <div class="{styles.label} mb-2">Components</div>
              <div class="grid grid-cols-1 gap-2">
                {#each computed.createdFromMerge as mergeItem, index (`${mergeItem.item_id}_${index}`)}
                  <a href="/items/{mergeItem.item_id}" class={styles.link}>
                    {mergeItem.item_name}
                  </a>
                {/each}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Treasure Map Location -->
      {#if data.item.item_type === "treasure_map" && data.treasureLocation}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Treasure Location</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div>
              <div class={styles.label}>Dig Location</div>
              <div class="flex items-center gap-2">
                <a
                  href="/zones/{data.treasureLocation.zone_id}"
                  class={styles.link}
                >
                  {data.treasureLocation.zone_name}
                </a>
                <MapLink
                  entityId={data.treasureLocation.location_id}
                  entityType="treasure"
                  compact
                />
              </div>
            </div>
            <div>
              <div class={styles.label}>Required Tool</div>
              <a href="/items/shovel" class={styles.link}>Shovel</a>
            </div>
            {#if data.treasureLocation.reward_id}
              <div>
                <div class={styles.label}>Reward</div>
                <a
                  href="/items/{data.treasureLocation.reward_id}"
                  class={styles.link}
                >
                  {data.treasureLocation.reward_name ||
                    data.treasureLocation.reward_id}
                </a>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Currency For -->
      {#if computed.usedAsCurrencyFor && computed.usedAsCurrencyFor.length > 0}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Currency for</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each computed.usedAsCurrencyFor as item (item.item_id)}
                <div class="flex justify-between items-center">
                  <a
                    href={resolve("/items/[id]", { id: item.item_id })}
                    class={styles.link}
                  >
                    {item.item_name}
                  </a>
                  <span class={styles.label}>
                    {item.price === 0 ? "Free" : `${item.price}x`}
                  </span>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "primal_essence" && data.essenceTraders.length > 0}
        <!-- Primal Essence Acquisition -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>How to Acquire</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Trade equipment to</div>
                <div class="space-y-1 mt-1">
                  {#each data.essenceTraders as trader (trader.id)}
                    <a href="/npcs/{trader.id}" class={styles.link}>
                      {trader.name}
                    </a>
                  {/each}
                </div>
              </div>
              <div>
                <div class={styles.label}>Requirements</div>
                <div class={styles.value}>
                  <ul class="list-disc list-inside space-y-0.5">
                    <li>Equipment items only</li>
                    <li>Magic quality or higher</li>
                  </ul>
                </div>
              </div>
              <div>
                <div class={styles.label}>Amount received</div>
                <!-- Source: server-scripts/Utils.cs:450 — getPrimalEssenceAmount: ceil(sellPrice * 0.06f) -->
                <div class={styles.value}>6% of sell price</div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "token_of_redemption" && data.veteranMasters.length > 0}
        <!-- Token of Redemption Usage -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Usage</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Purpose</div>
                <div class={styles.value}>Resets veteran skill points</div>
              </div>
              <div>
                <div class={styles.label}>Cost</div>
                <!-- Source: server-scripts/Utils.cs:178 (priceResetVeteranSkills = 10000), Npc.cs:1769 -->
                <div class={styles.value}>
                  {formatGold(10000)}g + Token of Redemption
                </div>
              </div>
              <div>
                <div class={styles.label}>Available from</div>
                <div class="space-y-1 mt-1">
                  {#each data.veteranMasters as master (master.id)}
                    <a href="/npcs/{master.id}" class={styles.link}>
                      {master.name}
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "radiant_aether"}
        <!-- Radiant Aether Effects -->
        <!-- Source: server-scripts/GameManager.cs:312 (probActivateRadiantAether = 0.15f), Player.cs:6374, Combat.cs:717-726,813, AreaDamageSkill.cs:38, AreaDebuffSkill.cs:34 -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Passive Effects</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-4">
              <div>
                <div class={styles.label}>How it works</div>
                <div class={styles.value}>
                  Keep in inventory. Has a 15% chance to activate when you deal
                  a critical hit, take lethal damage, or are hit by an AoE
                  attack. Consumes 1 when triggered.
                </div>
              </div>
              <div class="space-y-2">
                <div>
                  <div class={styles.label}>On Critical Hit</div>
                  <div class={styles.value}>
                    <span class={styles.valuePositive}>×3 on top of crit</span>
                    → ×4.5
                  </div>
                  <div class="italic text-muted-foreground text-sm mt-1">
                    "Radiant Aether surges - your strike rends the heavens!"
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                <div>
                  <div class={styles.label}>On Lethal Damage</div>
                  <div class={styles.value}>
                    <span class={styles.valuePositive}>Full heal to max HP</span
                    >
                    instead of dying
                  </div>
                  <div class="italic text-muted-foreground text-sm mt-1">
                    "Radiant Aether flares within you - you rise anew!"
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                <div>
                  <div class={styles.label}>On AoE Attack</div>
                  <div class={styles.value}>
                    <span class={styles.valuePositive}>Blocks the AoE</span>,
                    protecting your party from damage
                  </div>
                  <div class="italic text-muted-foreground text-sm mt-1">
                    "Radiant Aether flares brightly - your party withstand
                    &#123;SKILL_NAME&#125;!"
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "adventurers_essence" && data.worldBossRenewalSages.length > 0}
        <!-- Adventurer's Essence - World Boss Reset -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>World Boss Reset</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Cost</div>
                <div class={styles.value}>
                  {data.worldBossRenewalSages[0].gold_required.toLocaleString()}
                  Adventurer's Essences
                </div>
              </div>
              <div>
                <div class={styles.label}>Available from</div>
                <div class="space-y-1 mt-1">
                  {#each data.worldBossRenewalSages as sage (sage.id)}
                    <a href="/npcs/{sage.id}" class={styles.link}>
                      {sage.name}
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "cursed_rune" && data.priestesses.length > 0}
        <!-- Cursed Rune Blessing -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Blessing</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Converts to</div>
                <a href="/items/blessed_rune" class={styles.link}>
                  Blessed Rune
                </a>
              </div>
              <div>
                <div class={styles.label}>Cost</div>
                <div class={styles.valueCurrency}>
                  {formatGold(75)}g per rune
                </div>
              </div>
              <div>
                <div class={styles.label}>Available from</div>
                <div class="space-y-1 mt-1">
                  {#each data.priestesses as priestess (priestess.id)}
                    <div>
                      <a href="/npcs/{priestess.id}" class={styles.link}>
                        {priestess.name}
                      </a>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "blessed_rune" && data.priestesses.length > 0}
        <!-- Blessed Rune Origin -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Acquisition</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Created from</div>
                <a href="/items/cursed_rune" class={styles.link}>
                  Cursed Rune
                </a>
              </div>
              <div>
                <div class={styles.label}>Blessing cost</div>
                <div class={styles.valueCurrency}>
                  {formatGold(75)}g per rune
                </div>
              </div>
              <div>
                <div class={styles.label}>Blessed by</div>
                <div class="space-y-1 mt-1">
                  {#each data.priestesses as priestess (priestess.id)}
                    <div>
                      <a href="/npcs/{priestess.id}" class={styles.link}>
                        {priestess.name}
                      </a>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "lockpicks"}
        <!-- Source: server-scripts/GatherItem.cs:304-354 — Lockpicking skill -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Lockpicking</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-sm text-muted-foreground">
              Used by Rogues with the <a
                href="/skills/lockpicking"
                class={styles.link}>Lockpicking</a
              > veteran skill to open locked chests without the specific key. One
              lockpick is consumed per attempt with a 20% success chance.
            </p>
          </Card.Content>
        </Card.Root>
      {:else if data.item.item_type === "augment" && !data.item.augment_armor_set_name && data.augmenters.length > 0}
        <!-- Augment (Non-Set) Usage -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>How to Use</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Socketing</div>
                <div class={styles.value}>
                  Place the augment and an armor or weapon in a crafting
                  station, then craft. The augment is consumed and its stats are
                  permanently added. If you have multiple copies of the item,
                  the first un-augmented copy will be used.
                </div>
              </div>
              <div>
                <div class={styles.label}>Type</div>
                <div class={styles.value}>
                  {#if data.item.augment_is_defensive !== null && data.item.augment_is_defensive !== undefined}
                    {data.item.augment_is_defensive ? "Defensive" : "Offensive"}
                  {/if}
                </div>
              </div>
              {#if data.item.augment_is_defensive !== null && data.item.augment_is_defensive !== undefined}
                <div>
                  <div class={styles.label}>Compatible Slots</div>
                  <div class={styles.value}>
                    {data.item.augment_is_defensive
                      ? "Armor (Head, Chest, Legs, Feet, Hands, Bracers, Belt, Shield)"
                      : "Weapons"}
                  </div>
                </div>
              {/if}
              <div>
                <div class={styles.label}>Removing</div>
                <!-- Source: server-scripts/UINpcTrading.cs:118-123,182-186 — quality 2 (magic) = 10,000g, quality 3 (epic) = 15,000g, else 5,000g -->
                <div class={styles.value}>
                  Visit an Augmenter NPC to remove a socketed augment. Cost per
                  augment: {formatGold(5000)}g (common), {formatGold(10000)}g
                  (magic), or {formatGold(15000)}g (epic). The augment is
                  returned to your inventory.
                </div>
              </div>
              <div>
                <div class={styles.label}>Augmenter NPCs</div>
                <div class="space-y-1 mt-1">
                  {#each data.augmenters as augmenter (augmenter.id)}
                    <a href="/npcs/{augmenter.id}" class={styles.link}>
                      {augmenter.name}
                    </a>
                  {/each}
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if computed.foundInPacks && computed.foundInPacks.length > 0}
        <!-- Found in Packs -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Found in Packs</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each computed.foundInPacks as pack, index (`${pack.pack_id}_${index}`)}
                <div class="flex justify-between items-center">
                  <a href="/items/{pack.pack_id}" class={styles.link}>
                    {pack.pack_name}
                  </a>
                  <span class={styles.value}>×{pack.amount}</span>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.recipe_potion_learned_id && data.item.recipe_potion_learned_name}
        <!-- Teaches Recipe -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title>Teaches Recipe</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <div class={styles.label}>Potion</div>
                <a
                  href="/items/{data.item.recipe_potion_learned_id}"
                  class={styles.link}
                >
                  {data.item.recipe_potion_learned_name}
                </a>
              </div>

              {#if data.item.alchemy_recipe_level_required != null}
                <div class="text-right">
                  <div class={styles.label}>Recipe Tier</div>
                  <div class={styles.value}>
                    {formatTier(data.item.alchemy_recipe_level_required)}
                  </div>
                </div>
              {/if}
            </div>

            {#if data.item.alchemy_recipe_materials}
              {@const materials = JSON.parse(
                data.item.alchemy_recipe_materials,
              )}
              {#if materials.length > 0}
                <div>
                  <div class={styles.label}>Materials</div>
                  <div class="space-y-1 mt-2">
                    {#each materials as material (material.item_id)}
                      <div class="flex items-center justify-between">
                        <a href="/items/{material.item_id}" class={styles.link}>
                          {material.item_name}
                        </a>
                        <span class={styles.value}>×{material.amount}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}
          </Card.Content>
        </Card.Root>
      {:else if data.item.taught_by_recipe_id && data.item.taught_by_recipe_name}
        <!-- Crafted by -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              Crafted by
              {#if computed.craftedFrom && computed.craftedFrom.length > 0}
                <a
                  href="/recipes/{computed.craftedFrom[0].recipe_id}"
                  class="text-muted-foreground hover:text-foreground transition-colors"
                  title="View recipe details"
                >
                  <ExternalLink class="h-4 w-4" />
                </a>
              {/if}
            </Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <div class={styles.label}>Recipe</div>
                <a
                  href="/items/{data.item.taught_by_recipe_id}"
                  class={styles.link}
                >
                  {data.item.taught_by_recipe_name}
                </a>
              </div>

              {#if data.item.alchemy_recipe_level_required != null}
                <div class="text-right">
                  <div class={styles.label}>Recipe Tier</div>
                  <div class={styles.value}>
                    {formatTier(data.item.alchemy_recipe_level_required)}
                  </div>
                </div>
              {/if}
            </div>

            {#if data.item.alchemy_recipe_materials}
              {@const materials = JSON.parse(
                data.item.alchemy_recipe_materials,
              )}
              {#if materials.length > 0}
                <div>
                  <div class={styles.label}>Materials</div>
                  <div class="space-y-1 mt-2">
                    {#each materials as material (material.item_id)}
                      <div class="flex items-center justify-between">
                        <a href="/items/{material.item_id}" class={styles.link}>
                          {material.item_name}
                        </a>
                        <span class={styles.value}>×{material.amount}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/if}
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  {/if}

  <!-- Armor Set Bonuses (shown on augment items and armor pieces) -->
  {#if data.item.augment_armor_set_name}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title>
          {data.item.augment_armor_set_name}
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Set Members -->
        {#if computed.armorSetMembers && computed.armorSetMembers.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">
              Set Pieces ({computed.armorSetMembers.length})
            </h4>
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              {#each computed.armorSetMembers as member (member.item_id)}
                <ItemLink
                  itemId={member.item_id}
                  itemName={member.item_name}
                  tooltipHtml={member.tooltip_html}
                />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Attribute Bonuses (3-piece) -->
        <!-- Source: server-scripts/PlayerEquipment.cs:265,280 — set bonuses apply at 3 pieces (attributes) and 5 pieces (skills) -->
        {#if computed.armorSetAttributeBonuses && computed.armorSetAttributeBonuses.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">Set Bonuses (3 pieces)</h4>
            <div class="space-y-2">
              {#each computed.armorSetAttributeBonuses as bonus (bonus.attribute)}
                <div
                  class="flex items-center justify-between p-2 rounded bg-muted"
                >
                  <span>{formatStatName(bonus.attribute)}</span>
                  <span class={styles.valuePositive}>+{bonus.bonus}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Skill Bonuses (5-piece) -->
        {#if computed.armorSetSkillBonuses && computed.armorSetSkillBonuses.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">Set Bonuses (5 pieces)</h4>
            <div class="space-y-2">
              {#each computed.armorSetSkillBonuses as bonus (bonus.skill_id)}
                <div
                  class="flex items-center justify-between p-2 rounded bg-muted"
                >
                  <a href="/skills/{bonus.skill_id}" class={styles.link}>
                    {bonus.skill_name}
                  </a>
                  <span class={styles.valuePositive}>
                    +{bonus.level_bonus} level{bonus.level_bonus !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Use Effects -->
  {#if data.item.usage_health > 0 || data.item.usage_mana > 0 || data.item.usage_energy > 0 || data.item.potion_buff_id || data.item.food_buff_id || data.item.relic_buff_id || data.item.scroll_skill_id}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title>Use Effects</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if data.item.usage_health > 0}
          <div>
            <div class={styles.label}>
              Restores {formatResourceName("health")}
            </div>
            <div class={styles.valuePositive}>+{data.item.usage_health} HP</div>
          </div>
        {/if}

        {#if data.item.usage_mana > 0}
          <div>
            <div class={styles.label}>
              Restores {formatResourceName("mana")}
            </div>
            <div class="text-blue-600 dark:text-blue-400">
              +{data.item.usage_mana} MP
            </div>
          </div>
        {/if}

        {#if data.item.usage_energy > 0}
          <div>
            <div class={styles.label}>
              Restores {formatResourceName("energy")}
            </div>
            <div class={styles.valueCurrency}>
              +{data.item.usage_energy}
              {formatResourceName("energy")}
            </div>
          </div>
        {/if}

        {#if data.item.potion_buff_id && data.item.potion_buff_name}
          <div>
            <div class={styles.label}>Grants Buff</div>
            <a href="/skills/{data.item.potion_buff_id}" class={styles.link}>
              {data.item.potion_buff_name}
            </a>
          </div>
        {/if}

        {#if data.item.food_buff_id && data.item.food_buff_name}
          <div>
            <div class={styles.label}>Grants Buff</div>
            <a href="/skills/{data.item.food_buff_id}" class={styles.link}>
              {data.item.food_buff_name}
            </a>
          </div>
        {/if}

        {#if data.item.relic_buff_id}
          <div>
            <div class={styles.label}>Activates</div>
            <a href="/skills/{data.item.relic_buff_id}" class={styles.link}>
              {data.item.relic_buff_name ||
                data.item.relic_buff_id.replace(/_/g, " ")}
            </a>
          </div>
        {/if}

        {#if data.item.scroll_skill_id && data.item.scroll_skill_name}
          <div>
            <div class={styles.label}>Casts</div>
            <a href="/skills/{data.item.scroll_skill_id}" class={styles.link}>
              {data.item.scroll_skill_name}
            </a>
          </div>
        {/if}

        <div>
          <div class={styles.label}>Consumed on Use</div>
          <div class={styles.value}>
            {data.item.infinite_charges ? "No" : "Yes"}
          </div>
        </div>

        {#if data.item.cooldown > 0}
          <div>
            <div class={styles.label}>Recharge Time</div>
            <div class={styles.value}>{data.item.cooldown}s</div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Book Effects (Permanent Stat Gains) -->
  {#if data.item.book_strength_gain > 0 || data.item.book_dexterity_gain > 0 || data.item.book_constitution_gain > 0 || data.item.book_intelligence_gain > 0 || data.item.book_wisdom_gain > 0 || data.item.book_charisma_gain > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title>Permanent Stat Gains</Card.Title>
        <Card.Description
          >Reading this book grants permanent stat increases.</Card.Description
        >
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if data.item.book_strength_gain > 0}
          <div>
            <div class={styles.label}>Strength</div>
            <div class={styles.valuePositive}>
              +{data.item.book_strength_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_dexterity_gain > 0}
          <div>
            <div class={styles.label}>Dexterity</div>
            <div class={styles.valuePositive}>
              +{data.item.book_dexterity_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_constitution_gain > 0}
          <div>
            <div class={styles.label}>Constitution</div>
            <div class={styles.valuePositive}>
              +{data.item.book_constitution_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_intelligence_gain > 0}
          <div>
            <div class={styles.label}>Intelligence</div>
            <div class={styles.valuePositive}>
              +{data.item.book_intelligence_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_wisdom_gain > 0}
          <div>
            <div class={styles.label}>Wisdom</div>
            <div class={styles.valuePositive}>
              +{data.item.book_wisdom_gain}
            </div>
          </div>
        {/if}

        {#if data.item.book_charisma_gain > 0}
          <div>
            <div class={styles.label}>Charisma</div>
            <div class={styles.valuePositive}>
              +{data.item.book_charisma_gain}
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
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Dropped by</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.droppedBy as drop, index (`${drop.monster_id}_${index}`)}
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <MonsterTypeIcon
                    isBoss={drop.is_boss}
                    isFabled={drop.is_fabled}
                    isElite={drop.is_elite}
                  />
                  <a
                    href={resolve("/monsters/[id]", { id: drop.monster_id })}
                    class={styles.link}
                  >
                    {drop.monster_name}
                    <span class={styles.label}
                      >(Lv {drop.monster_level_min === drop.monster_level_max
                        ? drop.monster_level_min
                        : `${drop.monster_level_min}-${drop.monster_level_max}`})</span
                    >
                  </a>
                </div>
                <span class={styles.label}>{(drop.rate * 100).toFixed(1)}%</span
                >
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Sold By -->
    {#if computed.soldBy && computed.soldBy.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Sold by</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.soldBy as vendor, index (`${vendor.npc_id}_${index}`)}
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <a
                    href={resolve("/npcs/[id]", { id: vendor.npc_id })}
                    class={styles.link}
                  >
                    {vendor.npc_name}
                  </a>
                  <span class={styles.valueCurrency}>
                    {#if vendor.currency_item_id}
                      {vendor.price}
                      <a
                        href={resolve("/items/[id]", {
                          id: vendor.currency_item_id,
                        })}
                        class={styles.link}
                      >
                        {vendor.currency_item_name}
                      </a>
                    {:else}
                      {formatGold(vendor.price)}g
                    {/if}
                  </span>
                </div>
                {#if vendor.npc_faction && (data.item.faction_required_tier_name || vendor.is_faction_vendor)}
                  <div class="{styles.label} pl-2">
                    Requires {data.item.faction_required_tier_name ??
                      "Friendly"} with {vendor.npc_faction}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Rewarded by Quests -->
    {#if computed.rewardedBy && computed.rewardedBy.length > 0}
      {@const repeatableQuests = computed.rewardedBy.filter(
        (q) => q.is_repeatable,
      )}
      {@const oneTimeQuests = computed.rewardedBy.filter(
        (q) => !q.is_repeatable,
      )}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Rewarded by Quests</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if repeatableQuests.length > 0}
            <div>
              <div class="{styles.label} mb-2">Repeatable Quests</div>
              <div class="space-y-2">
                {#each repeatableQuests as quest, index (`${quest.quest_id}_${index}`)}
                  <div>
                    <a
                      href={resolve("/quests/[id]", { id: quest.quest_id })}
                      class={styles.link}
                    >
                      {quest.quest_name}
                      <span class={styles.label}>
                        (Lv {quest.level_recommended}{#if quest.class_restrictions && quest.class_restrictions.length > 0 && quest.class_restrictions.length < 6},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if oneTimeQuests.length > 0}
            <div>
              <div class="{styles.label} mb-2">One-Time Quests</div>
              <div class="space-y-2">
                {#each oneTimeQuests as quest, index (`${quest.quest_id}_${index}`)}
                  <div>
                    <a
                      href={resolve("/quests/[id]", { id: quest.quest_id })}
                      class={styles.link}
                    >
                      {quest.quest_name}
                      <span class={styles.label}>
                        (Lv {quest.level_recommended}{#if quest.class_restrictions && quest.class_restrictions.length > 0 && quest.class_restrictions.length < 6},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Provided by Quests -->
    {#if computed.providedByQuests && computed.providedByQuests.length > 0}
      {@const repeatableQuests = computed.providedByQuests.filter(
        (q) => q.is_repeatable,
      )}
      {@const oneTimeQuests = computed.providedByQuests.filter(
        (q) => !q.is_repeatable,
      )}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Provided by Quests</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if repeatableQuests.length > 0}
            <div>
              <div class="{styles.label} mb-2">Repeatable Quests</div>
              <div class="space-y-2">
                {#each repeatableQuests as quest, index (`${quest.quest_id}_${index}`)}
                  <div>
                    <a
                      href={resolve("/quests/[id]", { id: quest.quest_id })}
                      class={styles.link}
                    >
                      {quest.quest_name}
                      <span class={styles.label}>
                        (Lv {quest.level_recommended}{#if quest.class_restrictions && quest.class_restrictions.length > 0 && quest.class_restrictions.length < 6},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if oneTimeQuests.length > 0}
            <div>
              <div class="{styles.label} mb-2">One-Time Quests</div>
              <div class="space-y-2">
                {#each oneTimeQuests as quest, index (`${quest.quest_id}_${index}`)}
                  <div>
                    <a
                      href={resolve("/quests/[id]", { id: quest.quest_id })}
                      class={styles.link}
                    >
                      {quest.quest_name}
                      <span class={styles.label}>
                        (Lv {quest.level_recommended}{#if quest.class_restrictions && quest.class_restrictions.length > 0 && quest.class_restrictions.length < 6},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Dropped by Altar Boss -->
    {#if computed.rewardedByAltars && computed.rewardedByAltars.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Dropped by Altar Boss</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.rewardedByAltars as altar, index (`${altar.altar_id}_${index}`)}
              <div class="space-y-1">
                <a href={`/altars/${altar.altar_id}`} class={styles.link}>
                  {altar.altar_name}
                </a>
                <div class="{styles.label} pl-2 space-y-0.5">
                  <div>
                    Zone: <a
                      href={`/zones/${altar.zone_id}`}
                      class={styles.link}>{altar.zone_name}</a
                    >
                  </div>
                  {#if altar.boss_monster_id && altar.boss_monster_name}
                    <div>
                      Boss: <a
                        href={`/monsters/${altar.boss_monster_id}`}
                        class={styles.link}>{altar.boss_monster_name}</a
                      >
                    </div>
                  {/if}
                  {#if altar.reward_tier === "common"}
                    <div>Required Level: 30-34</div>
                  {:else if altar.reward_tier === "magic"}
                    <div>Required Level: 35-44</div>
                  {:else if altar.reward_tier === "epic"}
                    <div>Required Level: 45-50</div>
                    <div>Required Veteran Level: 0-99</div>
                  {:else}
                    <div>Required Level: 50</div>
                    <div>Required Veteran Level: 100+</div>
                  {/if}
                  <div>Drop Rate: {(altar.drop_rate * 100).toFixed(0)}%</div>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Rewarded by Treasure Maps -->
    {#if computed.rewardedByTreasureMaps && computed.rewardedByTreasureMaps.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Rewarded by Treasure Maps</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.rewardedByTreasureMaps as map (map.map_id)}
              <div>
                <a href="/items/{map.map_id}" class={styles.link}>
                  {map.map_name}
                </a>
                {#if map.zone_name}
                  <span class={styles.label}>({map.zone_name})</span>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Required to Activate Altars -->
    {#if computed.requiredForAltars && computed.requiredForAltars.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Required to Activate Altars</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.requiredForAltars as altar, index (`${altar.altar_id}_${index}`)}
              <div>
                <a href={`/altars/${altar.altar_id}`} class={styles.link}>
                  {altar.altar_name}
                </a>
                <span class={styles.label}>({altar.zone_name})</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Required for Portals -->
    {#if computed.requiredForPortals && computed.requiredForPortals.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Required for Portals</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.requiredForPortals as portal, index (`${portal.portal_id}_${index}`)}
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <a href="/zones/{portal.from_zone_id}" class={styles.link}>
                    {portal.from_zone_name}
                  </a>
                  <MapLink
                    entityId={portal.portal_id}
                    entityType="portal"
                    compact
                  />
                </div>
                <div class="{styles.label} pl-2">
                  → <a href="/zones/{portal.to_zone_id}" class={styles.link}>
                    {portal.to_zone_name}
                  </a>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Crafted From (exclude alchemy items which have their own "Crafted by" section) -->
    {#if computed.craftedFrom && computed.craftedFrom.length > 0 && !data.item.taught_by_recipe_id}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            Crafted from Recipe
            <a
              href="/recipes/{computed.craftedFrom[0].recipe_id}"
              class="text-muted-foreground hover:text-foreground transition-colors"
              title="View recipe details"
            >
              <ExternalLink class="h-4 w-4" />
            </a>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-1">
            {#each computed.craftedFrom[0].materials as material (material.item_id)}
              <div class="flex justify-between items-center">
                <a
                  href={resolve("/items/[id]", { id: material.item_id })}
                  class={styles.link}
                >
                  {material.item_name}
                </a>
                <span class={styles.label}>x{material.amount}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Gathered From -->
    {#if computed.gatheredFrom && computed.gatheredFrom.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Gathered from</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.gatheredFrom as gather, index (`${gather.gather_item_id}_${index}`)}
              <div class="flex justify-between items-center">
                <a
                  href="/gather-items/{gather.gather_item_id}"
                  class={styles.link}
                >
                  {gather.gather_item_name}
                </a>
                <span class={styles.label}>
                  {#if gather.rate_note}
                    {gather.rate_note}
                  {:else}
                    {(gather.rate * 100).toFixed(1)}%
                  {/if}
                  {#if gather.amount_min != null && gather.amount_max != null}
                    {#if gather.amount_min === gather.amount_max}
                      ({gather.amount_max}×)
                    {:else}
                      ({gather.amount_min}-{gather.amount_max}×)
                    {/if}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Opens Chests -->
    {#if computed.opensChests && computed.opensChests.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Opens Chests</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.opensChests as chest (chest.chest_id)}
              <div class="flex items-center gap-1.5">
                <a href="/chests/{chest.chest_id}" class={styles.link}>Chest</a>
                {#if chest.zone_name}<span class={styles.label}
                    >({chest.zone_name})</span
                  >{/if}
                <MapLink entityId={chest.chest_id} entityType="chest" compact />
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Found in Chests -->
    {#if computed.foundInChests && computed.foundInChests.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Found in Chests</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.foundInChests as chest, index (`${chest.chest_id}_${index}`)}
              <div>
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-1.5">
                    <a href="/chests/{chest.chest_id}" class={styles.link}>
                      Chest
                    </a>
                    {#if chest.zone_name}
                      <span class={styles.label}>({chest.zone_name})</span>
                    {/if}
                    <MapLink
                      entityId={chest.chest_id}
                      entityType="chest"
                      compact
                    />
                  </div>
                  <span class={styles.label}
                    >{(chest.rate * 100).toFixed(1)}%</span
                  >
                </div>
                {#if chest.key_id}
                  <div class="ml-2 text-sm">
                    <span class={styles.label}>Key:</span>
                    <a href="/items/{chest.key_id}" class={styles.link}>
                      {chest.key_name}
                    </a>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Found in Random Loot -->
    {#if computed.foundInRandomLoot && computed.foundInRandomLoot.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Found in Random Loot</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.foundInRandomLoot as randomItem, index (`${randomItem.random_item_id}_${index}`)}
              <div class="flex justify-between items-center">
                <a
                  href="/items/{randomItem.random_item_id}"
                  class={styles.link}
                >
                  {randomItem.random_item_name}
                </a>
                <span class={styles.label}>
                  {(randomItem.probability * 100).toFixed(1)}%
                </span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Possible Items (for simple random items, not chest-type items with weighted rewards) -->
    {#if data.randomOutcomes && data.randomOutcomes.length > 0 && (!computed.chestRewards || computed.chestRewards.length === 0)}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Possible Items</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each data.randomOutcomes as item (item.item_id)}
              <div class="flex justify-between items-center">
                <a href="/items/{item.item_id}" class={styles.link}>
                  {item.item_name}
                </a>
                <span class={styles.label}>
                  {(item.probability * 100).toFixed(1)}%
                </span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Chest Rewards -->
    {#if computed.chestRewards && computed.chestRewards.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Chest Rewards</Card.Title>
          <Card.Description>
            Gives up to {data.item.chest_num_items}
            {data.item.chest_num_items === 1 ? "item" : "items"} per opening. Each
            item can only appear once. Drop chances calculated via simulation (100k
            trials).
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.chestRewards as reward, index (`${reward.item_id}_${index}`)}
              <div class="flex justify-between items-center">
                <a href="/items/{reward.item_id}" class={styles.link}>
                  {reward.item_name}
                </a>
                <span class={styles.label}
                  >{(reward.actual_drop_chance * 100).toFixed(1)}%</span
                >
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Used in Recipes -->
    {#if computed.usedInRecipes && computed.usedInRecipes.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Used in Recipes</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each computed.usedInRecipes as recipe, index (`${recipe.recipe_id}_${index}`)}
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-1">
                  <a
                    href="/recipes/{recipe.recipe_id}"
                    class="text-muted-foreground hover:text-foreground transition-colors"
                    title="View recipe details"
                  >
                    <ExternalLink class="h-4 w-4" />
                  </a>
                  <a
                    href={resolve("/items/[id]", { id: recipe.result_item_id })}
                    class={styles.link}
                  >
                    {recipe.result_item_name}
                  </a>
                </div>
                <span class={styles.label}>x{recipe.amount}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Required for Quests -->
    {#if computed.neededForQuests && computed.neededForQuests.length > 0}
      {@const repeatableQuests = computed.neededForQuests.filter(
        (q) => q.is_repeatable,
      )}
      {@const oneTimeQuests = computed.neededForQuests.filter(
        (q) => !q.is_repeatable,
      )}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title>Required for Quests</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if repeatableQuests.length > 0}
            <div>
              <div class="{styles.label} mb-2">Repeatable Quests</div>
              <div class="space-y-2">
                {#each repeatableQuests as quest, index (`${quest.quest_id}_${quest.purpose}_${index}`)}
                  <div class="flex justify-between items-center">
                    <a
                      href={resolve("/quests/[id]", { id: quest.quest_id })}
                      class={styles.link}
                    >
                      {quest.quest_name}
                      <span class={styles.label}>
                        (Lv {quest.level_recommended}{#if quest.class_restrictions && quest.class_restrictions.length > 0 && quest.class_restrictions.length < 6},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                    <span class={styles.label}
                      >{quest.purpose} (x{quest.amount})</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if oneTimeQuests.length > 0}
            <div>
              <div class="{styles.label} mb-2">One-Time Quests</div>
              <div class="space-y-2">
                {#each oneTimeQuests as quest, index (`${quest.quest_id}_${quest.purpose}_${index}`)}
                  <div class="flex justify-between items-center">
                    <a
                      href={resolve("/quests/[id]", { id: quest.quest_id })}
                      class={styles.link}
                    >
                      {quest.quest_name}
                      <span class={styles.label}>
                        (Lv {quest.level_recommended}{#if quest.class_restrictions && quest.class_restrictions.length > 0 && quest.class_restrictions.length < 6},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                    <span class={styles.label}
                      >{quest.purpose} (x{quest.amount})</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
</div>
