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
  import Swords from "@lucide/svelte/icons/swords";
  import Sparkles from "@lucide/svelte/icons/sparkles";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/summons",
      name: "Summons — Ancient Kingdoms Compendium",
      description: `Searchable database of ${data.summons.length.toLocaleString()} companions, familiars, and pets in Ancient Kingdoms.`,
      items: data.summons.map((summon) => ({
        name: summon.name,
        path: summon.summoning_item
          ? `/items/${summon.summoning_item.id}`
          : `/summons/${summon.id}`,
      })),
    }),
  );

  const uniqueKinds = $derived(
    Array.from(new Set(data.summons.map((s) => s.kind))).sort(),
  );

  // Source: server-scripts/PetSkills.cs:25-49; server-scripts/Buff.cs:91,240,254; exported-data/skills.json — each familiar's buff per rank and its maximum rank.
  const FAMILIAR_EFFECTS: Record<string, string> = {
    blue_fairy: "+2 Mana per second per rank, up to rank 8",
    red_fairy: "+1% accuracy per rank, up to rank 8",
    arcane_fairy: "+1.5% spell power per rank, up to rank 10",
  };

  function effectText(summon: SummonListView): string {
    if (summon.kind === "Companion") return "Fights beside you";
    if (summon.kind === "Pet") return "Follows you, no combat role";
    const effect = FAMILIAR_EFFECTS[summon.id];
    if (!effect) throw new Error(`No familiar effect for ${summon.id}`);
    return effect;
  }

  const columnLabels: Record<string, string> = {
    effect: "What it does",
    obtain: "How to get it",
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
    {
      id: "effect",
      header: "What it does",
      accessorFn: (summon) => effectText(summon),
      enableSorting: false,
    },
    { id: "obtain", header: "How to get it", enableSorting: false },
  ];

  const kindCounts = $derived(
    Object.fromEntries(
      ["Companion", "Familiar", "Pet"].map((kind) => [
        kind,
        data.summons.filter((summon) => summon.kind === kind).length,
      ]),
    ),
  );
</script>

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<SummonListView, unknown>;
  row: Row<SummonListView>;
})}
  {#if cell.column.id === "name" && row.original.summoning_item}
    <EntityLink
      href="/items/{row.original.summoning_item.id}"
      name={row.original.name}
      variant="reference"
      domain="item"
      entityId={row.original.summoning_item.id}
      imageKind="pet"
      imageAvailable={Boolean(row.original.visualAsset)}
      fallback={PawPrint}
      size={32}
      class="whitespace-nowrap"
    />
  {:else if cell.column.id === "name"}
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
  {:else if cell.column.id === "obtain"}
    {#if row.original.summoning_item}
      <a
        href="/items/{row.original.summoning_item.id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.summoning_item.name}
      </a>
    {:else if row.original.summoning_class_id && row.original.summoning_skill_id}
      {@const config = getClassConfig(row.original.summoning_class_id)}
      <span>
        <a
          href="/classes/{row.original.summoning_class_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{config.name}</a
        >
        skill
        <a
          href="/skills/{row.original.summoning_skill_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{row.original.summoning_skill_name}</a
        >
      </span>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else if cell.getValue() === "—"}
    <span class="text-muted-foreground">—</span>
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
  description="Companions, familiars, and whistle pets in Ancient Kingdoms — which class or item summons each one and how summons differ."
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
    <div class="grid gap-4 lg:grid-cols-3">
      <div
        class="flex flex-col overflow-hidden rounded-lg border bg-muted/30 text-sm"
      >
        <div class="flex items-center gap-3 border-b px-4 py-3">
          <Swords class="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <h3 class="text-base font-semibold">Companions</h3>
            <p class="text-muted-foreground">Fight beside you</p>
          </div>
          <span class="ml-auto tabular-nums text-muted-foreground"
            >{kindCounts.Companion}</span
          >
        </div>
        <dl class="divide-y">
          <!-- Source: server-scripts/SummonSkill.cs:22-85 — a companion or familiar occupies the single summon slot, so a second summon fails while one is active. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Slot</dt>
            <dd class="text-right">Shared summon slot</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Active</dt>
            <dd class="text-right">1 companion or familiar</dd>
          </div>
          <!-- Source: server-scripts/SummonSkill.cs:76 — a familiar spawns at the summoning skill level, and a companion at the player level up to its cap. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Level</dt>
            <dd class="text-right">Your level, capped</dd>
          </div>
          <!-- Source: server-scripts/Pet.cs:3966-3977 — a dead combat pet or familiar is removed. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">On death</dt>
            <dd class="text-right">Summon it again</dd>
          </div>
        </dl>
        <ul
          class="list-disc space-y-1 border-t py-3 pl-8 pr-4 text-muted-foreground"
        >
          <!-- Source: server-scripts/PetSkills.cs:25-49; server-scripts/PlayerSkills.cs:1361-1371 — combat pet skill rank starts at 1, reaches 2 at 20 veteran points, then rises every 10 points up to each skill's cap. -->
          <li>Skills gain a rank every 10 veteran points.</li>
          <!-- Source: server-scripts/Pet.cs:3952-3963,4194-4205; server-scripts/GameManager.cs:1832-1919 — combat pets accept companion commands and stances. -->
          <li>
            Takes the mercenary <a
              href="/mercenaries#commands"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >commands and stances</a
            >.
          </li>
        </ul>
      </div>
      <div
        class="flex flex-col overflow-hidden rounded-lg border bg-muted/30 text-sm"
      >
        <div class="flex items-center gap-3 border-b px-4 py-3">
          <Sparkles class="h-5 w-5 shrink-0 text-sky-500" />
          <div>
            <h3 class="text-base font-semibold">Familiars</h3>
            <p class="text-muted-foreground">Buff you, never fight</p>
          </div>
          <span class="ml-auto tabular-nums text-muted-foreground"
            >{kindCounts.Familiar}</span
          >
        </div>
        <dl class="divide-y">
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Slot</dt>
            <dd class="text-right">Shared summon slot</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Active</dt>
            <dd class="text-right">1 companion or familiar</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Level</dt>
            <dd class="text-right">Summoning skill rank</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">On death</dt>
            <dd class="text-right">Summon it again</dd>
          </div>
        </dl>
      </div>
      <div
        class="flex flex-col overflow-hidden rounded-lg border bg-muted/30 text-sm"
      >
        <div class="flex items-center gap-3 border-b px-4 py-3">
          <PawPrint class="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <h3 class="text-base font-semibold">Pets</h3>
            <p class="text-muted-foreground">Follow you for company</p>
          </div>
          <span class="ml-auto tabular-nums text-muted-foreground"
            >{kindCounts.Pet}</span
          >
        </div>
        <dl class="divide-y">
          <!-- Source: server-scripts/Player.cs:4112-4144 — up to three followers, keyed by whistle item, outside the summon slot. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Slot</dt>
            <dd class="text-right">Own pet slots</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Active</dt>
            <dd class="text-right">3, one per whistle type</dd>
          </div>
          <!-- Source: server-scripts/PetFriendly.cs:9-25 — a friendly follower has no level or health. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Level</dt>
            <dd class="text-right">None</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">On death</dt>
            <dd class="text-right">Cannot die</dd>
          </div>
        </dl>
        <ul
          class="list-disc space-y-1 border-t py-3 pl-8 pr-4 text-muted-foreground"
        >
          <!-- Source: server-scripts/FriendlyPetFollowerItem.cs:34-55,84-96 — using the whistle of an active follower dismisses it, and the whistle has unlimited charges. -->
          <li>Use the whistle again to dismiss the pet.</li>
          <!-- Source: server-scripts/PetFriendly.cs:379-386,433-454; server-scripts/Player.cs:4227-4263 — a follower without its inventory whistle is removed, and active followers return after portal travel. -->
          <li>The pet leaves if its whistle is not in your inventory.</li>
          <!-- Source: server-scripts/PetFriendly.cs:688-702; server-scripts/Player.cs:13156-13160 — petting grants 1–4 faction standing every 30 seconds per animal. -->
          <li>
            <a
              href="/mechanics/reputation#pets"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Petting</a
            > gives 1–4 faction standing.
          </li>
        </ul>
      </div>
    </div>
  </section>
</div>
