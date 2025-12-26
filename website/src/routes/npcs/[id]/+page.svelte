<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import RoleBadges from "$lib/components/RoleBadges.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import type {
    NpcQuestOffered,
    NpcItemSold,
    NpcDrop,
    NpcSpawnLocation,
  } from "$lib/types/npcs";
  import {
    getActiveRoles,
    ROLE_DESCRIPTIONS,
    type RoleConfig,
    type RoleCategory,
  } from "$lib/utils/roles";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { ICON_BADGE } from "$lib/styles/badge";
  import Scroll from "@lucide/svelte/icons/scroll";
  import ShoppingBag from "@lucide/svelte/icons/shopping-bag";
  import Gem from "@lucide/svelte/icons/gem";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Sword from "@lucide/svelte/icons/sword";
  import User from "@lucide/svelte/icons/user";
  import Wrench from "@lucide/svelte/icons/wrench";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Shield from "@lucide/svelte/icons/shield";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Compass from "@lucide/svelte/icons/compass";
  import Snowflake from "@lucide/svelte/icons/snowflake";
  import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";

  const categoryColors: Record<RoleCategory, string> = {
    quest: "text-orange-500",
    merchant: "text-green-500",
    service: "text-blue-500",
    special: "text-purple-500",
    combat: "text-red-500",
    renewal: "text-teal-500",
    travel: "text-cyan-500",
  };

  let { data } = $props();

  // Get active roles for this NPC
  const activeRoles = $derived(getActiveRoles(data.npc.roles));

  // Get description for a role (with dynamic handling for renewal sage and teleporter)
  function getRoleDescription(role: RoleConfig): string {
    if (role.key === "is_renewal_sage") {
      const isWorldBoss = data.npc.respawn_dungeon_id === WORLD_BOSS_DUNGEON_ID;

      // World Boss resets use Adventurer's Essences (link to item page)
      // Regular dungeon resets use gold
      const currency = isWorldBoss
        ? `<a href="/items/adventurers_essence" class="text-blue-600 dark:text-blue-400 hover:underline">Adventurer's Essences</a>`
        : `<span class="text-yellow-600 dark:text-yellow-400">gold</span>`;

      if (isWorldBoss) {
        return data.npc.gold_required_respawn_dungeon > 0
          ? `Resets all World Bosses for <span class="text-yellow-600 dark:text-yellow-400">${data.npc.gold_required_respawn_dungeon.toLocaleString()}</span> ${currency}.`
          : `Resets all World Bosses.`;
      }

      const target = `<a href="/zones/${data.respawnDungeonZoneId}" class="text-blue-600 dark:text-blue-400 hover:underline">${data.respawnDungeonName}</a>`;

      return data.npc.gold_required_respawn_dungeon > 0
        ? `Resets all spawns in ${target} for <span class="text-yellow-600 dark:text-yellow-400">${data.npc.gold_required_respawn_dungeon.toLocaleString()}</span> ${currency}.`
        : `Resets all spawns in ${target}.`;
    }

    if (role.key === "is_teleporter") {
      if (data.teleportRoutes.length === 0) {
        return "Teleports players to another location.";
      }

      return data.teleportRoutes
        .map((route) => {
          const from = `<a href="/zones/${route.fromZoneId}" class="text-blue-600 dark:text-blue-400 hover:underline">${route.fromZoneName}</a>`;
          const to = `<a href="/zones/${route.toZoneId}" class="text-blue-600 dark:text-blue-400 hover:underline">${route.toZoneName}</a>`;
          return route.price > 0
            ? `Teleports players from ${from} to ${to} for <span class="text-yellow-600 dark:text-yellow-400">${route.price.toLocaleString()}</span> gold.`
            : `Teleports players from ${from} to ${to}.`;
        })
        .join("<br>");
    }

    return ROLE_DESCRIPTIONS[role.key]?.description ?? "";
  }

  // Get details for a role
  function getRoleDetails(role: RoleConfig): string[] | undefined {
    return ROLE_DESCRIPTIONS[role.key]?.details;
  }

  // Check if NPC has any messages
  const hasMessages = $derived(
    data.npc.welcome_messages.length > 0 || data.npc.shout_messages.length > 0,
  );

  // Check if NPC has combat stats (health > 0 indicates a combatant)
  const hasCombatStats = $derived(data.npc.health > 0);

  // Build resistances array for display (only non-zero values)
  const resistances = $derived.by(() => {
    const resists: { name: string; value: number }[] = [];
    if (data.npc.magic_resist !== 0)
      resists.push({ name: "Magic", value: data.npc.magic_resist });
    if (data.npc.poison_resist !== 0)
      resists.push({ name: "Poison", value: data.npc.poison_resist });
    if (data.npc.fire_resist !== 0)
      resists.push({ name: "Fire", value: data.npc.fire_resist });
    if (data.npc.cold_resist !== 0)
      resists.push({ name: "Cold", value: data.npc.cold_resist });
    if (data.npc.disease_resist !== 0)
      resists.push({ name: "Disease", value: data.npc.disease_resist });
    return resists;
  });

  // Build abilities array for display
  const abilities = $derived.by(() => {
    const abs: { label: string }[] = [];
    if (data.npc.invincible) abs.push({ label: "Invincible" });
    if (data.npc.see_invisibility) abs.push({ label: "Sees Invisibility" });
    if (data.npc.flee_on_low_hp) abs.push({ label: "Flees on Low HP" });
    if (data.npc.is_summonable) abs.push({ label: "Summonable" });
    return abs;
  });

  // Check which spawn columns to show
  const showRespawnColumn = $derived(data.npc.respawn_time > 0);
  const showChanceColumn = $derived(data.npc.respawn_probability < 1);

  // Check if any items have faction requirements
  const hasItemFactionRequirements = $derived(
    data.itemsSold.some((item) => item.faction_required > 0),
  );

  // Check if any quests have class requirements (for conditional column)
  const hasClassRequirements = $derived(
    data.questsOffered.some(
      (q) => q.class_requirements && q.class_requirements.length > 0,
    ),
  );

  // Check if any quests have flags (for conditional column)
  const hasQuestFlags = $derived(
    data.questsOffered.some(
      (q) =>
        q.is_main_quest ||
        q.is_epic_quest ||
        q.is_adventurer_quest ||
        q.is_repeatable,
    ),
  );

  // Quest columns
  const questColumns = $derived.by(() => {
    const cols: ColumnDef<NpcQuestOffered>[] = [
      {
        id: "type",
        header: "Type",
        size: 100,
        accessorFn: (row) => row.display_type,
      },
    ];

    if (hasQuestFlags) {
      cols.push({
        id: "flags",
        header: "Flags",
        size: 130,
        enableSorting: false,
        accessorFn: (row) => {
          const flags: string[] = [];
          if (row.is_main_quest) flags.push("Main");
          if (row.is_epic_quest) flags.push("Epic");
          if (row.is_adventurer_quest) flags.push("Daily");
          if (row.is_repeatable) flags.push("Repeatable");
          return flags.join(" ");
        },
      });
    }

    cols.push({
      accessorKey: "name",
      header: "Name",
      minSize: 200,
    });

    if (hasClassRequirements) {
      cols.push({
        id: "class",
        header: "Class",
        size: 180,
        enableSorting: false,
        accessorFn: (row) => (row.class_requirements || []).join(", "),
      });
    }

    cols.push(
      {
        accessorKey: "level_required",
        header: "Req. Level",
        size: 130,
      },
      {
        accessorKey: "level_recommended",
        header: "Rec. Level",
        size: 130,
      },
    );

    return cols;
  });

  // Items sold columns - dynamic based on faction requirements
  const itemsSoldColumns = $derived.by(() => {
    const cols: ColumnDef<NpcItemSold>[] = [
      {
        accessorKey: "item_name",
        header: "Item",
        minSize: 250,
      },
    ];

    if (hasItemFactionRequirements) {
      cols.push({
        id: "reputation",
        header: "Reputation",
        size: 180,
        accessorFn: (row) => row.faction_required,
      });
    }

    cols.push(
      {
        accessorKey: "price",
        header: "Price",
        size: 100,
      },
      {
        id: "currency",
        header: "Currency",
        size: 140,
        accessorFn: (row) => row.currency_item_name ?? "Gold",
      },
    );

    return cols;
  });

  // Drop columns
  const dropColumns: ColumnDef<NpcDrop>[] = [
    {
      accessorKey: "item_name",
      header: "Item",
      minSize: 300,
    },
    {
      accessorKey: "rate",
      header: "Drop Rate",
      size: 120,
    },
  ];

  // Spawn columns (dynamic based on NPC properties)
  const spawnColumns = $derived.by(() => {
    const cols: ColumnDef<NpcSpawnLocation>[] = [
      {
        accessorKey: "zone_name",
        header: "Zone",
        minSize: 180,
      },
    ];

    if (showRespawnColumn) {
      cols.push({
        id: "respawn",
        header: "Respawn",
        size: 150,
      });
    }

    if (showChanceColumn) {
      cols.push({
        id: "chance",
        header: "Chance",
        size: 150,
      });
    }

    return cols;
  });

  function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
</script>

{#snippet renderQuestCell({
  cell,
  row,
}: {
  cell: Cell<NpcQuestOffered, unknown>;
  row: Row<NpcQuestOffered>;
})}
  {#if cell.column.id === "type"}
    <QuestTypeBadge type={row.original.display_type} />
  {:else if cell.column.id === "flags"}
    <QuestFlagBadges quest={row.original} />
  {:else if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "class"}
    <ClassPills
      classes={(row.original.class_requirements || []).map((c) =>
        c.toLowerCase(),
      )}
    />
  {:else if cell.column.id === "level_required"}
    <span class="ml-auto"
      >{row.original.level_required > 0
        ? row.original.level_required
        : "-"}</span
    >
  {:else if cell.column.id === "level_recommended"}
    <span class="ml-auto"
      >{row.original.level_recommended > 0
        ? row.original.level_recommended
        : "-"}</span
    >
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestHeader({
  header,
}: {
  header: Header<NpcQuestOffered, unknown>;
})}
  {#if header.id === "level_required" || header.id === "level_recommended"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderItemSoldCell({
  cell,
  row,
}: {
  cell: Cell<NpcItemSold, unknown>;
  row: Row<NpcItemSold>;
})}
  {#if cell.column.id === "item_name"}
    <ItemLink
      itemId={row.original.item_id}
      itemName={row.original.item_name}
      tooltipHtml={row.original.tooltip_html}
    />
  {:else if cell.column.id === "price"}
    <span class="ml-auto">{row.original.price.toLocaleString()}</span>
  {:else if cell.column.id === "currency"}
    {#if row.original.currency_item_id}
      <a
        href="/items/{row.original.currency_item_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.currency_item_name}
      </a>
    {:else}
      <span class="text-yellow-600 dark:text-yellow-400">Gold</span>
    {/if}
  {:else if cell.column.id === "reputation"}
    {#if row.original.faction_required > 0}
      <span class="text-purple-600 dark:text-purple-400">
        {row.original.faction_tier_name ?? "Required"}
        <span class="text-muted-foreground font-normal"
          >({row.original.faction_required.toLocaleString()})</span
        >
      </span>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderItemSoldHeader({
  header,
}: {
  header: Header<NpcItemSold, unknown>;
})}
  {#if header.id === "price"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderDropCell({
  cell,
  row,
}: {
  cell: Cell<NpcDrop, unknown>;
  row: Row<NpcDrop>;
})}
  {#if cell.column.id === "item_name"}
    <ItemLink
      itemId={row.original.item_id}
      itemName={row.original.item_name}
      tooltipHtml={row.original.tooltip_html}
    />
  {:else if cell.column.id === "rate"}
    <span class="ml-auto">{formatPercent(row.original.rate)}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderDropHeader({ header }: { header: Header<NpcDrop, unknown> })}
  {#if header.id === "rate"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSpawnCell({
  cell,
  row,
}: {
  cell: Cell<NpcSpawnLocation, unknown>;
  row: Row<NpcSpawnLocation>;
})}
  {#if cell.column.id === "zone_name"}
    <a
      href="/zones/{row.original.zone_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.zone_name}
    </a>{#if row.original.sub_zone_name}<span class="text-muted-foreground"
        >&nbsp;({row.original.sub_zone_name})</span
      >{/if}
  {:else if cell.column.id === "respawn"}
    <span class="ml-auto">{formatTime(data.npc.respawn_time)}</span>
  {:else if cell.column.id === "chance"}
    <span class="ml-auto">{formatPercent(data.npc.respawn_probability)}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSpawnHeader({
  header,
}: {
  header: Header<NpcSpawnLocation, unknown>;
})}
  {#if header.id === "respawn" || header.id === "chance"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<svelte:head>
  <title>{data.npc.name} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "NPCs", href: "/npcs" },
      { label: data.npc.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{data.npc.name}</h1>
      <MapLink entityId={data.npc.id} entityType="npc" />
      <RoleBadges roles={data.npc.roles} />
      {#if data.npc.is_christmas_npc}
        <span class="{ICON_BADGE.base} {ICON_BADGE.static}">
          <Snowflake class="{ICON_BADGE.iconSize} text-red-500" />
          Winter Festival
        </span>
      {/if}
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {#if data.npc.faction}
        <span>Faction: {data.npc.faction}</span>
      {/if}
      {#if data.npc.race}
        <span>Race: {data.npc.race}</span>
      {/if}
    </div>
  </div>

  <!-- Spawns Section (at top, like monsters) -->
  {#if data.spawns.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Spawns
      </h2>

      <div class="space-y-4">
        <DataTable
          data={data.spawns}
          columns={spawnColumns}
          renderCell={renderSpawnCell}
          renderHeader={renderSpawnHeader}
          initialSorting={[{ id: "zone_name", desc: false }]}
          urlKey="npc-{data.npc.id}-spawns"
          pageSize={10}
          zebraStripe={true}
          class="bg-muted/30"
        />
      </div>
    </section>
  {/if}

  <!-- Combat Stats Section -->
  {#if hasCombatStats}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Sword class="h-5 w-5 text-red-500" />
        Combat Stats
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Level</div>
            <div class="font-medium">{data.npc.level}</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Health</div>
            <div class="font-medium">{data.npc.health.toLocaleString()}</div>
          </div>
          {#if data.npc.mana > 0}
            <div>
              <div class="text-sm text-muted-foreground">Mana</div>
              <div class="font-medium">{data.npc.mana.toLocaleString()}</div>
            </div>
          {/if}
          <div>
            <div class="text-sm text-muted-foreground">Damage</div>
            <div class="font-medium">{data.npc.damage}</div>
          </div>
          {#if data.npc.magic_damage > 0}
            <div>
              <div class="text-sm text-muted-foreground">Magic Damage</div>
              <div class="font-medium">{data.npc.magic_damage}</div>
            </div>
          {/if}
          <div>
            <div class="text-sm text-muted-foreground">Defense</div>
            <div class="font-medium">{data.npc.defense}</div>
          </div>
          {#if data.npc.block_chance > 0}
            <div>
              <div class="text-sm text-muted-foreground">Block Chance</div>
              <div class="font-medium">
                {formatPercent(data.npc.block_chance)}
              </div>
            </div>
          {/if}
          {#if data.npc.critical_chance > 0}
            <div>
              <div class="text-sm text-muted-foreground">Critical Chance</div>
              <div class="font-medium">
                {formatPercent(data.npc.critical_chance)}
              </div>
            </div>
          {/if}
          {#if data.npc.accuracy > 0}
            <div>
              <div class="text-sm text-muted-foreground">Accuracy</div>
              <div class="font-medium">
                {formatPercent(data.npc.accuracy)}
              </div>
            </div>
          {/if}
        </div>

        {#if resistances.length > 0 || abilities.length > 0}
          <div class="mt-4 pt-4 border-t flex flex-col md:flex-row gap-4">
            {#if resistances.length > 0}
              <div class="md:w-[500px] shrink-0">
                <div class="text-sm text-muted-foreground mb-2">
                  Resistances
                </div>
                <div class="flex flex-wrap gap-2">
                  {#each resistances as resist (resist.name)}
                    <span
                      class="inline-flex items-center rounded-md px-2 py-1 text-sm
                        {resist.value > 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
                    >
                      {resist.name}: {resist.value}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
            {#if abilities.length > 0}
              <div class="flex-1">
                <div class="text-sm text-muted-foreground mb-2">Special</div>
                <div class="flex flex-wrap gap-2">
                  {#each abilities as ability (ability.label)}
                    <span
                      class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {ability.label}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Gold Drop (if any) -->
        {#if data.npc.gold_max > 0}
          <div class="mt-4 pt-4 border-t">
            <div class="text-sm text-muted-foreground mb-1">Gold Drop</div>
            <div class="font-medium text-yellow-600 dark:text-yellow-400">
              {data.npc.gold_min.toLocaleString()} - {data.npc.gold_max.toLocaleString()}
              gold
              {#if data.npc.probability_drop_gold < 1}
                <span class="text-muted-foreground font-normal">
                  ({formatPercent(data.npc.probability_drop_gold)} chance)
                </span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Roles Section -->
  {#if activeRoles.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <User class="h-5 w-5 text-blue-500" />
        Services
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        {#each activeRoles as role (role.key)}
          {@const description = getRoleDescription(role)}
          {@const details = getRoleDetails(role)}
          <div>
            <span class="{ICON_BADGE.base} {ICON_BADGE.static}">
              {#if role.category === "quest"}
                <Scroll
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {:else if role.category === "merchant"}
                <ShoppingBag
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {:else if role.category === "service"}
                <Wrench
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {:else if role.category === "special"}
                <Sparkles
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {:else if role.category === "combat"}
                <Shield
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {:else if role.category === "renewal"}
                <RefreshCw
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {:else if role.category === "travel"}
                <Compass
                  class="{ICON_BADGE.iconSize} {categoryColors[role.category]}"
                />
              {/if}
              {role.label}
            </span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static content -->
            <p class="mt-1">{@html description}</p>
            {#if details && details.length > 0}
              <ul class="mt-1 space-y-0.5">
                {#each details as detail, i (i)}
                  <li class="text-sm text-muted-foreground">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static content -->
                    {@html detail}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Item Drops Section -->
  {#if data.drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Item Drops ({data.drops.length})
      </h2>
      <DataTable
        data={data.drops}
        columns={dropColumns}
        renderCell={renderDropCell}
        renderHeader={renderDropHeader}
        initialSorting={[{ id: "rate", desc: true }]}
        urlKey="npc-{data.npc.id}-drops"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Quests Section -->
  {#if data.questsOffered.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Scroll class="h-5 w-5 text-orange-500" />
        Quests ({data.questsOffered.length})
      </h2>
      <DataTable
        data={data.questsOffered}
        columns={questColumns}
        renderCell={renderQuestCell}
        renderHeader={renderQuestHeader}
        initialSorting={[
          { id: "level_recommended", desc: false },
          { id: "name", desc: false },
        ]}
        urlKey="npc-{data.npc.id}-quests"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Items for Sale Section -->
  {#if data.itemsSold.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <ShoppingBag class="h-5 w-5 text-green-500" />
        Items for Sale ({data.itemsSold.length})
      </h2>
      <DataTable
        data={data.itemsSold}
        columns={itemsSoldColumns}
        renderCell={renderItemSoldCell}
        renderHeader={renderItemSoldHeader}
        initialSorting={[{ id: "item_name", desc: false }]}
        urlKey="npc-{data.npc.id}-items"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Dialogue Section -->
  {#if hasMessages}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MessageCircle class="h-5 w-5 text-cyan-500" />
        Dialogue
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        {#if data.npc.welcome_messages.length > 0}
          <div>
            <div class="text-sm text-muted-foreground mb-2">
              Welcome Messages
            </div>
            <div class="space-y-1">
              {#each data.npc.welcome_messages as message, i (i)}
                <div class="italic text-muted-foreground">"{message}"</div>
              {/each}
            </div>
          </div>
        {/if}
        {#if data.npc.shout_messages.length > 0}
          <div>
            <div class="text-sm text-muted-foreground mb-2">Shout Messages</div>
            <div class="space-y-1">
              {#each data.npc.shout_messages as message, i (i)}
                <div class="italic text-muted-foreground">"{message}"</div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}
</div>
