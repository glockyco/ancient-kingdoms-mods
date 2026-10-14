<!--
  Defines "rounded" for the reader once per page. Place it after any
  calculation or sentence that rounds to the nearest whole number, or in the
  introduction of a reference page whose readers arrive at any topic. Later
  uses on the same page render nothing.
-->
<script lang="ts">
  import { claimRoundingDefinition } from "$lib/calculation/rounding";

  const first = claimRoundingDefinition();
</script>

{#if first}
  <p class="text-muted-foreground">
    Rounded means to the nearest whole number. Exact halves go to the even
    number, so 2.5 becomes 2.
  </p>
{/if}
