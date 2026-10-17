<script lang="ts">
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
  import { detailTitle } from "$lib/seo/title";
  import { getClassConfig } from "$lib/utils/classes";
  import {
    MERCENARY_COMPANION_SPELL_POWER_SHARE,
    MERCENARY_REAPER_OWNER_LEVEL,
  } from "$lib/utils/merc-stats";
  import type { PetClassLink, PetDetailView } from "$lib/types/pets";
  import { statName, formatStat } from "$lib/stats";
  import { formatPercent } from "$lib/utils/format";
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

  const summonedByColumns = $derived<ColumnDef<PetClassLink>[]>([
    {
      accessorKey: "class_id",
      header: pet.classLink.mercenary ? "Mercenary" : "Class",
    },
    { accessorKey: "skill_id", header: "Via skill" },
  ]);

  const statsScale = $derived(
    pet.stats.some((stat) => stat.level1 !== stat.atCap),
  );
  const statUnit = $derived(pet.kind === "Familiar" ? "Rank" : "Level");
</script>

{#snippet renderSummonedByCell({
  cell,
  row,
}: {
  cell: Cell<PetClassLink, unknown>;
  row: Row<PetClassLink>;
})}
  {#if cell.column.id === "class_id" && row.original.mercenary}
    <a
      href={petHref(row.original.mercenary.id, true)}
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.mercenary.name}
    </a>
  {:else if cell.column.id === "class_id"}
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
  title={detailTitle(pet.name, {
    family: pet.kind,
    source: pet.classLink.mercenary?.name ?? pet.classLink.skill_name,
  })}
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
      <span>Creature type: {pet.type_monster}</span>
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
      Summoned by
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
    <!-- Source: server-scripts/Health.cs:34; NecromancerPetStats.cs:50 — Health applies its exported multiplier before rounding, and the veteran Health bonus rounds separately from the unrounded multiplied base. -->
    <!-- Source: server-scripts/NecromancerPetStats.cs:GetVeteranBonus,GetDamageBonus,GetMagicDamageBonus,GetHealthBonus — up to 200 veteran points add rounded bonuses to Health, damage, defense, and resistances, not block or critical chance. -->
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
              <Table.Head class="table-cell text-right">
                Level {pet.level_max}, 200 total veteran points
              </Table.Head>
            {/if}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each pet.stats as stat, index (stat.id)}
            <Table.Row class={index % 2 === 1 ? "[&>td]:bg-muted/50" : ""}>
              <Table.Cell class="table-cell font-medium"
                >{statName(stat.id)}</Table.Cell
              >
              <Table.Cell class="table-cell text-right tabular-nums">
                {formatStat(stat.id, stat.level1)}
              </Table.Cell>
              {#if statsScale}
                <Table.Cell class="table-cell text-right tabular-nums">
                  {formatStat(stat.id, stat.atCap)}
                </Table.Cell>
              {/if}
              {#if pet.has_necromancer_pet_stats}
                <Table.Cell class="table-cell text-right tabular-nums">
                  {formatStat(stat.id, stat.withVeteran)}
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
    <!-- Source: server-scripts/Skills.cs:174-185; SummonSkill.cs:84-97 — owner pet-health passives add maximum Health, while Symbiosis copies attributes, defense, and resistances at summon time. -->
    <p class="text-muted-foreground">
      These values exclude your passive skills and other buffs.
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
        {#if pet.classLink.mercenary}
          {@const mercenary = pet.classLink.mercenary}
          <dl class="space-y-2">
            <!-- Source: server-scripts/NecromancerMercenaryPet.cs:RefreshFromSummoner — the companion takes the player's level, up to Level.max. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>Matches your regular level, up to level {pet.level_max}.</dd>
            </div>
            <!-- Source: server-scripts/MercenarySummonSkill.cs:UsesReaper,GetPrefab; NecromancerMercenarySummons.cs:NeedsCompanion — the summon skill picks the archer below owner level 50 and the reaper from it, and a form change replaces the active companion. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Summoned</dt>
              <dd>
                {#if mercenary.form === "reaper"}
                  The
                  <a
                    href={petHref(mercenary.id, true)}
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{mercenary.name}</a
                  >
                  summons it once you reach level {MERCENARY_REAPER_OWNER_LEVEL},
                  replacing its earlier companion.
                {:else}
                  The
                  <a
                    href={petHref(mercenary.id, true)}
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{mercenary.name}</a
                  >
                  summons it while you are below level {MERCENARY_REAPER_OWNER_LEVEL}.
                  At level {MERCENARY_REAPER_OWNER_LEVEL}, another companion
                  replaces it.
                {/if}
              </dd>
            </div>
            <!-- Source: server-scripts/NecromancerMercenaryPet.cs:RefreshFromSummoner,GetDamageBonus,GetMagicDamageBonus — Attack Power and Spell Power each gain RoundToInt(10% of the mercenary's Spell Power), and no veteran bonus applies. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">
                {statName("attack_power")} and {statName("spell_power")}
              </dt>
              <dd class="space-y-1">
                <p>
                  Each gains {formatPercent(
                    MERCENARY_COMPANION_SPELL_POWER_SHARE,
                    { decimals: 0 },
                  )} of its mercenary's Spell Power. It has no separate veteran stat
                  bonus.
                </p>
              </dd>
            </div>
            <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — a NecromancerMercenaryPet ranks its skills like a mercenary, with a minimum of 1. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Skill ranks</dt>
              <dd>
                Gains one rank per 5 character levels and per 10 total veteran
                points, up to each skill's maximum. Uses the
                <a
                  href="/mercenaries#skill-ranks"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >mercenary skill rank</a
                >
                for your level and total veteran points.
              </dd>
            </div>
            <!-- Source: server-scripts/NecromancerMercenaryPet.cs:CanAttack — the companion attacks only its living summoner's target while both are in aggressive stance. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Targets</dt>
              <dd>
                Attacks only its mercenary's target while the companion and
                mercenary are both in aggressive stance.
              </dd>
            </div>
            <!-- Source: server-scripts/NecromancerMercenarySummons.cs:LateUpdate,HasLivingSummoner — the companion is removed when its mercenary or owner dies, and its death restarts the summon cooldown. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Lifetime</dt>
              <dd>
                It disappears when its mercenary or you die. When it dies, its
                mercenary must wait the full summon cooldown before summoning
                another.
              </dd>
            </div>
          </dl>
        {:else if pet.kind === "Companion"}
          <dl class="space-y-2">
            <!-- Source: server-scripts/SummonSkill.cs:99; NecromancerPetStats.cs:38 — companion level is capped by Level.max, and undead companions refresh from their owner's level. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>
                Matches your regular level, up to level {pet.level_max}.
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
              <!-- Source: server-scripts/NecromancerPetStats.cs:RefreshFromOwner,GetVeteranBonus,GetDamageBonus,GetMagicDamageBonus,GetHealthBonus; Experience.cs:85,380,RefreshNecromancerPet — owner level and veteran gains refresh the pet; up to 200 veteran points add 0.01 per point to base damage and magic damage and 0.0025 per point to base Health, defense, and resistances. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">
                  Veteran bonus
                </dt>
                <dd class="space-y-1">
                  <p>
                    Up to 200 total veteran points, each point adds 1% of base
                    Attack Power and Spell Power, and 0.25% of base maximum Hit
                    Points, Armor Class, and each resistance. Compare
                    <a
                      href="/summons#undead-title"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >undead companions</a
                    >. The table above shows the stats at 200 points.
                  </p>
                </dd>
              </div>
            {:else if pet.classLink.class_id === "druid"}
              <!-- Source: server-scripts/SummonSkill.cs:73-97 — each rank of Symbiosis copies 0.1 of the Druid's attributes, defense, and resistances to the summoned pet. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">Symbiosis</dt>
                <dd>
                  Each rank of <a
                    href="/skills/symbiosis"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Symbiosis</a
                  > gives this companion 10% of your attributes, Armor Class, and
                  each resistance when summoned.
                </dd>
              </div>
            {/if}
            <!-- Source: server-scripts/SummonSkill.cs:UsesPetAttackCommand,MatchesPet,Apply. -->
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Summon key</dt>
              <dd>
                Sends this active companion to attack your target.
                {#if pet.has_necromancer_pet_stats}
                  Casting a different undead summon replaces it.
                {/if}
              </dd>
            </div>
            {#if pet.healthPassives?.length}
              <!-- Source: server-scripts/Skills.cs:174-185 — learned pet maximum-health passives apply to the companion and exclude the player. -->
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">
                  {statName("health")}
                </dt>
                <dd>
                  {#each pet.healthPassives as passive (passive.id)}
                    <a
                      href="/skills/{passive.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >{passive.name}</a
                    >
                    increases this companion's maximum Hit Points by
                    {formatPercent(passive.health_percent_min, {
                      decimals: 2,
                    })}{passive.health_percent_max !==
                    passive.health_percent_min
                      ? ` to ${formatPercent(passive.health_percent_max, { decimals: 2 })}`
                      : ""}, depending on rank.
                  {/each}
                  These passives do not increase your own maximum Hit Points.
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
              <dt class="text-muted-foreground w-40 shrink-0">On death</dt>
              <dd>Summon it again after it dies.</dd>
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
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">On death</dt>
              <dd>Summon it again after it dies.</dd>
            </div>
          </dl>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
</div>
