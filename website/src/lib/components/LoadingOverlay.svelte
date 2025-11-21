<script lang="ts">
  import { navigating } from "$app/stores";
</script>

{#if $navigating}
  <div
    class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
  >
    <div class="text-center">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      ></div>
      <p class="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
{/if}
