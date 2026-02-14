<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import { getClassConfig, getResourceDisplayName } from "$lib/utils/classes";
  import Shield from "@lucide/svelte/icons/shield";
  import Swords from "@lucide/svelte/icons/swords";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Crosshair from "@lucide/svelte/icons/crosshair";

  let { data } = $props();

  // Unique icon per class
  const classIcons: Record<string, typeof Shield> = {
    warrior: Shield,
    cleric: BookOpen,
    ranger: Crosshair,
    rogue: Swords,
    wizard: Sparkles,
    druid: Leaf,
  };

  function getClassIcon(classId: string) {
    return classIcons[classId] || Shield;
  }

  function getDifficultyLabel(difficulty: number): string {
    if (difficulty <= 2) return "Easy";
    if (difficulty <= 4) return "Medium";
    return "Hard";
  }

  function getDifficultyColor(difficulty: number): string {
    if (difficulty <= 2) return "text-green-600 dark:text-green-400";
    if (difficulty <= 4) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  }
</script>

<svelte:head>
  <title>Classes - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Browse all playable classes in Ancient Kingdoms."
  />
</svelte:head>

<div class="container mx-auto px-4 py-6">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Classes", href: "/classes" },
    ]}
  />

  <h1 class="text-4xl font-bold mb-6 mt-4">Classes</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each data.classes as classData (classData.id)}
      {@const config = getClassConfig(classData.id)}
      {@const ClassIcon = getClassIcon(classData.id)}

      <a
        href="/classes/{classData.id}"
        class="block group h-full cursor-pointer"
      >
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30 flex flex-col !py-0 !gap-0"
        >
          <Card.Header class="space-y-4 !px-6 !pt-6">
            <div class="flex justify-center">
              <div
                class="p-6 rounded-2xl"
                style="background-color: {config.color}10;"
              >
                <ClassIcon class="h-14 w-14" style="color: {config.color};" />
              </div>
            </div>

            <div class="text-center space-y-2">
              <Card.Title class="text-2xl group-hover:underline">
                {classData.name}
              </Card.Title>
              <Card.Description
                class="text-base flex items-center justify-center gap-2"
              >
                <span>{classData.primary_role}</span>
                {#if classData.secondary_role}
                  <span class="text-muted-foreground/50">•</span>
                  <span>{classData.secondary_role}</span>
                {/if}
              </Card.Description>
            </div>

            <p class="text-sm leading-relaxed text-muted-foreground">
              {classData.description}
            </p>
          </Card.Header>

          <Card.Content class="space-y-2 text-sm mt-auto !px-6 !pt-6 !pb-6">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Difficulty:</span>
              <span
                class="font-medium {getDifficultyColor(classData.difficulty)}"
              >
                {getDifficultyLabel(classData.difficulty)}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Resource:</span>
              <span class="font-medium">
                {getResourceDisplayName(classData.resource_type)}
              </span>
            </div>
          </Card.Content>
        </Card.Root>
      </a>
    {/each}
  </div>
</div>
