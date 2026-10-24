<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<Seo
  title="Regional Event Mechanics - Ancient Kingdoms"
  description="Regional events (Dynamic Events) in Ancient Kingdoms: objectives, contribution rewards, city invasions, and the Prosperity experience bonus."
  path="/mechanics/regional-events"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Regional Events" },
    ]}
  />

  <h1 class="text-4xl font-bold">Regional Event Mechanics</h1>
  <!-- Source: server-scripts/RegionalEventText.cs:81-105,138-152 — the map shows the regional objective, time, progress, contribution and completion rewards. -->
  <p class="text-muted-foreground">
    Regional events, also called Dynamic Events, ask players to supply a region,
    hunt animals, or defend a city. Check the map for the objective, remaining
    time, progress, and your contributions.
  </p>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/regional-events"]} />

  <Card.Root id="availability" class="bg-muted/30">
    <Card.Header>
      <Card.Title>When and where events start</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEvents.cs:120-125,377-432 — checks start 300 seconds after server start and repeat every 1800 seconds, with a 30% roll if connected players exist and no event is active or waiting. -->
      <p>
        The first check is 5 minutes after server start. Checks repeat every 30
        minutes with a 30% chance to start an event. At least one player must be
        connected, and no event can already be active or waiting for players.
      </p>
      <!-- Source: server-scripts/RegionalEvents.cs:497-542 — zones 1 through 5 are candidates unless occupied by the current event or Prosperity. Northern Wastes requires an online level 35 player and an invasion definition. -->
      <p>
        Events can select
        {#each data.regions as region, i (region.id)}{#if i > 0}{i ===
            data.regions.length - 1
              ? ", or "
              : ", "}{/if}<a
            href="/zones/{region.id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{region.name}</a
          >{/each}.
        <a
          href="/zones/northern_wastes"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Northern Wastes</a
        >
        is also eligible when a level 35 or higher player is online and an invasion
        is configured there. A region with the current event or active Prosperity
        is excluded. City invasions require a level 35 or higher player online.
      </p>
      <!-- Source: server-scripts/RegionalEvents.cs:433-440,536-559; server-scripts/RegionalEventProgress.cs:38-60 — ordinary requests use the configured activity duration. Invasions wait 1200 seconds for a living level 35 participant in the region, then run for 600 seconds. -->
      <!-- Source: server-scripts/RegionalEventSettings.cs:6-10 — enabled state and activity and Prosperity durations are configured settings. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Stage</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Time limit</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            <tr class="border-b"
              ><td class="p-3">Supply or hunting request</td><td class="p-3"
                >{data.settings.activity_duration_minutes} minutes</td
              ></tr
            >
            <tr class="border-b"
              ><td class="p-3">Invasion warning</td><td class="p-3"
                >Up to 20 minutes. A living level 35 or higher player in the
                region starts the invasion.</td
              ></tr
            >
            <tr class="border-b"
              ><td class="p-3">Active invasion</td><td class="p-3"
                >10 minutes after the invasion starts</td
              ></tr
            >
            <tr
              ><td class="p-3">Prosperity after success</td><td class="p-3"
                >{data.settings.prosperity_duration_minutes} minutes</td
              ></tr
            >
          </tbody>
        </table>
      </div>
      {#if !data.settings.enabled}
        <p>Regional events are disabled in the exported server settings.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="activities" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Activities and contributions</Card.Title>
      <!-- Source: server-scripts/RegionalEvents.cs:211-257,270-314 — contributions require a connected, living player in the event region and the matching activity. -->
      <Card.Description
        >Contribute while alive and connected in the event's region.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventText.cs:30-40 — the six activity titles. -->
      <!-- Source: server-scripts/RegionalEvents.cs:243-257,270-306,536-551 — gathering uses 5 yd, hunting uses 40 yd, fishing and cooking use 2.5 yd from the activity collider. Herbs exclude Northern Wastes. Ore uses zones 2, 3 and 5. -->
      <!-- Source: server-scripts/RegionalEventActivities.cs:32-128,139-181,212-279 — fishing needs valid spots and fish, cooking needs city ovens and dishes using the requested animal, and hunting selects a viable wild animal population. -->
      <!-- Source: server-scripts/GatherItem.cs:523-535,1365-1379 — gathering and fishing contributions require the item to enter the player's inventory. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground"
                >In-game title</th
              ><th class="p-3 text-left font-medium text-foreground">Where</th
              ><th class="p-3 text-left font-medium text-foreground"
                >One contribution</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground"
                >The Apothecaries' Call</td
              >
              <td class="p-3">The five standard regions listed above</td>
              <td class="p-3"
                >Gather a non-quest plant into your inventory within 5 yd of the
                resource.</td
              >
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground">Fires of the Forge</td
              >
              <td class="p-3"
                >{#each data.regions.filter( (region) => [2, 3, 5].includes(region.zone_id) ) as region, i (region.id)}{i >
                  0
                    ? ", "
                    : ""}<a
                    href="/zones/{region.id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{region.name}</a
                  >{/each}</td
              >
              <td class="p-3"
                >Mine non-quest ore into your inventory within 5 yd of the
                resource.</td
              >
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground"
                >The Fishers' Request</td
              >
              <td class="p-3"
                >Eligible regions with active fishing spots and non-quest fish</td
              >
              <td class="p-3"
                >Catch a non-quest fish into your inventory within 2.5 yd of the
                fishing spot's edge.</td
              >
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground">Cook for [city]</td>
              <td class="p-3"
                >Invasion cities listed below with suitable ovens and recipes</td
              >
              <td class="p-3"
                >Cook a dish using the requested animal at an oven inside the
                named city, within 2.5 yd of the oven's edge. Any quality
                counts. Recipes using another qualifying dish also count.</td
              >
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground">A Regional Hunt</td>
              <td class="p-3"
                >Eligible regions with at least 3 reliably respawning wild
                animals of one kind and enough estimated kills to meet the goal</td
              >
              <td class="p-3"
                >Help kill the requested animal. Have positive threat on it and
                stay within 40 yd when it dies.</td
              >
            </tr>
            <tr>
              <td class="p-3 font-medium text-foreground">Defend [city]</td>
              <td class="p-3">Invasion cities listed below</td>
              <td class="p-3"
                >Strike an invader to join. For each kill, have positive threat
                on that invader and stay within 40 yd when it dies.</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/RegionalEventProgress.cs:72-102; server-scripts/RegionalEvents.cs:229-249 — each distinct action advances the goal once and can credit multiple hunters. Invader deaths advance the goal even without a credited player. -->
      <p>
        Each completed action adds one to the shared goal. A hunting or invasion
        kill can credit several players. Invaders killed without a qualifying
        player still advance the shared goal, but give no personal contribution.
      </p>
      <!-- Source: server-scripts/RegionalEventText.cs:81-90 — players keep gathered resources, fish and cooked dishes. -->
      <p>You keep the resources, fish, and dishes.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="rewards" class="bg-muted/30">
    <Card.Header
      ><Card.Title>Goals and completion rewards</Card.Title></Card.Header
    >
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventProgress.cs:38-48; server-scripts/RegionalEvents.cs:220-227,527-559 — goals count living, connected players in the chosen region at event creation, with at most four extra participants. -->
      <p>
        Participants are counted when the event is created, using living,
        connected players in the region. Each participant after the first raises
        the goal, up to four extra participants. Joining later does not increase
        it.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-md border bg-muted/30 p-4">
          <h3 class="font-semibold text-foreground">
            Supply requests and hunts
          </h3>
          <p>12 + 3 per extra participant</p>
          <p>12 to 24 completed actions</p>
        </div>
        <div class="rounded-md border bg-muted/30 p-4">
          <h3 class="font-semibold text-foreground">City invasions</h3>
          <p>60 + 10 per extra participant</p>
          <p>Defeat invaders to reach the goal.</p>
        </div>
      </div>
      <!-- Source: server-scripts/RegionalEventProgress.cs:72-101,127-142; server-scripts/RegionalEvents.cs:316-344 — three contributions qualify for rewards, computed from the first contribution's level and XP requirement, and only connected players in the region at completion receive them. -->
      <!-- Source: server-scripts/RegionalEventText.cs:138-152 — the quarter-level reward is Veteran XP at level 50. -->
      <p>
        Make at least 3 contributions and be connected in the region when the
        shared goal is completed. You receive 20 + 10 × your level in gold and a
        quarter of the XP required for your current level, rounded down. At
        level 50, this is Veteran XP. Your level and XP requirement are recorded
        at your first contribution.
      </p>
      <!-- Source: server-scripts/RegionalEventProgress.cs:105-142; server-scripts/RegionalEvents.cs:328-344 — an expired event, fewer than three contributions, disconnection or absence at completion prevents the personal reward. -->
      <p>
        You receive no completion reward if the event expires, you make fewer
        than 3 contributions, or you are disconnected or outside the region at
        completion.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="prosperity" class="bg-muted/30">
    <Card.Header><Card.Title>Regional prosperity</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventProgress.cs:97-101,145-152; server-scripts/RegionalEvents.cs:188-195,363-375 — completion grants a regional 15% XP multiplier, floored, with dungeon combat mapped to its parent region. -->
      <!-- Source: server-scripts/Monster.cs:3202-3208,3239-3245; server-scripts/GatherItem.cs:630-642,818-828 — Prosperity follows Double XP and, for monster kills, the Forgotten Altar multiplier. -->
      <p>
        Completing the shared goal starts Prosperity in that region for
        {data.settings.prosperity_duration_minutes} minutes. Every player earning
        eligible XP there gets the bonus, whether or not they contributed. The eligible
        XP is multiplied by 1.15 and rounded down, after Double XP and any Forgotten
        Altar multiplier.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground"
                >XP source</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Prosperity bonus</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            <tr class="border-b"
              ><td class="p-3">Monster kills</td><td class="p-3"
                >15% more XP in the region and its dungeons, solo or in a party</td
              ></tr
            >
            <tr class="border-b"
              ><td class="p-3">Gathering and fishing</td><td class="p-3"
                >15% more XP outdoors in the region only</td
              ></tr
            >
            <!-- Source: server-scripts/PlayerQuests.cs:384-392; server-scripts/Player.cs:13348-13351,13757-13770,14040-14042,14063-14067; server-scripts/Npc.cs:1608-1616,1641-1649 — quest, discovery, crafting and NPC kill XP bypass the Prosperity multiplier. -->
            <tr
              ><td class="p-3">Quests, crafting, discovery, and NPC kills</td
              ><td class="p-3">No Prosperity bonus</td></tr
            >
          </tbody>
        </table>
      </div>
      <p>
        See <MechanicsLink section="experience">Experience</MechanicsLink> for other
        XP modifiers.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="invasions" class="bg-muted/30">
    <Card.Header><Card.Title>City invasions</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalInvasions.cs:335-389 — invaders cycle through the configured attacker list, use the configured level range and health multiplier, and keep only their first skill. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground"
                >City and region</th
              ><th class="p-3 text-left font-medium text-foreground">Level</th
              ><th class="p-3 text-left font-medium text-foreground">Health</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Attackers</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            {#each data.invasions as invasion (invasion.id)}
              <tr class="border-b last:border-0">
                <td class="p-3"
                  ><span class="block font-medium text-foreground"
                    >{invasion.city_name}</span
                  ><a
                    href="/zones/{invasion.zone_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{invasion.zone_name}</a
                  ></td
                >
                <td class="p-3 whitespace-nowrap"
                  >{invasion.minimum_level} to {invasion.maximum_level}</td
                >
                <td class="p-3 whitespace-nowrap"
                  >×{invasion.health_multiplier}</td
                >
                <td class="p-3"
                  ><ul class="space-y-1">
                    {#each invasion.attackers as attacker (attacker.ordinal)}<li
                      >
                        <EntityLink
                          href="/monsters/{attacker.monster_id}"
                          name={attacker.monster_name}
                        />
                      </li>{/each}
                  </ul></td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/RegionalInvasions.cs:283-341,378-384 — waves contain up to eight attackers every 20 seconds, at most 24 live attackers, and no gold, item drops or faction changes. -->
      <p>
        Waves spawn up to 8 attackers every 20 s, with at most 24 alive. Each
        attacker uses only its first skill. Invasion attackers drop no loot or
        gold and give no faction gains or losses.
      </p>
      <!-- Source: server-scripts/RegionalInvasions.cs:182-195,216-245 — invaders deal ten times damage to city citizens, take a tenth from them with a minimum of one damage, and only attack participating players inside the city. -->
      <p>
        Invaders attack city NPCs and only attack players who strike first,
        while those players remain inside the city. Against city NPCs, invaders
        deal 10 times damage and take one tenth damage, with a minimum of 1
        damage.
      </p>
      <!-- Source: server-scripts/Npc.cs:1505-1510 — a citizen killed by a regional invader respawns 900 seconds after death. -->
      <p>A city NPC killed by an invader respawns 15 minutes after death.</p>
    </Card.Content>
  </Card.Root>
</div>
