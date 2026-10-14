<script lang="ts">
  import { formatLinear } from "$lib/skills/skill-format";
  import { cleanseTypes } from "$lib/utils/formatSkillEffect";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const types = $derived(cleanseTypes(skill));
  const typeList = $derived(
    types.length > 1
      ? `${types.slice(0, -1).join(", ")} and ${types[types.length - 1]}`
      : types.join(""),
  );
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
        >Removes {typeList} debuffs from you and every other living, visible player
        and pet within {formatLinear(skill.cast_range, " yd")}, in your party or
        not.</span
      >
    {:else}
      <span class="block">Removes {typeList} debuffs from you or an ally.</span>
    {/if}
    <span class="block"
      >Other debuffs stay, including physical debuffs, which Armor Class
      resists.</span
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
