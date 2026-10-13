<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { mercenaryRank } from "$lib/calculation/mercenaries";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { usedByBardMercenary } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — Bard mercenary skill ranks have a minimum of 1. -->
<Calculation
  calculation={mercenaryRank(skill.max_level, usedByBardMercenary)}
/>
