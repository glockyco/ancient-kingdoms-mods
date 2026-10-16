<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { mercenaryRank } from "$lib/calculation/mercenaries";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { usedByRankOneMercenary } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — mercenary skill rank uses owner level and total veteran points. -->
<div class="space-y-3">
  <h3 class="font-semibold">Mercenary Skill Rank</h3>
  <p class="text-muted-foreground">
    A mercenary uses this skill at a rank set by your level and total veteran
    points. See
    <a
      href="/mercenaries#skill-ranks"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >Mercenary Skill Ranks</a
    >.
  </p>
  <Calculation
    calculation={mercenaryRank(skill.max_level, usedByRankOneMercenary)}
  />
</div>
