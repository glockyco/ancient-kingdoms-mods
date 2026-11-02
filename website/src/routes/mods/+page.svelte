<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Download from "@lucide/svelte/icons/download";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import installText from "../../../../mods/INSTALL.md?raw";
  import { parseInstallGuide } from "$lib/mods/install-steps";

  let { data } = $props();

  const guide = parseInstallGuide(installText);

  // Too large for the site's own files, so the download comes straight from the GitHub release.
  const MELONLOADER_ZIP =
    "https://github.com/glockyco/ancient-kingdoms-mods/releases/download/melonloader-0.7.3-unity6000.6/AncientKingdoms-MelonLoader-Unity6000.6.zip";

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
      title: "Boss skills",
      text: "Shows the skill cooldowns of the monsters you're fighting, and when their next special can come.",
      image: "/mod-pictures/card-boss-skills.webp",
      alt: "Ancient Cyclops casting Earthshatter Slam while his other skills count down.",
    },
    {
      title: "Bestiary",
      text: "Shows every monster's Bestiary page, with the chance of each drop, its skills and its respawn timer.",
      image: "/mod-pictures/card-bestiary.webp",
      alt: "Troll King Grimlok's Bestiary page with drop chances, a drop's tooltip and his skills.",
    },
    {
      title: "Map pins",
      text: "Marks the bosses, elites, and fabled monsters in your zone on the map, with their respawn timers.",
      image: "/mod-pictures/card-map-pins.webp",
      alt: "The map of Twilight Forest with a pin for each monster and Nivalis's spawn rules.",
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
  description="Pocket Compendium shows when bosses, elites and fabled monsters spawn in Ancient Kingdoms, where they are, their skill cooldowns in a fight, and what they drop."
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
      <p class="text-lg text-balance text-muted-foreground">
        A mod for Ancient Kingdoms that shows when bosses, elites, and fabled
        monsters spawn, where to find them, and their skill cooldowns in a
        fight. It also opens the full Bestiary page of any monster.
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

  <section id="install" class="scroll-mt-20 space-y-4">
    <h2 class="text-2xl font-semibold">Install</h2>
    <!-- mods/INSTALL.md holds the steps, so this page and the MelonLoader zip's README.txt agree. -->
    <ol>
      {#each guide.steps as step, i (step.title)}
        <li class="relative flex gap-4 pb-7 last:pb-0">
          {#if i < guide.steps.length - 1}
            <span
              class="absolute top-8 bottom-1 left-3.5 w-px bg-border"
              aria-hidden="true"
            ></span>
          {/if}
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-foreground"
            >{i + 1}</span
          >
          <div class="min-w-0 flex-1 pt-0.5">
            <h3 class="font-semibold text-foreground">{step.title}</h3>
            {#each step.paragraphs as paragraph (paragraph)}
              <p class="mt-1 text-pretty text-muted-foreground">
                {@render withCode(paragraph)}
              </p>
            {/each}
            {#if i === 0}
              <div class="mt-3 flex flex-wrap gap-3">
                <a class="cta primary" href={MELONLOADER_ZIP}>
                  <Download class="size-5" aria-hidden="true" />MelonLoader (40
                  MB)
                </a>
                <a
                  class="cta secondary"
                  href="/mods/PocketCompendium.dll"
                  download
                >
                  <Download class="size-5" aria-hidden="true" />Pocket
                  Compendium
                </a>
              </div>
            {/if}
            {#if step.notes.length > 0}
              <div class="mt-3 grid min-w-0 grid-cols-1 gap-2">
                {#each step.notes as note (note.system)}
                  <p
                    class="min-w-0 rounded-md border bg-muted/40 px-3 py-2 text-sm text-pretty"
                  >
                    <span class="font-medium text-foreground"
                      >{note.system}:</span
                    >
                    <span class="text-muted-foreground"
                      >{@render withCode(note.text)}</span
                    >
                  </p>
                {/each}
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
    {#each guide.closing as paragraph (paragraph)}
      <p class="text-sm text-pretty text-muted-foreground">{paragraph}</p>
    {/each}
    <img
      src="/mod-pictures/settings-window.webp"
      alt="Pocket Compendium's settings window on its Boss list page, with the list's style, direction, tiers and levels."
      width="786"
      height="565"
      loading="lazy"
      class="w-full max-w-xl rounded-lg border"
    />
  </section>
</div>

{#snippet withCode(text: string)}
  {#each text.split(/(`[^`]+`)/) as part, i (i)}
    {#if part.startsWith("`")}<code
        class="mt-1 block w-fit max-w-full rounded bg-muted px-2 py-1 text-xs"
        >{part.slice(1, -1)}</code
      >{:else}{part}{/if}
  {/each}
{/snippet}

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
