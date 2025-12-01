<script lang="ts">
  import { navigating } from "$app/stores";

  // Delay showing the spinner to avoid flash on fast navigations
  const DELAY_MS = 150;
  let showSpinner = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if ($navigating) {
      // Start timer to show spinner after delay
      timeoutId = setTimeout(() => {
        showSpinner = true;
      }, DELAY_MS);
    } else {
      // Navigation complete, hide spinner and clear timer
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      showSpinner = false;
    }
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
