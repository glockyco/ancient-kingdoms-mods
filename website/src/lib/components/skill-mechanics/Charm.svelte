<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { charmDamageCalculation } from "$lib/skills/damage-calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: BardCharmSongSkill.cs:GetCharmTarget,GetCharmResistChance,Apply and Combat.cs:GetProbResistMagic -->
<div class="space-y-1">
  <h3 class="font-semibold">Charm</h3>
  <Calculation calculation={charmDamageCalculation(skill)} />
  <!-- Source: server-scripts/BardCharmSongSkill.cs:66-70 — ordinary Magic Resist roll without Accuracy, then +2.5 percentage points per higher target level and −0.02 per nonnegative Charisma, capped at 95%. -->
  <p class="text-muted-foreground">
    Charm uses the target's <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#avoidance">Magic Resist roll</a
    >, without Accuracy. Each level the target is above you adds 2.5 percentage
    points to its chance to resist. Each point of your Charisma above 0 removes
    0.02 percentage points. The final chance is between 0% and 95%.
  </p>
  <!-- Source: server-scripts/BardCharmSongSkill.cs:IsValidCharmTarget,GetCharmTarget,Apply — debuff immunity blocks charm, and recasts roll resistance against the active charm. -->
  <p class="text-muted-foreground">
    <span class="block"
      >Only living monsters that are not bosses, elites, training dummies,
      returning home, or immune to debuffs can be charmed.</span
    >
    <span class="block">A Bard can control one charmed monster at a time.</span>
    <span class="block"
      >While you control a charmed monster, casting the song again targets that
      monster instead of your selected target and rolls its resist again. A
      resisted recast leaves the existing charm running.</span
    >
  </p>
  <p class="text-muted-foreground">
    See <a
      href="/mechanics/bard#charm"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard charm</a
    >.
  </p>
</div>
