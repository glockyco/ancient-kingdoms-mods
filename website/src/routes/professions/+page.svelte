<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  // Category icons
  import Hammer from "@lucide/svelte/icons/hammer";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Swords from "@lucide/svelte/icons/swords";
  import Compass from "@lucide/svelte/icons/compass";
  // Profession-specific icons
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import Skull from "@lucide/svelte/icons/skull";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Map from "@lucide/svelte/icons/map";

  type ProfessionCategory = "crafting" | "gathering" | "combat" | "exploration";

  let { data } = $props();

  // Group professions by category
  const groupedProfessions = $derived.by(() => {
    const groups: Record<ProfessionCategory, (typeof data.professions)[0][]> = {
      crafting: [],
      gathering: [],
      combat: [],
      exploration: [],
    };

    for (const profession of data.professions) {
      groups[profession.category as ProfessionCategory].push(profession);
    }

    return groups;
  });

  // Category display configuration
  const categoryConfig: Record<
    ProfessionCategory,
    { label: string; icon: typeof Hammer; color: string; bgColor: string }
  > = {
    crafting: {
      label: "Crafting",
      icon: Hammer,
      color: "text-orange-500 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    gathering: {
      label: "Gathering",
      icon: Pickaxe,
      color: "text-green-500 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    combat: {
      label: "Combat",
      icon: Swords,
      color: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-500/10",
    },
    exploration: {
      label: "Exploration",
      icon: Compass,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
  };

  // Category order for display
  const categoryOrder: ProfessionCategory[] = [
    "gathering",
    "crafting",
    "combat",
    "exploration",
  ];

  // Profession-specific icon configuration
  const professionIconConfig: Record<
    string,
    { icon: typeof Hammer; color: string; bgColor: string }
  > = {
    alchemy: {
      icon: FlaskConical,
      color: "text-purple-500 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    cooking: {
      icon: ChefHat,
      color: "text-orange-500 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    mining: {
      icon: Pickaxe,
      color: "text-stone-500 dark:text-stone-400",
      bgColor: "bg-stone-500/10",
    },
    herbalism: {
      icon: Leaf,
      color: "text-green-500 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    radiant_seeker: {
      icon: Sparkles,
      color: "text-yellow-500 dark:text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    adventuring: {
      icon: Scroll,
      color: "text-orange-500 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    hunter: {
      icon: Crosshair,
      color: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-500/10",
    },
    slayer: {
      icon: Skull,
      color: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-500/10",
    },
    exploring: {
      icon: Compass,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    lore_keeping: {
      icon: BookOpen,
      color: "text-indigo-500 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
    treasure_hunter: {
      icon: Map,
      color: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
  };

  function getProfessionIcon(professionId: string) {
    return (
      professionIconConfig[professionId] ?? {
        icon: Compass,
        color: categoryConfig.exploration.color,
        bgColor: categoryConfig.exploration.bgColor,
      }
    );
  }
</script>

<svelte:head>
  <title>Professions - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Browse all professions in Ancient Kingdoms. View crafting, gathering, combat, and exploration professions with related recipes, resources, and content."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb
    items={[{ label: "Home", href: "/" }, { label: "Professions" }]}
  />

  <h1 class="text-3xl font-bold">Professions</h1>

  {#each categoryOrder as category (category)}
    {@const professions = groupedProfessions[category]}
    {@const config = categoryConfig[category]}
    {#if professions && professions.length > 0}
      <section class="space-y-4">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          {#if category === "crafting"}
            <Hammer class="h-5 w-5 {config.color}" />
          {:else if category === "gathering"}
            <Pickaxe class="h-5 w-5 {config.color}" />
          {:else if category === "combat"}
            <Swords class="h-5 w-5 {config.color}" />
          {:else}
            <Compass class="h-5 w-5 {config.color}" />
          {/if}
          {config.label}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each professions as profession (profession.id)}
            {@const iconConfig = getProfessionIcon(profession.id)}
            <a href="/professions/{profession.id}" class="block group">
              <Card.Root
                class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
              >
                <Card.Header>
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg {iconConfig.bgColor}">
                      <iconConfig.icon class="h-6 w-6 {iconConfig.color}" />
                    </div>
                    <div>
                      <Card.Title class="group-hover:underline"
                        >{profession.name}</Card.Title
                      >
                      <Card.Description
                        >{profession.description}</Card.Description
                      >
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div
                    class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
                  >
                    {#if profession.tracking_type === "count_based" && profession.tracking_denominator}
                      {profession.tracking_denominator}
                      {profession.id === "lore_keeping"
                        ? "books to collect"
                        : "areas to discover"}
                    {:else}
                      Max level: {profession.max_level}%
                    {/if}
                    <ArrowRight class="ml-2 h-4 w-4" />
                  </div>
                </Card.Content>
              </Card.Root>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</div>
