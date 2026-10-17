<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { formatLinear } from "$lib/skills/skill-format";
  import { deathBloomCalculation } from "$lib/skills/calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<div class="space-y-3">
  <h3 class="font-semibold">Death Bloom</h3>
  <Calculation calculation={deathBloomCalculation(skill)} />
  <!-- Source: server-scripts/NecromancerDeathBloomSkill.cs:GetIntelligenceBonus,GetHealingAmount — Max(0, intelligence.value) feeds the heal, and the override adds no Wisdom bonus. -->
  <p class="text-muted-foreground">Wisdom does not increase this heal.</p>
  <!-- Source: server-scripts/NecromancerDeathBloomSkill.cs:CheckSelf,CorrectedTarget,Apply; server-scripts/TargetHealSkill.cs:CheckDistance — another living Player or non-familiar Pet within cast range; current Health must exceed the cost, which is paid in full. -->
  <p class="text-muted-foreground">
    Targets another living player or a non-familiar pet, including
    <a
      href="/mercenaries"
      class="text-blue-600 dark:text-blue-400 hover:underline">mercenaries</a
    >
    and other players'
    <a href="/summons" class="text-blue-600 dark:text-blue-400 hover:underline"
      >companions</a
    >, within {formatLinear(skill.cast_range, " yd")}. It cannot target you,
    familiars, monsters or NPCs. Your current Hit Points must be above the Hit
    Points spent. You pay the full cost even if the target is already at maximum
    Hit Points.
  </p>
  <!-- Source: server-scripts/TargetHealSkill.cs:Apply — critical healing multiplies by 3 in 10% of critical heals, otherwise by 2, and is capped by missing Health. -->
  <p class="text-muted-foreground">
    Your Critical Strike is the chance that this heal is critical. Critical
    heals restore double Hit Points, or triple Hit Points in 10% of cases.
    Healing is capped by the target's missing Hit Points.
  </p>
</div>
