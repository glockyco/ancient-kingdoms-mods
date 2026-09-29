<script lang="ts">
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import { getClassConfig } from "$lib/utils/classes";
  import type { SummonListView } from "$lib/types/pets";
  import PawPrint from "@lucide/svelte/icons/paw-print";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/summons",
      name: "Summons — Ancient Kingdoms Compendium",
      description: `Searchable database of ${data.summons.length.toLocaleString()} summonable companions and familiars in Ancient Kingdoms.`,
      items: data.summons.map((summon) => ({
        name: summon.name,
        path: `/summons/${summon.id}`,
      })),
    }),
  );

  const uniqueKinds = $derived(
    Array.from(new Set(data.summons.map((s) => s.kind))).sort(),
  );

  const columnLabels: Record<string, string> = {
    summoned_by_class: "Summoned By",
    summoned_by_spell: "Spell",
  };

  const columns: ColumnDef<SummonListView>[] = [
    { accessorKey: "name", header: "Name", enableHiding: false },
    {
      accessorKey: "kind",
      header: "Kind",
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    { accessorKey: "type_monster", header: "Creature type" },
    { id: "summoned_by_class", header: "Summoned By", enableSorting: false },
    { id: "summoned_by_spell", header: "Spell", enableSorting: false },
  ];
</script>

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<SummonListView, unknown>;
  row: Row<SummonListView>;
})}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/summons/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="pet"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={Boolean(row.original.visualAsset)}
      fallback={PawPrint}
      size={32}
      class="whitespace-nowrap"
    />
  {:else if cell.column.id === "summoned_by_class"}
    {#if row.original.summoning_class_id}
      {@const config = getClassConfig(row.original.summoning_class_id)}
      <a
        href="/classes/{row.original.summoning_class_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {config.name}
      </a>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else if cell.column.id === "summoned_by_spell"}
    {#if row.original.summoning_skill_id && row.original.summoning_skill_name}
      <a
        href="/skills/{row.original.summoning_skill_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.summoning_skill_name}
      </a>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<SummonListView> })}
  {@const kindCol = table.getColumn("kind")}
  {#if kindCol}
    <DataTableFacetedFilter
      column={kindCol}
      title="Kind"
      options={uniqueKinds.map((k) => ({ label: k, value: k }))}
    />
  {/if}
{/snippet}

<Seo
  title="Summons - Ancient Kingdoms"
  description="Companions and familiars in Ancient Kingdoms — which class summons each one, the spell that calls it, and its skills and stats."
  path="/summons"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Summons" }]} />

  <h1 class="text-3xl font-bold">Summons</h1>
  <DataTable
    data={data.summons}
    {columns}
    {columnLabels}
    {renderCell}
    {renderToolbar}
    pageSize={20}
    initialSorting={[
      { id: "kind", desc: false },
      { id: "name", desc: false },
    ]}
    urlKey="summons"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search summons..."
    class="bg-muted/30"
  />

  <section id="how-summons-work" class="space-y-4">
    <h2 class="text-xl font-semibold">How summons work</h2>
    <!-- Source: server-scripts/SummonSkill.cs:22-85; server-scripts/Player.cs:4112-4144 — combat pets and familiars share one active slot; three friendly followers can be active at once. -->
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Rule</th
            >
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Combat pet</th
            >
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Familiar</th
            >
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Whistle follower</th
            >
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/SummonSkill.cs:22-85; server-scripts/Player.cs:4112-4144 — combat pets and familiars share an occupied slot; whistle followers are separate. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row">Slot</th>
            <td class="px-4 py-2">Shared pet slot</td>
            <td class="px-4 py-2">Shared pet slot</td>
            <td class="px-4 py-2">Separate follower slots</td>
          </tr>
          <!-- Source: server-scripts/SummonSkill.cs:76; server-scripts/PetFriendly.cs:9-25,593-612 — combat pet matches player level up to its cap; familiar matches summon skill rank; follower has no level stat. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row">Level</th>
            <td class="px-4 py-2">Your level, up to its cap</td>
            <td class="px-4 py-2">Summoning skill rank</td>
            <td class="px-4 py-2">No level</td>
          </tr>
          <!-- Source: server-scripts/PetSkills.cs:60-65; server-scripts/Pet.cs:3952-3963; server-scripts/PetFriendly.cs:9-25,335-359 — combat pets attack; familiars and friendly followers do not. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row">Attacks</th>
            <td class="px-4 py-2">Yes</td>
            <td class="px-4 py-2">No</td>
            <td class="px-4 py-2">No</td>
          </tr>
          <!-- Source: server-scripts/Pet.cs:3966-3977; server-scripts/PetFriendly.cs:9-25 — combat pets and familiars disappear on death; friendly followers have no health or combat death. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row">Death</th>
            <td class="px-4 py-2">Disappears</td>
            <td class="px-4 py-2">Disappears</td>
            <td class="px-4 py-2">No combat death</td>
          </tr>
          <!-- Source: server-scripts/SummonSkill.cs:34-85; server-scripts/Player.cs:4125-4138 — one combat pet or familiar, plus three followers at most, one per whistle type. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row">Limit</th>
            <td class="px-4 py-2">1 combined</td>
            <td class="px-4 py-2">1 combined</td>
            <td class="px-4 py-2">3 total, 1 per whistle type</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="font-semibold">Wizard familiar buffs per rank</h3>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Familiar</th
            >
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Each rank gives you</th
            >
            <th
              class="h-10 whitespace-nowrap px-4 text-left font-medium"
              scope="col">Maximum rank</th
            >
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/PetSkills.cs:25-49; server-scripts/Buff.cs:254; exported-data/skills.json:126601-126605,126808-126811 — Blue buff adds 2 Mana per second each rank up to rank 8. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row"
              ><a
                href="/summons/blue_fairy"
                class="text-blue-600 hover:underline dark:text-blue-400">Blue</a
              ></th
            >
            <td class="px-4 py-2">+2 Mana per second</td>
            <td class="px-4 py-2">8</td>
          </tr>
          <!-- Source: server-scripts/PetSkills.cs:25-49; server-scripts/Buff.cs:240; exported-data/skills.json:126868-126872,127043-127046 — Red buff adds 1% accuracy each rank up to rank 8. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row"
              ><a
                href="/summons/red_fairy"
                class="text-blue-600 hover:underline dark:text-blue-400">Red</a
              ></th
            >
            <td class="px-4 py-2">+1% accuracy</td>
            <td class="px-4 py-2">8</td>
          </tr>
          <!-- Source: server-scripts/PetSkills.cs:25-49; server-scripts/Buff.cs:91; exported-data/skills.json:126334-126338,126473-126476 — Arcane buff adds 1.5% spell power each rank up to rank 10. -->
          <tr class="border-b last:border-0">
            <th class="px-4 py-2 text-left font-medium" scope="row"
              ><a
                href="/summons/arcane_fairy"
                class="text-blue-600 hover:underline dark:text-blue-400"
                >Arcane</a
              ></th
            >
            <td class="px-4 py-2">+1.5% spell power</td>
            <td class="px-4 py-2">10</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="font-semibold">Combat pets</h3>
    <!-- Source: server-scripts/PetSkills.cs:25-49; server-scripts/PlayerSkills.cs:1361-1371 — combat pet skill rank starts at 1, reaches 2 at 20 veteran points, then rises by one every 10 points up to each skill's cap. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Combat pet skills start at rank 1. After 20 total veteran points, each 10
      points adds one rank up to the skill's cap.
    </p>
    <!-- Source: server-scripts/Pet.cs:3952-3963,4194-4205; server-scripts/GameManager.cs:1832-1919 — combat pets accept companion commands and stances. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Combat pets use companion <a
        href="/mercenaries#commands"
        class="text-blue-600 hover:underline dark:text-blue-400"
        >commands and stances</a
      >.
    </p>

    <h3 class="font-semibold">Whistle followers</h3>
    <!-- Source: server-scripts/Player.cs:4112-4144; server-scripts/FriendlyPetFollowerItem.cs:34-55,84-96 — using an active follower's whistle again dismisses it without consuming the whistle. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Use a follower's whistle again to dismiss it. This does not consume the
      whistle.
    </p>
    <!-- Source: server-scripts/PetFriendly.cs:379-386,433-454; server-scripts/Player.cs:4227-4263 — followers disappear without their matching inventory whistle and return after portal travel. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Keep each follower's whistle in your inventory or the follower disappears.
      Active followers return after portal travel.
    </p>
    <!-- Source: server-scripts/PetFriendly.cs:688-702; server-scripts/Player.cs:13156-13160 — petting a nearby follower grants 1–4 faction standing every 30 seconds per animal. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Petting a nearby follower gives 1–4 faction standing at most once every 30
      seconds per animal. See <a
        href="/mechanics/reputation#pets"
        class="text-blue-600 hover:underline dark:text-blue-400"
        >petting and reputation</a
      >.
    </p>
  </section>
</div>
