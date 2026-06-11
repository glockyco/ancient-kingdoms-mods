<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Alert } from "$lib/components/ui/alert";
  import Backpack from "@lucide/svelte/icons/backpack";
  import Skull from "@lucide/svelte/icons/skull";
  import Swords from "@lucide/svelte/icons/swords";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

  const mechanics = [
    {
      href: "/mechanics/inventory",
      title: "Inventory",
      description: "Backpacks, bank tabs, house chests, and loot rules",
      icon: Backpack,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      href: "/mechanics/experience",
      title: "Experience",
      description: "Kill, death, profession, quest, and discovery XP",
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      href: "/mechanics/combat",
      title: "Combat",
      description: "Damage formulas, mitigation, healing, buffs, and timing",
      icon: Swords,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      href: "/mechanics/monster-spawns",
      title: "Monster Spawns",
      description: "Respawn timers, rare spawns, boss timers, and zone resets",
      icon: Skull,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];
</script>

<Seo
  title="Game Mechanics - Ancient Kingdoms"
  description="Combat damage formulas, XP gain rates, inventory and storage rules, and monster respawn timers for Ancient Kingdoms — drawn from the game's actual logic."
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

  <div class="grid gap-6 md:grid-cols-3">
    {#each mechanics as mechanic (mechanic.href)}
      <a href={mechanic.href} class="group block">
        <Card.Root
          class="h-full bg-muted/30 transition-colors hover:bg-muted/50"
        >
          <Card.Header>
            <div class="flex items-start gap-3">
              <div class="rounded-lg p-2 {mechanic.bg}">
                <mechanic.icon class="h-6 w-6 {mechanic.color}" />
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
</div>
