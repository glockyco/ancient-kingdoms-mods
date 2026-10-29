<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:87 (knockbackTime = 0.25f), 89 (knockbackObstacleDamageBonus = 0.0125f), 1351-1371 -->
<div class="space-y-1">
  <h3 class="font-semibold">Knockback</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Knockback cannot affect a stunned target or a hit that causes stun or
      fear.</span
    >
    <span class="block"
      >It pushes the target back{skill.knockback_distance
        ? ` ${skill.knockback_distance} yd`
        : ""} and stuns it for 0.25 seconds.</span
    >
    <span class="block"
      >If an obstacle blocks the path, the target also takes 1.25% of the damage
      just dealt, rounded up to at least 1.</span
    >
    <!-- Source: server-scripts/Combat.cs:710 — num6 is the victim's level minus the attacker's. -->
    <span class="block"
      >Targets 15 or more levels above the attacker cannot be knocked back,
      unless the attacker is a boss.</span
    >
  </p>
</div>
