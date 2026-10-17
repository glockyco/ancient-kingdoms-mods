<script lang="ts">
  import { formatLinear } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:isParry,DealDamageAt — the cast blocks Health damage from the selected target's single-target physical melee hit; counter is round(remaining damage × 0.5), clamped 1–5,000. -->
<div class="space-y-1">
  <h3 class="font-semibold">
    <a
      href="/mechanics/combat#parry"
      class="text-blue-600 dark:text-blue-400 hover:underline">Parry</a
    >
  </h3>
  <p class="text-muted-foreground">
    <span class="block"
      >While you cast Parry ({formatLinear(skill.cast_time, "s")}), a
      single-target physical melee hit from your selected target deals you no
      Hit Points damage.</span
    >
    <span class="block"
      >You counter for half the damage left after Armor Class, Ward and Mana
      Shield, rounded, from 1 to 5,000. A 400-damage hit returns 200. See <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#parry">Parry's calculation</a
      >. Fully absorbed hits do not trigger it.</span
    >
  </p>
</div>
