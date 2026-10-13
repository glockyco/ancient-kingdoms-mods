<script lang="ts">
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import {
    EXAMPLE_SHARED_HEALTH,
    balancedHealth,
  } from "$lib/skills/worked-examples";
  import { MAX_HEALTH } from "$lib/calculation/inputs";
  import * as fmt from "$lib/calculation/format";
</script>

<!-- Source: server-scripts/AreaHealSkill.cs:78-96 — each affected character's Health becomes RoundToInt(its maximum Health × the averaged Health fraction). -->
<div class="space-y-2">
  <h3 class="font-semibold">Balance Health</h3>
  <p class="text-muted-foreground">
    Every affected character ends at the group's average Health percentage,
    applied to its own maximum Health and rounded. At a {fmt.formatPercent(
      EXAMPLE_SHARED_HEALTH,
    )} average, a character with {fmt.formatNumber(MAX_HEALTH.value)}
    maximum Health ends at {fmt.formatNumber(balancedHealth())} Health.
  </p>
  <RoundingDefinition />
</div>
