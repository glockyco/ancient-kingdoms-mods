<script lang="ts">
  import { DEFENSE_RATES } from "$lib/calculation/combat";

  let { stat, resists }: { stat: string; resists: string } = $props();
  const rates = DEFENSE_RATES;
</script>

<!-- Source: server-scripts/Combat.cs:GetProbResistMeleeDebuff,GetProbResistMagic,GetProbResistPoison,GetProbResistFire,GetProbResistCold,GetProbResistDisease — Armor Class against physical debuffs or the matching resist adds 0.0005 per point, the level term and the caster's Accuracy adjust it, and the chance stays within 0–0.9. -->
Each point of the target's {stat} adds {rates.resistChancePerPoint} to its chance
to resist {resists}. Each 1% of the caster's Accuracy subtracts 1% from that
chance. Each level the target is above the caster adds {rates.levelTermPerLevel},
and each level below subtracts {rates.levelTermPerLevel}, up to {rates.maxLevelTerm}
either way. The chance stays between 0% and {rates.maxAvoidance}.
