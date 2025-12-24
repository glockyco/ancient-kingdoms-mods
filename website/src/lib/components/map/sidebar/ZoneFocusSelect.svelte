<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import type { ZoneListItem } from "$lib/types/map";

  interface Props {
    zones: ZoneListItem[];
    value: string | null;
    onchange: (zoneId: string | null) => void;
  }

  let { zones, value, onchange }: Props = $props();

  let open = $state(false);

  const selectedZone = $derived(
    value ? zones.find((z) => z.id === value) : null,
  );

  function handleSelect(zoneId: string | null) {
    onchange(zoneId);
    open = false;
  }
</script>

<div class="mb-2">
  <div class="text-xs text-muted-foreground mb-1">Focus</div>
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          class="w-full justify-between font-normal"
        >
          <span class={selectedZone ? "" : "text-muted-foreground"}>
            {selectedZone?.name ?? "All Zones"}
          </span>
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[240px] p-0" align="start">
      <Command.Root>
        <Command.Input placeholder="Search zones..." />
        <Command.List>
          <Command.Empty>No zones found.</Command.Empty>
          <Command.Group>
            <Command.Item value="__all__" onSelect={() => handleSelect(null)}>
              <CheckIcon
                class={cn(
                  "mr-2 h-4 w-4",
                  value === null ? "opacity-100" : "opacity-0",
                )}
              />
              All Zones
            </Command.Item>
            {#each zones as zone (zone.id)}
              <Command.Item
                value={zone.name}
                onSelect={() => handleSelect(zone.id)}
              >
                <CheckIcon
                  class={cn(
                    "mr-2 h-4 w-4",
                    value === zone.id ? "opacity-100" : "opacity-0",
                  )}
                />
                {zone.name}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</div>
