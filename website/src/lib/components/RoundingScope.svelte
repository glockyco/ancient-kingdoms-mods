<!-- Starts a page's rounding scope; see $lib/calculation/rounding. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { provideRoundingScope } from "$lib/calculation/rounding";

  let { children }: { children: Snippet } = $props();

  provideRoundingScope();
</script>

{@render children()}
