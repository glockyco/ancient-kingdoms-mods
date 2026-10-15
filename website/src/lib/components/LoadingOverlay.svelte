<script lang="ts">
  import { navigating } from "$app/stores";

  // Delay showing the spinner to avoid flash on fast navigations
  const DELAY_MS = 150;
  let showSpinner = $state(false);

  // Each navigation change cancels the pending timer, so a timer started by a
  // navigation that a second one replaced cannot show the spinner afterwards.
  $effect(() => {
    if (!$navigating) {
      showSpinner = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      showSpinner = true;
    }, DELAY_MS);
    return () => clearTimeout(timeoutId);
  });
</script>

{#if showSpinner}
  <div
    class="loading-overlay fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
  >
    <div class="text-center">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      ></div>
      <p class="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
{/if}
