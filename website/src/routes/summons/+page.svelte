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

  <Card.Root id="pets-and-familiars" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Combat pets and familiars</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 leading-6 text-muted-foreground">
      <!-- Source: server-scripts/SummonSkill.cs:22-85; server-scripts/PetSkills.cs:25-49,60-65; server-scripts/PlayerSkills.cs:1361-1371; server-scripts/Pet.cs:3966-3977 — combat pets and familiars share one active slot, but use different level and skill rules. -->
      <p>
        A combat pet and a familiar share 1 active pet slot. Summoning either
        while that slot is occupied fails.
      </p>
      <dl class="grid gap-2 sm:grid-cols-[minmax(8rem,auto)_1fr]">
        <dt class="font-medium text-foreground">Combat pet</dt>
        <dd>
          Matches your level, up to its cap. Its skills start at rank 1, reach
          rank 2 at 20 total veteran points, and gain another rank every 10
          points, up to each skill's cap. It attacks and disappears on death.
        </dd>
        <dt class="font-medium text-foreground">Familiar</dt>
        <dd>
          Matches your summoning skill rank. Its buffs stop at their maximum
          rank. It does not attack and disappears on death.
        </dd>
      </dl>
      <!-- Source: server-scripts/Pet.cs:2184-2195; server-scripts/PetSkills.cs:25-49,170-200; exported-data/skills.json:126808-126811,127043-127046,126473-126476 — familiars apply the exported Wizard buffs at their skill rank. -->
      <div>
        <h3 class="font-medium text-foreground">
          Wizard familiar buffs per rank
        </h3>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          <li>
            <a
              href="/summons/blue_fairy"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Blue Familiar</a
            >: +2 Mana regeneration per second.
          </li>
          <li>
            <a
              href="/summons/red_fairy"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Red Familiar</a
            >: +1% accuracy.
          </li>
          <li>
            <a
              href="/summons/arcane_fairy"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Arcane Familiar</a
            >: +1.5% spell power.
          </li>
        </ul>
      </div>
      <!-- Source: server-scripts/Pet.cs:3952-3963,4194-4205; server-scripts/GameManager.cs:1832-1919 — combat pets accept companion attack orders. -->
      <p>
        Combat pets use companion <a
          href="/mercenaries#commands"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >commands and stances</a
        >.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="friendly-followers" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Friendly pets and whistles</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 leading-6 text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:4112-4144,4227-4263; server-scripts/FriendlyPetFollowerItem.cs:34-55,84-96 — up to three active followers, one per whistle type; another use dismisses, and portal travel recreates them. -->
      <p>
        Whistle followers do not use the combat pet slot. You can have up to 3
        active followers, one per whistle type. Using that whistle again
        dismisses its follower without consuming the whistle.
      </p>
      <!-- Source: server-scripts/PetFriendly.cs:379-386,433-454; server-scripts/Player.cs:4227-4263 — followers need a matching inventory whistle; portal travel recreates them at the destination. -->
      <p>
        Keep each follower's whistle in your inventory. Without it, the follower
        disappears. Active followers return at the destination after portal
        travel.
      </p>
      <!-- Source: server-scripts/FriendlyPetFollowerItem.cs:58-81; server-scripts/Player.cs:4184-4200 — whistle names support up to 20 characters and updates apply to active followers. -->
      <p>
        A whistle name can have up to 20 characters. It uses letters, with
        spaces, apostrophes, or hyphens between letter groups. An empty name
        restores the default. Renaming updates its active follower.
      </p>
      <!-- Source: server-scripts/PetFriendly.cs:688-702; server-scripts/Player.cs:13156-13160 — petting a nearby follower grants 1–4 standing with its faction at most once every 30 seconds per animal. -->
      <p>
        Petting a nearby follower gives 1–4 standing with its faction at most
        once per 30 seconds per animal. See <a
          href="/mechanics/reputation#pets"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >petting and reputation</a
        >.
      </p>
    </Card.Content>
  </Card.Root>
</div>
