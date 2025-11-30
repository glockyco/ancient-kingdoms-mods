<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Skull from "@lucide/svelte/icons/skull";
  import Users from "@lucide/svelte/icons/users";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Zap from "@lucide/svelte/icons/zap";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import Flag from "@lucide/svelte/icons/flag";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Hammer from "@lucide/svelte/icons/hammer";
  import Search from "@lucide/svelte/icons/search";
  import Map from "@lucide/svelte/icons/map";
  import Image from "@lucide/svelte/icons/image";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  let { data } = $props();
</script>

<svelte:head>
  <title>Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-12">
  <!-- Hero Section -->
  <div class="text-center py-12 space-y-6">
    <h1 class="text-4xl md:text-5xl font-bold">Ancient Kingdoms Compendium</h1>
    <p class="text-xl text-muted-foreground">
      Your guide to items, monsters, npcs, and more
    </p>
  </div>

  <!-- Available Sections -->
  <section class="space-y-6">
    <h2 class="text-2xl font-semibold">Browse</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <a href="/items" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-amber-500/10">
                <Gem class="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Items</Card.Title>
                <Card.Description
                  >Equipment, consumables, and treasures</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.items.toLocaleString()} items
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <a href="/zones" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-emerald-500/10">
                <MapPin class="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Zones</Card.Title>
                <Card.Description>Overworld areas and dungeons</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.zones.toLocaleString()} zones
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <a href="/monsters" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-red-500/10">
                <Skull class="h-6 w-6 text-red-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Monsters</Card.Title>
                <Card.Description
                  >Bosses, elites, and other creatures</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.monsters.toLocaleString()} monsters
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <a href="/npcs" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-blue-500/10">
                <Users class="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">NPCs</Card.Title>
                <Card.Description
                  >Merchants, quest givers, and services</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.npcs.toLocaleString()} NPCs
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <a href="/recipes" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-purple-500/10">
                <FlaskConical class="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Recipes</Card.Title>
                <Card.Description
                  >Alchemy, cooking, and crafting recipes</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.recipes.toLocaleString()} recipes
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>
    </div>
  </section>

  <!-- Coming Soon Sections -->
  <section class="space-y-6">
    <h2 class="text-2xl font-semibold text-muted-foreground">Coming Soon</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-orange-500/10">
              <Scroll class="h-5 w-5 text-orange-500" />
            </div>
            <Card.Title class="text-base">Quests</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-purple-500/10">
              <Zap class="h-5 w-5 text-purple-500" />
            </div>
            <Card.Title class="text-base">Skills</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-rose-500/10">
              <Flag class="h-5 w-5 text-rose-500" />
            </div>
            <Card.Title class="text-base">Factions</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-lime-500/10">
              <Leaf class="h-5 w-5 text-lime-500" />
            </div>
            <Card.Title class="text-base">Gatherables</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-yellow-500/10">
              <Hammer class="h-5 w-5 text-yellow-500" />
            </div>
            <Card.Title class="text-base">Professions</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-cyan-500/10">
              <Search class="h-5 w-5 text-cyan-500" />
            </div>
            <Card.Title class="text-base">Global Search</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-pink-500/10">
              <Image class="h-5 w-5 text-pink-500" />
            </div>
            <Card.Title class="text-base">Images</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="opacity-50 bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-teal-500/10">
              <Map class="h-5 w-5 text-teal-500" />
            </div>
            <Card.Title class="text-base">Maps</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>
    </div>
  </section>
</div>
