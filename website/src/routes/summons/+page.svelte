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
  import * as Card from "$lib/components/ui/card";
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
    { accessorKey: "type_monster", header: "Class" },
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

  <Card.Root id="pets-and-familiars" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Combat pets and familiars</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm leading-6 text-muted-foreground">
      <!-- Source: server-scripts/SummonSkill.cs:22-85; PetSkills.cs:25-49,60-65; Pet.cs:3966-3977; PlayerParty.cs:91-139; Player.cs:4112-4173; PetFriendly.cs:363-405 — pet slot, scaling, attacks, death, and separate whistle-follower limit. -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[42rem] text-left">
          <thead class="border-b text-foreground">
            <tr
              ><th class="py-2 pr-5">Type</th><th class="py-2 pr-5"
                >Active slot</th
              ><th class="py-2 pr-5">Level source</th><th class="py-2 pr-5"
                >Attacks?</th
              ><th class="py-2 pr-5">Party place?</th><th class="py-2"
                >On death</th
              ></tr
            >
          </thead>
          <tbody>
            <tr class="border-b">
              <th class="py-2 pr-5 font-medium text-foreground">Combat pet</th>
              <td class="py-2 pr-5">One shared pet slot</td>
              <td class="py-2 pr-5"
                ><span class="block">Your level, up to its cap.</span><span
                  class="block">Skills scale with veteran level.</span
                ></td
              >
              <td class="py-2 pr-5">Yes</td><td class="py-2 pr-5">No</td><td
                class="py-2"
                ><span class="block">Vanishes.</span><span class="block"
                  >Summon again.</span
                ></td
              >
            </tr>
            <tr class="border-b">
              <th class="py-2 pr-5 font-medium text-foreground">Familiar</th>
              <td class="py-2 pr-5">The same pet slot</td>
              <td class="py-2 pr-5"
                ><span class="block">Summoning skill rank.</span><span
                  class="block">Buff rank has its own cap.</span
                ></td
              >
              <td class="py-2 pr-5">No</td><td class="py-2 pr-5">No</td><td
                class="py-2"
                ><span class="block">Vanishes.</span><span class="block"
                  >Summon again.</span
                ></td
              >
            </tr>
            <tr>
              <th class="py-2 pr-5 font-medium text-foreground"
                >Whistle follower</th
              >
              <td class="py-2 pr-5">Separate three-follower limit</td>
              <td class="py-2 pr-5">No combat level</td>
              <td class="py-2 pr-5">No</td><td class="py-2 pr-5">No</td><td
                class="py-2">No combat death</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Pet.cs:2184-2195; PetSkills.cs:25-49,170-200; exported-data/pets.json:1-59,122-179; exported-data/skills.json:126334-126387,126601-126654,126868-126921 — familiar buff selection and the three exported effect types. -->
      <p>
        <span class="block">Wizard familiars provide these buffs:</span>
        <span class="block"
          ><a
            href="/summons/blue_fairy"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Blue Familiar</a
          > improves Mana regeneration.</span
        >
        <span class="block"
          ><a
            href="/summons/red_fairy"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Red Familiar</a
          > improves accuracy.</span
        >
        <span class="block"
          ><a
            href="/summons/arcane_fairy"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Arcane Familiar</a
          > improves spell power.</span
        >
      </p>
      <!-- Source: server-scripts/Pet.cs:3952-3963,4194-4205; GameManager.cs:1832-1919 — combat pets receive companion attack orders. -->
      <p>
        <span class="block"
          >Combat pets use companion <a
            href="/mercenaries#commands"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >commands and stances</a
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="friendly-followers" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Friendly pets and whistles</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm leading-6 text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:4112-4173,4227-4263; FriendlyPetFollowerItem.cs:34-55,84-96 — maximum three, one per whistle item type, reuse, and recreation after portal travel. -->
      <p>
        <span class="block">You can have up to three active followers.</span>
        <span class="block"
          >A second use of the same whistle type dismisses its follower.</span
        >
        <span class="block">Using a whistle does not consume it.</span>
        <span class="block"
          >Portal travel recreates active followers at the destination.</span
        >
      </p>
      <!-- Source: server-scripts/PetFriendly.cs:379-386,433-454; FriendlyPetFollowerItem.cs:58-81; Player.cs:4184-4200 — the follower needs a matching inventory whistle, and the custom name belongs to the item. -->
      <p>
        <span class="block"
          >Keep the matching whistle in your inventory or its follower
          disappears.</span
        >
        <span class="block"
          >A whistle can hold a custom name of up to 20 characters.</span
        >
        <span class="block"
          >Names use letters with spaces, apostrophes, or hyphens between letter
          groups.</span
        >
        <span class="block">An empty name restores the default.</span>
        <span class="block"
          >Renaming the whistle updates its matching active follower.</span
        >
      </p>
      <!-- Source: server-scripts/PetFriendly.cs:688-702; Player.cs:13156-13160 — petting grants 1–4 standing with the follower's faction at most once per 30 seconds per animal. -->
      <p>
        <span class="block"
          >Petting a nearby follower gives 1–4 standing with its faction at most
          once every 30 seconds.</span
        >
        <span class="block"
          >See <a
            href="/mechanics/reputation#pets"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >petting and reputation</a
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

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
</div>
