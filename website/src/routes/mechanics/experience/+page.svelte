<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";

  let { data } = $props();
</script>

<svelte:head>
  <title>Experience Mechanics - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="How experience (XP) is earned in Ancient Kingdoms — kill XP scaling, gathering, crafting, alchemy, zone discovery, and party mechanics."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-4xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics" },
      { label: "Experience" },
    ]}
  />

  <h1 class="text-4xl font-bold">Experience Mechanics</h1>

  <nav aria-label="Page sections" class="text-sm text-muted-foreground">
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      <li>
        <a href="#kill-xp" class="hover:text-foreground hover:underline"
          >Kill XP</a
        >
      </li>
      <li>
        <a
          href="#zone-discovery-xp"
          class="hover:text-foreground hover:underline">Zone Discovery XP</a
        >
      </li>
      <li>
        <a href="#gathering-xp" class="hover:text-foreground hover:underline"
          >Gathering XP</a
        >
      </li>
      <li>
        <a href="#crafting-xp" class="hover:text-foreground hover:underline"
          >Crafting XP</a
        >
      </li>
      <li>
        <a href="#alchemy-xp" class="hover:text-foreground hover:underline"
          >Alchemy XP</a
        >
      </li>
    </ul>
  </nav>

  <!-- Kill XP -->
  <Card.Root id="kill-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Kill XP</Card.Title>
      <Card.Description>
        Experience earned by killing monsters.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-2">
        <h3 class="font-semibold">Base XP</h3>
        <p class="text-sm text-muted-foreground">
          Each monster has a base XP value shown on its page. This is the XP you
          receive when fighting it at the same level as you, solo, outside of a
          dungeon. The following modifiers are then applied on top.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Level Difference Scaling</h3>
        <p class="text-sm text-muted-foreground">
          Your actual XP is multiplied based on the difference between your
          level and the monster's level.
        </p>
        <!-- Source: server-scripts/Experience.cs:430-466 — BalanceExperienceReward -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Level difference</th>
                <th class="text-right p-2 font-medium">XP multiplier</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">10+ levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >150%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">9 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >145%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">8 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >140%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">7 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >135%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">6 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >130%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">5 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >125%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">4 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >120%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">3 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >115%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">2 levels below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >110%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">1 level below</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >105%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Same level</td>
                <td class="p-2 text-right font-mono">100%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">1 level above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >99%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">2 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >97%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">3 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >95%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">4 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >90%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">5 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >80%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">6 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >70%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">7 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >60%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">8 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >50%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">9 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >40%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">10 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >30%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">11 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >25%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">12 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >20%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">13 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >15%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">14 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >14%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">15 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >13%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">16 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >12%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">17 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >11%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">18 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >10%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">19 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >8%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">20 levels above</td>
                <td
                  class="p-2 text-right font-mono text-orange-600 dark:text-orange-400"
                  >5%</td
                >
              </tr>
              <tr class="hover:bg-muted/30">
                <td class="p-2">21+ levels above</td>
                <td
                  class="p-2 text-right font-mono text-red-600 dark:text-red-400"
                  >0%</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Additional Modifiers</h3>
        <p class="text-sm text-muted-foreground">
          These are applied on top of the level-scaled value:
        </p>
        <!-- Source: server-scripts/Experience.cs:446-453 — dungeon +10% bonus -->
        <!-- Source: server-scripts/Monster.cs:2457 — double XP skill (solo kill) -->
        <!-- Source: server-scripts/Monster.cs:2458 — Forgotten Altar ×1.4 (solo kill) -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Modifier</th>
                <th class="text-right p-2 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Dungeon kill</td>
                <td class="p-2 text-right font-mono">+10% flat</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Forgotten Altar event</td>
                <td class="p-2 text-right font-mono">×1.4</td>
              </tr>
              {#if data.doubleExpSkills.length > 0}
                {#each data.doubleExpSkills as skill, i (skill.id)}
                  <tr
                    class="{i < data.doubleExpSkills.length - 1
                      ? 'border-b'
                      : ''} hover:bg-muted/30"
                  >
                    <td class="p-2">
                      <a
                        href="/skills/{skill.id}"
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >{skill.name}</a
                      >
                      <span class="text-muted-foreground text-xs">(buff)</span>
                    </td>
                    <td class="p-2 text-right font-mono">×2</td>
                  </tr>
                {/each}
              {:else}
                <tr class="hover:bg-muted/30">
                  <td class="p-2">Double XP buff</td>
                  <td class="p-2 text-right font-mono">×2</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Party XP</h3>
        <!-- Source: server-scripts/Experience.cs:468-474 — CalculateExperienceShare -->
        <!-- Source: server-scripts/Monster.cs:2354-2412 — party kill XP award loop -->
        <p class="text-sm text-muted-foreground">
          When in a party, the base XP is split evenly among all nearby members
          (within range). The resulting per-member share is then scaled by the
          level difference between the <em>highest-level</em> party member and the
          monster. The same scaled value is awarded to every member regardless of
          their individual levels.
        </p>
        <p class="text-sm text-muted-foreground">
          A party bonus partially offsets the split: each additional member
          beyond the first adds 1.25× the per-member share as a bonus on top, so
          larger parties are more XP-efficient per player than soloing.
        </p>
        <p class="text-sm text-muted-foreground">
          The double XP buff is applied individually. Only members who have it
          active receive double their share. The Forgotten Altar event bonus
          applies to all members equally.
        </p>
        <p class="text-sm text-muted-foreground">
          Mercenaries do not affect XP splitting. They are not counted as party
          members, so a solo player with mercenaries receives the same XP as one
          without.
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Zone Discovery XP -->
  <Card.Root id="zone-discovery-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Zone Discovery XP</Card.Title>
      <Card.Description>
        Experience earned the first time you discover a zone.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/ZoneTrigger.cs:148-174 — discovery XP amounts -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Zone type</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Dungeon</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">City / Village</td>
            <td class="p-2 text-right font-mono">10</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">All other zones</td>
            <td class="p-2 text-right font-mono">25</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Gathering XP -->
  <Card.Root id="gathering-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Gathering XP</Card.Title>
      <Card.Description>
        Experience earned by gathering resources (herbalism, mining, etc.).
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/GatherItem.cs:533-546 — gathering XP by tier -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">15</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">750</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">4,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier V</td>
            <td class="p-2 text-right font-mono">10,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Crafting XP -->
  <Card.Root id="crafting-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Crafting XP</Card.Title>
      <Card.Description>
        Experience earned by crafting items at a crafting station.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10476-10480 — crafting XP by item quality -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">750</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">3,500</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">10,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Alchemy XP -->
  <Card.Root id="alchemy-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Alchemy XP</Card.Title>
      <Card.Description>
        Experience earned by brewing potions at an alchemy table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10246-10253 — alchemy XP by recipe tier -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Tier</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier I</td>
            <td class="p-2 text-right font-mono">300</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier II</td>
            <td class="p-2 text-right font-mono">2,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Tier III</td>
            <td class="p-2 text-right font-mono">5,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Tier IV</td>
            <td class="p-2 text-right font-mono">12,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>
</div>
