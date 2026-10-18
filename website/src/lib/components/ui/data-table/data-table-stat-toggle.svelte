<script lang="ts">
  import SwordsIcon from "@lucide/svelte/icons/swords";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import { cn } from "$lib/utils.js";

  let {
    open = $bindable(false),
    selectedCount = 0,
    mode = "all",
  }: {
    open?: boolean;
    selectedCount?: number;
    mode?: "any" | "all";
  } = $props();
</script>

<Button
  variant="outline"
  size="sm"
  class="h-8 self-center border-dashed"
  onclick={() => (open = !open)}
>
  <SwordsIcon class="mr-2 h-4 w-4" />
  Stats
  {#if selectedCount > 0}
    <Separator orientation="vertical" class="mx-2 h-4" />
    <Badge variant="secondary" class="rounded-sm px-1 font-normal">
      {selectedCount} ({mode})
    </Badge>
  {/if}
  <ChevronDownIcon
    class={cn("ml-2 h-4 w-4 transition-transform", open && "rotate-180")}
  />
</Button>
