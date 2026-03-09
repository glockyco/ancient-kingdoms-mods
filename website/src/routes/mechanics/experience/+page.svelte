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

  <div class="space-y-2">
    <h1 class="text-4xl font-bold">Experience Mechanics</h1>
    <p class="text-muted-foreground">
      How XP is earned and scaled across all activities.
    </p>
  </div>

  <!-- Kill XP -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Kill XP</Card.Title>
      <Card.Description>
        Experience earned by killing monsters.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="space-y-3">
        <h3 class="font-semibold">Base XP</h3>
        <p class="text-sm text-muted-foreground">
          The base XP shown in the compendium is what you receive when fighting
          a monster at the same level as you, solo, outside of a dungeon.
        </p>
        <!-- Source: server-scripts/Monster.cs:2802-2829 — CalculateRewardExp -->
        <dl
          class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm items-baseline"
        >
          <dt class="text-muted-foreground whitespace-nowrap">Level curve</dt>
          <dd class="space-y-0.5">
            <div class="font-mono">
              15 &times; 1.12<sup>(level &minus; 1)</sup>
            </div>
            <div class="font-mono text-muted-foreground">
              15 &times; 1.12<sup>39</sup> &times; 1.07<sup
                >(level &minus; 40)</sup
              > <span class="font-sans text-xs">(level &gt; 40)</span>
            </div>
          </dd>
          <dt class="text-muted-foreground whitespace-nowrap">
            Type multiplier
          </dt>
          <dd class="font-mono">
            &times;5 <span class="text-muted-foreground">(boss)</span>
            &nbsp;|&nbsp; &times;3
            <span class="text-muted-foreground">(elite)</span>
            &nbsp;|&nbsp; &times;0.5
            <span class="text-muted-foreground">(passive)</span>
            &nbsp;|&nbsp; &times;1
            <span class="text-muted-foreground">(normal)</span>
          </dd>
          <dt class="text-muted-foreground whitespace-nowrap">Health bonus</dt>
          <dd class="space-y-0.5">
            <div class="font-mono">&times;(1 + HP / 1,000 &times; 0.1)</div>
            <div class="font-mono text-muted-foreground">
              &times;(11 + (HP &minus; 100,000) / 5,000 &times; 0.01) <span
                class="font-sans text-xs">(HP &gt; 100,000)</span
              >
            </div>
          </dd>
          <dt class="text-muted-foreground whitespace-nowrap">
            Designer multiplier
          </dt>
          <dd class="font-mono">
            &times;expMultiplier <span class="text-muted-foreground"
              >(usually 1.0)</span
            >
          </dd>
        </dl>
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
                <td class="p-2">10+ levels below monster</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >150% (cap)</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Each level below (up to 10)</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >+5% per level</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">Same level</td>
                <td class="p-2 text-right font-mono">100%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">1 level above</td>
                <td class="p-2 text-right font-mono">99%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">2 levels above</td>
                <td class="p-2 text-right font-mono">97%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">3 levels above</td>
                <td class="p-2 text-right font-mono">95%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">4 levels above</td>
                <td class="p-2 text-right font-mono">90%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">5 levels above</td>
                <td class="p-2 text-right font-mono">80%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">6 levels above</td>
                <td class="p-2 text-right font-mono">70%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">7 levels above</td>
                <td class="p-2 text-right font-mono">60%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">8 levels above</td>
                <td class="p-2 text-right font-mono">50%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">9 levels above</td>
                <td class="p-2 text-right font-mono">40%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">10 levels above</td>
                <td class="p-2 text-right font-mono">30%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">11 levels above</td>
                <td class="p-2 text-right font-mono">25%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">12 levels above</td>
                <td class="p-2 text-right font-mono">20%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">13 levels above</td>
                <td class="p-2 text-right font-mono">15%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">14 levels above</td>
                <td class="p-2 text-right font-mono">14%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">15 levels above</td>
                <td class="p-2 text-right font-mono">13%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">16 levels above</td>
                <td class="p-2 text-right font-mono">12%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">17 levels above</td>
                <td class="p-2 text-right font-mono">11%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">18 levels above</td>
                <td class="p-2 text-right font-mono">10%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">19 levels above</td>
                <td class="p-2 text-right font-mono">8%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">20 levels above</td>
                <td class="p-2 text-right font-mono">5%</td>
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
        <!-- Source: server-scripts/Experience.cs:446-453 — dungeon bonus -->
        <!-- Source: server-scripts/Monster.cs:2455-2461 — double XP skill and Forgotten Altar event -->
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
                <td class="p-2">
                  {#if data.doubleExpSkills.length > 0}
                    {#each data.doubleExpSkills as skill, i (skill.id)}
                      {#if i > 0},
                      {/if}<a
                        href="/skills/{skill.id}"
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >{skill.name}</a
                      >
                    {/each}
                    (buff)
                  {:else}
                    Double XP buff
                  {/if}
                </td>
                <td class="p-2 text-right font-mono">×2</td>
              </tr>
              <tr class="hover:bg-muted/30">
                <td class="p-2">Forgotten Altar event</td>
                <td class="p-2 text-right font-mono">×1.4</td>
              </tr>
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
          monster — the same scaled value is awarded to every member regardless of
          their individual levels.
        </p>
        <p class="text-sm text-muted-foreground">
          A party bonus partially offsets the split: each additional member
          beyond the first adds 1.25× the per-member share as a bonus on top, so
          larger parties are more XP-efficient per player than soloing.
        </p>
        <p class="text-sm text-muted-foreground">
          The double XP buff is applied individually — only members who have it
          active receive double their share. The Forgotten Altar event bonus
          applies to all members equally.
        </p>
        <p class="text-sm text-muted-foreground">
          Mercenaries do not affect XP splitting — they are not counted as party
          members. A solo player with mercenaries receives the same XP as one
          without.
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Zone Discovery XP -->
  <Card.Root>
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
            <th class="text-right p-2 font-medium">Discovery XP</th>
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
  <Card.Root>
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
            <th class="text-left p-2 font-medium">Resource tier</th>
            <th class="text-right p-2 font-medium">Gathering XP</th>
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
  <Card.Root>
    <Card.Header>
      <Card.Title>Crafting XP</Card.Title>
      <Card.Description>
        Experience earned by crafting items at a crafting station.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10309-10318 — crafting XP by item quality -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Item quality</th>
            <th class="text-right p-2 font-medium">Crafting XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Quality I</td>
            <td class="p-2 text-right font-mono">150</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Quality II</td>
            <td class="p-2 text-right font-mono">750</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Quality III</td>
            <td class="p-2 text-right font-mono">3,500</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Quality IV</td>
            <td class="p-2 text-right font-mono">10,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>

  <!-- Alchemy XP -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Alchemy XP</Card.Title>
      <Card.Description>
        Experience earned by brewing potions at an alchemy table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10085-10096 — alchemy XP by potion quality -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Potion quality</th>
            <th class="text-right p-2 font-medium">Alchemy XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Quality I</td>
            <td class="p-2 text-right font-mono">300</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Quality II</td>
            <td class="p-2 text-right font-mono">2,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2">Quality III</td>
            <td class="p-2 text-right font-mono">5,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2">Quality IV</td>
            <td class="p-2 text-right font-mono">12,000</td>
          </tr>
        </tbody>
      </table>
    </Card.Content>
  </Card.Root>
</div>
