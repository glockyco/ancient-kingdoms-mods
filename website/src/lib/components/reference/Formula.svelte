<!--
  A calculation inside a reference topic, at the data size every calculation on
  the page shares, whatever the surrounding text size is.
-->
<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import type { Calculation as CalculationData } from "$lib/types/calculation";

  interface Props {
    calculation: CalculationData;
    /** Hide the named steps when the topic already lists them, keeping the worked example. */
    showSteps?: boolean;
  }

  let { calculation, showSteps = true }: Props = $props();
</script>

<div class="text-sm leading-normal">
  <Calculation {calculation} {showSteps} />
</div>
