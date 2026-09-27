<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import Zap from "@lucide/svelte/icons/zap";
  import {
    formatLinearDuration,
    formatLinearValue,
    formatSkillEffect,
  } from "$lib/utils/formatSkillEffect";
  import type { ClassSkill } from "$lib/queries/classes.server";

  let { skills, urlKey }: { skills: ClassSkill[]; urlKey: string } = $props();

  type LevelValue = { base_value: number; bonus_per_level: number };

  function formatCost(row: ClassSkill): string {
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
    return formatLinearValue(lv, undefined);
  }

  function formatDuration(raw: string | null): string {
    if (!raw) return "—";
    const lv = JSON.parse(raw) as LevelValue;
    if (lv.base_value === 0 && lv.bonus_per_level === 0) return "—";
    return formatLinearDuration(lv.base_value, lv.bonus_per_level);
  }

  const columns: ColumnDef<ClassSkill>[] = [
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
      accessorFn: (row) => formatDuration(row.cooldown),
    },
    {
      id: "cast_time",
      header: "Cast Time",
      enableSorting: false,
      accessorFn: (row) => formatDuration(row.cast_time),
    },
  ];

  const RIGHT_ALIGNED = new Set(["max_level", "cost", "cooldown", "cast_time"]);
</script>

{#snippet renderHeader({ header }: { header: Header<ClassSkill, unknown> })}
  {#if RIGHT_ALIGNED.has(header.id)}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<ClassSkill, unknown>;
  row: Row<ClassSkill>;
})}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/skills/{row.original.id}"
      name={row.original.name}
      domain="skill"
      entityId={row.original.id}
      imageKind="icon"
      imageAvailable={row.original.visual_public_path}
      variant="reference"
      fallback={Zap}
      size={28}
    />
  {:else if cell.column.id === "skill_type"}
    <span class="text-muted-foreground capitalize">
      {String(cell.getValue()).replace(/_/g, " ")}
    </span>
  {:else if cell.column.id === "effect"}
    <span class="text-sm">{cell.getValue()}</span>
  {:else if RIGHT_ALIGNED.has(cell.column.id)}
    <span class="ml-auto">{cell.getValue()}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<DataTable
  data={skills}
  {columns}
  {renderCell}
  {renderHeader}
  {urlKey}
  pageSize={10}
  zebraStripe={true}
  class="bg-muted/30"
/>
