<script lang="ts">
  import { achievementAnchor } from "$lib/data/achievements/relationships";
  import type { LinkedAchievement } from "$lib/types/achievements";

  let { achievements }: { achievements: LinkedAchievement[] } = $props();
</script>

<!-- One entry in a reward list, in the same "Label: value" form as gold and experience. -->
<div>
  <span class="text-sm text-muted-foreground"
    >{achievements.length === 1 ? "Achievement" : "Achievements"}:
  </span>
  {#each achievements as achievement, i (achievement.id)}{i > 0 ? ", " : ""}<a
      href="/achievements#{achievementAnchor(achievement.id)}"
      title={achievement.description}
      class="font-medium text-blue-600 hover:underline dark:text-blue-400"
      >{achievement.name}</a
    >{/each}
</div>
