<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo
  title="Experience Mechanics - Ancient Kingdoms Compendium"
  description="How experience (XP) is earned in Ancient Kingdoms — kill XP scaling, death and recovery, scrolls, gathering, alchemy, cooking, crafting, quests, and zone discovery."
  path="/mechanics/experience"
/>

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
        <a href="#death-xp" class="hover:text-foreground hover:underline"
          >Death XP</a
        >
      </li>
      <li>
        <a href="#scroll-xp" class="hover:text-foreground hover:underline"
          >Scroll XP</a
        >
      </li>
      <li>
        <a href="#gathering-xp" class="hover:text-foreground hover:underline"
          >Gathering XP</a
        >
      </li>
      <li>
        <a href="#alchemy-xp" class="hover:text-foreground hover:underline"
          >Alchemy XP</a
        >
      </li>
      <li>
        <a href="#scribing-xp" class="hover:text-foreground hover:underline"
          >Scribing XP</a
        >
      </li>
      <li>
        <a href="#cooking-xp" class="hover:text-foreground hover:underline"
          >Cooking XP</a
        >
      </li>
      <li>
        <a href="#crafting-xp" class="hover:text-foreground hover:underline"
          >Crafting XP</a
        >
      </li>
      <li>
        <a href="#quest-xp" class="hover:text-foreground hover:underline"
          >Quest XP</a
        >
      </li>
      <li>
        <a
          href="#zone-discovery-xp"
          class="hover:text-foreground hover:underline">Zone Discovery XP</a
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
        <!-- Source: server-scripts/Monster.cs:2457 — double XP applies to kills -->
        <!-- Source: server-scripts/GatherItem.cs:533 — double XP applies to gathering -->
        <!-- Source: server-scripts/Player.cs:10246 — double XP applies to alchemy -->
        <!-- Source: server-scripts/Player.cs:10322 — double XP applies to scribing -->
        <!-- Source: server-scripts/Player.cs:10474 — double XP applies to crafting and cooking -->
        <!-- Source: server-scripts/PlayerQuests.cs:321 — no double XP for quests -->
        <!-- Source: server-scripts/ZoneTrigger.cs — no double XP for zone discovery -->
        <p class="text-sm text-muted-foreground">
          Double XP buffs apply to kills, gathering, alchemy, scribing, cooking,
          and crafting. They do not apply to XP scrolls, quests, or zone
          discovery.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">Party XP</h3>
        <!-- Source: server-scripts/Experience.cs:468-474 — CalculateExperienceShare -->
        <!-- Source: server-scripts/Monster.cs:2354-2412 — party kill XP award loop -->
        <!-- Source: server-scripts/Party.cs:9 — Capacity = 5 -->
        <!-- Source: server-scripts/Party.cs:11 — BonusExperiencePerMember = 1.25f -->
        <!-- Source: server-scripts/Monster.cs:2402 — 1.25f passed as bonusPercentagePerMember -->
        <p class="text-sm text-muted-foreground">
          XP is split evenly among nearby party members, but a bonus more than
          compensates: each member in a larger party earns more than a solo
          player would. Level scaling uses the highest-level member's level
          difference to the monster, applied equally to everyone. Mercenaries
          are not counted as party members.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium">Party size</th>
                <th class="text-right p-2 font-medium">XP per member</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">1 (solo)</td>
                <td class="p-2 text-right font-mono">100%</td>
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">2</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >112.5%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">3</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >116.7%</td
                >
              </tr>
              <tr class="border-b hover:bg-muted/30">
                <td class="p-2">4</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >118.75%</td
                >
              </tr>
              <tr class="hover:bg-muted/30">
                <td class="p-2">5</td>
                <td
                  class="p-2 text-right font-mono text-green-600 dark:text-green-400"
                  >120%</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Death XP -->
  <Card.Root id="death-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Death XP</Card.Title>
      <Card.Description>
        Experience lost on death, and how to recover it.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Source: server-scripts/Experience.cs:32 — deathLossPercent = 0.1f -->
      <!-- Source: server-scripts/Experience.cs:477-486 — Death() = max * 0.1f -->
      <!-- Source: server-scripts/Player.cs:3264-3265 — lossExp capped at experience.current -->
      <p class="text-sm text-muted-foreground">
        On death, you lose 10% of the current level's XP cap. The loss cannot
        drop you below zero XP for your level.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2 font-medium">Recovery method</th>
              <th class="text-right p-2 font-medium">XP recovered</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/Player.cs:11087 — CmdGetExpFromRemains: 0.5f * lossExp -->
            <tr class="border-b hover:bg-muted/30">
              <td class="p-2">Retrieve from corpse</td>
              <td class="p-2 text-right font-mono">50%</td>
            </tr>
            <!-- Source: server-scripts/Player.cs:10026 — CmdResurrect: 0.75f * lossExp -->
            <tr class="hover:bg-muted/30">
              <td class="p-2"
                ><a
                  href="/skills/resurrection"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >Resurrection</a
                > (cast by another player)</td
              >
              <td class="p-2 text-right font-mono">75%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Scroll XP -->
  <Card.Root id="scroll-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Scroll XP</Card.Title>
      <Card.Description>
        Experience earned by using XP scrolls. No multipliers apply.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/PotionItem.cs:102-105 — usageExperience field -->
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left p-2 font-medium">Scroll</th>
            <th class="text-right p-2 font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_i"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge I</a
              ></td
            >
            <td class="p-2 text-right font-mono">250</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_ii"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge II</a
              ></td
            >
            <td class="p-2 text-right font-mono">1,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_iii"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge III</a
              ></td
            >
            <td class="p-2 text-right font-mono">5,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_iv"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge IV</a
              ></td
            >
            <td class="p-2 text-right font-mono">25,000</td>
          </tr>
          <tr class="border-b hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_knowledge_v"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Knowledge V</a
              ></td
            >
            <td class="p-2 text-right font-mono">100,000</td>
          </tr>
          <tr class="hover:bg-muted/30">
            <td class="p-2"
              ><a
                href="/items/scroll_of_illumination"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll of Illumination</a
              ></td
            >
            <td class="p-2 text-right font-mono">1,500,000</td>
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
        Experience earned by gathering herbs, minerals, radiant sparks, and
        other resources.
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

  <!-- Scribing XP -->
  <Card.Root id="scribing-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Scribing XP</Card.Title>
      <Card.Description>
        Experience earned by crafting scrolls at a scribing table.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10318-10321 — isScribingTable overrides num5 = level.current * 100 -->
      <p class="text-sm text-muted-foreground">
        Each successful craft awards <span class="font-mono font-medium"
          >Player Level &times; 100</span
        > XP.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Cooking XP -->
  <Card.Root id="cooking-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Cooking XP</Card.Title>
      <Card.Description>
        Experience earned by cooking food at a cooking oven.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/Player.cs:10474-10481 — cooking XP by item quality (same table as crafting) -->
      <!-- Source: server-scripts/Player.cs:10490-10515 — cooking branch awards XP on success only -->
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

  <!-- Crafting XP -->
  <Card.Root id="crafting-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Crafting XP</Card.Title>
      <Card.Description>
        Experience earned by crafting items at a forge.
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

  <!-- Quest XP -->
  <Card.Root id="quest-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Quest XP</Card.Title>
      <Card.Description>
        Experience earned by completing <a
          href="/quests"
          class="text-blue-600 dark:text-blue-400 hover:underline">quests</a
        >.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <!-- Source: server-scripts/PlayerQuests.cs:321 — rewardExperience added directly, no multipliers -->
      <p class="text-sm text-muted-foreground">
        XP varies per quest and is shown on each quest's page. No multipliers
        apply.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Zone Discovery XP -->
  <Card.Root id="zone-discovery-xp" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Zone Discovery XP</Card.Title>
      <Card.Description>
        Experience earned the first time you discover a zone.
      </Card.Description>
      <!-- Source: server-scripts/ZoneTrigger.cs — no multipliers apply to zone discovery XP -->
    </Card.Header>
    <Card.Content class="space-y-4">
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
      <p class="text-sm text-muted-foreground">No multipliers apply.</p>
    </Card.Content>
  </Card.Root>
</div>
