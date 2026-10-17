<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { base, resolve } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import ItemSourceLinks from "$lib/components/ItemSourceLinks.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import SpecialMechanicText from "$lib/components/SpecialMechanicText.svelte";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import FishIcon from "@lucide/svelte/icons/fish";
  import { ITEM_STAT_FIELDS } from "$lib/constants/items";
  import {
    formatEquipmentCategory,
    formatItemType,
    itemListType,
    formatNumber,
    formatPercent,
    formatDuration,
  } from "$lib/utils/format";
  import { ALL_CLASS_IDS, formatClassName } from "$lib/utils/classes";
  import { FISHING_RANGE_ASSUMPTIONS } from "$lib/utils/fishing";
  import type { StatId } from "$lib/generated/stat-vocabulary";
  import {
    formatStat,
    formatStatField,
    statFieldName,
    statName,
  } from "$lib/stats";
  import { isHouseChestItemId } from "$lib/inventory/house-chests";
  import { getItemSpecialMechanics } from "$lib/special-mechanics";
  import { formatAltarRequirement } from "$lib/calculation/altar";
  import type { PageData } from "./$types";

  const itemStatFields = Object.fromEntries(
    ITEM_STAT_FIELDS.map((field) => [field.field, field]),
  );

  let { data }: { data: PageData } = $props();

  import { QUALITY_NAMES, QUALITY_IDS } from "$lib/constants/quality";

  const qualityColors = QUALITY_IDS.map((id) => `bg-quality-${id}`);
  const specialMechanics = $derived(getItemSpecialMechanics(data.item.id));

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

  function hasSpecificClassRestriction(
    classes: string[] | null | undefined,
  ): classes is string[] {
    return Boolean(
      classes &&
      classes.length > 0 &&
      classes.length < ALL_CLASS_IDS.length &&
      !classes.includes("all"),
    );
  }

  function formatFishingChanceRange(
    minChance: number | null,
    maxChance: number | null,
  ): string | null {
    if (minChance == null || maxChance == null) return null;
    const percent = (chance: number) =>
      chance > 0 && chance < 0.0005
        ? "under 0.1%"
        : formatPercent(chance, { decimals: 1, trailingZeros: true });
    const minPercent = percent(minChance);
    const maxPercent = percent(maxChance);
    if (minPercent === maxPercent) return `${minPercent} per cast`;
    return `${minPercent} to ${maxPercent} per cast`;
  }

  function formatFishingSourceNote(
    minChance: number | null,
    maxChance: number | null,
  ): string | undefined {
    return formatFishingChanceRange(minChance, maxChance) ?? undefined;
  }

  const romanNumerals = ["I", "II", "III", "IV", "V"];
  function formatTier(tier: number): string {
    return romanNumerals[tier] ?? String(tier);
  }

  const isAugment = $derived(data.item.item_type === "augment");
  const isArmorSetMetadata = $derived(
    isAugment && Boolean(data.item.augment_armor_set_name),
  );
  const itemTypeLabel = $derived(formatItemType(itemListType(data.item)));
  const isBackpack = $derived(data.item.item_type === "backpack");
  const isPet = $derived(data.item.item_type === "pet");

  const petSpriteSrc = $derived(
    data.petVisualAsset ? `${base}/${data.petVisualAsset.public_path}` : null,
  );
  const isHouseChestStructure = $derived(
    data.item.item_type === "structure" && isHouseChestItemId(data.item.id),
  );
  const isSetPiece = $derived(Boolean(data.item.augment_armor_set_name));
  const isCostume = $derived(data.item.item_type === "costume");
  const isTravelItem = $derived(data.item.item_type === "travel");
  const hasMechanicsNotes = $derived(
    isBackpack ||
      isHouseChestStructure ||
      isSetPiece ||
      isCostume ||
      isTravelItem,
  );

  // Compute all derived values from item data and server-loaded sources/usages
  const computed = $derived.by(() => {
    // Stats include both numeric stats and metadata fields
    const allStats = parseJson<Record<string, number | boolean | string>>(
      data.item.stats,
    );

    // Extract metadata fields
    const maxDurability = allStats?.max_durability as number | undefined;
    const hasSerenity = allStats?.has_serenity as boolean | undefined;
    const augmentBonusSet = allStats?.augment_bonus_set as string | undefined;

    // Armor set information (from denormalized fields)
    const armorSetId = data.item.augment_armor_set_id;
    const armorSetName = data.item.augment_armor_set_name;

    // Filter stats for display: remove zeros and metadata fields
    const stats = allStats
      ? Object.entries(allStats).flatMap(([key, value]) => {
          const field = itemStatFields[key];
          return field && typeof value === "number" && value !== 0
            ? [{ field, value }]
            : [];
        })
      : null;

    return {
      allStats,
      maxDurability,
      hasSerenity,
      augmentBonusSet,
      armorSetId,
      armorSetName,
      stats,
      classRequired: parseJson<string[]>(data.item.class_required) || [],

      // SOURCES - Transform normalized types to template-expected format
      droppedBy: Array.from(
        Map.groupBy(data.sources.monsters ?? [], (m) => m.monster_id).values(),
      ).map((rolls) => ({
        ...rolls[0],
        rates: rolls.map((roll) => roll.drop_rate),
      })),

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
        Array.from(
          Map.groupBy(
            (data.sources.gathers ?? []).filter(
              (g) =>
                !g.is_fishing_spot ||
                g.fishing_chance_max == null ||
                g.fishing_chance_max > 0,
            ),
            (g) =>
              g.is_fishing_spot
                ? JSON.stringify([
                    g.resource_name,
                    g.zone_id,
                    g.fishing_source_role,
                    g.fishing_chance_min,
                    g.fishing_chance_max,
                    g.actual_drop_chance,
                  ])
                : g.resource_id,
          ).values(),
        )
          .map((group) => ({
            ...group[0],
            virtual_location_count: group.length,
          }))
          .map((g) => ({
            gather_item_id: g.resource_id,
            gather_item_name: g.resource_name,
            rate: g.actual_drop_chance,
            amount_min: g.amount_min,
            amount_max: g.amount_max,
            is_fishing_spot: g.is_fishing_spot,
            virtual_location_count: g.virtual_location_count,
            fishing_source_role: g.fishing_source_role,
            spawn_id: g.spawn_id,
            zone_id: g.zone_id,
            zone_name: g.zone_name,
            is_radiant_spark: g.is_radiant_spark,
            rate_note: g.is_radiant_spark
              ? "5% plus 0.2 percentage points per 1% Radiant Seeker (25% at 100%)"
              : formatFishingSourceNote(
                  g.fishing_chance_min,
                  g.fishing_chance_max,
                ),
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

      foundInRandomLoot: [
        ...data.sources.randoms.map((source) => ({
          ...source,
          assumesTreasureHunterZero: false,
        })),
        ...data.sources.chestItems.map((chest) => ({
          random_item_id: chest.chest_item_id,
          random_item_name: chest.chest_name,
          probability: chest.open_chance,
          assumesTreasureHunterZero: chest.chest_scales_with_treasure_hunter,
        })),
      ].sort(
        (a, b) =>
          b.probability - a.probability ||
          (a.random_item_name < b.random_item_name
            ? -1
            : a.random_item_name > b.random_item_name
              ? 1
              : 0),
      ),

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
        Array<{ stat_id: string; bonus: number }>
      >(data.item.augment_attribute_bonuses),
      chestRewards: [...data.chestRewards].sort(
        (a, b) =>
          b.open_chance - a.open_chance ||
          (a.item_name < b.item_name ? -1 : a.item_name > b.item_name ? 1 : 0),
      ),
    };
  });

  // Source: server-scripts/ChestItem.cs:24-32,61-64 — guaranteed rolls give fixed contents up to the opening limit.
  const hasFixedChestContents = $derived(
    Boolean(
      computed.chestRewards?.length &&
      computed.chestRewards.every((reward) => reward.roll_chance >= 1),
    ),
  );

  const hasStatsCard = $derived(
    !isAugment &&
      ((computed.stats && computed.stats.length > 0) ||
        data.item.weapon_delay > 0 ||
        data.item.weapon_proc_effect_id),
  );

  const hasPrimaryDetailCards = $derived(
    specialMechanics.length > 0 ||
      isPet ||
      Boolean(data.item.tooltip_html) ||
      hasStatsCard ||
      (computed.createdFromMerge && computed.createdFromMerge.length > 0) ||
      (computed.usedAsCurrencyFor && computed.usedAsCurrencyFor.length > 0) ||
      data.item.id === "primal_essence" ||
      data.item.id === "radiant_aether" ||
      (isAugment && !isArmorSetMetadata && data.augmenters.length > 0) ||
      data.packContents.length > 0,
  );
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
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-4xl font-bold">{data.item.name}</h1>
      {#if data.hasMapLocation}
        <MapLink entityId={data.item.id} entityType="item" />
      {/if}
      <span
        class="px-3 py-1 rounded text-sm font-medium text-white {qualityColors[
          data.item.quality
        ]}"
      >
        {QUALITY_NAMES[data.item.quality]}
      </span>
      {#if data.fishing_role !== null}
        <a
          href="/professions/fishing"
          class="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-500/20 dark:text-cyan-300"
        >
          <FishIcon class="h-4 w-4" />
          Fishing
        </a>
      {/if}

      {#if (data.item.item_type === "potion" && !data.item.potion_buff_allow_dungeon) || (data.item.item_type === "food" && !data.item.food_buff_allow_dungeon) || (data.item.item_type === "scroll" && !data.item.scroll_skill_allow_dungeon) || (data.item.item_type === "relic" && !data.item.relic_buff_allow_dungeon) || data.item.mount_speed > 0}
        <DungeonRestrictionBadge allowDungeon={false} />
      {/if}
    </div>
  </div>

  <!-- Basic Info -->
  <Card.Root class="bg-muted/30">
    <Card.Header>
      <Card.Title level={2}>Basic information</Card.Title>
    </Card.Header>
    <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <div class={styles.label}>Type</div>
        <div class={styles.value}>{itemTypeLabel}</div>
      </div>

      {#if data.item.level_required > 1}
        <div>
          <div class={styles.label}>Required level</div>
          <div class={styles.value}>{data.item.level_required}</div>
        </div>
      {/if}

      {#if hasSpecificClassRestriction(computed.classRequired)}
        <div>
          <div class={styles.label}>Required class</div>
          <div class={styles.value}>
            {computed.classRequired.map(formatClassName).join(", ")}
          </div>
        </div>
      {/if}

      {#if data.item.slot}
        <div>
          <div class={styles.label}>
            {isCostume ? "Costume slot" : "Equipment slot"}
          </div>
          <div class={styles.value}>
            {formatEquipmentCategory(data.item.slot)}
          </div>
        </div>
      {/if}

      {#if data.item.max_stack > 1}
        <div>
          <div class={styles.label}>Maximum stack</div>
          <div class={styles.value}>{data.item.max_stack}</div>
        </div>
      {/if}

      {#if data.item.backpack_slots > 0}
        <div>
          <div class={styles.label}>Backpack slots</div>
          <div class={styles.value}>{data.item.backpack_slots}</div>
        </div>
      {/if}

      {#if isBackpack && data.item.backpack_is_unique}
        <div>
          <!-- Source: server-scripts/BackpackItem.cs:7, server-scripts/PlayerInventory.cs:604-618 (IsUniqueBackpackAlreadyEquipped) — only one copy of a Unique backpack can be equipped -->
          <div class={styles.label}>Unique</div>
          <div class={styles.value}>Yes</div>
        </div>
      {/if}

      {#if computed.maxDurability && !isAugment && !isCostume}
        <div>
          <div class={styles.label}>Durability</div>
          <div class={styles.value}>{computed.maxDurability} points</div>
        </div>
      {/if}

      {#if data.item.mount_speed > 0}
        <div>
          <div class={styles.label}>Mount speed</div>
          <div class={styles.value}>{data.item.mount_speed}</div>
        </div>
      {/if}

      {#if data.item.food_type}
        <div>
          <div class={styles.label}>Food type</div>
          <div class={styles.value}>{data.item.food_type}</div>
        </div>
      {/if}

      {#if computed.hasSerenity}
        <div>
          <div class={styles.label}>Special effect</div>
          <a href="/skills/serenity" class={styles.link}>Serenity</a>
        </div>
      {/if}

      {#if computed.armorSetName && computed.armorSetId}
        <div>
          <div class={styles.label}>Set bonus</div>
          <a href="/items/{computed.armorSetId}" class={styles.link}>
            {computed.armorSetName}
          </a>
        </div>
      {/if}

      {#if data.item.buy_price > 0 && computed.soldBy && computed.soldBy.length > 0}
        <div>
          <div class={styles.label}>Buy price</div>
          <div class={styles.valueCurrency}>
            {#if computed.soldBy[0].currency_item_id}
              {formatNumber(data.item.buy_price, { groupSeparator: "\u202F" })}
              <a
                href={resolve("/items/[id]", {
                  id: computed.soldBy[0].currency_item_id,
                })}
                class={styles.link}
              >
                {computed.soldBy[0].currency_item_name}
              </a>
            {:else}
              {formatNumber(data.item.buy_price, { groupSeparator: "\u202F" })}g
            {/if}
          </div>
        </div>
      {/if}

      {#if data.item.sell_price > 0 && data.item.sellable}
        <div>
          <div class={styles.label}>Sell price</div>
          <div class={styles.valueCurrency}>
            {formatNumber(data.item.sell_price, { groupSeparator: "\u202F" })}g
          </div>
        </div>
      {/if}

      {#if data.item.primal_essence_value}
        <div>
          <div class={styles.label}>Trades for</div>
          <div class={styles.value}>
            <a href="/items/primal_essence" class={styles.link}>
              {data.item.primal_essence_value} Primal Essence
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

  {#if hasMechanicsNotes}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Mechanics</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-2 text-sm">
        {#if isBackpack}
          <div class="space-y-2 text-muted-foreground">
            <p>
              Equipping a backpack adds its slots to your Combined Backpack. See
              <a href="/mechanics/inventory#backpacks" class={styles.link}>
                backpack storage rules
              </a>
              for slot counts and where each bag comes from.
            </p>
          </div>
        {/if}
        {#if isHouseChestStructure}
          <div class="space-y-2 text-muted-foreground">
            <p>
              You need to own a house to use a house chest. See
              <a href="/mechanics/inventory#house-chests" class={styles.link}>
                house chest storage rules
              </a>
              for slot ranges, costs, and house locations.
            </p>
          </div>
        {/if}
        {#if isSetPiece}
          <p class="text-muted-foreground">
            Set bonuses count only equipped pieces with durability left. See
            <a href="/mechanics/inventory#armor-sets" class={styles.link}>
              armor set rules
            </a>
            for the piece thresholds.
          </p>
        {/if}
        {#if isCostume}
          <p class="text-muted-foreground">
            Using a costume saves its appearance to your wardrobe. See
            <a href="/mechanics/housing#appearance" class={styles.link}>
              wardrobe and appearance rules
            </a>.
          </p>
        {/if}
        {#if isTravelItem}
          <p class="text-muted-foreground">
            Travel scrolls do not work inside the Temple of Valaark. See
            <a href="/mechanics/world#binding-and-travel" class={styles.link}>
              binding and travel rules
            </a>
            for bind points.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Tooltip and Stats/Merge/Currency side-by-side (hide entire section if all would be empty) -->
  {#if hasPrimaryDetailCards}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Tooltip -->
      {#if data.item.tooltip_html}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Tooltip</Card.Title>
          </Card.Header>
          <Card.Content>
            <ItemTooltip
              tooltipHtml={data.item.tooltip_html}
              visualAsset={data.visualAsset}
            />
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Summoned pet -->
      {#if petSpriteSrc && data.petVisualAsset}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Pet</Card.Title>
          </Card.Header>
          <Card.Content class="flex-1">
            <div
              class="flex h-full min-h-32 w-full items-center justify-center"
            >
              <img
                src={petSpriteSrc}
                alt={`Pet summoned by ${data.item.name}`}
                width={data.petVisualAsset.width}
                height={data.petVisualAsset.height}
                class="h-auto w-auto max-w-full object-contain [image-rendering:pixelated] max-h-40"
              />
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      {#if specialMechanics[0]}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Special use</Card.Title>
          </Card.Header>
          <Card.Content>
            <div>
              <div class={styles.label}>How it works</div>
              <div class={styles.value}>
                <SpecialMechanicText parts={specialMechanics[0].summary} />
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      {#if data.fishing_effect}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>{data.fishing_effect.title}</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-3 text-sm">
            {#each data.fishing_effect.description_paragraphs as paragraph (paragraph)}
              <p class="text-muted-foreground">
                {paragraph}
              </p>
            {/each}
            <a href={data.fishing_effect.fishing_page_href} class={styles.link}>
              Open Fishing Calculator
            </a>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Fatecharm -->
      {#if data.item.luck_token_bonus}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Fatecharm</Card.Title>
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
                <div class={styles.label}>Created from</div>
                <div>
                  <a
                    href="/items/{data.item.luck_token_fragment_id}"
                    class={styles.link}
                  >
                    {data.item.luck_token_fragment_name}
                  </a>
                  {#if data.item.luck_token_fragments_needed}
                    <span class={styles.label}>
                      ×{data.item.luck_token_fragments_needed}</span
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
            <Card.Title level={2}>Fatecharm fragment</Card.Title>
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
              <div class={styles.label}>Amount needed</div>
              <div class={styles.value}>{data.item.fragment_amount_needed}</div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Pack Contents -->
      {#if data.packContents.length > 0}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Pack contents</Card.Title>
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

      <!-- Stats -->
      {#if hasStatsCard}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Stats</Card.Title>
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
                      ({formatPercent(
                        data.item.weapon_proc_effect_probability,
                        { decimals: 0, trailingZeros: true },
                      )} chance)
                    </span>
                  </span>
                </div>
              {/if}
              {#if data.item.weapon_delay > 0}
                <div
                  class="flex justify-between items-center p-2 rounded bg-muted"
                >
                  <span class="text-sm font-medium">Delay</span>
                  <span class="text-sm font-bold">{data.item.weapon_delay}</span
                  >
                </div>
              {/if}
              {#if computed.stats}
                {#each computed.stats as { field, value } (field.field)}
                  <div
                    class="flex justify-between items-center p-2 rounded bg-muted"
                  >
                    <span class="text-sm font-medium"
                      >{statFieldName(field, "item", {
                        weapon: data.item.item_type === "weapon",
                      })}</span
                    >
                    <!-- Source: server-scripts/EquipmentItem.cs:445 — the tooltip fills {DAMAGEBONUS} with the unsigned amount, and weapon tooltip templates print it as Base Damage without a plus sign. -->
                    <span class="text-sm font-bold"
                      >{formatStatField(field, value, {
                        signed:
                          data.item.item_type !== "weapon" ||
                          field.stat !== "attack_power",
                      })}</span
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
            <Card.Title level={2}>Combine to create</Card.Title>
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
      {/if}
      {#if computed.createdFromMerge && computed.createdFromMerge.length > 0}
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Created from</Card.Title>
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
            <Card.Title level={2}>Treasure location</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div>
              <div class={styles.label}>Dig location</div>
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
              <div class={styles.label}>Required tool</div>
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
            <Card.Title level={2}>Currency for</Card.Title>
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
                    {item.price === 0
                      ? "Free"
                      : `Costs ${formatNumber(item.price)}`}
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
            <Card.Title level={2}>How to get</Card.Title>
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
                    <li>Equipment of Magic quality or higher</li>
                    <li>
                      Sellable, with a positive sell price, and not broken
                    </li>
                    <li>Not a pickaxe</li>
                  </ul>
                </div>
              </div>
              <div>
                <div class={styles.label}>Amount received</div>
                <!-- Source: server-scripts/Utils.cs:getPrimalEssenceAmount, isTradeableForPrimalEssence and UINpcTrading.cs:562-580 - trades use the item's own sell price and require durability left. -->
                <div class={styles.value}>
                  6% of the sell price, rounded up. Gear bought with tokens uses
                  its sell price in tokens, not its gold value.
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "token_of_redemption" && data.veteranMasters.length > 0}
        <!-- Token of Redemption Usage -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>How to use</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Purpose</div>
                <div class={styles.value}>Resets veteran skill points</div>
              </div>
              <div>
                <div class={styles.label}>Cost</div>
                <!-- Source: server-scripts/Utils.cs:priceResetVeteranSkills (priceResetVeteranSkills = 10000), Npc.cs:1820-1827 -->
                <div class={styles.value}>
                  {formatNumber(10000, { groupSeparator: "\u202F" })}g + Token
                  of Redemption
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
        <!-- Source: server-scripts/Player.cs:HasRadiantAether -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
        <!-- Source: server-scripts/ScriptableSkill.cs:TryActivateRadiantAetherForArea -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Passive effects</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-4">
              <div>
                <div class={styles.label}>How it works</div>
                <div class={styles.value}>
                  <p>
                    Keep Radiant Aether in your 24 base inventory slots, not in
                    a backpack. Each activation consumes one.
                  </p>
                  <p>
                    Ability critical hits and otherwise fatal hits each have a
                    15% activation chance. Against an enemy's area skill, the
                    chance per carrier is 15% with one carrier targeted, or 25%
                    divided among multiple carriers, capped at 10% each.
                  </p>
                </div>
              </div>
              <div class="space-y-2">
                <div>
                  <div class={styles.label}>
                    When an ability lands a critical hit
                  </div>
                  <div class={styles.value}>
                    <span class={styles.valuePositive}
                      >The critical hit deals 3 times normal damage instead of
                      1.5 times.</span
                    >
                    The target's Critical Resist still reduces the bonus.
                  </div>
                  <div class="italic text-muted-foreground text-sm mt-1">
                    "Radiant Aether surges - your strike rends the heavens!"
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                <div>
                  <div class={styles.label}>When a hit would kill you</div>
                  <div class={styles.value}>
                    <span class={styles.valuePositive}
                      >Restores all Hit Points</span
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
                  <div class={styles.label}>
                    When an enemy uses an area skill
                  </div>
                  <div class={styles.value}>
                    <span class={styles.valuePositive}
                      >Cancels the skill for all targets</span
                    >, preventing its damage or debuff
                  </div>
                  <div class="italic text-muted-foreground text-sm mt-1">
                    "Radiant Aether flares brightly - your party withstand
                    &lt;skill name&gt;!"
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.id === "cursed_rune" && data.priestesses.length > 0}
        <!-- Cursed Rune Blessing -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Blessing</Card.Title>
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
                  {formatNumber(75, { groupSeparator: "\u202F" })}g per rune
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
            <Card.Title level={2}>How to get</Card.Title>
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
                  {formatNumber(75, { groupSeparator: "\u202F" })}g per rune
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
        <!-- Source: server-scripts/GatherItem.cs:368-376,407-428 — Lockpicking skill -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Lockpicking</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-sm text-muted-foreground">
              Rogues with the <a href="/skills/lockpicking" class={styles.link}
                >Lockpicking</a
              > veteran skill can open locked chests without their keys. Each attempt
              uses one lockpick and has a 20% success chance.
            </p>
          </Card.Content>
        </Card.Root>
      {:else if isAugment && !isArmorSetMetadata && data.augmenters.length > 0}
        <!-- Socketable Augment Usage -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>How to use</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class={styles.label}>Socketing</div>
                <div class={styles.value}>
                  Place the augment and an armor or weapon in a crafting
                  station, then craft. Crafting uses the augment and permanently
                  adds its stats to the equipment. If you have multiple copies
                  of the equipment, crafting uses the first copy without an
                  augment.
                </div>
              </div>
              <div>
                <div class={styles.label}>Removing</div>
                <!-- Source: server-scripts/UINpcTrading.cs:261-265 — removal prices depend on the augment's quality. -->
                <div class={styles.value}>
                  Visit an Augmenter to remove a socketed augment. Removal costs {formatNumber(
                    5000,
                    { groupSeparator: "\u202F" },
                  )}g for an uncommon augment, {formatNumber(10000, {
                    groupSeparator: "\u202F",
                  })}g for a magic augment, or {formatNumber(15000, {
                    groupSeparator: "\u202F",
                  })}g for an epic augment. The Augmenter returns it to your
                  inventory.
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
            <Card.Title level={2}>Found in packs</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each computed.foundInPacks as pack, index (`${pack.pack_id}_${index}`)}
                <div class="flex justify-between items-center">
                  <a href="/items/{pack.pack_id}" class={styles.link}>
                    {pack.pack_name}
                  </a>
                  <span class={styles.value}
                    >Contains {formatNumber(pack.amount)}</span
                  >
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {:else if data.item.recipe_potion_learned_id && data.item.recipe_potion_learned_name}
        <!-- Teaches Recipe -->
        <Card.Root class="bg-muted/30">
          <Card.Header>
            <Card.Title level={2}>Teaches recipe</Card.Title>
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
                  <div class={styles.label}>Recipe tier</div>
                  <div class={styles.value}>
                    {formatTier(data.item.alchemy_recipe_level_required)}
                  </div>
                </div>
              {/if}
            </div>

            {#if data.recipeMaterials[data.item.recipe_potion_learned_id]?.length}
              {@const materials =
                data.recipeMaterials[data.item.recipe_potion_learned_id]}
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
            <Card.Title level={2} class="flex items-center gap-2">
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
                  <div class={styles.label}>Recipe tier</div>
                  <div class={styles.value}>
                    {formatTier(data.item.alchemy_recipe_level_required)}
                  </div>
                </div>
              {/if}
            </div>

            {#if computed.craftedFrom?.[0]?.materials.length}
              {@const materials = computed.craftedFrom[0].materials}
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
        <Card.Title level={2}>
          {data.item.augment_armor_set_name}
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- Set Members -->
        {#if computed.armorSetMembers && computed.armorSetMembers.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">
              Set pieces ({computed.armorSetMembers.length})
            </h4>
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              {#each computed.armorSetMembers as member (member.item_id)}
                <ItemLink
                  itemId={member.item_id}
                  itemName={member.item_name}
                  tooltipHtml={member.tooltip_html}
                  imageAvailable={data.itemIconPaths[member.item_id]}
                />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Attribute Bonuses (3-piece) -->
        <!-- Source: server-scripts/PlayerEquipment.cs:OnEquipmentChanged — set bonuses apply at 3 pieces (attributes) and 5 pieces (skills) -->
        {#if computed.armorSetAttributeBonuses && computed.armorSetAttributeBonuses.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">Set bonuses (3 pieces)</h4>
            <div class="space-y-2">
              {#each computed.armorSetAttributeBonuses as bonus (bonus.stat_id)}
                <div
                  class="flex items-center justify-between p-2 rounded bg-muted"
                >
                  <span>{statName(bonus.stat_id as StatId, "item")}</span>
                  <span class={styles.valuePositive}
                    >{formatStat(bonus.stat_id as StatId, bonus.bonus, {
                      signed: true,
                    })}</span
                  >
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Skill Bonuses (5-piece) -->
        {#if computed.armorSetSkillBonuses && computed.armorSetSkillBonuses.length > 0}
          <div>
            <h4 class="text-sm font-semibold mb-2">Set bonuses (5 pieces)</h4>
            <div class="space-y-2">
              {#each computed.armorSetSkillBonuses as bonus (bonus.skill_id)}
                <div
                  class="flex items-center justify-between p-2 rounded bg-muted"
                >
                  <a href="/skills/{bonus.skill_id}" class={styles.link}>
                    {bonus.skill_name}
                  </a>
                  <span class={styles.valuePositive}>
                    +{bonus.level_bonus} rank{bonus.level_bonus !== 1
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
        <Card.Title level={2}>Use effects</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if data.item.usage_health > 0}
          <div>
            <div class={styles.label}>
              Restores {statName("health", "item")}
            </div>
            <div class={styles.valuePositive}>
              {formatStat("health", data.item.usage_health, { signed: true })}
              {statName("health", "item")}
            </div>
          </div>
        {/if}

        {#if data.item.usage_mana > 0}
          <div>
            <div class={styles.label}>
              Restores {statName("mana", "item")}
            </div>
            <div class="text-blue-600 dark:text-blue-400">
              {formatStat("mana", data.item.usage_mana, { signed: true })}
              {statName("mana", "item")}
            </div>
          </div>
        {/if}

        {#if data.item.usage_energy > 0}
          <div>
            <div class={styles.label}>
              Restores {statName("rage", "item")}
            </div>
            <div class={styles.valueCurrency}>
              {formatStat("rage", data.item.usage_energy, { signed: true })}
              {statName("rage", "item")}
            </div>
          </div>
        {/if}

        {#if data.item.potion_buff_id && data.item.potion_buff_name}
          <div>
            <div class={styles.label}>Grants buff</div>
            <a href="/skills/{data.item.potion_buff_id}" class={styles.link}>
              {data.item.potion_buff_name}
            </a>
            {#if data.consumableBuffEffect}
              <div class="text-sm">{data.consumableBuffEffect}</div>
            {/if}
          </div>
        {/if}

        {#if data.item.food_buff_id && data.item.food_buff_name}
          <div>
            <div class={styles.label}>Grants buff</div>
            <a href="/skills/{data.item.food_buff_id}" class={styles.link}>
              {data.item.food_buff_name}
            </a>
            {#if data.consumableBuffEffect}
              <div class="text-sm">{data.consumableBuffEffect}</div>
            {/if}
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
          <div class={styles.label}>Consumed on use</div>
          <div class={styles.value}>
            {data.item.infinite_charges ? "No" : "Yes"}
          </div>
        </div>

        {#if data.item.cooldown > 0}
          <div>
            <div class={styles.label}>Recharge time</div>
            <div class={styles.value}>{formatDuration(data.item.cooldown)}</div>
          </div>
        {/if}

        <!-- Source: server-scripts/FoodItem.cs:Use; server-scripts/PassiveSkill.cs:GetFoodAndDrinkBuffDurationBonus — Tavern Spirit lengthens food and drink buffs. -->
        {#if data.foodBuffUsesTavernSpirit}
          <p class="col-span-full text-sm text-muted-foreground">
            <a href="/skills/tavern_spirit" class={styles.link}>Tavern Spirit</a
            >
            lengthens this buff by 10% per rank.
          </p>
          <!-- Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance - learned Elixir Endurance sets a potion buff's rank to 1 + the Elixir Endurance rank, except for bandages. -->
        {:else if data.item.potion_buff_id && data.item.cooldown_category !== "Bandages"}
          <p class="col-span-full text-sm text-muted-foreground">
            With <a href="/skills/elixir_endurance" class={styles.link}
              >Elixir Endurance</a
            > learned, this buff's rank is 1 + your Elixir Endurance rank.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Book Effects (Permanent Stat Gains) -->
  {#if data.item.book_strength_gain > 0 || data.item.book_dexterity_gain > 0 || data.item.book_constitution_gain > 0 || data.item.book_intelligence_gain > 0 || data.item.book_wisdom_gain > 0 || data.item.book_charisma_gain > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Permanent stat gains</Card.Title>
      </Card.Header>
      <Card.Content class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#if data.item.book_strength_gain > 0}
          <div>
            <div class={styles.label}>{statName("strength", "item")}</div>
            <div class={styles.valuePositive}>
              {formatStat("strength", data.item.book_strength_gain, {
                signed: true,
              })}
            </div>
          </div>
        {/if}

        {#if data.item.book_dexterity_gain > 0}
          <div>
            <div class={styles.label}>{statName("dexterity", "item")}</div>
            <div class={styles.valuePositive}>
              {formatStat("dexterity", data.item.book_dexterity_gain, {
                signed: true,
              })}
            </div>
          </div>
        {/if}

        {#if data.item.book_constitution_gain > 0}
          <div>
            <div class={styles.label}>{statName("constitution", "item")}</div>
            <div class={styles.valuePositive}>
              {formatStat("constitution", data.item.book_constitution_gain, {
                signed: true,
              })}
            </div>
          </div>
        {/if}

        {#if data.item.book_intelligence_gain > 0}
          <div>
            <div class={styles.label}>{statName("intelligence", "item")}</div>
            <div class={styles.valuePositive}>
              {formatStat("intelligence", data.item.book_intelligence_gain, {
                signed: true,
              })}
            </div>
          </div>
        {/if}

        {#if data.item.book_wisdom_gain > 0}
          <div>
            <div class={styles.label}>{statName("wisdom", "item")}</div>
            <div class={styles.valuePositive}>
              {formatStat("wisdom", data.item.book_wisdom_gain, {
                signed: true,
              })}
            </div>
          </div>
        {/if}

        {#if data.item.book_charisma_gain > 0}
          <div>
            <div class={styles.label}>{statName("charisma", "item")}</div>
            <div class={styles.valuePositive}>
              {formatStat("charisma", data.item.book_charisma_gain, {
                signed: true,
              })}
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Relationships -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#if !isArmorSetMetadata && (!data.hasKnownSource || data.acquisitionNotes.length > 0)}
      <Card.Root class="bg-muted/30 self-start">
        <Card.Header>
          <Card.Title level={2}>Sources</Card.Title>
        </Card.Header>
        <Card.Content>
          {#each data.acquisitionNotes as note (note)}
            <p>{note}</p>
          {:else}
            <ItemSourceLinks
              groups={[]}
              itemId={data.item.id}
              emptyLabel="No known source"
            />
          {/each}
        </Card.Content>
      </Card.Root>
    {/if}
    <!-- Dropped By -->
    {#if computed.droppedBy && computed.droppedBy.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}
            >{computed.droppedBy.every((drop) => drop.is_distribution_roll)
              ? "Loot distributions"
              : "Dropped by"}</Card.Title
          >
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
                <span class={styles.label}>
                  {#if drop.per_kill_chance != null}
                    {formatPercent(drop.per_kill_chance, {
                      decimals: 1,
                      trailingZeros: false,
                    })} per kill
                    {#if drop.per_kill_chance_with_fatecharm != null && drop.per_kill_chance_with_fatecharm !== drop.per_kill_chance}
                      ({formatPercent(drop.per_kill_chance_with_fatecharm, {
                        decimals: 1,
                        trailingZeros: false,
                      })} with the zone's Fatecharm)
                    {/if}
                  {:else}
                    {drop.rates
                      .map((rate) =>
                        formatPercent(rate, {
                          decimals: 1,
                          trailingZeros: true,
                        }),
                      )
                      .join(" + ")}
                    {#if drop.is_distribution_roll}
                      to drop one item from this pool{/if}
                    {#if drop.rates.length > 1}
                      ({drop.rates.length} separate rolls)
                    {/if}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
          {#if computed.droppedBy.some((drop) => drop.per_kill_chance != null)}
            <p class="mt-3 text-sm text-muted-foreground">
              Chances are without Fatecharm unless shown. A matching dungeon
              Fatecharm is consumed when used.
            </p>
          {/if}
          {#if data.item.is_quest_item}
            <p class="mt-3 text-sm text-muted-foreground">
              Drops only while you or a nearby party member needs it for an
              unfinished gathering quest.
            </p>
          {:else if data.item.has_gather_quest && computed.droppedBy.some((drop) => drop.is_boss)}
            <p class="mt-3 text-sm text-muted-foreground">
              Boss drops require you or a nearby party member to need this item
              for an unfinished gathering quest. Other monsters can drop it
              without that quest.
            </p>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Sold By -->
    {#if computed.soldBy && computed.soldBy.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Sold by</Card.Title>
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
                      {formatNumber(vendor.price, {
                        groupSeparator: "\u202F",
                      })}g
                    {/if}
                  </span>
                </div>
                {#if vendor.npc_faction && (data.item.faction_required_tier_name || vendor.is_faction_vendor)}
                  <div class="{styles.label} pl-2">
                    {#if data.item.faction_required_tier_name}
                      Requires {data.item.faction_required_tier_name} standing with
                      {vendor.npc_faction}
                    {:else}
                      Requires {formatNumber(15000)} reputation with {vendor.npc_faction}
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Pet mechanics -->
    {#if isPet}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Mechanics</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3 text-sm text-muted-foreground">
          <!-- Source: server-scripts/Player.cs:4210-4240 — using the item summons the pet, or dismisses the one it already summoned. -->
          <p>
            Use the whistle to summon the pet. Using it again dismisses that
            pet. Three pets can follow you at once.
          </p>
          <!-- Source: server-scripts/FriendlyPetFollowerItem.cs:16-23,58-80 — name rules and the default name. -->
          <p>
            Right-click the whistle in your inventory to name the pet. A name
            holds up to 20 characters and accepts letters, spaces, apostrophes,
            and hyphens. Without a name the pet is called "&lt;your
            character&gt;'s pet".
          </p>
          <!-- Source: server-scripts/PetFriendly.cs:UpdateServer_PLAYER_FOLLOWER - followers leave when their whistle is absent and catch up when far behind. -->
          <p>
            The pet follows you and catches up when it falls far behind. It
            leaves when its whistle is no longer in your inventory. It is
            cosmetic and takes no part in combat.
          </p>
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
          <Card.Title level={2}>Rewarded by quests</Card.Title>
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
                        (Lv {quest.level_recommended}{#if hasSpecificClassRestriction(quest.class_restrictions)},
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
                        (Lv {quest.level_recommended}{#if hasSpecificClassRestriction(quest.class_restrictions)},
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
          <Card.Title level={2}>Given when you start a quest</Card.Title>
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
                        (Lv {quest.level_recommended}{#if hasSpecificClassRestriction(quest.class_restrictions)},
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
                        (Lv {quest.level_recommended}{#if hasSpecificClassRestriction(quest.class_restrictions)},
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
          <Card.Title level={2}>Dropped by altar boss</Card.Title>
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
                  <div>
                    If you activate the altar:
                    {formatAltarRequirement(
                      altar.reward_tier,
                      altar,
                      data.maxLevel,
                    )}
                  </div>
                  <div>
                    Drop Rate: {formatPercent(altar.drop_rate, {
                      decimals: 0,
                      trailingZeros: true,
                    })}
                  </div>
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
          <Card.Title level={2}>Rewarded by treasure maps</Card.Title>
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
          <Card.Title level={2}>Required to activate altars</Card.Title>
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
          <Card.Title level={2}>Required for portals</Card.Title>
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
          <Card.Title level={2} class="flex items-center gap-2">
            Crafted from recipe
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
                <span class={styles.label}>×{material.amount}</span>
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
          <Card.Title level={2}>Gathered from</Card.Title>
        </Card.Header>
        <Card.Content>
          {#if computed.gatheredFrom.some((gather) => gather.is_fishing_spot)}
            <p class="mb-3 text-muted-foreground">
              {FISHING_RANGE_ASSUMPTIONS}
            </p>
          {/if}
          <div class="space-y-2">
            {#each computed.gatheredFrom as gather, index (`${gather.gather_item_id}_${gather.spawn_id ?? index}`)}
              {#if gather.is_fishing_spot}
                <div class="space-y-1">
                  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <a
                      href="/gather-items/{gather.gather_item_id}"
                      class="{styles.link} min-w-40 flex-1"
                    >
                      {gather.gather_item_name}
                    </a>
                    <span
                      class="{styles.label} mr-auto shrink-0 whitespace-nowrap sm:ml-auto sm:mr-0 sm:text-right"
                    >
                      {#if gather.rate_note}
                        {gather.rate_note}
                      {:else}
                        {formatPercent(gather.rate, {
                          decimals: 1,
                          trailingZeros: true,
                        })}
                      {/if}
                    </span>
                  </div>
                  <div class="ml-0 flex items-center gap-1.5 text-sm sm:ml-2">
                    {#if gather.zone_name}
                      <span class={styles.label}
                        >{gather.zone_name}{#if gather.virtual_location_count > 1}
                          ({gather.virtual_location_count} spots){/if}</span
                      >
                    {/if}
                    <MapLink
                      entityId={gather.gather_item_id}
                      entityType="resource"
                      compact
                    />
                  </div>
                </div>
              {:else}
                <div class="flex justify-between items-start gap-3">
                  <div class="flex items-center gap-1.5">
                    <a
                      href="/gather-items/{gather.gather_item_id}"
                      class={styles.link}
                    >
                      {gather.gather_item_name}
                    </a>
                    {#if gather.zone_name}
                      <span class={styles.label}>({gather.zone_name})</span>
                    {/if}
                    <MapLink
                      entityId={gather.gather_item_id}
                      entityType="resource"
                      compact
                    />
                  </div>
                  <span class="{styles.label} text-right">
                    {#if gather.rate_note}
                      {gather.rate_note}
                    {:else}
                      {formatPercent(gather.rate, {
                        decimals: 1,
                        trailingZeros: true,
                      })}
                    {/if}
                    {#if !gather.is_radiant_spark && gather.amount_min != null && gather.amount_max != null && gather.amount_max > 0}
                      {#if gather.amount_min === gather.amount_max}
                        , {gather.amount_max} per gather
                      {:else}
                        , {gather.amount_min} to {gather.amount_max} per gather
                      {/if}
                    {/if}
                  </span>
                </div>
              {/if}
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Opens Chests -->
    {#if computed.opensChests && computed.opensChests.length > 0}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Opens chests</Card.Title>
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
          <Card.Title level={2}>Found in chests</Card.Title>
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
                    >{formatPercent(chest.rate, {
                      decimals: 1,
                      trailingZeros: true,
                    })}</span
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
          <Card.Title level={2}>Opened from</Card.Title>
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
                  {formatPercent(randomItem.probability, {
                    decimals: 1,
                    trailingZeros: true,
                  })}
                  {#if randomItem.assumesTreasureHunterZero}
                    at 0% Treasure Hunter
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Possible Items (for simple random items, not chest-type items) -->
    {#if data.randomOutcomes && data.randomOutcomes.length > 0 && (!computed.chestRewards || computed.chestRewards.length === 0)}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Possible items</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each data.randomOutcomes as item (item.item_id)}
              <div class="flex justify-between items-center">
                <a href="/items/{item.item_id}" class={styles.link}>
                  {item.item_name}
                </a>
                <span class={styles.label}>
                  {formatPercent(item.probability, {
                    decimals: 1,
                    trailingZeros: true,
                  })}
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
          <Card.Title level={2}>Chest rewards</Card.Title>
          <Card.Description>
            {#if hasFixedChestContents}
              Each opening gives {Math.min(
                data.item.chest_num_items,
                computed.chestRewards.length,
              )} fixed {data.item.chest_num_items === 1 ? "item" : "items"}.
            {:else}
              Each opening gives up to {data.item.chest_num_items}
              {data.item.chest_num_items === 1 ? "item" : "items"}. An item
              cannot appear twice in one opening.
              {#if computed.chestRewards.some((reward) => reward.scales_with_treasure_hunter)}
                Chances are at 0% Treasure Hunter. Each 1% Treasure Hunter adds
                0.1 percentage points to each relic's roll.
              {/if}
            {/if}
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
                  >{formatPercent(reward.open_chance, {
                    decimals: 1,
                    trailingZeros: true,
                  })}</span
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
          <Card.Title level={2}>Used in recipes</Card.Title>
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
                <span class={styles.label}
                  >Needs {formatNumber(recipe.amount)}</span
                >
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
          <Card.Title level={2}>Required for quests</Card.Title>
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
                        (Lv {quest.level_recommended}{#if hasSpecificClassRestriction(quest.class_restrictions)},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                    <span class={styles.label}
                      >{quest.purpose}{#if quest.amount > 0}
                        ×{quest.amount}{/if}</span
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
                        (Lv {quest.level_recommended}{#if hasSpecificClassRestriction(quest.class_restrictions)},
                          {quest.class_restrictions
                            .map(formatClassName)
                            .join(", ")}{/if})
                      </span>
                    </a>
                    <span class={styles.label}
                      >{quest.purpose}{#if quest.amount > 0}
                        ×{quest.amount}{/if}</span
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
