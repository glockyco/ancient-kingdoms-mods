<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import { Button } from "$lib/components/ui/button";

  interface Props {
    onclick: () => void;
  }
  let { onclick }: Props = $props();
</script>

<div class="absolute bottom-20 right-4 z-10">
  <Button
    variant="secondary"
    size="icon"
    class="h-12 w-12 rounded-full shadow-lg bg-background/95 backdrop-blur"
    {onclick}
    aria-label="Search map (Ctrl+K)"
  >
    <Search class="h-5 w-5" />
  </Button>
  <span
    class="hidden lg:block absolute -left-16 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded"
  >
    Ctrl+K
  </span>
</div>
