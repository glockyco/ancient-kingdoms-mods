<!--
  The home page as it was before the title-screen redesign: search, the map,
  and a grid of every overview. Readers who prefer it switch to it from the
  site header; see HomeLayoutToggle.
-->
<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import GameVersionBanner from "$lib/components/GameVersionBanner.svelte";
  import HomeSearch from "$lib/components/HomeSearch.svelte";
  import { HOME_COUNTS } from "$lib/generated/home-counts";
  import { MECHANICS_GROUPS } from "$lib/data/mechanics";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Skull from "@lucide/svelte/icons/skull";
  import Users from "@lucide/svelte/icons/users";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Zap from "@lucide/svelte/icons/zap";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import Flame from "@lucide/svelte/icons/flame";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Box from "@lucide/svelte/icons/box";
  import Hammer from "@lucide/svelte/icons/hammer";
  import Map from "@lucide/svelte/icons/map";
  import Star from "@lucide/svelte/icons/star";
  import Cat from "@lucide/svelte/icons/cat";
  import Swords from "@lucide/svelte/icons/swords";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Trophy from "@lucide/svelte/icons/trophy";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Shield from "@lucide/svelte/icons/shield";

  import type { GameVersionResult } from "$lib/steam-news-parser";

  let { live, checkedAt }: { live: GameVersionResult; checkedAt: string } =
    $props();

  // Primary database sections, ranked by usage. Each carries its own literal
  // badge classes (Tailwind needs static strings) so the icon tint stays
  // consistent with the per-page pattern used across the site. Counts come
  // from a build-time snapshot compiled into this bundle, so these lists are
  // plain constants rather than `$derived` over `data`.
  const browse = [
    {
      title: "Items",
      description: "Equipment, consumables, and treasures",
      href: "/items",
      icon: Gem,
      badge: "bg-amber-500/10 text-amber-500",
      count: HOME_COUNTS.items,
      unit: "items",
    },
    {
      title: "Monsters",
      description: "Bosses, elites, and other creatures",
      href: "/monsters",
      icon: Skull,
      badge: "bg-red-500/10 text-red-500",
      count: HOME_COUNTS.monsters,
      unit: "monsters",
    },
    {
      title: "Zones",
      description: "Overworld areas and dungeons",
      href: "/zones",
      icon: MapPin,
      badge: "bg-emerald-500/10 text-emerald-500",
      count: HOME_COUNTS.zones,
      unit: "zones",
    },
    {
      title: "Classes",
      description: "Playable classes and skill trees",
      href: "/classes",
      icon: Star,
      badge: "bg-indigo-500/10 text-indigo-500",
      count: HOME_COUNTS.classes,
      unit: "classes",
    },
    {
      title: "Professions",
      description: "Gathering, crafting, combat, and exploration",
      href: "/professions",
      icon: Hammer,
      badge: "bg-yellow-500/10 text-yellow-500",
      count: HOME_COUNTS.professions,
      unit: "professions",
    },
    {
      title: "Crafting Recipes",
      description: "Crafting, alchemy, cooking, and scribing",
      href: "/recipes",
      icon: FlaskConical,
      badge: "bg-purple-500/10 text-purple-500",
      count: HOME_COUNTS.recipes,
      unit: "recipes",
    },
  ];

  // Secondary sections, shown as compact tiles.
  const more = [
    {
      title: "Achievements",
      href: "/achievements",
      icon: Trophy,
      badge: "bg-amber-500/10 text-amber-500",
      count: HOME_COUNTS.achievements,
    },
    {
      title: "Factions",
      href: "/factions",
      icon: Shield,
      badge: "bg-indigo-500/10 text-indigo-500",
      count: HOME_COUNTS.factions,
    },
    {
      title: "Mercenaries",
      href: "/mercenaries",
      icon: Swords,
      badge: "bg-teal-500/10 text-teal-500",
      count: HOME_COUNTS.mercenaries,
    },
    {
      title: "Summons",
      href: "/summons",
      icon: Cat,
      badge: "bg-cyan-500/10 text-cyan-500",
      count: HOME_COUNTS.summons,
    },
    {
      title: "Skills",
      href: "/skills",
      icon: Zap,
      badge: "bg-purple-500/10 text-purple-500",
      count: HOME_COUNTS.skills,
    },
    {
      title: "Altars",
      href: "/altars",
      icon: Flame,
      badge: "bg-orange-500/10 text-orange-500",
      count: HOME_COUNTS.altars,
    },
    {
      title: "NPCs",
      href: "/npcs",
      icon: Users,
      badge: "bg-blue-500/10 text-blue-500",
      count: HOME_COUNTS.npcs,
    },
    {
      title: "Quests",
      href: "/quests",
      icon: Scroll,
      badge: "bg-orange-500/10 text-orange-500",
      count: HOME_COUNTS.quests,
    },
    {
      title: "Gathering Resources",
      href: "/gather-items",
      icon: Leaf,
      badge: "bg-lime-500/10 text-lime-500",
      count: HOME_COUNTS.gatheringResources,
    },
    {
      title: "Chests",
      href: "/chests",
      icon: Box,
      badge: "bg-sky-500/10 text-sky-500",
      count: HOME_COUNTS.chests,
    },
    {
      title: "Traps",
      href: "/traps",
      icon: TriangleAlert,
      badge: "bg-rose-500/10 text-rose-500",
      count: HOME_COUNTS.traps,
    },
  ];
</script>

<div class="mx-auto max-w-5xl px-6 pt-8">
  <div class="flex flex-col gap-9">
    <!-- Hero -->
    <div class="relative space-y-4 py-2 text-center">
      <img src="/logo.webp" alt="" class="mx-auto h-28 w-28" />
      <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
        Ancient Kingdoms Compendium
      </h1>
      <p class="text-xl text-muted-foreground">
        Fan-made wiki, world map, and searchable game database
      </p>
      <GameVersionBanner {live} {checkedAt} />
      <HomeSearch />
    </div>

    <!-- Flagship: interactive world map -->
    <a
      href="/map"
      class="group flex flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-sm transition-colors hover:border-foreground/20 hover:bg-muted/40 sm:flex-row sm:gap-6 sm:p-7 sm:text-left"
    >
      <div
        class="grid size-15 shrink-0 place-items-center rounded-xl bg-teal-500/10 text-teal-500"
      >
        <Map class="size-8" />
      </div>
      <div class="flex-1">
        <h2 class="text-xl font-bold tracking-tight group-hover:underline">
          Interactive World Map
        </h2>
        <p class="mt-1 text-muted-foreground">
          Find monsters, NPCs, and resources across {HOME_COUNTS.zones} zones on the
          map of Eratiath.
        </p>
      </div>
      <span
        class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground"
      >
        Explore <ArrowRight class="size-4" />
      </span>
    </a>

    <!-- Browse -->
    <section>
      {@render sectionLabel("Browse")}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each browse as entry (entry.href)}
          <a
            href={entry.href}
            class="group flex h-full flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-foreground/20 hover:bg-muted/40"
          >
            <div
              class="grid size-11 place-items-center rounded-xl {entry.badge}"
            >
              <entry.icon class="size-6" />
            </div>
            <div>
              <h3 class="text-base font-semibold group-hover:underline">
                {entry.title}
              </h3>
              <p class="mt-0.5 text-sm text-muted-foreground">
                {entry.description}
              </p>
            </div>
            <div
              class="mt-auto flex items-center gap-1.5 pt-1 text-sm text-muted-foreground"
            >
              <span class="font-semibold tabular-nums text-foreground">
                {formatNumber(entry.count)}
              </span>
              <span>{entry.unit}</span>
              <ArrowRight
                class="ml-auto size-4 transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </a>
        {/each}
      </div>
    </section>

    <!-- More -->
    <section>
      {@render sectionLabel("More")}
      <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
        {#each more as entry (entry.href)}
          <a
            href={entry.href}
            class="group flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/50"
          >
            <div
              class="grid size-8 shrink-0 place-items-center rounded-lg {entry.badge}"
            >
              <entry.icon class="size-4" />
            </div>
            <span class="text-sm font-medium group-hover:underline">
              {entry.title}
            </span>
            <span class="ml-auto text-xs tabular-nums text-muted-foreground">
              {formatNumber(entry.count)}
            </span>
          </a>
        {/each}
      </div>
    </section>

    <!-- Game mechanics -->
    <section>
      {@render sectionLabel("Game mechanics")}
      <div class="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-5">
        {#each MECHANICS_GROUPS as group (group.title)}
          <div>
            <h3 class="mb-1.5 text-sm font-semibold">{group.title}</h3>
            <ul>
              {#each group.pages as page (page.href)}
                <li>
                  <a
                    href={page.href}
                    class="block py-1 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {page.title}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

{#snippet sectionLabel(label: string)}
  <p
    class="mb-4 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
  >
    {label}
  </p>
{/snippet}
