<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:88 (knockbackTime = 0.25f), 90 (knockbackObstacleDamageBonus = 0.0125f), 1139-1159 -->
<div class="space-y-1">
  <h3 class="font-semibold">Knockback</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Knockback applies only if stun and fear did not apply on the same hit and
      the target is not already stunned.</span
    >
    <span class="block"
      >It pushes the target back{skill.knockback_distance
        ? ` ${skill.knockback_distance} yd`
        : ""} and stuns them for 0.25 seconds.</span
    >
    <span class="block"
      >If an obstacle blocks the path, the target also takes 1.25% of the damage
      just dealt, rounded up to at least 1.</span
    >
    <span class="block"
      >The target must be within 15 levels of the attacker, unless the attacker
      is a boss.</span
    >
  </p>
</div>
