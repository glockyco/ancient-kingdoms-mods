<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Download from "@lucide/svelte/icons/download";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Cta from "$lib/mods/Cta.svelte";

  let { data } = $props();

  const features = [
    {
      title: "Boss List",
      text: "Lists the bosses, elites, and fabled monsters in your zone and when they spawn. Click one to watch it.",
      image: "/mod-pictures/card-boss-list.webp",
      alt: "The boss list in Twilight Forest with monsters that are up, in combat and respawning.",
    },
    {
      title: "World Markers",
      text: "Marks dead monsters on their spawn points with a respawn timer, and points to living ones off screen.",
      image: "/mod-pictures/card-world-markers.webp",
      alt: "Gukavep's spawn point with a respawn timer, and arrows to Maltheris Vex and Spirit of the Forest.",
    },
    {
      title: "Boss Skills",
      text: "Shows the skill cooldowns of the monsters you're fighting, and when their next special can come.",
      image: "/mod-pictures/card-boss-skills.webp",
      alt: "Ancient Cyclops casting Earthshatter Slam while his other skills count down.",
    },
    {
      title: "Bestiary",
      text: "Shows every monster's Bestiary page, with the chance of each drop and its respawn timer. A bar on each monster fills as you find its drops.",
      image: "/mod-pictures/card-bestiary.webp",
      alt: "Ancient Cyclops's Bestiary page with his drop chances, beside the list of monsters with a bar on each that fills as you find its drops.",
    },
    {
      title: "Skills Panel",
      text: "Shows a monster's skills beside its Bestiary page, with what each does, its cast time and cooldown.",
      image: "/mod-pictures/card-skills-panel.webp",
      alt: "Ancient Cyclops's Bestiary page with his Skills panel beside it, listing Earthshatter Slam, Strong Knockback and Grasping Roots.",
    },
    {
      title: "Map Pins",
      text: "Marks the bosses, elites, and fabled monsters in your zone on the map, with their respawn timers. Hover over a dungeon's entrance to see its bosses.",
      image: "/mod-pictures/card-map-pins.webp",
      alt: "The map of Crescent Coast with a pin for each monster and the Sunken Temple's bosses beside its entrance.",
    },
    {
      title: "Gathering",
      text: "Marks the herbs, ores, fish and Radiant Sparks you watch on the map and the minimap, and points to the nearest ready one.",
      image: "/mod-pictures/card-gathering.webp",
      alt: "The Gathering list beside the minimap with Violet's tooltip, and an arrow to Chamomile 26 yd away.",
    },
    {
      title: "Fatecharms",
      text: "Warns you on the target frame when killing a boss would use the Fatecharm in your main inventory.",
      image: "/mod-pictures/card-fatecharms.webp",
      alt: "The Catacombs Fatecharm beside Captain Aerendyl's level, with its tooltip.",
    },
    {
      title: "Augment Marks",
      text: "Marks each item that has an augment with the augment's icon.",
      image: "/mod-pictures/card-augment-marks.webp",
      alt: "A Warrior's equipment in Dreadguard armor, with an augment's icon on every piece.",
    },
    {
      title: "Settings",
      text: "Switch each feature on or off and change how it looks. Press F8 to open the settings.",
      image: "/mod-pictures/card-settings.webp",
      alt: "The Boss list's settings, with its style, direction, tiers and levels.",
    },
  ];
</script>

<Seo
  title="Pocket Compendium - Ancient Kingdoms Mod"
  description="Pocket Compendium shows when bosses, elites and fabled monsters spawn in Ancient Kingdoms, where they are, their skill cooldowns in a fight, and what they drop."
  path="/mods"
/>

<div class="container mx-auto max-w-5xl px-6 py-8 sm:px-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Mods" }]} />

  <!-- Three columns like the feature grid, so the picture lines up with its second and third. -->
  <header class="mt-6 grid items-center gap-x-6 gap-y-8 lg:grid-cols-3">
    <div class="space-y-6">
      <div class="space-y-3">
        <h1 class="text-3xl font-bold sm:text-4xl lg:text-3xl">
          Pocket Compendium
        </h1>
        <p class="text-lg text-muted-foreground">
          Version {data.version}<span class="mx-2" aria-hidden="true">·</span><a
            href="/mods/changelog"
            class="font-medium text-brand-gold hover:underline">Changelog</a
          >
        </p>
        <p class="text-lg text-pretty text-muted-foreground">
          A mod for Ancient Kingdoms that shows when bosses, elites, and fabled
          monsters spawn, where to find them, and their skill cooldowns in a
          fight. It also opens the full Bestiary page of any monster and marks
          the herbs, ores, fish and Radiant Sparks you're looking for.
        </p>
      </div>
      <div class="flex flex-wrap gap-3 lg:flex-col">
        <Cta
          href="/mods/PocketCompendium.dll"
          download
          class="w-full sm:w-auto lg:w-full"
        >
          <Download class="size-5" aria-hidden="true" />Download Pocket
          Compendium
        </Cta>
        <Cta
          href="/mods/install"
          variant="secondary"
          class="w-full sm:w-auto lg:w-full"
        >
          <BookOpen class="size-5" aria-hidden="true" />How to Install
        </Cta>
      </div>
    </div>
    <!-- The file's size, so the page keeps the picture's space while it loads. -->
    <img
      src="/mod-pictures/pocket-compendium-world.webp"
      alt="The boss list in Twilight Forest, a respawn timer on Gukavep's spawn point, and arrows to four monsters off screen."
      width="1585"
      height="880"
      class="w-full rounded-lg ring-1 ring-border lg:col-span-2"
    />
  </header>

  <section class="mt-20 space-y-6">
    <h2 class="text-2xl font-semibold">Features</h2>
    <ul class="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as feature (feature.title)}
        <li class="space-y-3">
          <img
            src={feature.image}
            alt={feature.alt}
            loading="lazy"
            width="1200"
            height="800"
            class="aspect-[3/2] w-full rounded-lg object-cover ring-1 ring-border"
          />
          <div class="space-y-1">
            <h3 class="font-semibold">{feature.title}</h3>
            <p class="text-sm text-pretty text-muted-foreground">
              {feature.text}
            </p>
          </div>
        </li>
      {/each}
    </ul>
  </section>

  <section
    class="mt-20 flex flex-col gap-6 rounded-xl border bg-card p-6 sm:p-8 md:flex-row md:items-center md:justify-between"
  >
    <div class="space-y-1">
      <h2 class="text-2xl font-semibold">Install</h2>
      <p class="text-pretty text-muted-foreground">
        The steps cover Windows, Mac with CrossOver, and Steam Deck or Linux.
      </p>
    </div>
    <Cta href="/mods/install" variant="secondary" class="w-full sm:w-auto">
      Open the Install Guide<ArrowRight class="size-5" aria-hidden="true" />
    </Cta>
  </section>
</div>
