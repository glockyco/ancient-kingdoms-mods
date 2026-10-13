<script lang="ts">
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/TargetBuffSkill.cs:Apply — cooldownReductionPercent shortens each caster skill's remaining cooldown by min(remaining × percentage, 30 seconds), then returns without a buff. -->
<div class="space-y-1">
  <h3 class="font-semibold">Cooldown Reduction</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Casting this instantly shortens each of your skills' remaining cooldowns
      by
      {fmt.formatPercent(
        fmt.atRank(skill.cooldown_reduction_percent!, skill.max_level),
      )}
      at rank {skill.max_level}, by at most 30 seconds per skill.</span
    >
    <span class="block">It leaves no buff.</span>
  </p>
</div>
