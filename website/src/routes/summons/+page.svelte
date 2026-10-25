<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
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
  import { MERCENARY_REAPER_OWNER_LEVEL } from "$lib/utils/merc-stats";
  import { petHref } from "$lib/utils/pets";
  import type { SummonListView } from "$lib/types/pets";
  import PawPrint from "@lucide/svelte/icons/paw-print";
  import Swords from "@lucide/svelte/icons/swords";
  import Sparkles from "@lucide/svelte/icons/sparkles";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/summons",
      name: "Summons — Ancient Kingdoms Compendium",
      description: `Searchable database of ${formatNumber(data.summons.length)} companions, familiars, and pets in Ancient Kingdoms.`,
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
  const uniqueClasses = $derived(
    Array.from(
      new Set(
        data.summons
          .map((s) => s.summoning_class_id)
          .filter((id): id is string => id !== null),
      ),
    ).sort(),
  );
  const undeadSummons = $derived(
    data.summons.filter((summon) => summon.has_necromancer_pet_stats),
  );

  const levelCaps = (summons: SummonListView[]) =>
    [...new Set(summons.map((summon) => summon.level_max))]
      .filter((cap): cap is number => cap !== null)
      .sort((a, b) => a - b)
      .map((cap) => `level ${cap}`)
      .join(" or ");
  const companionCaps = $derived(
    levelCaps(data.summons.filter((summon) => summon.kind === "Companion")),
  );
  const undeadCaps = $derived(levelCaps(undeadSummons));
  // Source: server-scripts/PetSkills.cs:RefreshSkillLevels; server-scripts/Buff.cs:91,240,254; the export's skills.json — each familiar's buff per rank and its maximum rank.
  const FAMILIAR_EFFECTS: Record<string, string> = {
    blue_fairy: "+2 Mana Regeneration per rank, up to rank 8",
    red_fairy: "+1% Accuracy per rank, up to rank 8",
    arcane_fairy: "+1.5% Spell Power per rank, up to rank 10",
  };

  function effectText(summon: SummonListView): string {
    if (summon.kind === "Companion")
      return summon.summoning_mercenary
        ? "Fights beside its mercenary"
        : "Fights beside you";
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
    {
      id: "class",
      header: "Class",
      accessorFn: (summon) => summon.summoning_class_id ?? "",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.getValue(columnId) as string);
      },
    },
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
    {:else if row.original.summoning_mercenary && row.original.summoning_skill_id}
      {@const mercenary = row.original.summoning_mercenary}
      <span>
        <a
          href={petHref(mercenary.id, true)}
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{mercenary.name}</a
        >
        skill
        <a
          href="/skills/{row.original.summoning_skill_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >{row.original.summoning_skill_name}</a
        >,
        {mercenary.form === "reaper"
          ? `from your level ${MERCENARY_REAPER_OWNER_LEVEL}`
          : `below your level ${MERCENARY_REAPER_OWNER_LEVEL}`}
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
  {@const classCol = table.getColumn("class")}
  {#if classCol}
    <DataTableFacetedFilter
      column={classCol}
      title="Class"
      options={uniqueClasses.map((c) => ({
        label: getClassConfig(c).name,
        value: c,
      }))}
    />
  {/if}
{/snippet}

<Seo
  title="Summons - Ancient Kingdoms"
  description="Compare companions, Necromancer undead summons, familiars, and whistle pets in Ancient Kingdoms, including their skills, veteran bonuses, and summoning rules."
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
    initialColumnVisibility={{ class: false }}
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
            >{formatNumber(kindCounts.Companion)}</span
          >
        </div>
        <dl class="divide-y">
          <!-- Source: server-scripts/SummonSkill.cs:Apply — companions and familiars share NetworkactivePet; a Necromancer can replace it by casting a different non-familiar summon. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Slot</dt>
            <dd class="text-right">Shared summon slot</dd>
          </div>
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Active</dt>
            <dd class="text-right">1 companion or familiar</dd>
          </div>
          <!-- Source: server-scripts/SummonSkill.cs:99 — a familiar spawns at the summoning skill level, and a companion at the player level up to its cap. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">Level</dt>
            <dd class="text-right">Your level, up to {companionCaps}</dd>
          </div>
          <!-- Source: server-scripts/Pet.cs:4035-4046 — a dead combat pet or familiar is removed. -->
          <div class="flex justify-between gap-4 px-4 py-2.5">
            <dt class="text-muted-foreground">On death</dt>
            <dd class="text-right">Summon it again</dd>
          </div>
        </dl>
        <ul
          class="list-disc space-y-1 border-t py-3 pl-8 pr-4 text-muted-foreground"
        >
          <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — combat pet skills use total veteran points divided by 10 and cap at each skill's maxLevel. -->
          <li>Skills gain a rank every 10 veteran points.</li>
          <!-- Source: server-scripts/Pet.cs:OnAggro,UserCode_CmdSetAggresiveStance__Boolean; server-scripts/GameManager.cs:OnMercenaryAttackKeyPressed — combat pets accept companion commands and stances. -->
          <li>
            Companions follow the mercenary <a
              href="/mercenaries#commands"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >commands and stances</a
            >.
          </li>
          <!-- Source: server-scripts/SummonSkill.cs:UsesPetAttackCommand,MatchesPet,Apply. -->
          <li>
            Press your active companion's summon key to send it to attack your
            target.
          </li>
          {#if data.healthPassives.length}
            <!-- Source: server-scripts/Skills.cs:174-185 — learned pet maximum-health passives apply to companions owned by the passive's class. -->
            <li>
              {#each data.healthPassives as passive (passive.id)}
                <a
                  href="/skills/{passive.id}"
                  class="text-blue-600 hover:underline dark:text-blue-400"
                  >{passive.name}</a
                >
                increases your companions' maximum Hit Points by
                {formatNumber(
                  passive.health_percent_min * 100,
                )}%{passive.health_percent_max !== passive.health_percent_min
                  ? ` to ${formatNumber(passive.health_percent_max * 100)}%`
                  : ""}, depending on rank.
              {/each}
              Your own maximum Hit Points are unchanged.
            </li>
          {/if}
          <!-- Source: server-scripts/Pet.cs:UpdateServer_CASTING — back-seeking companions flank for melee first skills, bosses, elites or frontal attacks, while close ranged companions step away. -->
          <li>
            Melee companions try to flank enemies. Ranged companions keep their
            distance and try to flank bosses, elites, and enemies with frontal
            attacks. Skeleton does not flank.
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
            >{formatNumber(kindCounts.Familiar)}</span
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
            >{formatNumber(kindCounts.Pet)}</span
          >
        </div>
        <dl class="divide-y">
          <!-- Source: server-scripts/Player.cs:4253-4285 — up to three followers, keyed by whistle item, outside the summon slot. -->
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
          <!-- Source: server-scripts/FriendlyPetFollowerItem.cs:34-55,84-96 — reusing the whistle dismisses its active follower. -->
          <li>Use the whistle again to dismiss the pet.</li>
          <!-- Source: server-scripts/PetFriendly.cs:379-386,433-454 — a follower without its inventory whistle is removed. -->
          <li>The pet leaves if its whistle is not in your inventory.</li>
          <!-- Source: server-scripts/PetFriendly.cs:688-702; server-scripts/Player.cs:13633-13637 — petting grants 1–4 faction standing every 30 seconds per animal. -->
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

  <section
    aria-labelledby="undead-title"
    class="rounded-lg border bg-muted/30 p-5 space-y-4"
  >
    <h2 id="undead-title" class="text-xl font-semibold">
      Necromancer undead summons
    </h2>
    <ul class="flex flex-wrap gap-x-5 gap-y-2">
      {#each undeadSummons as summon (summon.id)}
        <li>
          <a
            href="/summons/{summon.id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
          >
            {summon.name}
          </a>
        </li>
      {/each}
    </ul>
    <!-- Source: server-scripts/NecromancerPetStats.cs:RefreshFromOwner,GetVeteranBonus,GetDamageBonus,GetMagicDamageBonus,GetHealthBonus; Experience.cs:85,380,RefreshNecromancerPet — owner level and veteran gains refresh the pet; up to 200 veteran points add 0.01 per point to base damage and magic damage and 0.0025 per point to base Health, defense, and resistances. -->
    <p>
      These companions grow with your level, up to {undeadCaps}, and veteran
      points. Up to 200 points, each total veteran point adds 1% of base Attack
      Power and Spell Power, and 0.25% of base maximum Hit Points, Armor Class,
      and each resistance. Compare their stats in the pages above.
    </p>
    <!-- Source: server-scripts/SummonSkill.cs:UsesPetAttackCommand,MatchesPet,Apply — a Necromancer replaces NetworkactivePet with a different non-familiar summon; a matching pet uses the summon key as an attack command; other classes receive You already have an active pet. -->
    <p>
      Casting a different undead summon replaces your active companion. Other
      classes must dismiss their active companion or familiar before summoning
      another.
    </p>
  </section>
</div>
