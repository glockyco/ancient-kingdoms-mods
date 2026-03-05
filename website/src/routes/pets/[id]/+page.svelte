<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
  import { getClassConfig } from "$lib/utils/classes";
  import type { ClassSkill } from "$lib/queries/classes.server";
  import type { PetClassLink, PetRecruiter } from "$lib/types/pets";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Zap from "@lucide/svelte/icons/zap";
  import Info from "@lucide/svelte/icons/info";

  let { data } = $props();

  const pet = $derived(data.pet);

  // "Summoned By" table — one row containing the class link
  const summonedByRows = $derived(
    pet.kind !== "Mercenary" ? [pet.classLink] : [],
  );

  const summonedByColumns: ColumnDef<PetClassLink>[] = [
    { accessorKey: "class_id", header: "Class" },
    { accessorKey: "skill_id", header: "Via Skill" },
  ];

  // "Recruited At" table
  const recruitedAtColumns: ColumnDef<PetRecruiter>[] = [
    { accessorKey: "npc_name", header: "Recruiter" },
    { accessorKey: "zone_name", header: "Zone" },
    { id: "map", header: "Map", size: 80, enableSorting: false },
  ];

  // Skills table
  function formatCost(row: ClassSkill): string {
    type LevelValue = { base_value: number; bonus_per_level: number };
    const mana = row.mana_cost
      ? (JSON.parse(row.mana_cost) as LevelValue)
      : null;
    const energy = row.energy_cost
      ? (JSON.parse(row.energy_cost) as LevelValue)
      : null;
    const lv =
      (mana?.base_value ?? 0) > 0
        ? mana
        : (energy?.base_value ?? 0) > 0
          ? energy
          : null;
    if (!lv) return "—";
    if (lv.bonus_per_level === 0) return String(lv.base_value);
    const sign = lv.bonus_per_level > 0 ? "+" : "";
    return `${lv.base_value} (${sign}${lv.bonus_per_level}/lvl)`;
  }

  function formatCooldown(raw: string | null): string {
    if (!raw) return "—";
    const lv = JSON.parse(raw) as { base_value: number };
    if (lv.base_value === 0) return "—";
    return `${lv.base_value}s`;
  }

  const skillColumns: ColumnDef<ClassSkill>[] = [
    { accessorKey: "name", header: "Skill", enableHiding: false },
    { accessorKey: "skill_type", header: "Type" },
    { accessorKey: "max_level", header: "Max Lvl" },
    {
      id: "effect",
      header: "Effect",
      enableSorting: false,
      accessorFn: (row) => formatSkillEffect(row),
    },
    {
      id: "cost",
      header: "Cost",
      enableSorting: false,
      accessorFn: (row) => formatCost(row),
    },
    {
      id: "cooldown",
      header: "Cooldown",
      enableSorting: false,
      accessorFn: (row) => formatCooldown(row.cooldown),
    },
    {
      id: "cast_time",
      header: "Cast Time",
      enableSorting: false,
      accessorFn: (row) => formatCooldown(row.cast_time),
    },
  ];
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

{#snippet renderRecruitedAtCell({
  cell,
  row,
}: {
  cell: Cell<PetRecruiter, unknown>;
  row: Row<PetRecruiter>;
})}
  {#if cell.column.id === "npc_name"}
    <a
      href="/npcs/{row.original.npc_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.npc_name}
    </a>
  {:else if cell.column.id === "zone_name"}
    <a
      href="/zones/{row.original.zone_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.zone_name}
    </a>
  {:else if cell.column.id === "map"}
    <MapLink entityId={row.original.npc_id} entityType="npc" compact={true} />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSkillHeader({
  header,
}: {
  header: Header<ClassSkill, unknown>;
})}
  {#if header.id === "max_level" || header.id === "cost" || header.id === "cooldown" || header.id === "cast_time"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSkillCell({
  cell,
  row,
}: {
  cell: Cell<ClassSkill, unknown>;
  row: Row<ClassSkill>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/skills/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "skill_type"}
    <span class="text-muted-foreground capitalize">
      {String(cell.getValue()).replace(/_/g, " ")}
    </span>
  {:else if cell.column.id === "effect"}
    <span class="text-sm">{cell.getValue()}</span>
  {:else if cell.column.id === "max_level" || cell.column.id === "cost" || cell.column.id === "cooldown" || cell.column.id === "cast_time"}
    <span class="ml-auto">{cell.getValue()}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<svelte:head>
  <title>{pet.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{pet.name} is a {pet.kind.toLowerCase()} in Ancient Kingdoms."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Pets", href: "/pets" },
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
      <span
        >Class:
        {#if pet.kind === "Mercenary"}
          <a
            href="/classes/{pet.type_monster.toLowerCase()}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{pet.type_monster}</a
          >
        {:else}
          {pet.type_monster}
        {/if}
      </span>
    </div>
  </div>
  <!-- Summoned By (companions and familiars) -->
  {#if pet.kind !== "Mercenary"}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Summoned By
      </h2>
      <DataTable
        data={summonedByRows}
        columns={summonedByColumns}
        renderCell={renderSummonedByCell}
        urlKey="pet-{pet.id}-summoned-by"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Recruited At (mercenaries) -->
  {#if pet.kind === "Mercenary" && pet.recruiters.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Recruited At
      </h2>
      <DataTable
        data={pet.recruiters}
        columns={recruitedAtColumns}
        renderCell={renderRecruitedAtCell}
        urlKey="pet-{pet.id}-recruited-at"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Skills -->
  {#if pet.skills.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Zap class="h-5 w-5 text-purple-500" />
        Skills ({pet.skills.length})
      </h2>
      <DataTable
        data={pet.skills}
        columns={skillColumns}
        renderCell={renderSkillCell}
        renderHeader={renderSkillHeader}
        urlKey="pet-{pet.id}-skills"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Mechanics -->
  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <Info class="h-5 w-5 text-muted-foreground" />
      Mechanics
    </h2>
    <Card.Root class="bg-muted/30">
      <Card.Content>
        {#if pet.kind === "Mercenary"}
          <dl class="space-y-2">
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Resource</dt>
              <dd>
                {pet.type_monster === "Warrior" || pet.type_monster === "Rogue"
                  ? "Rage"
                  : "Mana"}
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>Matches your regular level</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level Bonuses</dt>
              <dd>
                {#if pet.type_monster === "Warrior"}
                  Con every 2 lvls · Str every 3 · Dex every 4 · Int every 5 ·
                  Wis &amp; Cha every 6
                {:else if pet.type_monster === "Rogue"}
                  Dex every 2 lvls · Str every 3 · Con every 4 · Int every 5 ·
                  Wis &amp; Cha every 6
                {:else if pet.type_monster === "Cleric"}
                  Wis every 2 lvls · Int every 3 · Con every 4 · Str every 5 ·
                  Dex &amp; Cha every 6
                {:else if pet.type_monster === "Druid"}
                  Wis every 2 lvls · Int every 3 · Dex every 4 · Con every 5 ·
                  Str &amp; Cha every 6
                {:else if pet.type_monster === "Wizard"}
                  Int every 2 lvls · Dex every 3 · Wis every 4 · Con every 5 ·
                  Str &amp; Cha every 6
                {:else if pet.type_monster === "Ranger"}
                  Dex every 2 lvls · Con every 3 · Str every 4 · Wis every 5 ·
                  Int &amp; Cha every 6
                {/if}
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Skill Levels</dt>
              <dd>
                floor(regular level ÷ 5) + floor(veteran level ÷ 10), capped at
                each skill's max level
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">
                Veteran Bonuses
              </dt>
              <dd>
                Per veteran level: +1% HP, +1% {pet.type_monster ===
                  "Warrior" || pet.type_monster === "Rogue"
                  ? "rage"
                  : "mana"}, +1 damage<br />Every 2nd veteran level: +1 defense
                and all resistances
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Active Limit</dt>
              <dd>1 at levels 10–19 · 2 at 20–29 · 3 at 30–49 · 4 at 50+</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Max Stored</dt>
              <dd>6</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Stance</dt>
              <dd>
                Aggressive (attacks your target) or Defensive (retaliates only)
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Equipment</dt>
              <dd>Can be equipped with gear to boost stats</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Recruit Cost</dt>
              <dd>
                50–2,500 <span class="text-yellow-600 dark:text-yellow-400"
                  >gold</span
                >, scales with your regular and veteran level
              </dd>
            </div>
            {#if pet.type_monster === "Warrior"}
              <div class="flex gap-2">
                <dt class="text-muted-foreground w-40 shrink-0">
                  Death Prevention
                </dt>
                <dd>
                  When a lethal hit would kill this mercenary, it automatically
                  casts
                  <a
                    href="/skills/runebound_aegis"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Runebound Aegis</a
                  > (level 50+).
                </dd>
              </div>
            {/if}
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">On Death</dt>
              <dd>Stays dead. Resurrection costs the same as recruiting.</dd>
            </div>
          </dl>
        {:else if pet.kind === "Companion"}
          <dl class="space-y-2">
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>Matches your regular level, up to level {pet.level}</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Skill Levels</dt>
              <dd>
                floor(veteran level ÷ 10) — scales with veteran level only,
                capped at each skill's max level
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Symbiosis</dt>
              <dd>
                Each level of the <a
                  href="/skills/symbiosis"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Symbiosis</a
                > passive transfers 10% of your attributes to this companion
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">On Death</dt>
              <dd>Vanishes — re-summon to restore</dd>
            </div>
          </dl>
        {:else if pet.kind === "Familiar"}
          <dl class="space-y-2">
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Role</dt>
              <dd>Passive buff only — does not attack</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">Level</dt>
              <dd>
                Equal to your rank in
                {#if pet.classLink.skill_id && pet.classLink.skill_name}
                  <a
                    href="/skills/{pet.classLink.skill_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{pet.classLink.skill_name}</a
                  >
                {:else}
                  the summoning skill
                {/if}
                (max {pet.effective_max_level})
              </dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-muted-foreground w-40 shrink-0">On Death</dt>
              <dd>Vanishes — re-summon to restore</dd>
            </div>
          </dl>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>
</div>
