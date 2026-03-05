<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Skull from "@lucide/svelte/icons/skull";
  import Users from "@lucide/svelte/icons/users";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Zap from "@lucide/svelte/icons/zap";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import Flag from "@lucide/svelte/icons/flag";
  import Flame from "@lucide/svelte/icons/flame";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Box from "@lucide/svelte/icons/box";
  import Hammer from "@lucide/svelte/icons/hammer";
  import Search from "@lucide/svelte/icons/search";
  import Map from "@lucide/svelte/icons/map";
  import Image from "@lucide/svelte/icons/image";
  import Star from "@lucide/svelte/icons/star";
  import Cat from "@lucide/svelte/icons/cat";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  let { data } = $props();
</script>

<svelte:head>
  <title>Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Interactive map and wiki-like reference for Ancient Kingdoms - items, monsters, zones, quests, and more, directly extracted from the game files."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-12">
  <!-- Hero Section -->
  <div class="text-center py-2 space-y-4 relative">
    <div class="absolute top-0 right-0">
      <ThemeToggle />
    </div>
    <img src="/logo.webp" alt="" class="w-28 h-28 mx-auto" />
    <h1 class="text-4xl md:text-5xl font-bold">Ancient Kingdoms Compendium</h1>
    <p class="text-xl text-muted-foreground">
      Your guide to items, monsters, zones, quests, and more
    </p>
    <p class="text-sm text-muted-foreground">
      Updated for v0.9.8.0 (2026-03-05)
    </p>
  </div>

  <!-- Browse Section -->
  <section class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- World Map (spanning full width) -->
      <a href="/map" class="block group md:col-span-3">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div class="p-3 rounded-xl bg-teal-500/10">
                <Map class="h-8 w-8 text-teal-500" />
              </div>
              <div class="flex-1 text-center md:text-left">
                <Card.Title class="text-xl group-hover:underline"
                  >Interactive World Map</Card.Title
                >
                <Card.Description class="text-base">
                  Explore the world of Eratiath — every monster, NPC, and
                  resource at your fingertips
                </Card.Description>
              </div>
              <div
                class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
              >
                <span class="font-medium">Explore</span>
                <ArrowRight class="ml-2 h-4 w-4" />
              </div>
            </div>
          </Card.Header>
        </Card.Root>
      </a>

      <!-- Items -->
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

      <!-- Monsters -->
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

      <!-- NPCs -->
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

      <!-- Zones -->
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

      <!-- Quests -->
      <a href="/quests" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-orange-500/10">
                <Scroll class="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Quests</Card.Title>
                <Card.Description
                  >Quest givers, objectives, and rewards</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.quests.toLocaleString()} quests
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Altars -->
      <a href="/altars" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-orange-500/10">
                <Flame class="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Altars</Card.Title>
                <Card.Description
                  >Event locations and their rewards</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.altars.toLocaleString()} altars
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Classes -->
      <a href="/classes" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-indigo-500/10">
                <Star class="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Classes</Card.Title>
                <Card.Description
                  >Warrior, Cleric, Ranger, and more</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.classes.toLocaleString()} classes
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Skills -->
      <a href="/skills" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-purple-500/10">
                <Zap class="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Skills</Card.Title>
                <Card.Description
                  >Damage spells, heals, buffs, and more</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.skills.toLocaleString()} skills
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Pets -->
      <a href="/pets" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-teal-500/10">
                <Cat class="h-6 w-6 text-teal-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Pets</Card.Title>
                <Card.Description
                  >Mercenaries, companions, and familiars</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.pets.toLocaleString()} pets
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Professions -->
      <a href="/professions" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-yellow-500/10">
                <Hammer class="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline"
                  >Professions</Card.Title
                >
                <Card.Description
                  >Gathering, crafting, and more</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.professions.toLocaleString()} professions
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Gathering Resources -->
      <a href="/gather-items" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-lime-500/10">
                <Leaf class="h-6 w-6 text-lime-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline"
                  >Gathering Resources</Card.Title
                >
                <Card.Description
                  >Plants, minerals, and radiant sparks</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.gatheringResources.toLocaleString()} resources
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>

      <!-- Crafting Recipes -->
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
                <Card.Title class="group-hover:underline"
                  >Crafting Recipes</Card.Title
                >
                <Card.Description
                  >Alchemy, cooking, and other recipes</Card.Description
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

      <!-- Chests -->
      <a href="/chests" class="block group">
        <Card.Root
          class="h-full transition-colors hover:bg-muted/50 bg-muted/30"
        >
          <Card.Header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-sky-500/10">
                <Box class="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <Card.Title class="group-hover:underline">Chests</Card.Title>
                <Card.Description
                  >Treasure chests, their keys, and contents</Card.Description
                >
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div
              class="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Browse all {data.counts.chests.toLocaleString()} chests
              <ArrowRight class="ml-2 h-4 w-4" />
            </div>
          </Card.Content>
        </Card.Root>
      </a>
    </div>
  </section>

  <!-- Coming Soon Sections -->
  <section class="space-y-6">
    <h2 class="text-2xl font-semibold">Coming Soon</h2>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Card.Root class="h-full bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-rose-500/10">
              <Flag class="h-5 w-5 text-rose-500" />
            </div>
            <Card.Title class="text-base">Factions</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="h-full bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-cyan-500/10">
              <Search class="h-5 w-5 text-cyan-500" />
            </div>
            <Card.Title class="text-base">Global Search</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>

      <Card.Root class="h-full bg-muted/30">
        <Card.Header>
          <div class="flex flex-col items-center text-center gap-2">
            <div class="p-2 rounded-lg bg-pink-500/10">
              <Image class="h-5 w-5 text-pink-500" />
            </div>
            <Card.Title class="text-base">Images</Card.Title>
          </div>
        </Card.Header>
      </Card.Root>
    </div>
  </section>
</div>
