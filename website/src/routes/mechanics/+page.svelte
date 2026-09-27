<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Alert } from "$lib/components/ui/alert";
  import type { Component } from "svelte";
  import Axe from "@lucide/svelte/icons/axe";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Calculator from "@lucide/svelte/icons/calculator";
  import Globe from "@lucide/svelte/icons/globe";
  import Hammer from "@lucide/svelte/icons/hammer";
  import House from "@lucide/svelte/icons/house";
  import Music from "@lucide/svelte/icons/music";
  import Shield from "@lucide/svelte/icons/shield";
  import Skull from "@lucide/svelte/icons/skull";
  import Swords from "@lucide/svelte/icons/swords";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import UserRound from "@lucide/svelte/icons/user-round";
  import Users from "@lucide/svelte/icons/users";
  import Castle from "@lucide/svelte/icons/castle";
  import HeartCrack from "@lucide/svelte/icons/heart-crack";

  interface Mechanic {
    href: string;
    title: string;
    description: string;
    icon: Component;
  }

  // Groups follow the categories of the in-game Adventurer's Guide, so a
  // player can move from a guide article to the matching page.
  const groups: { title: string; mechanics: Mechanic[] }[] = [
    {
      title: "Combat & progression",
      mechanics: [
        {
          href: "/mechanics/character",
          title: "Character Build",
          description: "Attributes, resources, skills, and specializations",
          icon: UserRound,
        },
        {
          href: "/mechanics/combat",
          title: "Combat",
          description: "Targeting, damage formulas, mitigation, and effects",
          icon: Axe,
        },
        {
          href: "/mechanics/experience",
          title: "Experience",
          description: "Level costs, veteran points, and every XP source",
          icon: TrendingUp,
        },
        {
          href: "/mechanics/death",
          title: "Death & Remains",
          description: "What death costs, remains, and resurrection",
          icon: HeartCrack,
        },
        {
          href: "/mechanics/bard",
          title: "Bard Songs & Charm",
          description: "Song slots, auras, and charming a monster",
          icon: Music,
        },
      ],
    },
    {
      title: "Companions",
      mechanics: [
        {
          href: "/mercenaries#how-it-works",
          title: "Mercenaries",
          description: "Roster, commands, equipment, and auto-consume",
          icon: Swords,
        },
        {
          href: "/mechanics/mercenary-stats",
          title: "Mercenary Stats",
          description: "Stat ranges per class and race, plus hiring odds",
          icon: Calculator,
        },
      ],
    },
    {
      title: "Equipment & economy",
      mechanics: [
        {
          href: "/mechanics/inventory",
          title: "Inventory",
          description: "Storage, durability, armor sets, and merchants",
          icon: Backpack,
        },
        {
          href: "/mechanics/crafting",
          title: "Crafting & Augments",
          description: "Craft Stations, recipes, and attaching augments",
          icon: Hammer,
        },
        {
          href: "/mechanics/housing",
          title: "Housing & Appearance",
          description: "Furniture, wardrobe, and barbers",
          icon: House,
        },
      ],
    },
    {
      title: "Party & community",
      mechanics: [
        {
          href: "/mechanics/party",
          title: "Party & Loot",
          description: "Party places, shared rewards, and loot rolls",
          icon: Users,
        },
        {
          href: "/mechanics/guilds",
          title: "Guilds",
          description: "Membership, invitations, and guild points",
          icon: Castle,
        },
      ],
    },
    {
      title: "World & adventures",
      mechanics: [
        {
          href: "/mechanics/world",
          title: "World & Travel",
          description: "Game modes, binding, travel, and portals",
          icon: Globe,
        },
        {
          href: "/mechanics/monster-spawns",
          title: "Monster Spawns",
          description: "Respawn timers, rare spawns, and missing bosses",
          icon: Skull,
        },
        {
          href: "/mechanics/reputation",
          title: "Reputation",
          description: "Faction standing, the tier ladder, and every source",
          icon: Shield,
        },
      ],
    },
  ];
</script>

<Seo
  title="Game Mechanics - Ancient Kingdoms"
  description="Character builds, combat formulas, death and remains, inventory, crafting, parties and loot rolls, guilds, travel, monster spawns, and reputation in Ancient Kingdoms."
  path="/mechanics"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Mechanics" }]} />

  <h1 class="text-4xl font-bold">Mechanics</h1>

  <Alert variant="warning">
    <TriangleAlert />
    <p>
      These pages are reference material. They favor precise game rules over
      quick-start guidance, so some sections are dense.
    </p>
  </Alert>

  {#each groups as group (group.title)}
    <section class="space-y-3">
      <h2 class="text-xl font-semibold">{group.title}</h2>
      <div class="grid gap-4 md:grid-cols-3">
        {#each group.mechanics as mechanic (mechanic.href)}
          <a href={mechanic.href} class="group block">
            <Card.Root
              class="h-full bg-muted/30 transition-colors hover:bg-muted/50"
            >
              <Card.Header>
                <div class="flex items-start gap-3">
                  <div class="rounded-lg bg-muted p-2">
                    <mechanic.icon class="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div class="space-y-1">
                    <Card.Title class="group-hover:underline"
                      >{mechanic.title}</Card.Title
                    >
                    <Card.Description>{mechanic.description}</Card.Description>
                  </div>
                </div>
              </Card.Header>
            </Card.Root>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>
