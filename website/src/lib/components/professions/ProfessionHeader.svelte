<script lang="ts" module>
  import type { Component, Snippet } from "svelte";
  import type { PageSection } from "$lib/components/PageSections.svelte";

  export interface ProfessionHeaderData {
    name: string;
    category: string;
    achievement_id?: string | null;
    achievement_name?: string | null;
  }

  interface Props {
    profession: ProfessionHeaderData;
    icon: Component<{ class?: string }>;
    iconClass: string;
    iconBackgroundClass: string;
    /** Mastery value that unlocks the achievement. */
    capPercent?: number;
    sections?: PageSection[];
    children: Snippet;
  }
</script>

<script lang="ts">
  import PageSections from "$lib/components/PageSections.svelte";
  import AchievementLink from "$lib/components/AchievementLink.svelte";

  let {
    profession,
    icon: Icon,
    iconClass,
    iconBackgroundClass,
    capPercent = 100,
    sections = [],
    children,
  }: Props = $props();
</script>

<header class="space-y-4">
  <div class="flex items-center gap-3">
    <div class="rounded-lg p-2.5 {iconBackgroundClass}">
      <Icon class="h-6 w-6 {iconClass}" />
    </div>
    <div>
      <h1 class="text-3xl font-bold tracking-tight">{profession.name}</h1>
      <p
        class="text-xs uppercase tracking-wider text-muted-foreground"
        aria-label="Category"
      >
        {profession.category}
      </p>
    </div>
  </div>

  <div class="max-w-2xl text-balance leading-relaxed">
    {@render children()}
  </div>

  {#if profession.achievement_id && profession.achievement_name}
    <p class="text-sm">
      <AchievementLink
        achievementId={profession.achievement_id}
        achievementName={profession.achievement_name}
        text={`At ${capPercent}%, you unlock the ${profession.achievement_name} achievement.`}
      />
    </p>
  {/if}

  {#if sections.length >= 4}
    <PageSections {sections} />
  {/if}
</header>
