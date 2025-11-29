<script lang="ts" generics="TData, TValue">
  import CirclePlusIcon from "@lucide/svelte/icons/circle-plus";
  import XIcon from "@lucide/svelte/icons/x";
  import type { Column } from "@tanstack/table-core";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Separator } from "$lib/components/ui/separator";
  import { Badge } from "$lib/components/ui/badge";

  let {
    column,
    title,
  }: {
    column: Column<TData, TValue>;
    title: string;
  } = $props();

  const filterValue = $derived(
    column?.getFilterValue() as [number | null, number | null] | undefined,
  );
  const hasFilter = $derived(
    filterValue && (filterValue[0] !== null || filterValue[1] !== null),
  );

  // Derive input values from filter state to stay in sync with URL restoration
  const minValue = $derived(
    filterValue?.[0] !== null && filterValue?.[0] !== undefined
      ? String(filterValue[0])
      : "",
  );
  const maxValue = $derived(
    filterValue?.[1] !== null && filterValue?.[1] !== undefined
      ? String(filterValue[1])
      : "",
  );

  function handleMinInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const min = target.value ? parseInt(target.value) : null;
    const max = maxValue ? parseInt(maxValue) : null;
    column?.setFilterValue(
      min !== null || max !== null ? [min, max] : undefined,
    );
  }

  function handleMaxInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const min = minValue ? parseInt(minValue) : null;
    const max = target.value ? parseInt(target.value) : null;
    column?.setFilterValue(
      min !== null || max !== null ? [min, max] : undefined,
    );
  }

  function clearFilter() {
    column?.setFilterValue(undefined);
  }

  function formatRange(): string {
    if (!filterValue) return "";
    const [min, max] = filterValue;
    if (min !== null && max !== null) return `${min}-${max}`;
    if (min !== null) return `${min}+`;
    if (max !== null) return `≤${max}`;
    return "";
  }
</script>

<div class="flex items-center gap-1">
  <Popover.Root>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          size="sm"
          class="h-8 border-dashed"
        >
          <CirclePlusIcon class="mr-2 h-4 w-4" />
          {title}
          {#if hasFilter}
            <Separator orientation="vertical" class="mx-2 h-4" />
            <Badge variant="secondary" class="rounded-sm px-1 font-normal">
              {formatRange()}
            </Badge>
          {/if}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[200px] p-3" align="start">
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minValue}
            oninput={handleMinInput}
            class="h-8"
          />
          <span class="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxValue}
            oninput={handleMaxInput}
            class="h-8"
          />
        </div>
        {#if hasFilter}
          <Button
            variant="ghost"
            size="sm"
            class="w-full"
            onclick={clearFilter}
          >
            Clear
          </Button>
        {/if}
      </div>
    </Popover.Content>
  </Popover.Root>
  {#if hasFilter}
    <Button variant="ghost" size="sm" class="h-8 px-2" onclick={clearFilter}>
      <XIcon class="h-4 w-4" />
    </Button>
  {/if}
</div>
