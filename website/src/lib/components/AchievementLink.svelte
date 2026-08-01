<script lang="ts">
  import Trophy from "@lucide/svelte/icons/trophy";
  import { achievementAnchor } from "$lib/data/achievements/relationships";

  let {
    achievementId,
    achievementName,
    class: className = "",
    text = `Achievement: ${achievementName}`,
  }: {
    achievementId: string;
    achievementName: string;
    class?: string;
    text?: string;
  } = $props();
</script>

<a
  href="/achievements#{achievementAnchor(achievementId)}"
  class="inline-flex items-center gap-1.5 font-medium text-amber-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-amber-300 {className}"
>
  <Trophy class="h-4 w-4 shrink-0" aria-hidden="true" />
  <span>{text}</span>
</a>
