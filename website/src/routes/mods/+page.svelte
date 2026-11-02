<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Download from "@lucide/svelte/icons/download";
  import BookOpen from "@lucide/svelte/icons/book-open";

  let { data } = $props();

  const MELONLOADER =
    "https://github.com/glockyco/ancient-kingdoms-mods/releases/tag/melonloader-0.7.3-unity6000.6";

  const features = [
    {
      title: "Boss list",
      text: "Lists the bosses, elites, and fabled monsters in your zone and when they spawn. Click one to watch it.",
      image: "/mod-pictures/card-boss-list.webp",
      alt: "The boss list in Twilight Forest with monsters that are up, in combat and respawning.",
    },
    {
      title: "World markers",
      text: "Marks dead monsters on their spawn points with a respawn timer, and points to living ones off screen.",
      image: "/mod-pictures/card-world-markers.webp",
      alt: "Gukavep's spawn point with a respawn timer, and arrows to Maltheris Vex and Spirit of the Forest.",
    },
    {
      title: "Map pins",
      text: "Marks the bosses, elites, and fabled monsters in your zone on the map, with their respawn timers.",
      image: "/mod-pictures/card-map-pins.webp",
      alt: "The map of Twilight Forest with a pin for each monster and Nivalis's spawn rules.",
    },
    {
      title: "Bestiary",
      text: "Shows every monster's Bestiary page, with the chance of each drop, its skills and its respawn timer.",
      image: "/mod-pictures/card-bestiary.webp",
      alt: "Troll King Grimlok's Bestiary page with drop chances, a drop's tooltip and his skills.",
    },
    {
      title: "Boss skills",
      text: "Shows the skill cooldowns of the monsters you're fighting, and when their next special can come.",
      image: "/mod-pictures/card-boss-skills.webp",
      alt: "Ancient Cyclops casting Earthshatter Slam while his other skills count down.",
    },
    {
      title: "Fatecharms",
      text: "Warns you on the target frame when killing a boss would use the Fatecharm in your main inventory.",
      image: "/mod-pictures/card-fatecharms.webp",
      alt: "The Catacombs Fatecharm beside Captain Aerendyl's level, with its tooltip.",
    },
  ];
</script>

<Seo
  title="Pocket Compendium - Ancient Kingdoms Mod"
  description="Pocket Compendium shows when bosses, elites and fabled monsters spawn in Ancient Kingdoms, where they are, and what they drop."
  path="/mods"
/>

<div class="container mx-auto max-w-5xl space-y-12 p-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Mods" }]} />

  <section class="space-y-6">
    <div class="space-y-3">
      <div class="flex flex-wrap items-baseline gap-x-3">
        <h1 class="text-4xl font-bold">Pocket Compendium</h1>
        <span class="text-lg text-muted-foreground">Version {data.version}</span
        >
      </div>
      <p class="text-lg text-pretty text-muted-foreground">
        A mod for Ancient Kingdoms that shows when bosses, elites, and fabled
        monsters spawn and where to find them. It also opens the full Bestiary
        page of any monster.
      </p>
    </div>
    <div class="flex flex-wrap gap-3">
      <a class="cta primary" href="/mods/PocketCompendium.dll" download>
        <Download class="size-5" aria-hidden="true" />Download Pocket Compendium
      </a>
      <a class="cta secondary" href="#install">
        <BookOpen class="size-5" aria-hidden="true" />How to install
      </a>
    </div>
    <!-- The file's size, so the page keeps the picture's space while it loads. -->
    <img
      src="/mod-pictures/pocket-compendium-world.webp"
      alt="The boss list in Twilight Forest, a respawn timer on Gukavep's spawn point, and arrows to four monsters off screen."
      width="1585"
      height="880"
      class="w-full rounded-lg border"
    />
  </section>

  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Features</h2>
    <div class="grid gap-6 md:grid-cols-2">
      {#each features as feature (feature.title)}
        <Card.Root class="gap-0 overflow-hidden bg-muted/30 py-0">
          <img
            src={feature.image}
            alt={feature.alt}
            loading="lazy"
            class="aspect-[3/2] w-full border-b object-cover"
          />
          <Card.Header class="py-5">
            <Card.Title>{feature.title}</Card.Title>
            <Card.Description class="text-pretty"
              >{feature.text}</Card.Description
            >
          </Card.Header>
        </Card.Root>
      {/each}
    </div>
  </section>

  <section id="install" class="scroll-mt-20 space-y-3">
    <h2 class="text-2xl font-semibold">Install</h2>
    <ol class="list-decimal space-y-2 pl-6 text-pretty">
      <li>
        Install the <a class="underline" href={MELONLOADER}>fixed MelonLoader</a
        > as the README.txt in its zip describes. The official one doesn't work with
        the current game.
      </li>
      <li>
        If you have BossTracker.dll, BossSkillTracker.dll, or BetterBestiary.dll
        in the game's <code>Mods</code> folder, delete them.
      </li>
      <li>
        Copy PocketCompendium.dll into the <code>Mods</code> folder and start the
        game. Press F8 for the settings.
      </li>
    </ol>
  </section>
</div>

<style>
  .cta {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 3rem;
    padding: 0 1.4rem;
    border-radius: calc(var(--radius) - 2px);
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }
  .cta.primary {
    background: var(--brand-gold-fill);
    color: var(--brand-gold-fill-foreground);
  }
  .cta.primary:hover {
    background: color-mix(in oklab, var(--brand-gold-fill) 88%, white);
  }
  .cta.secondary {
    border: 1px solid color-mix(in oklab, var(--brand-gold) 60%, transparent);
    color: var(--brand-gold);
  }
  .cta.secondary:hover {
    border-color: var(--brand-gold);
  }
  .cta:focus-visible {
    outline: 2px solid var(--brand-gold);
    outline-offset: 2px;
  }
</style>
