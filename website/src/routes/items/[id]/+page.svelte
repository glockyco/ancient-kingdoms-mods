<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { base } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import UseList from "$lib/components/acquisition/UseList.svelte";
  import Inspection from "$lib/components/acquisition/Inspection.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import {
    additionalInspection,
    itemPresentationRequirements,
  } from "$lib/components/acquisition/display";
  import Seo from "$lib/components/Seo.svelte";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import SpecialMechanicText from "$lib/components/SpecialMechanicText.svelte";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";
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
  import type { StatId } from "$lib/generated/stat-vocabulary";
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
  const inspection = $derived(additionalInspection(data.sources, data.usages));
  const additionalRequirements = $derived(
    itemPresentationRequirements(
      data.itemRequirements,
      data.item.level_required,
    ),
  );

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
    };
  });

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
      data.item.id === "primal_essence" ||
      data.item.id === "radiant_aether" ||
      (isAugment && !isArmorSetMetadata && data.augmenters.length > 0) ||
      data.sources.inspection.fixedContents.length > 0,
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
      {#if data.sources.inspection.fixedContents.length > 0}
        <Card.Root class="bg-muted/30">
          <Card.Header
            ><Card.Title level={2}>Pack contents</Card.Title></Card.Header
          >
          <Card.Content
            ><Inspection
              inspection={{
                ...data.sources.inspection,
                offeredAssets: [],
                initiatingMemberships: [],
                randomOutcomes: [],
                portableChestOutcomes: [],
              }}
              items={data.acquisitionItems}
            /></Card.Content
          >
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
      {/if}
      {#if data.item.id === "token_of_redemption" && data.veteranMasters.length > 0}
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
              > veteran skill can open locked chests without their keys. After the
              chest's outer success roll, a matching carried key is consumed first.
              Without that key, one lockpick is consumed for a 20% opening roll. An
              outer failure consumes neither.
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
                  Place the augment and a compatible piece of equipment in a
                  crafting station, then craft. Crafting uses the augment and
                  permanently adds its stats to the equipment. If you have
                  multiple copies of the equipment, crafting uses the first copy
                  without an augment.
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
      {:else if data.taughtRecipeId}
        <Card.Root class="bg-muted/30">
          <Card.Header
            ><Card.Title level={2}>Teaches recipe</Card.Title></Card.Header
          >
          <Card.Content class="space-y-3">
            <ItemLink
              itemId={data.item.recipe_potion_learned_id!}
              itemName={data.item.recipe_potion_learned_name ??
                data.item.recipe_potion_learned_id!}
            />
            <a href="/recipes/{data.taughtRecipeId}" class={styles.link}
              >View all recipe variants, tiers and materials</a
            >
          </Card.Content>
        </Card.Root>
      {:else if data.recipeTeachers.length}
        <Card.Root class="bg-muted/30">
          <Card.Header
            ><Card.Title level={2}>Recipe learned from</Card.Title></Card.Header
          >
          <Card.Content class="space-y-2">
            {#each data.recipeTeachers as teacher (teacher.id)}<ItemLink
                itemId={teacher.id}
                itemName={teacher.name}
                imageAvailable={teacher.icon_path}
              />{/each}
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

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

    {#if data.sources.methods.length || !inspection.offeredAssets.some((method) => method.rooted)}
      <section class="space-y-3 md:col-span-2">
        <h2 class="text-xl font-semibold">Sources</h2>
        {#if data.sources.methods.length}
          <MethodList
            methods={data.sources.methods}
            items={data.acquisitionItems}
            names={data.acquisitionNames}
            selectedItemId={data.item.id}
          />
        {:else}<p class="text-muted-foreground">No known public source.</p>{/if}
      </section>
    {/if}
    {#if inspection.offeredAssets.length || inspection.initiatingMemberships.length || inspection.randomOutcomes.length || inspection.portableChestOutcomes.length}
      <section class="space-y-3 md:col-span-2">
        <h2 class="text-xl font-semibold">Contents and offers</h2>
        <Inspection
          inspection={{ ...inspection, fixedContents: [] }}
          isPack={data.item.item_type === "pack"}
          items={data.acquisitionItems}
          names={data.acquisitionNames}
        />
      </section>
    {/if}
    {#if data.usages.length}
      <section class="space-y-3 md:col-span-2">
        <h2 class="text-xl font-semibold">Used for</h2>
        <UseList
          uses={data.usages}
          items={data.acquisitionItems}
          names={data.acquisitionNames}
        />
      </section>
    {/if}
    {#if additionalRequirements.length}
      <section class="space-y-3 md:col-span-2">
        <h2 class="text-xl font-semibold">Requirements</h2>
        <Requirements
          roots={additionalRequirements}
          names={data.acquisitionNames}
        />
      </section>
    {/if}
  </div>
</div>
