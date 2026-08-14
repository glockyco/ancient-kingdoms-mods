<script lang="ts">
  import { base } from "$app/paths";
  import {
    DataTable,
    type Cell,
    type ColumnDef,
    type Row,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import RoleBadges from "$lib/components/RoleBadges.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import {
    FACTION_ACCENTS,
    FACTION_ACCENT_FALLBACK,
  } from "$lib/constants/factions";
  import type {
    FactionChestRow,
    FactionGatedItemRow,
    FactionHouseRow,
    FactionMemberRow,
    FactionMonsterRow,
    FactionNpcKillRow,
    FactionQuestGrantRow,
    FactionQuestRequirementRow,
    FactionVendorRow,
  } from "$lib/queries/factions.server";
  import {
    monsterKillReputation,
    npcKillReputation,
    type KillReputationDirection,
  } from "$lib/utils/killReputation";
  import { reputationTierName } from "$lib/utils/reputation";
  import Box from "@lucide/svelte/icons/box";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Skull from "@lucide/svelte/icons/skull";
  import Sword from "@lucide/svelte/icons/sword";
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import Users from "@lucide/svelte/icons/users";

  let { data } = $props();

  const accent = $derived(
    FACTION_ACCENTS[data.faction.id] ?? FACTION_ACCENT_FALLBACK,
  );
  const FactionIcon = $derived(accent.icon);

  const GAIN_CLASS = "text-green-600 dark:text-green-400";
  const LOSS_CLASS = "text-red-600 dark:text-red-400";

  const hasUnlocks = $derived(
    data.faction.vendors.length > 0 ||
      data.faction.gatedItems.length > 0 ||
      data.faction.houses.length > 0 ||
      data.faction.questRequirements.length > 0,
  );

  /**
   * Magnitude the kill applies to *this* faction. The shared helpers group
   * every faction of a kill into one effect per direction, so pick the effect
   * that both matches the direction and names this faction.
   */
  function monsterAmount(
    monster: FactionMonsterRow,
    direction: KillReputationDirection,
  ): string {
    const effect = monsterKillReputation(monster).find(
      (e) =>
        e.direction === direction && e.factions.includes(data.faction.name),
    );
    return effect?.amount ?? "-";
  }

  function npcAmount(
    npc: FactionNpcKillRow,
    direction: KillReputationDirection,
  ): string {
    const effect = npcKillReputation(npc).find(
      (e) =>
        e.direction === direction && e.factions.includes(data.faction.name),
    );
    return effect?.amount ?? "-";
  }

  /**
   * Sort key for a pre-formatted amount: the top of the range, ungrouped.
   * The helpers hand back display strings like "31,400" or "15-21".
   */
  function amountSortValue(formatted: string): number {
    const top = formatted.split("-").pop() ?? "";
    return Number(top.replace(/,/g, "")) || 0;
  }

  function monsterLevel(monster: FactionMonsterRow): string {
    return monster.level_min === monster.level_max
      ? `${monster.level_min}`
      : `${monster.level_min}–${monster.level_max}`;
  }

  function monsterRank(monster: FactionMonsterRow): string {
    if (monster.is_boss) return "Boss";
    if (monster.is_fabled) return "Fabled";
    if (monster.is_elite) return "Elite";
    return "Normal";
  }

  function tierFor(value: number): string {
    return reputationTierName(data.tiers, value);
  }

  function monsterColumns(
    direction: KillReputationDirection,
  ): ColumnDef<FactionMonsterRow>[] {
    return [
      { accessorKey: "name", header: "Monster", minSize: 220 },
      {
        id: "level",
        header: "Level",
        size: 110,
        accessorFn: (row) => row.level_max,
      },
      {
        id: "rank",
        header: "Rank",
        size: 110,
        accessorFn: (row) => monsterRank(row),
      },
      {
        id: "amount",
        header: "On kill",
        size: 130,
        accessorFn: (row) => amountSortValue(monsterAmount(row, direction)),
      },
      { id: "location", header: "Location", size: 90, enableSorting: false },
    ];
  }

  function npcKillColumns(
    direction: KillReputationDirection,
  ): ColumnDef<FactionNpcKillRow>[] {
    return [
      { accessorKey: "name", header: "NPC", minSize: 220 },
      { accessorKey: "level", header: "Level", size: 110 },
      {
        id: "amount",
        header: "On kill",
        size: 130,
        accessorFn: (row) => amountSortValue(npcAmount(row, direction)),
      },
      { id: "location", header: "Location", size: 90, enableSorting: false },
    ];
  }

  const monsterImproveColumns = $derived(monsterColumns("improve"));
  const monsterDecreaseColumns = $derived(monsterColumns("decrease"));
  const npcKillImproveColumns = $derived(npcKillColumns("improve"));
  const npcKillDecreaseColumns = $derived(npcKillColumns("decrease"));

  const chestColumns: ColumnDef<FactionChestRow>[] = [
    { id: "name", header: "Icon", size: 80, enableSorting: false },
    {
      id: "zone",
      header: "Zone",
      minSize: 180,
      accessorFn: (row) => row.zone_name ?? "",
    },
    { id: "amount", header: "On loot", size: 130, enableSorting: false },
    { id: "location", header: "Location", size: 90, enableSorting: false },
  ];

  const questGrantColumns: ColumnDef<FactionQuestGrantRow>[] = [
    { accessorKey: "name", header: "Quest", minSize: 260 },
    {
      accessorKey: "level_recommended",
      header: "Recommended level",
      size: 180,
    },
    { accessorKey: "gain", header: "On completion", size: 150 },
  ];

  const memberColumns: ColumnDef<FactionMemberRow>[] = [
    { accessorKey: "name", header: "NPC", minSize: 220 },
    { accessorKey: "level", header: "Level", size: 110 },
    { id: "roles", header: "Roles", minSize: 220, enableSorting: false },
    { id: "location", header: "Location", size: 90, enableSorting: false },
  ];

  const vendorColumns: ColumnDef<FactionVendorRow>[] = [
    { accessorKey: "name", header: "NPC", minSize: 260 },
    { id: "requires", header: "Requires", minSize: 200, enableSorting: false },
    { id: "location", header: "Location", size: 90, enableSorting: false },
  ];

  const gatedItemColumns: ColumnDef<FactionGatedItemRow>[] = [
    { accessorKey: "name", header: "Item", minSize: 240 },
    {
      id: "vendor",
      header: "Vendor",
      minSize: 180,
      accessorFn: (row) => row.vendor_name,
    },
    { accessorKey: "faction_required_to_buy", header: "Requires", size: 200 },
  ];

  const houseColumns: ColumnDef<FactionHouseRow>[] = [
    { accessorKey: "name", header: "House", minSize: 220 },
    {
      id: "zone",
      header: "Zone",
      minSize: 180,
      accessorFn: (row) => row.zone_name ?? "",
    },
    { accessorKey: "base_price", header: "Price", size: 140 },
    { accessorKey: "faction_required", header: "Requires", size: 200 },
    { id: "location", header: "Location", size: 90, enableSorting: false },
  ];

  const questRequirementColumns: ColumnDef<FactionQuestRequirementRow>[] = [
    { accessorKey: "name", header: "Quest", minSize: 240 },
    {
      id: "giver",
      header: "Quest giver",
      minSize: 180,
      accessorFn: (row) => row.giver_name ?? "",
    },
    { accessorKey: "required_value", header: "Requires", size: 200 },
  ];
</script>

{#snippet reputationValue(value: number, positive: boolean)}
  <span class={positive ? GAIN_CLASS : LOSS_CLASS}>
    {positive ? "+" : "−"}{Math.abs(value).toLocaleString()}
  </span>
{/snippet}

{#snippet requirementValue(value: number)}
  <span>{tierFor(value)}</span>
  <span class="text-muted-foreground">&nbsp;({value.toLocaleString()})</span>
{/snippet}

{#snippet monsterCell(
  direction: KillReputationDirection,
  cell: Cell<FactionMonsterRow, unknown>,
  row: Row<FactionMonsterRow>,
)}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/monsters/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="monster"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      fallback={Skull}
      size={28}
    />
  {:else if cell.column.id === "level"}
    {monsterLevel(row.original)}
  {:else if cell.column.id === "rank"}
    {monsterRank(row.original)}
  {:else if cell.column.id === "amount"}
    <span class={direction === "improve" ? GAIN_CLASS : LOSS_CLASS}>
      {direction === "improve" ? "+" : "−"}{monsterAmount(
        row.original,
        direction,
      )}
    </span>
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="monster" compact />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderMonsterImproveCell({
  cell,
  row,
}: {
  cell: Cell<FactionMonsterRow, unknown>;
  row: Row<FactionMonsterRow>;
})}
  {@render monsterCell("improve", cell, row)}
{/snippet}

{#snippet renderMonsterDecreaseCell({
  cell,
  row,
}: {
  cell: Cell<FactionMonsterRow, unknown>;
  row: Row<FactionMonsterRow>;
})}
  {@render monsterCell("decrease", cell, row)}
{/snippet}

{#snippet npcKillCell(
  direction: KillReputationDirection,
  cell: Cell<FactionNpcKillRow, unknown>,
  row: Row<FactionNpcKillRow>,
)}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/npcs/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="npc"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      fallback={Users}
      size={28}
    />
  {:else if cell.column.id === "amount"}
    <span class={direction === "improve" ? GAIN_CLASS : LOSS_CLASS}>
      {direction === "improve" ? "+" : "−"}{npcAmount(row.original, direction)}
    </span>
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="npc" compact />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderNpcKillImproveCell({
  cell,
  row,
}: {
  cell: Cell<FactionNpcKillRow, unknown>;
  row: Row<FactionNpcKillRow>;
})}
  {@render npcKillCell("improve", cell, row)}
{/snippet}

{#snippet renderNpcKillDecreaseCell({
  cell,
  row,
}: {
  cell: Cell<FactionNpcKillRow, unknown>;
  row: Row<FactionNpcKillRow>;
})}
  {@render npcKillCell("decrease", cell, row)}
{/snippet}

{#snippet renderChestCell({
  cell,
  row,
}: {
  cell: Cell<FactionChestRow, unknown>;
  row: Row<FactionChestRow>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/chests/{row.original.id}"
      aria-label={`Chest ${row.original.id}`}
      title={`Chest ${row.original.id}`}
      class="inline-flex"
    >
      <EntityIcon
        src={row.original.visual_public_path
          ? `${base}/${row.original.visual_public_path}`
          : null}
        alt={`Chest ${row.original.id} icon`}
        fallback={Box}
        size={32}
      />
    </a>
  {:else if cell.column.id === "zone"}
    {#if row.original.zone_id && row.original.zone_name}
      <a
        href="/zones/{row.original.zone_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >{row.original.zone_name}</a
      >
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "amount"}
    {@render reputationValue(200, false)}
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="chest" compact />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestGrantCell({
  cell,
  row,
}: {
  cell: Cell<FactionQuestGrantRow, unknown>;
  row: Row<FactionQuestGrantRow>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >{row.original.name}</a
    >
  {:else if cell.column.id === "gain"}
    {@render reputationValue(row.original.gain, true)}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderMemberCell({
  cell,
  row,
}: {
  cell: Cell<FactionMemberRow, unknown>;
  row: Row<FactionMemberRow>;
})}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/npcs/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="npc"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      fallback={Users}
      size={28}
    />
  {:else if cell.column.id === "roles"}
    <RoleBadges roles={row.original.roles} />
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="npc" compact />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderVendorCell({
  cell,
  row,
}: {
  cell: Cell<FactionVendorRow, unknown>;
  row: Row<FactionVendorRow>;
})}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/npcs/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="npc"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      fallback={Users}
      size={28}
    />
  {:else if cell.column.id === "requires"}
    Requires 15,000 reputation
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="npc" compact />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderGatedItemCell({
  cell,
  row,
}: {
  cell: Cell<FactionGatedItemRow, unknown>;
  row: Row<FactionGatedItemRow>;
})}
  {#if cell.column.id === "name"}
    <ItemLink
      itemId={row.original.id}
      itemName={row.original.name}
      tooltipHtml={row.original.tooltip_html}
      imageAvailable={row.original.visual_public_path}
      variant="reference"
      fallback={Box}
    />
  {:else if cell.column.id === "vendor"}
    <EntityLink
      href="/npcs/{row.original.vendor_id}"
      name={row.original.vendor_name}
      variant="reference"
      domain="npc"
      entityId={row.original.vendor_id}
      imageKind="primary"
      imageAvailable={row.original.vendor_visual_public_path}
      fallback={Users}
      size={28}
    />
  {:else if cell.column.id === "faction_required_to_buy"}
    <span
      >{row.original.faction_required_tier_name ??
        tierFor(row.original.faction_required_to_buy)}</span
    >
    <span class="text-muted-foreground"
      >&nbsp;({row.original.faction_required_to_buy.toLocaleString()})</span
    >
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderHouseCell({
  cell,
  row,
}: {
  cell: Cell<FactionHouseRow, unknown>;
  row: Row<FactionHouseRow>;
})}
  {#if cell.column.id === "name"}
    {row.original.name}
  {:else if cell.column.id === "zone"}
    {#if row.original.zone_id && row.original.zone_name}
      <a
        href="/zones/{row.original.zone_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >{row.original.zone_name}</a
      >
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "base_price"}
    {row.original.base_price.toLocaleString()} gold
  {:else if cell.column.id === "faction_required"}
    {@render requirementValue(row.original.faction_required)}
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="house" compact />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestRequirementCell({
  cell,
  row,
}: {
  cell: Cell<FactionQuestRequirementRow, unknown>;
  row: Row<FactionQuestRequirementRow>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >{row.original.name}</a
    >
  {:else if cell.column.id === "giver"}
    {#if row.original.giver_id && row.original.giver_name}
      <a
        href="/npcs/{row.original.giver_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >{row.original.giver_name}</a
      >
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "required_value"}
    {@render requirementValue(row.original.required_value)}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<Seo
  title="{data.faction.name} - Factions - Ancient Kingdoms"
  description={data.description}
  path="/factions/{data.faction.id}"
/>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Factions", href: "/factions" },
      { label: data.faction.name },
    ]}
  />

  <div>
    <div class="flex items-center gap-3">
      <div class="p-3 rounded-xl {accent.bg}">
        <FactionIcon class="h-8 w-8 {accent.color}" />
      </div>
      <h1 class="text-4xl font-bold">{data.faction.name}</h1>
    </div>

    <p class="mt-3 text-sm text-muted-foreground">
      {data.faction.members.length.toLocaleString()} members ·
      {data.faction.monstersImprove.length.toLocaleString()} monsters raise reputation
      · {data.faction.questGrants.length.toLocaleString()} quests grant reputation
    </p>

    <p class="mt-2 text-sm text-muted-foreground">
      Reputation with this faction only changes through the sources below. See
      <a
        href="/mechanics/reputation"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >how reputation works</a
      > for the tiers and formulas.
    </p>
  </div>

  <nav class="flex flex-wrap gap-2" aria-label="Faction navigation">
    {#each data.factions as faction (faction.id)}
      {#if faction.id === data.faction.id}
        <span
          class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
          aria-current="page"
        >
          {faction.name}
        </span>
      {:else}
        <a
          href="/factions/{faction.id}"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {faction.name}
        </a>
      {/if}
    {/each}
  </nav>

  {#if hasUnlocks}
    <section class="space-y-6">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <KeyRound class="h-5 w-5 text-amber-500" />
        Unlocks
      </h2>

      {#if data.faction.vendors.length > 0}
        <div>
          <h3 class="mb-3 text-lg font-medium">
            Faction vendors ({data.faction.vendors.length})
          </h3>
          <DataTable
            data={data.faction.vendors}
            columns={vendorColumns}
            renderCell={renderVendorCell}
            initialSorting={[{ id: "name", desc: false }]}
            urlKey="faction-{data.faction.id}-vendors"
            pageSize={10}
            zebraStripe={true}
            class="bg-muted/30"
          />
        </div>
      {/if}

      {#if data.faction.gatedItems.length > 0}
        <div>
          <h3 class="mb-3 text-lg font-medium">
            Items ({data.faction.gatedItems.length})
          </h3>
          <DataTable
            data={data.faction.gatedItems}
            columns={gatedItemColumns}
            renderCell={renderGatedItemCell}
            initialSorting={[
              { id: "faction_required_to_buy", desc: true },
              { id: "name", desc: false },
            ]}
            urlKey="faction-{data.faction.id}-gated-items"
            pageSize={10}
            zebraStripe={true}
            class="bg-muted/30"
          />
        </div>
      {/if}

      {#if data.faction.houses.length > 0}
        <div>
          <h3 class="mb-3 text-lg font-medium">
            Houses ({data.faction.houses.length})
          </h3>
          <DataTable
            data={data.faction.houses}
            columns={houseColumns}
            renderCell={renderHouseCell}
            initialSorting={[{ id: "base_price", desc: false }]}
            urlKey="faction-{data.faction.id}-houses"
            pageSize={10}
            zebraStripe={true}
            class="bg-muted/30"
          />
        </div>
      {/if}

      {#if data.faction.questRequirements.length > 0}
        <div>
          <h3 class="mb-3 text-lg font-medium">
            Quests ({data.faction.questRequirements.length})
          </h3>
          <DataTable
            data={data.faction.questRequirements}
            columns={questRequirementColumns}
            renderCell={renderQuestRequirementCell}
            initialSorting={[
              { id: "required_value", desc: true },
              { id: "name", desc: false },
            ]}
            urlKey="faction-{data.faction.id}-quest-requirements"
            pageSize={10}
            zebraStripe={true}
            class="bg-muted/30"
          />
        </div>
      {/if}
    </section>
  {/if}

  {#if data.faction.members.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Users class="h-5 w-5 text-blue-500" />
        Members ({data.faction.members.length})
      </h2>
      <DataTable
        data={data.faction.members}
        columns={memberColumns}
        renderCell={renderMemberCell}
        initialSorting={[{ id: "name", desc: false }]}
        urlKey="faction-{data.faction.id}-members"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  {#if data.faction.monstersImprove.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Sword class="h-5 w-5 text-red-500" />
        Reputation gained from monsters ({data.faction.monstersImprove.length})
      </h2>
      <DataTable
        data={data.faction.monstersImprove}
        columns={monsterImproveColumns}
        renderCell={renderMonsterImproveCell}
        initialSorting={[
          { id: "amount", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="faction-{data.faction.id}-monsters-improve"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  {#if data.faction.questGrants.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Scroll class="h-5 w-5 text-orange-500" />
        Reputation gained from quests ({data.faction.questGrants.length})
      </h2>
      <DataTable
        data={data.faction.questGrants}
        columns={questGrantColumns}
        renderCell={renderQuestGrantCell}
        initialSorting={[
          { id: "level_recommended", desc: false },
          { id: "name", desc: false },
        ]}
        urlKey="faction-{data.faction.id}-quest-grants"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  {#if data.faction.npcKillsImprove.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Skull class="h-5 w-5 text-slate-500" />
        Reputation gained from NPCs ({data.faction.npcKillsImprove.length})
      </h2>
      <DataTable
        data={data.faction.npcKillsImprove}
        columns={npcKillImproveColumns}
        renderCell={renderNpcKillImproveCell}
        initialSorting={[
          { id: "amount", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="faction-{data.faction.id}-npc-kills-improve"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  {#if data.faction.monstersDecrease.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <TrendingDown class="h-5 w-5 text-red-500" />
        Reputation lost to monsters ({data.faction.monstersDecrease.length})
      </h2>
      <DataTable
        data={data.faction.monstersDecrease}
        columns={monsterDecreaseColumns}
        renderCell={renderMonsterDecreaseCell}
        initialSorting={[
          { id: "amount", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="faction-{data.faction.id}-monsters-decrease"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  {#if data.faction.npcKillsDecrease.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <TrendingDown class="h-5 w-5 text-slate-500" />
        Reputation lost to NPCs ({data.faction.npcKillsDecrease.length})
      </h2>
      <DataTable
        data={data.faction.npcKillsDecrease}
        columns={npcKillDecreaseColumns}
        renderCell={renderNpcKillDecreaseCell}
        initialSorting={[
          { id: "amount", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="faction-{data.faction.id}-npc-kills-decrease"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  {#if data.faction.chests.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Box class="h-5 w-5 text-sky-500" />
        Reputation lost to chests ({data.faction.chests.length})
      </h2>
      <DataTable
        data={data.faction.chests}
        columns={chestColumns}
        renderCell={renderChestCell}
        initialSorting={[{ id: "zone", desc: false }]}
        urlKey="faction-{data.faction.id}-chests"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}
</div>
