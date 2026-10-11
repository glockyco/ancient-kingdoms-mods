<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PetSkillsTable from "$lib/components/PetSkillsTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { getClassConfig } from "$lib/utils/classes";
  import type { PetClassLink, PetDetailView } from "$lib/types/pets";
  import type { PetHealthPassive } from "$lib/queries/pet-passives.server";
  import { petHref } from "$lib/utils/pets";
  import { base } from "$app/paths";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import type { EntityVisualAsset } from "$lib/types/visual-assets";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import PawPrint from "@lucide/svelte/icons/paw-print";
  import Zap from "@lucide/svelte/icons/zap";
  import Info from "@lucide/svelte/icons/info";

  // Detail layout for summons (companions and familiars). Mercenaries use
  // MercenaryDetail.
  let {
    pet,
    description,
    visualAsset,
  }: {
    pet: PetDetailView & { healthPassives?: PetHealthPassive[] };
    description: string;
    visualAsset: EntityVisualAsset | null;
  } = $props();

  const spriteSrc = $derived(
    visualAsset ? `${base}/${visualAsset.public_path}` : null,
  );

  const summonedByColumns: ColumnDef<PetClassLink>[] = [
    { accessorKey: "class_id", header: "Class" },
    { accessorKey: "skill_id", header: "Via Skill" },
  ];

  const statsScale = $derived(
    pet.stats.some((stat) => stat.level1 !== stat.atCap),
  );
  const statUnit = $derived(pet.kind === "Familiar" ? "Rank" : "Level");
  const formatStat = (value: number, isPercent: boolean) =>
    isPercent
      ? `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`
      : value.toLocaleString("en-US");
</script>

{#snippet renderSummonedByCell({
  cell,
  row,
}: {
  cell: Cell<PetClassLink, unknown>;
  row: Row<PetClassLink>;
})}
  {#if cell.column.id === "class_id"}
    {@const config = getClassConfig(row.original.class_id)}
    <a
      href="/classes/{row.original.class_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {config.name}
    </a>
  {:else if cell.column.id === "skill_id"}
    {#if row.original.skill_id && row.original.skill_name}
      <a
        href="/skills/{row.original.skill_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.skill_name}
      </a>
    {:else}
      <span class="text-muted-foreground">—</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<Seo
  title={`${pet.name} - Ancient Kingdoms`}
  {description}
  path={petHref(pet.id, false)}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Summons", href: "/summons" },
      { label: pet.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{pet.name}</h1>
      <span
        class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      >
        {pet.kind}
      </span>
    </div>
    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span>Class: {pet.type_monster}</span>
    </div>
  </div>
  {#if visualAsset}
    <section aria-labelledby="pet-summary-title">
      <h2 id="pet-summary-title" class="sr-only">Appearance</h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <div class="flex min-h-32 w-full items-center justify-center">
          <EntityIcon
            src={spriteSrc}
            alt={`${pet.name} sprite`}
            width={visualAsset.width ?? 224}
            height={visualAsset.height ?? 224}
            size={224}
            fallback={PawPrint}
            bordered={false}
            class="max-h-56 max-w-full object-contain [image-rendering:pixelated]"
          />
        </div>
      </div>
    </section>
  {/if}

  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <MapPin class="h-5 w-5 text-emerald-500" />
      Summoned By
    </h2>
    <DataTable
      data={[pet.classLink]}
      columns={summonedByColumns}
      renderCell={renderSummonedByCell}
      urlKey="pet-{pet.id}-summoned-by"
      pageSize={10}
      zebraStripe={true}
      class="bg-muted/30"
    />
  </section>

  <section aria-labelledby="pet-stats-title" class="space-y-4">
    <h2 id="pet-stats-title" class="text-xl font-semibold">Base stats</h2>
    <!-- Source: server-scripts/LinearInt.cs:10-13; LinearFloat.cs:10-13; SummonSkill.cs:99 — stats scale from their base values with level, companions stop at Level.max, and familiars use the summoning skill rank. -->
    <!-- Source: server-scripts/Health.cs:34; NecromancerPetStats.cs:48 — Health applies its exported multiplier before rounding, and the veteran Health bonus rounds separately from the unrounded multiplied base. -->
    <!-- Source: server-scripts/NecromancerPetStats.cs:36-48,61-108 — up to 200 veteran points add rounded bonuses to Health, damage, defense, and resistances, not block or critical chance. -->
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <Table.Root class="text-base">
        <Table.Header>
          <Table.Row>
            <Table.Head class="table-cell">Stat</Table.Head>
            {#if statsScale}
              <Table.Head class="table-cell text-right">{statUnit} 1</Table.Head
              >
              <Table.Head class="table-cell text-right">
                {statUnit}
                {pet.effective_max_level}
              </Table.Head>
            {:else}
              <Table.Head class="table-cell text-right">All levels</Table.Head>
            {/if}
            {#if pet.has_necromancer_pet_stats}
              <Table.Head class="table-cell text-right whitespace-normal">
                Level {pet.level_max}<br />+200 veteran points
              </Table.Head>
            {/if}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each pet.stats as stat, index (stat.name)}
            <Table.Row class={index % 2 === 1 ? "[&>td]:bg-muted/50" : ""}>
              <Table.Cell class="table-cell font-medium">{stat.name}</Table.Cell
              >
              <Table.Cell class="table-cell text-right tabular-nums">
                {formatStat(stat.level1, stat.isPercent)}
              </Table.Cell>
              {#if statsScale}
                <Table.Cell class="table-cell text-right tabular-nums">
                  {formatStat(stat.atCap, stat.isPercent)}
                </Table.Cell>
              {/if}
              {#if pet.has_necromancer_pet_stats}
                <Table.Cell class="table-cell text-right tabular-nums">
                  {formatStat(stat.withVeteran, stat.isPercent)}
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
    <!-- Source: server-scripts/Skills.cs:174-185; SummonSkill.cs:84-97 — owner pet-health passives add maximum Health, while Symbiosis copies attributes, defense, and resistances at summon time. -->
    <p class="text-muted-foreground">
      These values exclude owner passives and other buffs.
      {#if pet.healthPassives?.length}
        {#each pet.healthPassives as passive (passive.id)}
          <a
            href="/skills/{passive.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{passive.name}</a
          >
          adds to maximum Health when learned.
        {/each}
      {/if}
      {#if pet.classLink.class_id === "druid"}
        Symbiosis adds your copied attributes, defense, and resistances.
      {/if}
    </p>
  </section>

  {#if pet.skills.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Zap class="h-5 w-5 text-purple-500" />
        Skills ({pet.skills.length})
      </h2>
      <PetSkillsTable skills={pet.skills} urlKey="pet-{pet.id}-skills" />
    </section>
  {/if}

  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <Info class="h-5 w-5 text-muted-foreground" />
      Mechanics
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content>
        {#if pet.kind === "Companion"}
          <dl class="space-y-2">
            <!-- Source: server-scripts/SummonSkill.cs:99; NecromancerPetStats.cs:36 — companion level is capped by Level.max, and undead companions refresh from their owner's level. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>
                {#if pet.has_necromancer_pet_stats}
                  Matches your regular level, up to level {pet.level_max}, and
                  refreshes when you level up.
                {:else}
                  Matches your regular level, up to level {pet.level_max}.
                {/if}
              </dd>
            </div>
            <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — combat pet skill ranks use total veteran points divided by 10 and cap at each skill's maxLevel. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Skill ranks</dt>
              <dd>
                Skills gain a rank every 10 veteran points, up to each skill's
                maximum rank.
              </dd>
            </div>
            {#if pet.has_necromancer_pet_stats}
              <!-- Source: server-scripts/NecromancerPetStats.cs:RefreshFromOwner,GetVeteranBonus,GetHealthBonus,61-99; Experience.cs:85,380,RefreshNecromancerPet — owner level and veteran gains refresh the pet; up to 200 veteran points add 0.0025 per point to base Health, damage, magic damage, defense, and resistances. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">
                  Veteran bonus
                </dt>
                <dd class="space-y-1">
                  <p>
                    Each of your veteran points adds 0.25% of base Health to
                    maximum Health and 0.25% of base physical damage, magic
                    damage, defense, and each resistance, rounded. The bonus
                    caps at +50% with 200 points and refreshes whenever you gain
                    a veteran point.
                  </p>
                  <RoundingDefinition />
                </dd>
              </div>
              <!-- Source: server-scripts/SummonSkill.cs:UsesPetAttackCommand,MatchesPet,Apply — a Necromancer replaces an active pet with a different non-familiar summon; the matching summon key commands its active pet. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">Summon key</dt>
                <dd>
                  Commands this pet while it is active. Casting a different
                  undead summon replaces it.
                </dd>
              </div>
            {:else if pet.classLink.class_id === "druid"}
              <!-- Source: server-scripts/SummonSkill.cs:73-97 — each rank of Symbiosis copies 0.1 of the owner's attributes, defense, and resistances to the summoned pet. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">Symbiosis</dt>
                <dd>
                  Each rank of <a
                    href="/skills/symbiosis"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Symbiosis</a
                  > gives this companion 10% of your attributes, defense, and each
                  resistance when summoned.
                </dd>
              </div>
            {/if}
            {#if pet.healthPassives?.length}
              <!-- Source: server-scripts/Skills.cs:174-185 — learned pet maximum-health passives apply to the companion and exclude the owner. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">
                  Maximum Health
                </dt>
                <dd>
                  {#each pet.healthPassives as passive (passive.id)}
                    <a
                      href="/skills/{passive.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{passive.name}</a
                    >
                    increases this companion's maximum Health by its listed percentage
                    when learned.
                  {/each}
                  Your own maximum Health is unchanged.
                </dd>
              </div>
            {/if}
            {#if pet.fear_immune}
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">Fear</dt>
                <dd>Immune to Fear.</dd>
              </div>
            {/if}
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">On Death</dt>
              <dd>It vanishes when it dies. Summon it again to restore it.</dd>
            </div>
          </dl>
        {:else}
          <dl class="space-y-2">
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Role</dt>
              <dd>It grants a buff but does not attack.</dd>
            </div>
            <div class="flex gap-2">
              <!-- Source: server-scripts/SummonSkill.cs:99 — familiar level equals the summoning skill rank without the companion Level.max clamp. -->
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>
                Its level matches your rank in
                {#if pet.classLink.skill_id && pet.classLink.skill_name}
                  <a
                    href="/skills/{pet.classLink.skill_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{pet.classLink.skill_name}</a
                  >.
                {:else}
                  the summoning skill.
                {/if}
                Its maximum rank is {pet.effective_max_level}.
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">On Death</dt>
              <dd>It vanishes when it dies. Summon it again to restore it.</dd>
            </div>
          </dl>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
</div>
