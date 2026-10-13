<script lang="ts">
  import { formatLinear } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/NecromancerPetBuffSkill.cs:6-28 — direct pet buffs require an owned living combat pet. -->
<!-- Source: server-scripts/TargetBuffSkill.cs:477-482 — alsoBuffActivePet copies a self-buff to the owned living non-familiar, non-mercenary active pet within castRange. -->
<div class="space-y-2">
  <h3 class="font-semibold">Companion Buff</h3>
  <!-- Source: server-scripts/TargetBuffSkill.cs:477-480; server-scripts/NecromancerPetBuffSkill.cs:24-28 — the pet must be within cast range. -->
  <p class="text-muted-foreground">
    {#if skill.also_buff_active_pet}
      When applied to yourself, the same buff also reaches your living companion
      within {formatLinear(skill.cast_range, " yd")}. Familiars and mercenaries
      cannot receive this copy.
    {:else if skill.skill_type === "target_buff" && skill.is_pet_skill}
      <!-- Source: server-scripts/TargetBuffSkill.cs:CorrectedTarget,CheckDistance — isPetSkill selects the active pet; self-only buffs skip the range check. -->
      Targets your active pet at any distance, including a familiar.
    {:else}
      Targets your living companion within {formatLinear(
        skill.cast_range,
        " yd",
      )}. Familiars and mercenaries cannot receive this buff.
    {/if}
  </p>
</div>
