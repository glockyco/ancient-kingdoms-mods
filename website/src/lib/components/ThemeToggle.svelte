<script lang="ts">
  import { toggleMode, mode } from "mode-watcher";
  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import { Button } from "$lib/components/ui/button";
</script>

<Button
  variant="ghost"
  size="icon"
  onclick={toggleMode}
  class="js-only"
  aria-label="Toggle theme"
>
  {#if mode.current === "dark"}
    <Sun class="size-5" />
  {:else}
    <Moon class="size-5" />
  {/if}
</Button>
