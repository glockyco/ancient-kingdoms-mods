<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Alert } from "$lib/components/ui/alert";
  import type { Component } from "svelte";
  import Axe from "@lucide/svelte/icons/axe";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Calculator from "@lucide/svelte/icons/calculator";
  import Castle from "@lucide/svelte/icons/castle";
  import Globe from "@lucide/svelte/icons/globe";
  import Hammer from "@lucide/svelte/icons/hammer";
  import HeartCrack from "@lucide/svelte/icons/heart-crack";
  import House from "@lucide/svelte/icons/house";
  import Music from "@lucide/svelte/icons/music";
  import Shield from "@lucide/svelte/icons/shield";
  import Skull from "@lucide/svelte/icons/skull";
  import Swords from "@lucide/svelte/icons/swords";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import UserRound from "@lucide/svelte/icons/user-round";
  import Users from "@lucide/svelte/icons/users";
  import { MECHANICS_GROUPS, type MechanicsHref } from "$lib/data/mechanics";

  const ICONS: Record<MechanicsHref, Component> = {
    "/mechanics/character": UserRound,
    "/mechanics/combat": Axe,
    "/mechanics/experience": TrendingUp,
    "/mechanics/death": HeartCrack,
    "/mechanics/bard": Music,
    "/mercenaries#how-it-works": Swords,
    "/mechanics/mercenary-stats": Calculator,
    "/mechanics/inventory": Backpack,
    "/mechanics/crafting": Hammer,
    "/mechanics/housing": House,
    "/mechanics/party": Users,
    "/mechanics/guilds": Castle,
    "/mechanics/world": Globe,
    "/mechanics/monster-spawns": Skull,
    "/mechanics/reputation": Shield,
  };
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

  {#each MECHANICS_GROUPS as group (group.title)}
    <section class="space-y-3">
      <h2 class="text-xl font-semibold">{group.title}</h2>
      <div class="grid gap-4 md:grid-cols-3">
        {#each group.pages as mechanic (mechanic.href)}
          {@const Icon = ICONS[mechanic.href]}
          <a href={mechanic.href} class="group block">
            <Card.Root
              class="h-full bg-muted/30 transition-colors hover:bg-muted/50"
            >
              <Card.Header>
                <div class="flex items-start gap-3">
                  <div class="rounded-lg bg-muted p-2">
                    <Icon class="h-6 w-6 text-muted-foreground" />
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
