<script lang="ts">
  import { formatLinear } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/TargetBuffSkill.cs:496-501 — alsoBuffActivePet copies a self-buff to the owned living non-familiar, non-mercenary active pet within castRange. -->
<div class="space-y-2">
  <h3 class="font-semibold">Companion Buff</h3>
  <p class="text-muted-foreground">
    {#if skill.also_buff_active_pet}
      When applied to yourself, the same buff also reaches your living companion
      within {formatLinear(skill.cast_range, " yd")}. Familiars and mercenaries
      cannot receive this copy.
    {:else if skill.is_necromancer_pet_buff}
      <!-- Source: server-scripts/NecromancerPetBuffSkill.cs:HasLivingCombatPet,CheckDistance — only the Necromancer's own living, non-familiar, non-mercenary pet within cast range. -->
      Targets your living companion within {formatLinear(
        skill.cast_range,
        " yd",
      )}. Familiars and mercenaries cannot receive this buff.
    {:else if skill.can_buff_self && !skill.can_buff_others}
      <!-- Source: server-scripts/TargetBuffSkill.cs:CorrectedTarget,CheckDistance — isPetSkill selects the active pet, and a buff that cannot reach others skips the range check. -->
      Targets your active pet at any distance, including a familiar.
    {:else}
      <!-- Source: server-scripts/TargetBuffSkill.cs:CorrectedTarget,CheckDistance — isPetSkill selects the active pet within cast range. -->
      Targets your active pet within {formatLinear(skill.cast_range, " yd")},
      including a familiar.
    {/if}
  </p>
</div>
