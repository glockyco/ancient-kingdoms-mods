<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import type {
    NpcQuestOffered,
    NpcItemSold,
    NpcDrop,
    NpcSpawnLocation,
  } from "$lib/types/npcs";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Scroll from "@lucide/svelte/icons/scroll";
  import ShoppingBag from "@lucide/svelte/icons/shopping-bag";
  import Gem from "@lucide/svelte/icons/gem";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Sword from "@lucide/svelte/icons/sword";
  import User from "@lucide/svelte/icons/user";

  let { data } = $props();

  // Role display configuration with descriptions
  // description: main function, details: costs/requirements (optional)
  interface RoleConfig {
    key: string;
    label: string;
    color: string;
    description: string;
    details?: string[];
  }

  const roleConfig: RoleConfig[] = [
    {
      key: "is_quest_giver",
      label: "Quest Giver",
      color:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      description: "Offers quests to players.",
    },
    {
      key: "is_taskgiver_adventurer",
      label: "Daily Quests",
      color:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      description: "Offers daily adventurer quests.",
      details: ["Requires level 40"],
    },
    {
      key: "is_merchant",
      label: "Merchant",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      description: "Sells items to players.",
    },
    {
      key: "is_merchant_adventurer",
      label: "Adventurer Merchant",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      description: "Sells adventurer-related items and rewards.",
    },
    {
      key: "is_faction_vendor",
      label: "Faction Vendor",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      description: "Sells faction-exclusive items.",
      details: ["Requires 15,000+ faction reputation"],
    },
    {
      key: "is_essence_trader",
      label: "Essence Trader",
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      description:
        'Trades magic+ equipment for <a href="/items/adventurers_essence" class="text-blue-600 dark:text-blue-400 hover:underline">Adventurer\'s Essence</a>.',
      details: ["Requires magic or better gear in inventory"],
    },
    {
      key: "is_bank",
      label: "Banker",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Provides access to your bank storage.",
      details: [
        "30 slots per tab, up to 10 tabs",
        "Tab costs: 1k → 5k → 10k → 25k → 50k → 75k → 100k → 250k → 500k gold",
      ],
    },
    {
      key: "can_repair_equipment",
      label: "Repairs Equipment",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Repairs damaged equipment for gold.",
    },
    {
      key: "is_skill_master",
      label: "Skill Master",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Resets your class skill points.",
      details: [
        "Cost: 100g (lvl 1-9), 250g (10-19), 500g (20-29), 1k (30-39), 3k (40+)",
      ],
    },
    {
      key: "is_veteran_master",
      label: "Veteran Master",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Resets your veteran skill points.",
      details: [
        'Cost: 10,000 gold + <a href="/items/token_of_redemption" class="text-blue-600 dark:text-blue-400 hover:underline">Token of Redemption</a>',
      ],
    },
    {
      key: "is_reset_attributes",
      label: "Attribute Reset",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Resets your attribute points.",
      details: [
        "Cost: 100g (lvl 1-9), 250g (10-19), 500g (20-29), 1k (30-39), 3k (40+)",
      ],
    },
    {
      key: "is_soul_binder",
      label: "Soul Binder",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Binds your respawn point to the current area.",
    },
    {
      key: "is_inkeeper",
      label: "Innkeeper",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Sells food and drinks.",
      details: ["Cost: 25 gold"],
    },
    {
      key: "is_recruiter_mercenaries",
      label: "Mercenary Recruiter",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      description: "Hire and manage mercenaries (up to 6 stored).",
      details: [
        "Requires level 10",
        "Active limit: 1 (lvl 10-19), 2 (20-29), 3 (30-39), 4 (40+)",
      ],
    },
    {
      key: "is_priestess",
      label: "Priestess",
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      description:
        'Converts <a href="/items/cursed_rune" class="text-blue-600 dark:text-blue-400 hover:underline">Cursed Runes</a> into <a href="/items/blessed_rune" class="text-blue-600 dark:text-blue-400 hover:underline">Blessed Runes</a>.',
      details: ["Cost: 75 gold per rune", "Requires Cursed Runes in inventory"],
    },
    {
      key: "is_augmenter",
      label: "Augmenter",
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      description: "Removes augments from equipment.",
      details: ["Requires augmented gear in inventory or equipped"],
    },
    {
      key: "is_guard",
      label: "Guard",
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      description: "Protects the area and may attack hostile players.",
    },
  ];

  // Get active roles for badges
  const activeRoles = $derived(
    roleConfig.filter(
      (role) => data.npc.roles[role.key as keyof typeof data.npc.roles],
    ),
  );

  // Check if NPC has any messages
  const hasMessages = $derived(
    data.npc.welcome_messages.length > 0 || data.npc.shout_messages.length > 0,
  );

  // Check which spawn columns to show
  const showRespawnColumn = $derived(data.npc.respawn_time > 0);
  const showChanceColumn = $derived(data.npc.respawn_probability < 1);

  // Check if any items have faction requirements
  const hasItemFactionRequirements = $derived(
    data.itemsSold.some((item) => item.faction_required > 0),
  );

  // Quest columns
  const questColumns: ColumnDef<NpcQuestOffered>[] = [
    {
      accessorKey: "name",
      header: "Quest",
      minSize: 250,
    },
    {
      accessorKey: "level_recommended",
      header: "Level",
      size: 100,
    },
  ];

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
        size: 120,
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
  {#if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level_recommended"}
    <span class="ml-auto">{row.original.level_recommended}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestHeader({
  header,
}: {
  header: Header<NpcQuestOffered, unknown>;
})}
  {#if header.id === "level_recommended"}
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
      {#each activeRoles as role (role.key)}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {role.color}"
        >
          {role.label}
        </span>
      {/each}
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

        <!-- Dungeon Respawn info -->
        {#if data.npc.respawn_dungeon_id > 0 && data.respawnDungeonName}
          <div class="bg-muted/30 rounded-md border p-3">
            <span>Can be respawned in </span>
            <span class="font-medium">{data.respawnDungeonName}</span>
            {#if data.npc.gold_required_respawn_dungeon > 0}
              <span class="text-yellow-600 dark:text-yellow-400">
                ({data.npc.gold_required_respawn_dungeon.toLocaleString()} gold)
              </span>
            {/if}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Combat Section (below spawns) -->
  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <Sword class="h-5 w-5 text-red-500" />
      Combat
    </h2>
    <div class="bg-muted/30 rounded-md border p-4 space-y-4">
      <!-- Gold Drop -->
      <div>
        <div class="text-sm text-muted-foreground mb-1">Gold Drop</div>
        {#if data.npc.gold_max > 0}
          <div class="font-medium text-yellow-600 dark:text-yellow-400">
            {data.npc.gold_min.toLocaleString()} - {data.npc.gold_max.toLocaleString()}
            gold
            {#if data.npc.probability_drop_gold < 1}
              <span class="text-muted-foreground font-normal">
                ({formatPercent(data.npc.probability_drop_gold)} chance)
              </span>
            {/if}
          </div>
        {:else}
          <div class="text-muted-foreground">No gold drops</div>
        {/if}
      </div>

      <!-- Combat Flags -->
      {#if data.npc.see_invisibility || data.npc.flee_on_low_hp || data.npc.is_summonable}
        <div>
          <div class="text-sm text-muted-foreground mb-2">Abilities</div>
          <div class="flex flex-wrap gap-2">
            {#if data.npc.see_invisibility}
              <span
                class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                Sees Invisibility
              </span>
            {/if}
            {#if data.npc.flee_on_low_hp}
              <span
                class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                Flees on Low HP
              </span>
            {/if}
            {#if data.npc.is_summonable}
              <span
                class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                Summonable
              </span>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Roles Section -->
  {#if activeRoles.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <User class="h-5 w-5 text-blue-500" />
        Services
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        {#each activeRoles as role (role.key)}
          <div>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {role.color}"
            >
              {role.label}
            </span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static content -->
            <p class="mt-1 text-sm">{@html role.description}</p>
            {#if role.details}
              <ul class="mt-1 space-y-0.5">
                {#each role.details as detail, i (i)}
                  <li class="text-xs text-muted-foreground">
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
        initialSorting={[{ id: "level_recommended", desc: false }]}
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
