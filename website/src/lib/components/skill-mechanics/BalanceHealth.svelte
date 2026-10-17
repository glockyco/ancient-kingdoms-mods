<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import { EXAMPLE_SHARED_HEALTH } from "$lib/skills/worked-examples";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { formatLinear } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/AreaHealSkill.cs:Apply — caster plus living visible players and non-familiar pets in range share their average Health fraction, rounded against each maximum. -->
<div class="space-y-2">
  <h3 class="font-semibold">Balance Health</h3>
  <p class="text-muted-foreground">
    Sets you and every living, visible player, companion and mercenary within
    {formatLinear(skill.cast_range, " yd")}, in your party or not, to their
    average Hit Points percentage. Characters above the average lose Hit Points.
    For example, 100% and 25% average to
    {formatPercent(EXAMPLE_SHARED_HEALTH, {
      decimals: 2,
      preserveNonzero: true,
    })} each.
  </p>
  <RoundingDefinition />
</div>
