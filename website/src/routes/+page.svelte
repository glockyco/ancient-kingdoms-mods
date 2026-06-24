<script lang="ts">
  import { dev } from "$app/environment";
  import Seo from "$lib/components/Seo.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import SupportButton from "$lib/components/SupportButton.svelte";
  import SteamIcon from "$lib/components/SteamIcon.svelte";
  import DiscordIcon from "$lib/components/DiscordIcon.svelte";
  import KofiIcon from "$lib/components/KofiIcon.svelte";
  import GameVersionBanner from "$lib/components/GameVersionBanner.svelte";
  import HomeSearch from "$lib/components/HomeSearch.svelte";
  import { buttonVariants } from "$lib/components/ui/button";
  import { COMPENDIUM_VERSION } from "$lib/constants/version";
  import {
    DISCORD_URL,
    KOFI_URL,
    STEAM_GUIDE_URL,
    STEAM_STORE_URL,
  } from "$lib/constants/links";
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
  import ArrowRight from "@lucide/svelte/icons/arrow-right";

  let { data } = $props();

  const title = "Ancient Kingdoms Compendium — Wiki, Map & Guides";
  const description =
    "Every item, monster, NPC, zone, quest, skill, and recipe, pulled directly from the game files and updated each patch.";

  // Primary database sections, ranked by usage. Each carries its own literal
  // badge classes (Tailwind needs static strings) so the icon tint stays
  // consistent with the per-page pattern used across the site. Derived because
  // the counts come from reactive `data`.
  const browse = $derived([
    {
      title: "Items",
      description: "Equipment, consumables, and treasures",
      href: "/items",
      icon: Gem,
      badge: "bg-amber-500/10 text-amber-500",
      count: data.counts.items,
      unit: "items",
    },
    {
      title: "Monsters",
      description: "Bosses, elites, and other creatures",
      href: "/monsters",
      icon: Skull,
      badge: "bg-red-500/10 text-red-500",
      count: data.counts.monsters,
      unit: "monsters",
    },
    {
      title: "Zones",
      description: "Overworld areas and dungeons",
      href: "/zones",
      icon: MapPin,
      badge: "bg-emerald-500/10 text-emerald-500",
      count: data.counts.zones,
      unit: "zones",
    },
    {
      title: "Classes",
      description: "The six playable classes",
      href: "/classes",
      icon: Star,
      badge: "bg-indigo-500/10 text-indigo-500",
      count: data.counts.classes,
      unit: "classes",
    },
    {
      title: "Professions",
      description: "Skills and progression",
      href: "/professions",
      icon: Hammer,
      badge: "bg-yellow-500/10 text-yellow-500",
      count: data.counts.professions,
      unit: "professions",
    },
    {
      title: "Crafting Recipes",
      description: "Alchemy, cooking, forge, and scribing",
      href: "/recipes",
      icon: FlaskConical,
      badge: "bg-purple-500/10 text-purple-500",
      count: data.counts.recipes,
      unit: "recipes",
    },
  ]);

  // Secondary sections, shown as compact tiles.
  const more = $derived([
    {
      title: "Skills",
      href: "/skills",
      icon: Zap,
      badge: "bg-purple-500/10 text-purple-500",
      count: data.counts.skills,
    },
    {
      title: "NPCs",
      href: "/npcs",
      icon: Users,
      badge: "bg-blue-500/10 text-blue-500",
      count: data.counts.npcs,
    },
    {
      title: "Quests",
      href: "/quests",
      icon: Scroll,
      badge: "bg-orange-500/10 text-orange-500",
      count: data.counts.quests,
    },
    {
      title: "Gathering Resources",
      href: "/gather-items",
      icon: Leaf,
      badge: "bg-lime-500/10 text-lime-500",
      count: data.counts.gatheringResources,
    },
    {
      title: "Pets",
      href: "/pets",
      icon: Cat,
      badge: "bg-teal-500/10 text-teal-500",
      count: data.counts.pets,
    },
    {
      title: "Chests",
      href: "/chests",
      icon: Box,
      badge: "bg-sky-500/10 text-sky-500",
      count: data.counts.chests,
    },
    {
      title: "Altars",
      href: "/altars",
      icon: Flame,
      badge: "bg-orange-500/10 text-orange-500",
      count: data.counts.altars,
    },
  ]);

  // Game-mechanics reference pages. Titles and routes mirror /mechanics.
  const mechanics = [
    { title: "Inventory", href: "/mechanics/inventory" },
    { title: "Experience", href: "/mechanics/experience" },
    { title: "Combat", href: "/mechanics/combat" },
    { title: "Monster Spawns", href: "/mechanics/monster-spawns" },
  ];

  // Curated footer nav: the highest-traffic sections only (no Mechanics — it
  // has its own section above).
  const footerLinks = [
    { label: "Map", href: "/map" },
    { label: "Items", href: "/items" },
    { label: "Monsters", href: "/monsters" },
    { label: "Zones", href: "/zones" },
    { label: "Classes", href: "/classes" },
    { label: "Professions", href: "/professions" },
  ];
</script>

<Seo {title} {description} path="/" />

<div class="mx-auto max-w-5xl px-6 pt-8">
  <div class="flex flex-col gap-9">
    <!-- Hero -->
    <div class="relative space-y-4 py-2 text-center">
      <div class="flex items-center justify-between gap-2 sm:block">
        <div class="flex items-center gap-1 sm:absolute sm:top-0 sm:left-0">
          <ThemeToggle />
          <a
            href={STEAM_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Steam Guide"
            class={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <SteamIcon class="size-5" />
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join Discord"
            class={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <DiscordIcon class="size-5" />
          </a>
        </div>
        <div
          aria-label="Support actions"
          class="flex items-center sm:absolute sm:top-0 sm:right-0"
        >
          <SupportButton compact iconRight />
        </div>
      </div>
      <img src="/logo.webp" alt="" class="mx-auto h-28 w-28" />
      <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
        Ancient Kingdoms Compendium
      </h1>
      <p class="text-xl text-muted-foreground">
        Fan-made wiki, interactive world map, and game database
      </p>
      <GameVersionBanner live={data.live} checkedAt={data.checkedAt} />
      {#if dev}
        <HomeSearch />
      {/if}
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
          Explore the world of Eratiath — every monster, NPC, and resource
          across {data.counts.zones} zones
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
                {entry.count.toLocaleString()}
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
              {entry.count.toLocaleString()}
            </span>
          </a>
        {/each}
      </div>
    </section>

    <!-- Game mechanics -->
    <section>
      {@render sectionLabel("Game mechanics")}
      <div class="flex flex-wrap gap-2">
        {#each mechanics as mechanic (mechanic.href)}
          <a
            href={mechanic.href}
            class="inline-flex items-center rounded-full border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-foreground/20 hover:bg-muted/50"
          >
            {mechanic.title}
          </a>
        {/each}
      </div>
    </section>
  </div>

  <!-- Page foot: about prose + meta -->
  <footer class="mt-12 border-t pt-10 pb-10">
    <div
      class="max-w-[66ch] space-y-3 text-sm leading-relaxed text-pretty text-muted-foreground"
    >
      <p>
        <strong>Ancient Kingdoms</strong> is an old-school 2D pixel-art RPG by
        Ancient Pixels, inspired by classic MMORPGs. It's set in the world of
        Eratiath and can be played solo or in co-op. The game is currently in
        <a
          href={STEAM_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="text-foreground underline underline-offset-2"
        >
          Early Access on Steam</a
        >.
      </p>
      <p>
        The <strong>Ancient Kingdoms Compendium</strong> is a fan-made wiki, interactive
        world map, and searchable game database. Its listings are generated directly
        from the game files and refreshed after each patch, covering items, monsters,
        NPCs, zones, quests, skills, classes, professions, crafting recipes, and more.
      </p>
    </div>

    <div
      class="mt-10 flex flex-wrap items-center justify-between gap-x-10 gap-y-6 text-[0.8125rem] text-muted-foreground"
    >
      <div>Ancient Kingdoms Compendium · Updated for v{COMPENDIUM_VERSION}</div>
      <nav class="flex flex-wrap gap-x-4 gap-y-1" aria-label="Site sections">
        {#each footerLinks as link (link.href)}
          <a href={link.href} class="transition-colors hover:text-foreground">
            {link.label}
          </a>
        {/each}
      </nav>
      <div class="flex items-center gap-1">
        <a
          href={STEAM_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Steam Guide"
          class={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <SteamIcon class="size-5" />
        </a>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join Discord"
          class={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <DiscordIcon class="size-5" />
        </a>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Support on Ko-fi"
          class={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <KofiIcon class="size-5" />
        </a>
      </div>
    </div>
  </footer>
</div>

{#snippet sectionLabel(label: string)}
  <p
    class="mb-4 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
  >
    {label}
  </p>
{/snippet}
