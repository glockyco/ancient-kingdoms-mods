<script lang="ts">
  import { formatLinear } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/AreaBuffSkill.cs:Apply; TargetBuffSkill.cs:HasMatchingCleanseDebuff,Apply; BuffSkill.cs:GetCleanseCountersRemoved — area cleanses collect living visible players/pets without a party check; matching types are disease/poison/cold/fire/magic. -->
<div class="space-y-1">
  <h3 class="font-semibold">
    <a
      href="/mechanics/combat#cleanse"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >Cleanse Mechanics</a
    >
  </h3>
  <p class="text-muted-foreground">
    {#if skill.skill_type === "area_buff"}
      <span class="block"
        >Removes matching debuffs from you and every other living, visible
        player and pet within {formatLinear(skill.cast_range, " yd")}, in your
        party or not.</span
      >
    {:else}
      <span class="block"
        >Cast on yourself or an ally, this skill removes harmful debuffs of the
        types it cleanses.</span
      >
    {/if}
    <span class="block"
      >A cleanse removes only debuffs of the types it lists: poison, disease,
      cold, fire or magic. A debuff with none of those types, such as one that
      Armor Class resists, cannot be cleansed.</span
    >
    <span class="block">The target cannot resist the cleanse.</span>
    <span class="block"
      >See <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#cleanse">cleanse calculations</a
      > for layer removal and damage-over-time scaling.</span
    >
  </p>
</div>
