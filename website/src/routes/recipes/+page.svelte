<script lang="ts">
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import { getItemTooltips } from "$lib/queries/items";

  let { data } = $props();

  // Tooltip state - loaded lazily from client-side DB
  let tooltips = $state<Map<string, string>>(new Map());
  let tooltipFetchController: AbortController | null = null;

  async function fetchTooltipsForRows(
    visibleRows: RecipeRow[],
    adjacentRows: RecipeRow[],
  ) {
    // Cancel any in-flight fetch
    tooltipFetchController?.abort();
    tooltipFetchController = new AbortController();
    const signal = tooltipFetchController.signal;

    // Combine visible and adjacent rows, filter out already-loaded tooltips
    const allIds = [...visibleRows, ...adjacentRows].map(
      (r) => r.result_item_id,
    );
    const uniqueIds = [...new Set(allIds)];
    const missingIds = uniqueIds.filter((id) => !tooltips.has(id));

    if (missingIds.length === 0) return;

    try {
      const newTooltips = await getItemTooltips(missingIds);

      // Check if aborted before updating state
      if (signal.aborted) return;

      // Merge new tooltips into existing map
      tooltips = new Map([...tooltips, ...newTooltips]);
    } catch {
      // Query failed (e.g., DB not loaded yet) - items will just not have tooltips
    }
  }

  function handleVisibleRowsChange(
    visibleRows: RecipeRow[],
    adjacentRows: RecipeRow[],
  ) {
    fetchTooltipsForRows(visibleRows, adjacentRows);
  }

  const PAGE_SIZE = 20;

  // Roman numerals for tier display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Add virtual column for type sorting (numeric for stable sort order)
  const dataWithVirtual = $derived(
    data.recipes.map((r) => ({
      ...r,
      type_order: r.type === "Alchemy" ? 1 : r.type === "Cooking" ? 2 : 3,
    })),
  );

  type RecipeRow = (typeof dataWithVirtual)[number];

  const columns: ColumnDef<RecipeRow>[] = [
    {
      id: "details",
      header: "",
      size: 32,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 90,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
      sortingFn: (rowA, rowB) => {
        return rowA.original.type_order - rowB.original.type_order;
      },
    },
    {
      accessorKey: "tier",
      header: "Tier",
      size: 80,
    },
    {
      accessorKey: "result_item_name",
      header: "Output",
      minSize: 220,
      enableHiding: false,
    },
    {
      id: "ingredient1",
      header: "Ingredient 1",
      size: 270,
      enableSorting: false,
      accessorFn: (row) => row.ingredients[0]?.item_name ?? "",
    },
    {
      id: "ingredient2",
      header: "Ingredient 2",
      size: 220,
      enableSorting: false,
      accessorFn: (row) => row.ingredients[1]?.item_name ?? "",
    },
    {
      id: "ingredient3",
      header: "Ingredient 3",
      minSize: 220,
      enableSorting: false,
      accessorFn: (row) => row.ingredients[2]?.item_name ?? "",
    },
  ];

  const columnLabels: Record<string, string> = {
    details: "",
    type: "Type",
    tier: "Tier",
    result_item_name: "Output",
    ingredient1: "Ingredient 1",
    ingredient2: "Ingredient 2",
    ingredient3: "Ingredient 3",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<RecipeRow, unknown> })}
  {columnLabels[header.id] ?? header.id}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<RecipeRow, unknown>;
  row: Row<RecipeRow>;
})}
  {#if cell.column.id === "details"}
    <a
      href="/recipes/{row.original.id}"
      class="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      title="View recipe details"
    >
      <ExternalLink class="h-4 w-4" />
    </a>
  {:else if cell.column.id === "type"}
    {row.original.type}
  {:else if cell.column.id === "tier"}
    <span class="font-medium">{romanNumerals[row.original.tier] ?? "-"}</span>
  {:else if cell.column.id === "result_item_name"}
    <ItemLink
      itemId={row.original.result_item_id}
      itemName={row.original.result_item_name}
      tooltipHtml={tooltips.get(row.original.result_item_id) ?? null}
    />
    {#if row.original.result_amount > 1}
      <span class="text-muted-foreground ml-1"
        >x{row.original.result_amount}</span
      >
    {/if}
  {:else if cell.column.id === "ingredient1"}
    {#if row.original.ingredients[0]}
      <span class="whitespace-nowrap">
        <a
          href="/items/{row.original.ingredients[0].item_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{row.original.ingredients[0].item_name}</a
        >
        <span class="text-muted-foreground">
          x{row.original.ingredients[0].amount}</span
        >
      </span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "ingredient2"}
    {#if row.original.ingredients[1]}
      <span class="whitespace-nowrap">
        <a
          href="/items/{row.original.ingredients[1].item_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{row.original.ingredients[1].item_name}</a
        >
        <span class="text-muted-foreground">
          x{row.original.ingredients[1].amount}</span
        >
      </span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "ingredient3"}
    {#if row.original.ingredients[2]}
      <span class="whitespace-nowrap">
        <a
          href="/items/{row.original.ingredients[2].item_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{row.original.ingredients[2].item_name}</a
        >
        <span class="text-muted-foreground">
          x{row.original.ingredients[2].amount}</span
        >
      </span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<RecipeRow> })}
  {@const typeCol = table.getColumn("type")}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={[
        { label: "Alchemy", value: "Alchemy" },
        { label: "Cooking", value: "Cooking" },
        { label: "Crafting", value: "Crafting" },
      ]}
    />
  {/if}
{/snippet}

<svelte:head>
  <title>Crafting Recipes - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Crafting, alchemy, and cooking recipes for Ancient Kingdoms - ingredients and skill requirements."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb
    items={[{ label: "Home", href: "/" }, { label: "Crafting Recipes" }]}
  />

  <h1 class="text-3xl font-bold">Crafting Recipes</h1>

  <DataTable
    data={dataWithVirtual}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[
      { id: "type", desc: false },
      { id: "tier", desc: false },
      { id: "result_item_name", desc: false },
    ]}
    urlKey="recipes"
    showPagination={true}
    showSearch={true}
    showColumnToggle={false}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search recipes..."
    class="bg-muted/30"
    onVisibleRowsChange={handleVisibleRowsChange}
  />
</div>
