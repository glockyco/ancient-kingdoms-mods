<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { base, resolve } from "$app/paths";
  import type { Cell, ColumnDef, Row } from "$lib/components/ui/data-table";
  import RelationTable from "$lib/components/RelationTable.svelte";
  import { formatAltarRewardTier } from "$lib/calculation/altar";
  import { SEASON_ORDER, type Season } from "$lib/data/seasonal-events";
  import SeasonLabel from "$lib/components/SeasonLabel.svelte";
  import SeasonIcons from "$lib/components/SeasonIcons.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import ItemSourceLinks from "$lib/components/ItemSourceLinks.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import SpecialMechanicText from "$lib/components/SpecialMechanicText.svelte";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";
  import DropChance from "$lib/components/DropChance.svelte";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import FishIcon from "@lucide/svelte/icons/fish";
  import { ITEM_STAT_FIELDS } from "$lib/constants/items";
  import {
    formatEquipmentCategory,
    formatItemType,
    itemListType,
    formatPercent,
    formatNumber,
    formatRange,
  } from "$lib/utils/format";
  import { ALL_CLASS_IDS, formatClassName } from "$lib/utils/classes";
  import { FISHING_RANGE_ASSUMPTIONS } from "$lib/utils/fishing";
  import type { StatId } from "$lib/generated/stat-vocabulary";
  import type { QuestDisplayType } from "$lib/utils/quests";
  import {
    formatStat,
    formatStatField,
    statFieldName,
    statName,
  } from "$lib/stats";
  import { isHouseChestItemId } from "$lib/inventory/house-chests";
  import { getItemSpecialMechanics } from "$lib/special-mechanics";
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
    // Table text that can run long wraps at a fixed width, so one long cell
    // cannot set the width of every flexible column.
    wrapCell: "block max-w-64 whitespace-normal",
    // Positive values (bonuses, gains, health/mana)
    valuePositive: "text-green-600 dark:text-green-400",
    // Currency/gold values
    valueCurrency: "text-yellow-600 dark:text-yellow-400",
    // Beside the tooltip, one fact per row with its value at the right. A card with
    // the page's width to itself lays facts out in columns, label above value.
    factList: "grid @2xl:grid-cols-3 @2xl:gap-x-8 @2xl:gap-y-4",
    fact: "flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0 [&>dd]:text-right @2xl:block @2xl:border-b-0 @2xl:py-0 @2xl:[&>dd]:text-left",
    // A fact whose value is a sentence keeps its label above it at every width.
    proseFact:
      "border-b py-2 last:border-b-0 [&>dd]:mt-1 @2xl:border-b-0 @2xl:py-0 @2xl:[&>dd]:mt-0",
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
      !classes.includes("all") &&
      !classes.some((id) => id === "withheld" || id === "unpublished class"),
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
    return minPercent === maxPercent
      ? minPercent
      : formatRange(minPercent, maxPercent);
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
  // The How to Use section already explains socketing when the item lists augmenters.
  const showsAugmentNote = $derived(
    isAugment && !isArmorSetMetadata && data.augmenters.length === 0,
  );
  const hasMechanicsNotes = $derived(
    isBackpack ||
      isHouseChestStructure ||
      isSetPiece ||
      isCostume ||
      isTravelItem ||
      showsAugmentNote ||
      isPet,
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
      // One row per monster, zones and chance. Rolls that differ only in level merge.
      droppedBy: Array.from(
        Map.groupBy(data.sources.monsters ?? [], (m) =>
          JSON.stringify([
            m.monster_id,
            m.is_boss,
            m.is_elite,
            m.drop_rate,
            m.per_kill_chance,
            m.per_kill_chance_with_fatecharm,
            m.fatecharm?.id,
            m.seasons,
            m.zones.map((zone) => zone.zone_id),
          ]),
        ).values(),
      ).map((rolls) => ({
        ...rolls[0],
        monster_level_min: Math.min(
          ...rolls.map((roll) => roll.monster_level_min),
        ),
        monster_level_max: Math.max(
          ...rolls.map((roll) => roll.monster_level_max),
        ),
      })),

      soldBy: data.sources.vendors.filter(
        (vendor) => !vendor.currency_item_name || vendor.currency_item_id,
      ),

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
        data.sources.recipes
          ?.map((r) => ({
            ...r,
            materials:
              r.materials ??
              data.recipeMaterials[r.variant_id ?? r.recipe_id] ??
              [],
          }))
          .filter((recipe) =>
            recipe.materials.every((material) => material.item_id),
          ) || [],

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
                    g.zones.map((zone) => zone.zone_id),
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
            zones: g.zones,
            is_radiant_spark: g.is_radiant_spark,
            rate_note: g.is_radiant_spark
              ? "5% + 0.2% per 1% Radiant Seeker (25% at 100%)"
              : (formatFishingChanceRange(
                  g.fishing_chance_min,
                  g.fishing_chance_max,
                ) ?? undefined),
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
          seasons: p.seasons,
        })) || [],

      createdFromMerge:
        data.sources.merges
          ?.filter((merge) => merge.component_item_ids.every(Boolean))
          .flatMap((merge) =>
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
            // Many NPCs make the same offer. Rows stay distinct by price and by
            // whether the offer is year-round, and seasonal rows list their seasons.
            const key = `${c.purchasable_item_id}:${c.price}:${Boolean(c.season)}`;
            const entry = (acc[key] ??= {
              key,
              item_id: c.purchasable_item_id,
              item_name: c.purchasable_item_name,
              price: c.price,
              seasons: [],
            });
            if (c.season && !entry.seasons.includes(c.season)) {
              entry.seasons.push(c.season);
              entry.seasons.sort((a, b) => SEASON_ORDER[a] - SEASON_ORDER[b]);
            }
            return acc;
          },
          {} as Record<
            string,
            {
              key: string;
              item_id: string;
              item_name: string;
              price: number;
              seasons: Season[];
            }
          >,
        ),
      ),

      // Still parsed from item (not obtainability data)
      armorSetSkillBonuses: parseJson<
        Array<{ skill_id: string; skill_name: string; level_bonus: number }>
      >(data.item.augment_skill_bonuses_with_names),
      armorSetMembers: parseJson<
        Array<{
          item_id: string;
          item_name: string;
          quality: number;
          tooltip_html?: string;
        }>
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

  const hasFixedChestContents = $derived(
    Boolean(
      computed.chestRewards?.length &&
      computed.chestRewards.every((reward) => reward.open_chance >= 1),
    ),
  );

  // A row links to the map only where the map can show its entity for this item.
  const mapTarget =
    (category: keyof typeof data.mapLinks) => (id: string, name: string) =>
      data.mapLinks[category].includes(id)
        ? { entityId: id, entityType: category, name }
        : null;
  // Chests have no names, so a chest is named by its zone.
  const chestName = (zoneName: string | null) =>
    zoneName ? `Chest in ${zoneName}` : "Chest";
  const chanceLabel = (chance: number) =>
    formatPercent(chance, { decimals: 1, trailingZeros: true });
  const packContentRows = $derived(
    data.packContents.map((content) => ({
      item_id: content.item_id,
      item_name: content.item_name,
      value: content.amount,
      label: formatNumber(content.amount),
    })),
  );
  const possibleItemRows = $derived(
    (data.randomOutcomes ?? []).map((outcome) => ({
      item_id: outcome.item_id,
      item_name: outcome.item_name,
      value: outcome.probability,
      label: chanceLabel(outcome.probability),
    })),
  );
  const chestRewardRows = $derived(
    computed.chestRewards.map((reward) => ({
      item_id: reward.item_id,
      item_name: reward.item_name,
      value: reward.open_chance,
      label: chanceLabel(reward.open_chance),
    })),
  );

  // Stats the item's tooltip lists, through a placeholder or an exact typed stat line.
  const tooltipStatFields = $derived(
    new Set(parseJson<string[]>(data.item.tooltip_stat_fields) ?? []),
  );
  // An armor set bonus entry's stats are the set's bonuses, which its set section shows.
  const unlistedStats = $derived(
    isArmorSetMetadata
      ? []
      : (computed.stats ?? []).filter(
          ({ field }) => !tooltipStatFields.has(field.field),
        ),
  );
  // Source: server-scripts/EquipmentItem.cs:CanEquip — no equipment slot accepts a pickaxe, shovel or fishing rod, and attack delay is read only from equipped weapons.
  const isTool = $derived(
    ["Pickaxe", "Shovel", "Fishing Rod"].includes(
      data.item.weapon_category ?? "",
    ),
  );
  const unlistedAttackDelay = $derived(
    data.item.weapon_delay > 0 &&
      !isTool &&
      !tooltipStatFields.has("weapon_delay"),
  );

  // Relation tables. Each keeps the name first and its number second, so a phone shows both before the table scrolls.
  // Number columns are sized to fit "100.0%" and a header with its sort icon, so a phone shows them whole.
  const NUMBER = 112;
  // Text columns start narrow and grow with their content and the free width, so a
  // drop table's five columns fit a two-column layout at 768 pixels.
  const TEXT = 160;
  // A row's zones, sortable by their names.
  function zoneColumn<
    Row extends { zones: readonly { zone_name: string }[] },
  >(): ColumnDef<Row> {
    return {
      id: "zone",
      accessorFn: (row) => row.zones.map((z) => z.zone_name).join(", "),
      header: "Zone",
      minSize: TEXT,
    };
  }

  type DropRow = (typeof computed.droppedBy)[number];
  const dropChance = (drop: DropRow) => drop.per_kill_chance ?? drop.drop_rate;
  const dropColumns: ColumnDef<DropRow>[] = [
    { accessorKey: "monster_name", header: "Monster", minSize: TEXT },
    { id: "chance", accessorFn: dropChance, header: "Chance", size: NUMBER },
    {
      id: "level",
      accessorFn: (drop) => drop.monster_level_min,
      header: "Level",
      size: NUMBER,
    },
    zoneColumn<DropRow>(),
  ];

  type AltarDropRow = (typeof computed.rewardedByAltars)[number];
  const altarDropColumns: ColumnDef<AltarDropRow>[] = [
    { accessorKey: "altar_name", header: "Altar", minSize: TEXT },
    { accessorKey: "drop_rate", header: "Chance", size: NUMBER },
    { id: "tier", header: "Reward tier", minSize: TEXT, enableSorting: false },
    { accessorKey: "boss_monster_name", header: "Final boss", minSize: TEXT },
    { accessorKey: "zone_name", header: "Zone", minSize: TEXT },
  ];

  type VendorRow = (typeof computed.soldBy)[number];
  const vendorColumns = $derived<ColumnDef<VendorRow>[]>([
    { accessorKey: "npc_name", header: "NPC", minSize: TEXT },
    {
      accessorKey: "price",
      header: "Price",
      // Gold fits a number column. A token name or a bundle size needs more room.
      size: computed.soldBy.some(
        (v) => v.currency_item_id || (v.amount ?? 1) > 1,
      )
        ? 160
        : NUMBER,
    },
    ...(computed.soldBy.some((v) => v.npc_faction && v.is_faction_vendor)
      ? [
          {
            id: "requirement",
            header: "Requires",
            minSize: TEXT,
            enableSorting: false,
          },
        ]
      : []),
    zoneColumn<VendorRow>(),
  ]);

  // A quest row from rewards, provided items or objectives.
  type QuestRow = {
    quest_id: string;
    quest_name: string;
    level_recommended: number;
    class_restrictions: string[] | null;
    is_repeatable: boolean;
    seasons?: readonly Season[];
    purpose?: string;
    amount?: number;
  };
  const questColumns = (rows: QuestRow[], withNeed: boolean) =>
    [
      { accessorKey: "quest_name", header: "Quest", minSize: TEXT },
      ...(withNeed
        ? [{ id: "need", header: "Needs", size: 128, enableSorting: false }]
        : []),
      {
        accessorKey: "level_recommended",
        header: "Rec. Level",
        size: NUMBER,
      },
      ...(rows.some((q) => hasSpecificClassRestriction(q.class_restrictions))
        ? [{ id: "classes", header: "Classes", minSize: TEXT }]
        : []),
    ] as ColumnDef<QuestRow>[];
  // The quest page's objective names, so both pages describe a quest's use of the item alike.
  // Source: server-scripts/GatherInventoryQuest.cs:OnCompleted — a quest that removes its items takes them on completion, others only check that you have them.
  const QUEST_ITEM_NEEDS: Record<string, QuestDisplayType> = {
    required: "Deliver",
    have: "Have",
    gather: "Gather",
    brew: "Brew",
    equip: "Equip",
  };

  type TreasureMapRow = (typeof computed.rewardedByTreasureMaps)[number];
  const treasureMapColumns: ColumnDef<TreasureMapRow>[] = [
    { accessorKey: "map_name", header: "Treasure map", minSize: TEXT },
    { accessorKey: "zone_name", header: "Dig zone", minSize: TEXT },
  ];

  type GatherRow = (typeof computed.gatheredFrom)[number];
  // A fishing chance is per cast. The header says so when every row is a fishing spot.
  const fishingOnly = $derived(
    computed.gatheredFrom.every((g) => g.is_fishing_spot),
  );
  const gatherColumns = $derived<ColumnDef<GatherRow>[]>([
    { accessorKey: "gather_item_name", header: "Resource", minSize: TEXT },
    {
      accessorKey: "rate",
      header: fishingOnly ? "Chance / Cast" : "Chance",
      size: 160,
    },
    ...(computed.gatheredFrom.some((g) => (g.amount_max ?? 0) > 0)
      ? [{ id: "amount", header: "Amount", size: NUMBER, enableSorting: false }]
      : []),
    zoneColumn<GatherRow>(),
  ]);

  type ChestRow = (typeof computed.foundInChests)[number];
  const chestColumns = $derived<ColumnDef<ChestRow>[]>([
    { accessorKey: "zone_name", header: "Chest", minSize: TEXT },
    { accessorKey: "rate", header: "Chance", size: NUMBER },
    ...(computed.foundInChests.some((c) => c.key_id)
      ? [{ accessorKey: "key_name", header: "Key", minSize: TEXT }]
      : []),
  ]);

  type PackRow = (typeof computed.foundInPacks)[number];
  const packColumns: ColumnDef<PackRow>[] = [
    { accessorKey: "pack_name", header: "Pack", minSize: TEXT },
    { accessorKey: "amount", header: "Amount", size: NUMBER },
  ];

  type RandomLootRow = (typeof computed.foundInRandomLoot)[number];
  const randomLootColumns: ColumnDef<RandomLootRow>[] = [
    { accessorKey: "random_item_name", header: "Container", minSize: TEXT },
    { accessorKey: "probability", header: "Chance", size: NUMBER },
  ];

  type RecipeUseRow = (typeof computed.usedInRecipes)[number];
  const recipeUseColumns: ColumnDef<RecipeUseRow>[] = [
    { accessorKey: "result_item_name", header: "Makes", minSize: TEXT },
    { accessorKey: "amount", header: "Amount", size: NUMBER },
    { id: "recipe", header: "Recipe", minSize: TEXT, enableSorting: false },
  ];

  type CurrencyRow = (typeof computed.usedAsCurrencyFor)[number];
  const currencyColumns: ColumnDef<CurrencyRow>[] = [
    { accessorKey: "item_name", header: "Buys", minSize: TEXT },
    { accessorKey: "price", header: "Price", size: NUMBER },
  ];

  type AltarUseRow = (typeof computed.requiredForAltars)[number];
  const altarUseColumns: ColumnDef<AltarUseRow>[] = [
    { accessorKey: "altar_name", header: "Altar", minSize: TEXT },
    { accessorKey: "zone_name", header: "Zone", minSize: TEXT },
  ];

  type PortalRow = (typeof computed.requiredForPortals)[number];
  const portalColumns: ColumnDef<PortalRow>[] = [
    { accessorKey: "from_zone_name", header: "Portal in", minSize: TEXT },
    { accessorKey: "to_zone_name", header: "Leads to", minSize: TEXT },
  ];

  type OpensChestRow = (typeof computed.opensChests)[number];
  const opensChestColumns: ColumnDef<OpensChestRow>[] = [
    { accessorKey: "zone_name", header: "Chest", minSize: TEXT },
    // Fits a grouped range such as "4 000 - 5 999", which is wider than a percentage.
    { accessorKey: "gold_min", header: "Gold", size: 140 },
    { accessorKey: "item_reward_name", header: "Reward", minSize: TEXT },
  ];

  // Possible items, chest rewards and pack contents all list an item with a number, sorted by the value and shown as its label.
  type ContentRow = {
    item_id: string;
    item_name: string;
    value: number;
    label: string;
  };
  const contentColumns = (valueHeader: string): ColumnDef<ContentRow>[] => [
    { accessorKey: "item_name", header: "Item", minSize: TEXT },
    { accessorKey: "value", header: valueHeader, size: NUMBER },
  ];
</script>

{#snippet number(value: string | number)}
  <span class="ml-auto tabular-nums"
    >{typeof value === "number"
      ? formatNumber(value, { decimals: 20 })
      : value}</span
  >
{/snippet}

{#snippet percent(value: number)}
  {@render number(formatPercent(value, { decimals: 1, trailingZeros: true }))}
{/snippet}

{#snippet zoneLink(zoneId: string | null | undefined, zoneName: string | null)}
  {#if zoneId && zoneName}
    <a href={resolve("/zones/[id]", { id: zoneId })} class={styles.link}
      >{zoneName}</a
    >
  {:else if zoneName}
    {zoneName}
  {/if}
{/snippet}

{#snippet zoneList(zones: readonly { zone_id: string; zone_name: string }[])}
  <span class={styles.wrapCell}>
    {#each zones as zone, index (zone.zone_id)}{index > 0
        ? ", "
        : ""}{@render zoneLink(zone.zone_id, zone.zone_name)}{/each}
  </span>
{/snippet}

{#snippet entityLinks(links: { href: string; name: string }[])}
  <ul class="space-y-1">
    {#each links as link, index (index)}
      <li><a href={link.href} class={styles.link}>{link.name}</a></li>
    {/each}
  </ul>
{/snippet}

{#snippet materialList(
  materials: readonly { item_id: string; item_name: string; amount: number }[],
)}
  <ul class="space-y-1">
    {#each materials as material (material.item_id)}
      <li>
        <a href="/items/{material.item_id}" class={styles.link}
          >{material.item_name}</a
        >
        <span class="tabular-nums text-muted-foreground"
          >×{formatNumber(material.amount)}</span
        >
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet renderDropCell({
  cell,
  row,
}: {
  cell: Cell<DropRow, unknown>;
  row: Row<DropRow>;
})}
  {@const drop = row.original}
  {#if cell.column.id === "monster_name"}
    <!-- A long name wraps rather than running into the chance column at tablet widths. -->
    <div class="flex items-center gap-1.5 whitespace-normal">
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
      </a>
      <SeasonIcons seasons={drop.seasons} />
    </div>
  {:else if cell.column.id === "level"}
    {@render number(
      drop.monster_level_min === drop.monster_level_max
        ? drop.monster_level_min
        : formatRange(drop.monster_level_min, drop.monster_level_max),
    )}
  {:else if cell.column.id === "zone"}
    {@render zoneList(drop.zones)}
  {:else if cell.column.id === "chance"}
    <span class="ml-auto tabular-nums">
      <DropChance
        chance={dropChance(drop)}
        fatecharmChance={drop.per_kill_chance_with_fatecharm}
        fatecharm={drop.fatecharm}
      />
    </span>
  {/if}
{/snippet}

{#snippet renderAltarDropCell({
  cell,
  row,
}: {
  cell: Cell<AltarDropRow, unknown>;
  row: Row<AltarDropRow>;
})}
  {@const altar = row.original}
  {#if cell.column.id === "altar_name"}
    <a
      href={resolve("/altars/[id]", { id: altar.altar_id })}
      class={styles.link}>{altar.altar_name}</a
    >
  {:else if cell.column.id === "drop_rate"}
    {@render percent(altar.drop_rate)}
  {:else if cell.column.id === "tier"}
    <span class={styles.wrapCell}>
      {altar.reward_tier
        ? formatAltarRewardTier(altar.reward_tier, altar, data.maxLevel)
        : ""}
    </span>
  {:else if cell.column.id === "boss_monster_name"}
    {#if altar.boss_monster_id && altar.boss_monster_name}
      <a
        href={resolve("/monsters/[id]", { id: altar.boss_monster_id })}
        class={styles.link}>{altar.boss_monster_name}</a
      >
    {/if}
  {:else if cell.column.id === "zone_name"}
    {@render zoneLink(altar.zone_id, altar.zone_name)}
  {/if}
{/snippet}

{#snippet renderVendorCell({
  cell,
  row,
}: {
  cell: Cell<VendorRow, unknown>;
  row: Row<VendorRow>;
})}
  {@const vendor = row.original}
  {#if cell.column.id === "npc_name"}
    <a href={resolve("/npcs/[id]", { id: vendor.npc_id })} class={styles.link}
      >{vendor.npc_name}</a
    >
  {:else if cell.column.id === "price"}
    <span class="ml-auto tabular-nums {styles.valueCurrency}">
      {#if vendor.currency_item_id}
        {formatNumber(vendor.price)}
        <a
          href={resolve("/items/[id]", { id: vendor.currency_item_id })}
          class={styles.link}>{vendor.currency_item_name}</a
        >
      {:else}
        {formatNumber(vendor.price)}g
      {/if}
      {#if vendor.amount && vendor.amount > 1}
        <span class="text-muted-foreground"
          >for {formatNumber(vendor.amount)}</span
        >
      {/if}
    </span>
  {:else if cell.column.id === "requirement"}
    {#if vendor.npc_faction && vendor.is_faction_vendor}
      <span class={styles.wrapCell}>
        {vendor.required_reputation_name ?? vendor.required_reputation_tier} with
        {vendor.npc_faction}
      </span>
    {/if}
  {:else if cell.column.id === "zone"}
    {@render zoneList(vendor.zones)}
  {/if}
{/snippet}

{#snippet renderQuestCell({
  cell,
  row,
}: {
  cell: Cell<QuestRow, unknown>;
  row: Row<QuestRow>;
})}
  {@const quest = row.original}
  {#if cell.column.id === "quest_name"}
    <div class="flex items-center gap-1.5">
      <a
        href={resolve("/quests/[id]", { id: quest.quest_id })}
        class={styles.link}>{quest.quest_name}</a
      >
      <!-- Few quests repeat, so a marker beside the name replaces a column of "Once". -->
      {#if quest.is_repeatable}
        <span class="inline-flex shrink-0 p-0.5" title="Repeatable">
          <RefreshCw
            class="h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span class="sr-only">Repeatable</span>
        </span>
      {/if}
      <SeasonIcons seasons={quest.seasons ?? []} />
    </div>
  {:else if cell.column.id === "need"}
    {[QUEST_ITEM_NEEDS[quest.purpose ?? ""] ?? quest.purpose, quest.amount]
      .filter(Boolean)
      .join(" ")}
  {:else if cell.column.id === "level_recommended"}
    {@render number(quest.level_recommended)}
  {:else if cell.column.id === "classes"}
    <span class={styles.wrapCell}>
      {hasSpecificClassRestriction(quest.class_restrictions)
        ? quest.class_restrictions!.map(formatClassName).join(", ")
        : ""}
    </span>
  {/if}
{/snippet}

{#snippet renderTreasureMapCell({
  cell,
  row,
}: {
  cell: Cell<TreasureMapRow, unknown>;
  row: Row<TreasureMapRow>;
})}
  {@const map = row.original}
  {#if cell.column.id === "map_name"}
    <a href={resolve("/items/[id]", { id: map.map_id })} class={styles.link}
      >{map.map_name}</a
    >
  {:else if cell.column.id === "zone_name"}
    {@render zoneLink(map.zone_id, map.zone_name)}
  {/if}
{/snippet}

{#snippet renderGatherCell({
  cell,
  row,
}: {
  cell: Cell<GatherRow, unknown>;
  row: Row<GatherRow>;
})}
  {@const gather = row.original}
  {#if cell.column.id === "gather_item_name"}
    <a
      href={resolve("/gather-items/[id]", { id: gather.gather_item_id })}
      class={styles.link}>{gather.gather_item_name}</a
    >
  {:else if cell.column.id === "rate"}
    <span class="ml-auto max-w-48 whitespace-normal text-right tabular-nums">
      {gather.rate_note ??
        formatPercent(gather.rate, {
          decimals: 1,
          trailingZeros: true,
        })}{gather.is_fishing_spot && !fishingOnly ? " per cast" : ""}
    </span>
  {:else if cell.column.id === "amount"}
    {#if gather.amount_min != null && gather.amount_max != null && gather.amount_max > 0}
      {@render number(
        gather.amount_min === gather.amount_max
          ? gather.amount_max
          : formatRange(gather.amount_min, gather.amount_max),
      )}
    {/if}
  {:else if cell.column.id === "zone"}
    {@render zoneList(gather.zones)}
  {/if}
{/snippet}

{#snippet renderChestCell({
  cell,
  row,
}: {
  cell: Cell<ChestRow, unknown>;
  row: Row<ChestRow>;
})}
  {@const chest = row.original}
  {#if cell.column.id === "zone_name"}
    <a
      href={resolve("/chests/[id]", { id: chest.chest_id })}
      class={styles.link}>{chestName(chest.zone_name)}</a
    >
  {:else if cell.column.id === "rate"}
    {@render percent(chest.rate)}
  {:else if cell.column.id === "key_name"}
    {#if chest.key_id}
      <a href={resolve("/items/[id]", { id: chest.key_id })} class={styles.link}
        >{chest.key_name}</a
      >
    {/if}
  {/if}
{/snippet}

{#snippet renderPackCell({
  cell,
  row,
}: {
  cell: Cell<PackRow, unknown>;
  row: Row<PackRow>;
})}
  {@const pack = row.original}
  {#if cell.column.id === "pack_name"}
    <div class="flex items-center gap-1.5">
      <a href={resolve("/items/[id]", { id: pack.pack_id })} class={styles.link}
        >{pack.pack_name}</a
      >
      <SeasonIcons seasons={pack.seasons} />
    </div>
  {:else if cell.column.id === "amount"}
    {@render number(pack.amount)}
  {/if}
{/snippet}

{#snippet renderRandomLootCell({
  cell,
  row,
}: {
  cell: Cell<RandomLootRow, unknown>;
  row: Row<RandomLootRow>;
})}
  {@const source = row.original}
  {#if cell.column.id === "random_item_name"}
    <a
      href={resolve("/items/[id]", { id: source.random_item_id })}
      class={styles.link}>{source.random_item_name}</a
    >
  {:else if cell.column.id === "probability"}
    {@render percent(source.probability)}
  {/if}
{/snippet}

{#snippet renderRecipeUseCell({
  cell,
  row,
}: {
  cell: Cell<RecipeUseRow, unknown>;
  row: Row<RecipeUseRow>;
})}
  {@const recipe = row.original}
  {#if cell.column.id === "result_item_name"}
    <a
      href={resolve("/items/[id]", { id: recipe.result_item_id })}
      class={styles.link}>{recipe.result_item_name}</a
    >
  {:else if cell.column.id === "amount"}
    {@render number(recipe.amount)}
  {:else if cell.column.id === "recipe"}
    <a
      href={resolve("/recipes/[id]", { id: recipe.recipe_id })}
      class={styles.link}
      >{recipe.recipe_type.charAt(0).toUpperCase() +
        recipe.recipe_type.slice(1)} recipe</a
    >
  {/if}
{/snippet}

{#snippet renderCurrencyCell({
  cell,
  row,
}: {
  cell: Cell<CurrencyRow, unknown>;
  row: Row<CurrencyRow>;
})}
  {@const offer = row.original}
  {#if cell.column.id === "item_name"}
    <div class="flex items-center gap-1.5">
      <a
        href={resolve("/items/[id]", { id: offer.item_id })}
        class={styles.link}>{offer.item_name}</a
      >
      <SeasonIcons seasons={offer.seasons} />
    </div>
  {:else if cell.column.id === "price"}
    {@render number(offer.price === 0 ? "Free" : offer.price)}
  {/if}
{/snippet}

{#snippet renderAltarUseCell({
  cell,
  row,
}: {
  cell: Cell<AltarUseRow, unknown>;
  row: Row<AltarUseRow>;
})}
  {@const altar = row.original}
  {#if cell.column.id === "altar_name"}
    <a
      href={resolve("/altars/[id]", { id: altar.altar_id })}
      class={styles.link}>{altar.altar_name}</a
    >
  {:else if cell.column.id === "zone_name"}
    {@render zoneLink(altar.zone_id, altar.zone_name)}
  {/if}
{/snippet}

{#snippet renderPortalCell({
  cell,
  row,
}: {
  cell: Cell<PortalRow, unknown>;
  row: Row<PortalRow>;
})}
  {@const portal = row.original}
  {#if cell.column.id === "from_zone_name"}
    {@render zoneLink(portal.from_zone_id, portal.from_zone_name)}
  {:else if cell.column.id === "to_zone_name"}
    {@render zoneLink(portal.to_zone_id, portal.to_zone_name)}
  {/if}
{/snippet}

{#snippet renderOpensChestCell({
  cell,
  row,
}: {
  cell: Cell<OpensChestRow, unknown>;
  row: Row<OpensChestRow>;
})}
  {@const chest = row.original}
  {#if cell.column.id === "zone_name"}
    <a
      href={resolve("/chests/[id]", { id: chest.chest_id })}
      class={styles.link}>{chestName(chest.zone_name)}</a
    >
  {:else if cell.column.id === "gold_min"}
    {#if chest.gold_max > 0}
      <span class="ml-auto tabular-nums {styles.valueCurrency}"
        >{chest.gold_min === chest.gold_max
          ? formatNumber(chest.gold_min)
          : formatRange(chest.gold_min, chest.gold_max)}</span
      >
    {/if}
  {:else if cell.column.id === "item_reward_name"}
    {#if chest.item_reward_id}
      <!-- Chest pages show an item reward above one as a range from one, so this row matches them. -->
      <span class={styles.wrapCell}
        ><a
          href={resolve("/items/[id]", { id: chest.item_reward_id })}
          class={styles.link}>{chest.item_reward_name}</a
        ><span class="tabular-nums text-muted-foreground"
          >&nbsp;×{chest.item_reward_amount > 1
            ? formatRange(1, chest.item_reward_amount)
            : 1}</span
        ></span
      >
    {/if}
  {/if}
{/snippet}

{#snippet renderContentCell({
  cell,
  row,
}: {
  cell: Cell<ContentRow, unknown>;
  row: Row<ContentRow>;
})}
  {@const content = row.original}
  {#if cell.column.id === "item_name"}
    <a
      href={resolve("/items/[id]", { id: content.item_id })}
      class={styles.link}>{content.item_name}</a
    >
  {:else if cell.column.id === "value"}
    {@render number(content.label)}
  {/if}
{/snippet}

<!-- Source: server-scripts/RegionalEventActivities.cs:FindCityDishes,IsCookingResult — a dish counts when cooked at an oven in the requesting city, and dishes made from the city's animal meat or from another such dish count. -->
{#snippet cookingRequests(role: "dish" | "meat")}
  {#each data.regionalCooking.filter((request) => request.role === role) as request (request.region_zone_id)}
    <p class="mt-3 text-sm text-muted-foreground">
      {#if role === "dish"}
        Cooking it at an oven in {request.city_name} counts toward the city's
        <a
          href="/mechanics/regional-events#invasion-{request.city}"
          class={styles.link}>regional cooking request</a
        >.
      {:else}
        Dishes made from it count toward {request.city_name}'s
        <a
          href="/mechanics/regional-events#invasion-{request.city}"
          class={styles.link}>regional cooking request</a
        >.
      {/if}
    </p>
  {/each}
{/snippet}

{#snippet fishingAssumptions()}
  {FISHING_RANGE_ASSUMPTIONS}
{/snippet}

{#snippet meatRequests()}
  {@render cookingRequests("meat")}
{/snippet}

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
      <h1 class="text-3xl font-bold">{data.item.name}</h1>
      {#if data.hasMapLocation || data.hasKnownSource}
        <MapLink entityId={data.item.id} entityType="item" />
      {/if}
      {#if !isArmorSetMetadata}
        <span
          class="px-3 py-1 rounded text-sm font-medium text-white {qualityColors[
            data.item.quality
          ]}"
        >
          {QUALITY_NAMES[data.item.quality]}
        </span>
      {/if}
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

  <!--
    The tooltip sits beside the item's facts, and both cards end at the same
    height. The fact list has one fact per row, so it grows with the item as the
    tooltip does. An item without a tooltip shows its facts at full width.
  -->
  {#snippet identityCards()}
    <!-- Fatecharm -->
    {#if data.item.luck_token_role === "fatecharm"}
      <Card.Root class="@container bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Fatecharm</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl class={styles.factList}>
            <div class={styles.fact}>
              <dt class={styles.label}>Zone</dt>
              <dd>{data.item.luck_token_zone_name || "Unknown"}</dd>
            </div>
            {#if data.item.luck_token_fragment_id && data.item.luck_token_fragment_name}
              <div class={styles.fact}>
                <dt class={styles.label}>Created From</dt>
                <dd>
                  <a
                    href="/items/{data.item.luck_token_fragment_id}"
                    class={styles.link}>{data.item.luck_token_fragment_name}</a
                  >
                </dd>
              </div>
            {/if}
            {#if data.item.luck_token_fragments_needed}
              <div class={styles.fact}>
                <dt class={styles.label}>Fragments Needed</dt>
                <dd>{data.item.luck_token_fragments_needed}</dd>
              </div>
            {/if}
          </dl>
        </Card.Content>
      </Card.Root>
    {/if}
    <!-- Fatecharm Fragment -->
    {#if data.item.luck_token_role === "fragment" && data.item.fragment_result_item_id}
      <Card.Root class="@container bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Fatecharm Fragment</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl class={styles.factList}>
            <div class={styles.fact}>
              <dt class={styles.label}>Zone</dt>
              <dd>{data.item.luck_token_zone_name || "Unknown"}</dd>
            </div>
            <div class={styles.fact}>
              <dt class={styles.label}>Creates</dt>
              <dd>
                <a
                  href="/items/{data.item.fragment_result_item_id}"
                  class={styles.link}
                  >{data.item.fragment_result_item_name || "Unknown"}</a
                >
              </dd>
            </div>
            <div class={styles.fact}>
              <dt class={styles.label}>Fragments Needed</dt>
              <dd>{formatNumber(data.item.fragment_amount_needed)}</dd>
            </div>
          </dl>
        </Card.Content>
      </Card.Root>
    {/if}
    <!-- Summoned pet -->
    {#if petSpriteSrc && data.petVisualAsset}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Pet</Card.Title>
        </Card.Header>
        <Card.Content class="flex justify-center">
          <img
            src={petSpriteSrc}
            alt={`Pet summoned by ${data.item.name}`}
            width={data.petVisualAsset.width}
            height={data.petVisualAsset.height}
            class="h-auto w-auto max-h-40 max-w-full object-contain [image-rendering:pixelated]"
          />
        </Card.Content>
      </Card.Root>
    {/if}
    <!-- Armor Set Bonuses (shown on augment items and armor pieces) -->
    {#if data.item.augment_armor_set_name}
      <Card.Root class="bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>
            {#if computed.armorSetId && computed.armorSetId !== data.item.id}
              <a href="/items/{computed.armorSetId}" class={styles.link}>
                {data.item.augment_armor_set_name}
              </a>
            {:else}
              {data.item.augment_armor_set_name}
            {/if}
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <!-- Set Members -->
          {#if computed.armorSetMembers && computed.armorSetMembers.length > 0}
            <div>
              <h3 class="text-sm font-semibold mb-2">
                Set Pieces ({computed.armorSetMembers.length})
              </h3>
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                {#each computed.armorSetMembers as member (member.item_id)}
                  <ItemLink
                    itemId={member.item_id}
                    itemName={member.item_name}
                    quality={member.quality}
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
              <h3 class="text-sm font-semibold mb-2">Set Bonuses (3 pieces)</h3>
              <div class="space-y-2">
                {#each computed.armorSetAttributeBonuses as bonus (bonus.stat_id)}
                  <div
                    class="flex items-center justify-between gap-2 p-2 rounded bg-muted"
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
              <h3 class="text-sm font-semibold mb-2">Set Bonuses (5 pieces)</h3>
              <div class="space-y-2">
                {#each computed.armorSetSkillBonuses as bonus (bonus.skill_id)}
                  <div
                    class="flex items-center justify-between gap-2 p-2 rounded bg-muted"
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
  {/snippet}

  <div
    class={data.item.tooltip_html
      ? "grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
      : undefined}
  >
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
    <!-- The item's own facts: the fact list, then the linked versions of what the tooltip shows about its set and fatecharm zone. -->
    <div class="flex flex-col gap-4">
      <Card.Root class="@container flex-1 bg-muted/30">
        <Card.Header>
          <Card.Title level={2}>Basic Information</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <dl class={styles.factList}>
            <div class={styles.fact}>
              <dt class={styles.label}>Type</dt>
              <dd>{itemTypeLabel}</dd>
            </div>
            {#if data.item.level_required > 1}
              <div class={styles.fact}>
                <dt class={styles.label}>Level Required</dt>
                <dd>{data.item.level_required}</dd>
              </div>
            {/if}
            {#if hasSpecificClassRestriction(computed.classRequired)}
              <div class={styles.fact}>
                <dt class={styles.label}>Class Required</dt>
                <dd>
                  {computed.classRequired.map(formatClassName).join(", ")}
                </dd>
              </div>
            {/if}
            {#if data.item.slot}
              <div class={styles.fact}>
                <dt class={styles.label}>Equipment Slot</dt>
                <dd>{formatEquipmentCategory(data.item.slot)}</dd>
              </div>
            {/if}
            {#if data.item.weapon_proc_effect_id}
              <div class={styles.fact}>
                <!-- Source: server-scripts/WeaponItem.cs:procOnSpellCast; Skills.cs:TrySpellCastWeaponProc — a flagged weapon rolls after damaging spells instead of on hits. -->
                <dt class={styles.label}>
                  {data.item.weapon_proc_on_spell_cast
                    ? "Spell-Cast Effect"
                    : "On-Hit Effect"}
                </dt>
                <dd>
                  <a
                    href="/skills/{data.item.weapon_proc_effect_id}"
                    class={styles.link}
                  >
                    {data.item.weapon_proc_effect_name ||
                      data.item.weapon_proc_effect_id}
                  </a>
                  <span class={styles.label}>
                    ({(data.item.weapon_proc_effect_probability * 100).toFixed(
                      0,
                    )}% chance)
                  </span>
                </dd>
              </div>
            {/if}
            {#if data.item.max_stack > 1}
              <div class={styles.fact}>
                <dt class={styles.label}>Max Stack</dt>
                <dd>{formatNumber(data.item.max_stack)}</dd>
              </div>
            {/if}
            {#if data.item.backpack_slots > 0}
              <div class={styles.fact}>
                <dt class={styles.label}>Backpack Slots</dt>
                <dd>{data.item.backpack_slots}</dd>
              </div>
            {/if}
            {#if isBackpack && data.item.backpack_is_unique}
              <div class={styles.fact}>
                <!-- Source: server-scripts/BackpackItem.cs:7, server-scripts/PlayerInventory.cs:641-655 (IsUniqueBackpackAlreadyEquipped) — only one copy of a Unique backpack can be equipped -->
                <dt class={styles.label}>Unique</dt>
                <dd>Yes</dd>
              </div>
            {/if}
            {#if computed.maxDurability && !isAugment}
              <div class={styles.fact}>
                <dt class={styles.label}>Max Durability</dt>
                <dd>{formatNumber(computed.maxDurability)}</dd>
              </div>
            {/if}
            {#if data.item.mount_speed > 0}
              <div class={styles.fact}>
                <dt class={styles.label}>Mount Speed</dt>
                <dd>{formatNumber(data.item.mount_speed, { decimals: 20 })}</dd>
              </div>
            {/if}
            {#if data.item.food_type}
              <div class={styles.fact}>
                <dt class={styles.label}>Food Type</dt>
                <dd>{data.item.food_type}</dd>
              </div>
            {/if}
            {#if computed.hasSerenity}
              <div class={styles.fact}>
                <dt class={styles.label}>Special Effect</dt>
                <dd>
                  <a href="/skills/serenity" class={styles.link}>Serenity</a>
                </dd>
              </div>
            {/if}
            {#if data.item.buy_price > 0 && computed.soldBy && computed.soldBy.length > 0}
              <div class={styles.fact}>
                <dt class={styles.label}>Buy Price</dt>
                <dd class={styles.valueCurrency}>
                  {#if computed.soldBy[0].currency_item_id}
                    {formatNumber(data.item.buy_price)}
                    <a
                      href={resolve("/items/[id]", {
                        id: computed.soldBy[0].currency_item_id,
                      })}
                      class={styles.link}
                    >
                      {computed.soldBy[0].currency_item_name}
                    </a>
                  {:else}
                    {formatNumber(data.item.buy_price)}g
                  {/if}
                </dd>
              </div>
            {/if}
            {#if data.item.sell_price > 0 && data.item.sellable}
              <div class={styles.fact}>
                <dt class={styles.label}>Sell Price</dt>
                <dd class={styles.valueCurrency}>
                  {formatNumber(data.item.sell_price)}g
                </dd>
              </div>
            {/if}
            {#if data.item.primal_essence_value}
              <!-- Like Sell Price: what a Primal Essence trader gives for the item. -->
              <div class={styles.fact}>
                <dt class={styles.label}>Essence Value</dt>
                <dd>
                  <a href="/items/primal_essence" class={styles.link}
                    >{formatNumber(data.item.primal_essence_value)} Primal Essence</a
                  >
                </dd>
              </div>
            {/if}
            {#if data.item.item_type !== "augment"}
              <div class={styles.fact}>
                <dt class={styles.label}>Tradable</dt>
                <dd>{data.item.tradable ? "Yes" : "No"}</dd>
              </div>
            {/if}
          </dl>
          {#if unlistedStats.length > 0 || unlistedAttackDelay}
            <div class="space-y-1">
              <!-- A description can state a stat in words or with a number, but only stat lines are a stat list. -->
              <h3 class="text-sm font-semibold">
                Not in the tooltip's stat lines
              </h3>
              <dl class={styles.factList}>
                {#if unlistedAttackDelay}
                  <div class={styles.fact}>
                    <dt class={styles.label}>Attack Delay</dt>
                    <dd>{data.item.weapon_delay}</dd>
                  </div>
                {/if}
                {#each unlistedStats as { field, value } (field.field)}
                  <div class={styles.fact}>
                    <dt class={styles.label}>{statFieldName(field, "item")}</dt>
                    <dd>{formatStatField(field, value, { signed: true })}</dd>
                  </div>
                {/each}
              </dl>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
      {@render identityCards()}
    </div>
  </div>

  <!-- What the item does -->
  <!-- Use Effects -->
  {#if data.item.usage_health > 0 || data.item.usage_mana > 0 || data.item.usage_energy > 0 || data.item.potion_buff_id || data.item.food_buff_id || data.item.relic_buff_id || data.item.scroll_skill_id}
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Use Effects</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          {#if data.item.usage_health > 0}
            <div class={styles.fact}>
              <dt class={styles.label}>
                Restores {statName("health", "item")}
              </dt>
              <dd class={styles.valuePositive}>
                +{formatNumber(data.item.usage_health)} HP
              </dd>
            </div>
          {/if}
          {#if data.item.usage_mana > 0}
            <div class={styles.fact}>
              <dt class={styles.label}>
                Restores {statName("mana", "item")}
              </dt>
              <dd class="text-blue-600 dark:text-blue-400">
                +{formatNumber(data.item.usage_mana)} MP
              </dd>
            </div>
          {/if}
          {#if data.item.usage_energy > 0}
            <div class={styles.fact}>
              <dt class={styles.label}>
                Restores {statName("rage", "item")}
              </dt>
              <dd class={styles.valueCurrency}>
                +{formatNumber(data.item.usage_energy)}
                {statName("rage", "item")}
              </dd>
            </div>
          {/if}
          {#each [[data.item.potion_buff_id, data.item.potion_buff_name], [data.item.food_buff_id, data.item.food_buff_name]] as [buffId, buffName], index (index)}
            {#if buffId && buffName}
              <div class={styles.fact}>
                <dt class={styles.label}>Grants Buff</dt>
                <dd>
                  <a href="/skills/{buffId}" class={styles.link}>{buffName}</a>
                  {#if data.consumableBuffEffect}
                    <div class="text-sm">{data.consumableBuffEffect}</div>
                  {/if}
                </dd>
              </div>
            {/if}
          {/each}
          {#if data.item.relic_buff_id}
            <div class={styles.fact}>
              <dt class={styles.label}>Activates</dt>
              <dd>
                <a href="/skills/{data.item.relic_buff_id}" class={styles.link}
                  >{data.item.relic_buff_name ||
                    data.item.relic_buff_id.replace(/_/g, " ")}</a
                >
              </dd>
            </div>
          {/if}
          {#if data.item.scroll_skill_id && data.item.scroll_skill_name}
            <div class={styles.fact}>
              <dt class={styles.label}>Casts</dt>
              <dd>
                <a
                  href="/skills/{data.item.scroll_skill_id}"
                  class={styles.link}>{data.item.scroll_skill_name}</a
                >
              </dd>
            </div>
          {/if}
          <div class={styles.fact}>
            <dt class={styles.label}>Consumed on Use</dt>
            <dd>{data.item.infinite_charges ? "No" : "Yes"}</dd>
          </div>
          {#if data.item.cooldown > 0}
            <div class={styles.fact}>
              <dt class={styles.label}>Recharge Time</dt>
              <dd>{data.item.cooldown}s</dd>
            </div>
          {/if}
        </dl>
        <!-- Source: server-scripts/FoodItem.cs:Use; server-scripts/PassiveSkill.cs:GetFoodAndDrinkBuffDurationBonus — Tavern Spirit lengthens food and drink buffs. -->
        {#if data.foodBuffUsesTavernSpirit}
          <p class="mt-4 text-sm text-muted-foreground">
            <a href="/skills/tavern_spirit" class={styles.link}>Tavern Spirit</a
            >
            lengthens food and drink buffs.
          </p>
          <!-- Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — learned Elixir Endurance sets a potion buff's rank to 1 + its own rank, except for bandages. -->
        {:else if data.item.potion_buff_id && data.item.cooldown_category !== "Bandages"}
          <p class="mt-4 text-sm text-muted-foreground">
            <a href="/skills/elixir_endurance" class={styles.link}
              >Elixir Endurance</a
            > raises this buff's rank to one more than its own rank.
          </p>
        {/if}
        {#if data.blockedDuringSeasons}
          <p class="mt-2 text-sm text-muted-foreground">
            Cannot be used during <a
              href="/mechanics/seasonal-events#double-xp"
              class={styles.link}>Halloween or the Winter Festival</a
            >, when everyone already has Double XP.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Book Effects (Permanent Stat Gains) -->
  {#if data.item.book_strength_gain > 0 || data.item.book_dexterity_gain > 0 || data.item.book_constitution_gain > 0 || data.item.book_intelligence_gain > 0 || data.item.book_wisdom_gain > 0 || data.item.book_charisma_gain > 0}
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Permanent Stat Gains</Card.Title>
        <Card.Description
          >Reading this book permanently increases the attributes listed below.</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          {#each [["Strength", data.item.book_strength_gain], ["Dexterity", data.item.book_dexterity_gain], ["Constitution", data.item.book_constitution_gain], ["Intelligence", data.item.book_intelligence_gain], ["Wisdom", data.item.book_wisdom_gain], ["Charisma", data.item.book_charisma_gain]] as const as [attribute, gain] (attribute)}
            {#if gain > 0}
              <div class={styles.fact}>
                <dt class={styles.label}>{attribute}</dt>
                <dd class={styles.valuePositive}>+{gain}</dd>
              </div>
            {/if}
          {/each}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if specialMechanics[0]}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Special Use</Card.Title>
      </Card.Header>
      <Card.Content class="text-sm">
        <SpecialMechanicText parts={specialMechanics[0].summary} />
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
  <!-- Treasure Map Location -->
  {#if data.item.item_type === "treasure_map" && data.treasureLocation}
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Treasure Location</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Dig Location</dt>
            <dd
              class="flex flex-wrap items-baseline justify-end gap-x-2 @2xl:justify-start"
            >
              <a
                href="/zones/{data.treasureLocation.zone_id}"
                class={styles.link}>{data.treasureLocation.zone_name}</a
              >
              <MapLink
                entityId={data.treasureLocation.location_id}
                entityType="treasure"
                compact
                name="the dig site"
              />
            </dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Required Tool</dt>
            <dd><a href="/items/shovel" class={styles.link}>Shovel</a></dd>
          </div>
          {#if data.treasureLocation.reward_id}
            <div class={styles.fact}>
              <dt class={styles.label}>Reward</dt>
              <dd>
                <a
                  href="/items/{data.treasureLocation.reward_id}"
                  class={styles.link}
                  >{data.treasureLocation.reward_name ||
                    data.treasureLocation.reward_id}</a
                >
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.id === "radiant_aether"}
    <!-- Radiant Aether Effects -->
    <!-- Source: server-scripts/Player.cs:HasRadiantAether -->
    <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
    <!-- Source: server-scripts/ScriptableSkill.cs:TryActivateRadiantAetherForArea -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Passive Effects</Card.Title>
        <Card.Description>
          Works only while it is in your main inventory, not in a backpack. Each
          activation uses one.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.proseFact}>
            <dt class={styles.label}>Your Ability Lands a Critical Hit</dt>
            <dd>
              15% chance that the hit deals
              <span class={styles.valuePositive}>×3 critical damage</span>
              instead of ×1.5, before the target's Critical Resist.
              <p class="mt-1 text-sm italic text-muted-foreground">
                "Radiant Aether surges - your strike rends the heavens!"
              </p>
            </dd>
          </div>
          <div class={styles.proseFact}>
            <dt class={styles.label}>A Hit Would Kill You</dt>
            <dd>
              15% chance to
              <span class={styles.valuePositive}>restore all HP</span> instead
              of dying.
              <p class="mt-1 text-sm italic text-muted-foreground">
                "Radiant Aether flares within you - you rise anew!"
              </p>
            </dd>
          </div>
          <div class={styles.proseFact}>
            <dt class={styles.label}>An Enemy Area Skill Targets You</dt>
            <dd>
              15% chance to
              <span class={styles.valuePositive}
                >cancel the skill for everyone it targets</span
              >. When several targets carry Radiant Aether, each has a smaller
              chance: 10% with two, 8.3% with three, 6.25% with four.
              <p class="mt-1 text-sm italic text-muted-foreground">
                "Radiant Aether flares brightly - your party withstand [skill
                name]!"
              </p>
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.id === "lockpicks"}
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
  {/if}
  {#if isAugment && !isArmorSetMetadata && data.augmenters.length > 0}
    <!-- Socketable Augment Usage -->
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>How to Use</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          <div>
            <div class={styles.label}>Socketing</div>
            <div class={styles.value}>
              Place the augment and an armor or weapon in a crafting station,
              then craft. Crafting uses the augment and permanently adds its
              stats to the equipment. If you have multiple copies of the
              equipment, crafting uses the first copy without an augment.
            </div>
          </div>
          <div>
            <div class={styles.label}>Removing</div>
            <!-- Source: server-scripts/UINpcTrading.cs:168-173,253-257 — quality 2 (magic) = 10,000g, quality 3 (epic) = 15,000g, else 5,000g -->
            <div class={styles.value}>
              Visit an Augmenter to remove a socketed augment. Removal costs {formatNumber(
                5000,
              )}g for a common augment, {formatNumber(10000)}g for a magic
              augment, or {formatNumber(15000)}g for an epic augment. The
              Augmenter returns it to your inventory.
            </div>
          </div>
          <div>
            <div class={styles.label}>Augmenter NPCs</div>
            <div class={styles.value}>
              {@render entityLinks(
                data.augmenters.map((augmenter) => ({
                  href: `/npcs/${augmenter.id}`,
                  name: augmenter.name,
                })),
              )}
            </div>
          </div>
          <p class={styles.label}>
            See <a href="/mechanics/crafting#augments" class={styles.link}
              >augment rules</a
            > for which equipment accepts an augment.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.recipe_potion_learned_id && data.item.recipe_potion_learned_name && data.taughtRecipes.length === 1 && data.taughtRecipes[0].materials.every((material) => material.item_id)}
    <!-- Teaches Recipe -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Teaches Recipe</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Potion</dt>
            <dd>
              <a
                href="/items/{data.item.recipe_potion_learned_id}"
                class={styles.link}>{data.item.recipe_potion_learned_name}</a
              >
            </dd>
          </div>
          {#if data.item.alchemy_recipe_level_required != null}
            <div class={styles.fact}>
              <dt class={styles.label}>Recipe Tier</dt>
              <dd>{formatTier(data.taughtRecipes[0].tier)}</dd>
            </div>
          {/if}
          {#if data.recipeMaterials[data.item.recipe_potion_learned_id]?.length}
            <div class={styles.fact}>
              <dt class={styles.label}>Materials</dt>
              <dd>
                {@render materialList(
                  data.recipeMaterials[data.item.recipe_potion_learned_id],
                )}
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Pack Contents -->
  {#if packContentRows.length > 0}
    <RelationTable
      title="Pack Contents"
      rows={packContentRows}
      columns={contentColumns("Amount")}
      cell={renderContentCell}
      urlKey="item-{data.item.id}-contents"
      rightAligned={["value"]}
    />
  {/if}
  <!-- Possible Items (for simple random items, not chest-type items) -->
  {#if possibleItemRows.length > 0 && computed.chestRewards.length === 0}
    <RelationTable
      title="Possible Items"
      rows={possibleItemRows}
      columns={contentColumns("Chance")}
      cell={renderContentCell}
      urlKey="item-{data.item.id}-outcomes"
      initialSorting={[{ id: "value", desc: true }]}
      rightAligned={["value"]}
    />
  {/if}
  <!-- Chest Rewards -->
  {#if chestRewardRows.length > 0}
    <RelationTable
      title="Chest Rewards"
      rows={chestRewardRows}
      columns={contentColumns("Chance")}
      cell={renderContentCell}
      urlKey="item-{data.item.id}-rewards"
      initialSorting={[{ id: "value", desc: true }]}
      rightAligned={["value"]}
    >
      {#snippet description()}
        {#if hasFixedChestContents}
          Each opening gives {formatNumber(
            Math.min(data.item.chest_num_items, chestRewardRows.length),
          )} fixed {data.item.chest_num_items === 1 ? "item" : "items"}.
        {:else}
          Each opening gives up to {formatNumber(data.item.chest_num_items)}
          {data.item.chest_num_items === 1 ? "item" : "items"}. An item cannot
          appear twice in one opening.
        {/if}
      {/snippet}
    </RelationTable>
  {/if}
  {#if hasMechanicsNotes}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Mechanics</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-2 text-sm">
        {#if isBackpack}
          <div class="space-y-2 text-muted-foreground">
            <p>
              Equipping a backpack expands your carry inventory. See
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
              House chest use requires owning a house. See
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
        {#if showsAugmentNote}
          <p class="text-muted-foreground">
            Augments attach to equipment at a Craft Station. See
            <a href="/mechanics/crafting#augments" class={styles.link}>
              augment rules
            </a>
            for compatibility and removal.
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
            See
            <a href="/mechanics/world#binding-and-travel" class={styles.link}>
              binding and travel rules
            </a>
            for bind points and where travel items cannot be used.
          </p>
        {/if}
        {#if isPet}
          <div class="space-y-2 text-muted-foreground">
            <!-- Source: server-scripts/Player.cs:4254-4284 — using the item summons the pet, or dismisses the one it already summoned. -->
            <p>
              Use the whistle to summon the pet. Using it again dismisses that
              pet. Three pets can follow you at once.
            </p>
            <!-- Source: server-scripts/FriendlyPetFollowerItem.cs:16-23,58-80 — name rules and the default name. -->
            <p>
              Right-click the whistle in your inventory to name the pet. A name
              holds up to 20 characters and accepts letters, spaces,
              apostrophes, and hyphens. Without a name the pet is called
              "&lt;your character&gt;'s pet".
            </p>
            <!-- Source: server-scripts/PetFriendly.cs:389-396 — the follower teleports to its owner past 24 units. -->
            <!-- Source: server-scripts/PetFriendly.cs:379-386,433-454 — a follower without its inventory whistle is removed. -->
            <p>
              The pet follows you and catches up when it falls far behind. It
              leaves if its whistle is not in your inventory. It is cosmetic and
              takes no part in combat. See
              <a href="/summons#how-summons-work" class={styles.link}>
                friendly follower rules
              </a>
              for how pets compare with other followers.
            </p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Where to get it -->
  {#if !data.hasKnownSource && !isArmorSetMetadata}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Sources</Card.Title>
      </Card.Header>
      <Card.Content>
        <ItemSourceLinks
          groups={[]}
          itemId={data.item.id}
          emptyLabel="No known source"
        />
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Dropped By -->
  {#if computed.droppedBy.length > 0}
    <RelationTable
      title="Dropped by"
      mapTarget={(drop) =>
        mapTarget("monster")(drop.monster_id, drop.monster_name)}
      rows={computed.droppedBy}
      columns={dropColumns}
      cell={renderDropCell}
      urlKey="item-{data.item.id}-drops"
      initialSorting={[{ id: "chance", desc: true }]}
      rightAligned={["chance", "level"]}
    />
  {/if}
  <!-- Dropped by Altar Boss -->
  {#if computed.rewardedByAltars.length > 0}
    <RelationTable
      title="Dropped by Altar Boss"
      mapTarget={(altar) =>
        mapTarget("altar")(altar.altar_id, altar.altar_name)}
      rows={computed.rewardedByAltars}
      columns={altarDropColumns}
      cell={renderAltarDropCell}
      urlKey="item-{data.item.id}-altar-drops"
      initialSorting={[{ id: "drop_rate", desc: true }]}
      rightAligned={["drop_rate"]}
    />
  {/if}
  <!-- Sold By -->
  {#if computed.soldBy.length > 0}
    <RelationTable
      title="Sold by"
      mapTarget={(vendor) => mapTarget("npc")(vendor.npc_id, vendor.npc_name)}
      rows={computed.soldBy}
      columns={vendorColumns}
      cell={renderVendorCell}
      urlKey="item-{data.item.id}-vendors"
      rightAligned={["price"]}
    />
  {/if}
  <!-- Seasonal Shop -->
  {#if data.sources.seasonal.length > 0}
    <!-- Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor — repair merchants add the seasonal items to their stock while the season runs. -->
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Seasonal Shop</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-3">
        <!--
              Two columns keep every price at the right edge from sm up. On
              narrow phones every row stacks its price under its season, so no
              row wraps differently from another.
            -->
        <div
          class="grid grid-cols-1 gap-y-3 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-x-4 sm:gap-y-2"
        >
          {#each data.sources.seasonal as offer (`${offer.season}_${offer.currency_item_id}_${offer.price}`)}
            <SeasonLabel season={offer.season} variant="inline" />
            <span class="-mt-2 sm:mt-0 sm:text-right {styles.valueCurrency}">
              {#if offer.currency_item_id}
                {formatNumber(offer.price)}
                <a
                  href={resolve("/items/[id]", {
                    id: offer.currency_item_id,
                  })}
                  class={styles.link}
                >
                  {offer.currency_item_name}
                </a>
              {:else}
                {formatNumber(offer.price)}g
              {/if}
              {#if offer.amount > 1}
                ({formatNumber(offer.amount)}×)
              {/if}
            </span>
          {/each}
        </div>
        <p class={styles.label}>
          Every <a
            href="/npcs?npcs.role_keys=can_repair_equipment"
            class={styles.link}>repair merchant</a
          > sells it while the event runs.
        </p>
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Rewarded by Quests -->
  {#if computed.rewardedBy.length > 0}
    <RelationTable
      title="Rewarded by Quests"
      mapTarget={(quest) =>
        mapTarget("quest")(quest.quest_id, quest.quest_name)}
      rows={computed.rewardedBy as QuestRow[]}
      columns={questColumns(computed.rewardedBy as QuestRow[], false)}
      cell={renderQuestCell}
      urlKey="item-{data.item.id}-quest-rewards"
      initialSorting={[{ id: "level_recommended", desc: false }]}
      rightAligned={["level_recommended"]}
    />
  {/if}
  <!-- Provided by Quests -->
  {#if computed.providedByQuests.length > 0}
    <RelationTable
      title="Provided by Quests"
      mapTarget={(quest) =>
        mapTarget("quest")(quest.quest_id, quest.quest_name)}
      rows={computed.providedByQuests as QuestRow[]}
      columns={questColumns(computed.providedByQuests as QuestRow[], false)}
      cell={renderQuestCell}
      urlKey="item-{data.item.id}-quest-provided"
      initialSorting={[{ id: "level_recommended", desc: false }]}
      rightAligned={["level_recommended"]}
    />
  {/if}
  <!-- Rewarded by Treasure Maps -->
  {#if computed.rewardedByTreasureMaps.length > 0}
    <RelationTable
      title="Rewarded by Treasure Maps"
      rows={computed.rewardedByTreasureMaps}
      columns={treasureMapColumns}
      cell={renderTreasureMapCell}
      urlKey="item-{data.item.id}-treasure-maps"
    />
  {/if}
  <!-- Crafted From (exclude alchemy items which have their own "Crafted by" section) -->
  {#if computed.craftedFrom && computed.craftedFrom.length > 0 && !data.item.taught_by_recipe_id}
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Crafted from Recipe</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Materials</dt>
            <dd>{@render materialList(computed.craftedFrom[0].materials)}</dd>
          </div>
        </dl>
        <a
          href={resolve("/recipes/[id]", {
            id: computed.craftedFrom[0].recipe_id,
          })}
          class="mt-4 inline-block text-sm {styles.link}">View the recipe</a
        >
        {@render cookingRequests("dish")}
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.taught_by_recipe_id && data.item.taught_by_recipe_name && computed.craftedFrom.length > 0}
    <!-- Crafted by -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Crafted by</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Recipe</dt>
            <dd>
              <a
                href="/items/{data.item.taught_by_recipe_id}"
                class={styles.link}>{data.item.taught_by_recipe_name}</a
              >
            </dd>
          </div>
          {#if data.item.alchemy_recipe_level_required != null}
            <div class={styles.fact}>
              <dt class={styles.label}>Recipe Tier</dt>
              <dd>
                {formatTier(
                  computed.craftedFrom[0]?.tier ??
                    data.item.alchemy_recipe_level_required,
                )}
              </dd>
            </div>
          {/if}
          {#if computed.craftedFrom[0].materials.length > 0}
            <div class={styles.fact}>
              <dt class={styles.label}>Materials</dt>
              <dd>{@render materialList(computed.craftedFrom[0].materials)}</dd>
            </div>
          {/if}
        </dl>
        <a
          href={resolve("/recipes/[id]", {
            id: computed.craftedFrom[0].recipe_id,
          })}
          class="mt-4 inline-block text-sm {styles.link}">View the recipe</a
        >
      </Card.Content>
    </Card.Root>
  {/if}
  {#if computed.createdFromMerge && computed.createdFromMerge.length > 0}
    <!-- Created From (shown when no stats and not a merge item) -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Created from</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Components</dt>
            <dd>
              {@render entityLinks(
                computed.createdFromMerge.map((part) => ({
                  href: `/items/${part.item_id}`,
                  name: part.item_name,
                })),
              )}
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.id === "primal_essence" && data.essenceTraders.length > 0}
    <!-- Primal Essence Acquisition -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>How to Acquire</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Trade Equipment To</dt>
            <dd>
              {@render entityLinks(
                data.essenceTraders.map((trader) => ({
                  href: `/npcs/${trader.id}`,
                  name: trader.name,
                })),
              )}
            </dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Accepts</dt>
            <dd>Equipment of Magic quality or higher</dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Amount Received</dt>
            <!-- Source: server-scripts/Utils.cs:getPrimalEssenceAmount — ceil(sellPrice * 0.06f), rounded up to a whole essence -->
            <dd>6% of sell price, rounded up</dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.id === "blessed_rune" && data.priestesses.length > 0}
    <!-- Blessed Rune Origin -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Acquisition</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Created From</dt>
            <dd>
              <a href="/items/cursed_rune" class={styles.link}>Cursed Rune</a>
            </dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Blessing Cost</dt>
            <dd class={styles.valueCurrency}>{formatNumber(75)}g per rune</dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Blessed By</dt>
            <dd>
              {@render entityLinks(
                data.priestesses.map((priestess) => ({
                  href: `/npcs/${priestess.id}`,
                  name: priestess.name,
                })),
              )}
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Gathered From -->
  {#if computed.gatheredFrom.length > 0}
    <RelationTable
      title="Gathered from"
      mapTarget={(gather) =>
        mapTarget("resource")(
          gather.gather_item_id,
          gather.zones.length === 1
            ? `${gather.gather_item_name} in ${gather.zones[0].zone_name}`
            : gather.gather_item_name,
        )}
      rows={computed.gatheredFrom}
      columns={gatherColumns}
      cell={renderGatherCell}
      urlKey="item-{data.item.id}-gathers"
      initialSorting={[{ id: "rate", desc: true }]}
      rightAligned={["rate", "amount"]}
      description={computed.gatheredFrom.some((g) => g.is_fishing_spot)
        ? fishingAssumptions
        : undefined}
    />
  {/if}
  <!-- Found in Chests -->
  {#if computed.foundInChests.length > 0}
    <RelationTable
      title="Found in Chests"
      mapTarget={(chest) =>
        mapTarget("chest")(chest.chest_id, chestName(chest.zone_name))}
      rows={computed.foundInChests}
      columns={chestColumns}
      cell={renderChestCell}
      urlKey="item-{data.item.id}-chests"
      initialSorting={[{ id: "rate", desc: true }]}
      rightAligned={["rate"]}
    />
  {/if}
  {#if computed.foundInPacks.length > 0}
    <RelationTable
      title="Found in Packs"
      rows={computed.foundInPacks}
      columns={packColumns}
      cell={renderPackCell}
      urlKey="item-{data.item.id}-packs"
      rightAligned={["amount"]}
    />
  {/if}
  <!-- Found in Random Loot -->
  {#if computed.foundInRandomLoot.length > 0}
    <RelationTable
      title="Found in Random Loot"
      rows={computed.foundInRandomLoot}
      columns={randomLootColumns}
      cell={renderRandomLootCell}
      urlKey="item-{data.item.id}-random-loot"
      initialSorting={[{ id: "probability", desc: true }]}
      rightAligned={["probability"]}
    />
  {/if}

  <!-- What it is for -->
  <!-- Used in Recipes -->
  {#if computed.usedInRecipes.length > 0}
    <RelationTable
      title="Used in Recipes"
      rows={computed.usedInRecipes}
      columns={recipeUseColumns}
      cell={renderRecipeUseCell}
      urlKey="item-{data.item.id}-recipes"
      initialSorting={[{ id: "result_item_name", desc: false }]}
      rightAligned={["amount"]}
      description={data.regionalCooking.some((r) => r.role === "meat")
        ? meatRequests
        : undefined}
    />
  {/if}
  {#if data.usages.merges.length > 0 && data.usages.merges[0].all_components.every((component) => component.item_id)}
    <!-- Combine To Create -->
    {@const mergeTarget = data.usages.merges[0]}
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Combine to Create</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Components</dt>
            <dd>
              {@render entityLinks(
                mergeTarget.all_components.map((part) => ({
                  href: `/items/${part.item_id}`,
                  name: part.item_name,
                })),
              )}
            </dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Creates</dt>
            <dd>
              <a href="/items/{mergeTarget.result_item_id}" class={styles.link}
                >{mergeTarget.result_item_name}</a
              >
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Required for Quests -->
  {#if computed.neededForQuests.length > 0}
    <RelationTable
      title="Required for Quests"
      mapTarget={(quest) =>
        mapTarget("quest")(quest.quest_id, quest.quest_name)}
      rows={computed.neededForQuests as QuestRow[]}
      columns={questColumns(computed.neededForQuests as QuestRow[], true)}
      cell={renderQuestCell}
      urlKey="item-{data.item.id}-quest-needs"
      initialSorting={[{ id: "level_recommended", desc: false }]}
      rightAligned={["level_recommended"]}
    />
  {/if}
  <!-- Currency For -->
  {#if computed.usedAsCurrencyFor.length > 0}
    <RelationTable
      title="Currency for"
      rows={computed.usedAsCurrencyFor}
      columns={currencyColumns}
      cell={renderCurrencyCell}
      urlKey="item-{data.item.id}-currency"
      rightAligned={["price"]}
    />
  {/if}
  {#if data.item.id === "token_of_redemption" && data.veteranMasters.length > 0}
    <!-- Token of Redemption Usage -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Usage</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Purpose</dt>
            <dd>Resets veteran skill points</dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Cost</dt>
            <!-- Source: server-scripts/Utils.cs:priceResetVeteranSkills (priceResetVeteranSkills = 10000), Npc.cs:1830-1837 -->
            <dd>{formatNumber(10000)}g + Token of Redemption</dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Available From</dt>
            <dd>
              {@render entityLinks(
                data.veteranMasters.map((master) => ({
                  href: `/npcs/${master.id}`,
                  name: master.name,
                })),
              )}
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  {#if data.item.id === "cursed_rune" && data.priestesses.length > 0}
    <!-- Cursed Rune Blessing -->
    <Card.Root class="@container bg-muted/30">
      <Card.Header>
        <Card.Title level={2}>Blessing</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class={styles.factList}>
          <div class={styles.fact}>
            <dt class={styles.label}>Converts To</dt>
            <dd>
              <a href="/items/blessed_rune" class={styles.link}>Blessed Rune</a>
            </dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Cost</dt>
            <dd class={styles.valueCurrency}>{formatNumber(75)}g per rune</dd>
          </div>
          <div class={styles.fact}>
            <dt class={styles.label}>Available From</dt>
            <dd>
              {@render entityLinks(
                data.priestesses.map((priestess) => ({
                  href: `/npcs/${priestess.id}`,
                  name: priestess.name,
                })),
              )}
            </dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}
  <!-- Required to Activate Altars -->
  {#if computed.requiredForAltars.length > 0}
    <RelationTable
      title="Required to Activate Altars"
      mapTarget={(altar) =>
        mapTarget("altar")(altar.altar_id, altar.altar_name)}
      rows={computed.requiredForAltars}
      columns={altarUseColumns}
      cell={renderAltarUseCell}
      urlKey="item-{data.item.id}-altars"
    />
  {/if}
  <!-- Required for Portals -->
  {#if computed.requiredForPortals.length > 0}
    <RelationTable
      title="Required for Portals"
      mapTarget={(portal) =>
        mapTarget("portal")(
          portal.portal_id,
          `Portal in ${portal.from_zone_name}`,
        )}
      rows={computed.requiredForPortals}
      columns={portalColumns}
      cell={renderPortalCell}
      urlKey="item-{data.item.id}-portals"
    />
  {/if}
  <!-- Opens Chests -->
  {#if computed.opensChests.length > 0}
    <RelationTable
      title="Opens Chests"
      mapTarget={(chest) =>
        mapTarget("chest")(chest.chest_id, chestName(chest.zone_name))}
      rows={computed.opensChests}
      columns={opensChestColumns}
      cell={renderOpensChestCell}
      urlKey="item-{data.item.id}-opens-chests"
      initialSorting={[{ id: "gold_min", desc: true }]}
      rightAligned={["gold_min"]}
    />
  {/if}
</div>
