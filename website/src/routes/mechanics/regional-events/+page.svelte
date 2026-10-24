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

  // Source: server-scripts/RegionalEventActivities.cs:TypicalAnimal — the animal whose meat each city's cooking request uses.
  const COOKING_ANIMALS: Record<string, string> = {
    Elven: "Deer",
    Dwarven: "Bison",
    Milldenn: "Sabretooth",
    DarkElven: "Magmadrake",
    Felarii: "Panther",
  };
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
    Regional events, also called Dynamic Events, ask everyone in a region for
    help: gather supplies, hunt, cook, or defend a city from invaders. The map
    shows the goal, the time left, and your progress. Help at least 3 times to
    earn a reward, and the whole region prospers when the goal is reached.
  </p>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/regional-events"]} />

  <Card.Root id="availability" class="bg-muted/30">
    <Card.Header>
      <Card.Title>When events happen</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEvents.cs:120-125,377-432 — checks start 300 seconds after server start and repeat every 1800 seconds, with a 30% roll if connected players exist and no event is active or waiting. -->
      <p>
        Every 30 minutes there is a 30% chance that an event starts, as long as
        someone is online and no other event is running. The first chance comes
        5 minutes after the world starts.
      </p>
      <!-- Source: server-scripts/RegionalEvents.cs:497-542 — zones 1 through 5 are candidates unless occupied by the current event or Prosperity. Northern Wastes requires an online level 35 player and an invasion definition. -->
      <p>
        Events take place in
        {#each data.regions as region, i (region.id)}{#if i > 0}{i ===
            data.regions.length - 1
              ? ", and "
              : ", "}{/if}<a
            href="/zones/{region.id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >{region.name}</a
          >{/each}. Events in the
        <a
          href="/zones/northern_wastes"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Northern Wastes</a
        >
        and city invasions only happen while a level 35 or higher player is online.
        The same region never gets two events in a row, and a region gets no event
        while it prospers.
      </p>
      <!-- Source: server-scripts/RegionalEvents.cs:433-440,536-559; server-scripts/RegionalEventProgress.cs:38-60 — ordinary requests use the configured activity duration. Invasions wait 1200 seconds for a living level 35 participant in the region, then run for 600 seconds. -->
      <!-- Source: server-scripts/RegionalEventSettings.cs:6-10 — enabled state and activity and Prosperity durations are configured settings. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Event</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Time limit</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            <tr class="border-b"
              ><td class="p-3">Supply request, hunt, or cooking request</td><td
                class="p-3"
                >{data.settings.activity_duration_minutes} minutes</td
              ></tr
            >
            <!-- Source: server-scripts/RegionalInvasions.cs:283-298; RegionalEvents.cs:433-442; RegionalEventProgress.cs:38-60,104-124 — no invaders spawn before the invasion starts. A living level 35 participant in the zone starts it, and an unstarted invasion expires after 1200 seconds. -->
            <tr class="border-b"
              ><td class="p-3">City invasion, announced</td><td class="p-3"
                >Up to 20 minutes. No invaders appear yet. The invasion starts
                as soon as a level 35 or higher player is anywhere in the
                invaded region. If none arrives within 20 minutes, the invasion
                is called off.</td
              ></tr
            >
            <tr class="border-b"
              ><td class="p-3">City invasion, under attack</td><td class="p-3"
                >10 minutes</td
              ></tr
            >
            <tr
              ><td class="p-3">Prosperity</td><td class="p-3"
                >{data.settings.prosperity_duration_minutes} minutes</td
              ></tr
            >
          </tbody>
        </table>
      </div>
      {#if !data.settings.enabled}
        <p>Regional events are switched off in the exported server settings.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="activities" class="bg-muted/30">
    <Card.Header>
      <Card.Title>What to do</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventText.cs:30-40 — the six activity titles. -->
      <!-- Source: server-scripts/RegionalEvents.cs:243-257,270-306,536-551 — gathering uses 5 yd, hunting uses 40 yd, fishing and cooking use 2.5 yd from the activity collider. Herbs exclude Northern Wastes. Ore uses zones 2, 3 and 5. -->
      <!-- Source: server-scripts/RegionalEventActivities.cs:32-128,139-181,212-279 — fishing needs valid spots and fish, cooking needs city ovens and dishes using the requested animal, and hunting selects a viable wild animal population. -->
      <!-- Source: server-scripts/RegionalEventActivities.cs:TypicalAnimal,MeatAnimal — each city's cooking request uses one animal's meat. -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr class="border-b"
              ><th class="p-3 text-left font-medium text-foreground">Event</th
              ><th class="p-3 text-left font-medium text-foreground">Where</th
              ><th class="p-3 text-left font-medium text-foreground"
                >What counts</th
              ></tr
            ></thead
          >
          <tbody class="[&>tr:nth-child(odd)]:bg-muted/30">
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground"
                >The Apothecaries' Call</td
              >
              <td class="p-3">Any event region except the Northern Wastes</td>
              <td class="p-3">Each plant you gather.</td>
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
              <td class="p-3">Each ore you mine.</td>
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground"
                >The Fishers' Request</td
              >
              <td class="p-3">A region with fishing spots</td>
              <td class="p-3">Each fish you catch.</td>
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground">Cook for [city]</td>
              <td class="p-3">An oven in the named city</td>
              <td class="p-3"
                >Each dish you cook with the city's animal meat, at any quality.
                The animals are listed under City invasions.</td
              >
            </tr>
            <tr class="border-b">
              <td class="p-3 font-medium text-foreground">A Regional Hunt</td>
              <td class="p-3">A region with plenty of one wild animal</td>
              <td class="p-3"
                >Each requested animal you help kill, if you are nearby when it
                dies.</td
              >
            </tr>
            <tr>
              <td class="p-3 font-medium text-foreground">Defend [city]</td>
              <td class="p-3">One of the cities under City invasions</td>
              <td class="p-3"
                >Each invader you help kill, if you are nearby when it dies.</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/RegionalEventProgress.cs:72-102; server-scripts/RegionalEvents.cs:229-249 — each distinct action advances the goal once and can credit multiple hunters. Invader deaths advance the goal even without a credited player. -->
      <!-- Source: server-scripts/RegionalEvents.cs:251-258; RegionalEventActivities.cs:54,150,258 — quest items do not count for gathering, fishing or cooking. -->
      <!-- Source: server-scripts/RegionalEventText.cs:81-90 — players keep gathered resources, fish and cooked dishes. -->
      <p>
        All players in the region work toward the same goal. A kill counts for
        everyone who helped. Invaders killed by townsfolk also count. Quest
        items do not count. You keep what you gather, catch, and cook.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="rewards" class="bg-muted/30">
    <Card.Header><Card.Title>Goals and rewards</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventProgress.cs:38-48; server-scripts/RegionalEvents.cs:220-227,527-559 — goals count living, connected players in the chosen region at event creation, with at most four extra participants. -->
      <p>
        The goal depends on how many players are in the region when the event
        starts, up to 5. Players who arrive later do not change it.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-md border bg-muted/30 p-4">
          <h3 class="font-semibold text-foreground">
            Supply, hunting, and cooking requests
          </h3>
          <p>12 actions, plus 3 for each extra player (12 to 24)</p>
        </div>
        <div class="rounded-md border bg-muted/30 p-4">
          <h3 class="font-semibold text-foreground">City invasions</h3>
          <p>60 invaders, plus 10 for each extra player (60 to 100)</p>
        </div>
      </div>
      <!-- Source: server-scripts/RegionalEventProgress.cs:72-101,127-142; server-scripts/RegionalEvents.cs:316-344 — three contributions qualify for rewards, computed from the first contribution's level and XP requirement, and only connected players in the region at completion receive them. -->
      <!-- Source: server-scripts/RegionalEventText.cs:138-152 — the quarter-level reward is Veteran XP at level 50. -->
      <p>
        Help at least 3 times and be in the region when the goal is reached. You
        get 20 + 10 × your level in gold (520 at level 50) and 25% of a full
        level's XP. At level 50 this is Veteran XP.
      </p>
      <!-- Source: server-scripts/RegionalEventProgress.cs:105-142; server-scripts/RegionalEventText.cs:103 — an expired event pays nothing and has no penalty. -->
      <p>If time runs out, the event ends with no reward and no penalty.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="prosperity" class="bg-muted/30">
    <Card.Header><Card.Title>Prosperity</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-muted-foreground">
      <!-- Source: server-scripts/RegionalEventProgress.cs:97-101,145-152; server-scripts/RegionalEvents.cs:188-195,363-375 — completion grants a regional 15% XP multiplier, floored, with dungeon combat mapped to its parent region. -->
      <!-- Source: server-scripts/PlayerQuests.cs:384-392; server-scripts/Player.cs:13348-13351,13757-13770,14040-14042,14063-14067; server-scripts/Npc.cs:1608-1616,1641-1649 — quest, discovery, crafting and NPC kill XP bypass the Prosperity multiplier. -->
      <p>
        When the goal is reached, the region prospers for
        {data.settings.prosperity_duration_minutes} minutes. Everyone in the region
        gets 15% more XP from monsters, including in its dungeons, and from gathering
        and fishing outside dungeons. Players who did not help get the bonus too.
        Quests, crafting, exploring, and NPC kills get no bonus.
      </p>
      <p>
        See <MechanicsLink section="experience">Experience</MechanicsLink> for how
        the bonus combines with Double XP.
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
              ><th class="p-3 text-left font-medium text-foreground">City</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Invader level</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Invader health</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Invaders</th
              ><th class="p-3 text-left font-medium text-foreground"
                >Cooking request</th
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
                  >{invasion.health_multiplier === 1
                    ? "Normal"
                    : `${invasion.health_multiplier} × normal`}</td
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
                <td class="p-3 whitespace-nowrap"
                  >{COOKING_ANIMALS[invasion.city] ?? "None"} meat</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/RegionalInvasions.cs:283-341,378-384 — waves contain up to eight attackers every 20 seconds, at most 24 live attackers, and no gold, item drops or faction changes. -->
      <!-- Source: server-scripts/RegionalInvasions.cs:182-195,216-245 — invaders deal ten times damage to city citizens, take a tenth from them with a minimum of one damage, and only attack participating players inside the city. -->
      <p>
        Invaders arrive in waves of up to 8 every 20 seconds, with at most 24 at
        once. They attack the townsfolk and leave you alone until you hit them.
        They only use their basic attack. They drop no loot or gold, and killing
        them does not change your reputation.
      </p>
      <!-- Source: server-scripts/Npc.cs:1505-1510 — a citizen killed by a regional invader respawns 900 seconds after death. -->
      <p>
        Invaders deal 10 times their normal damage to townsfolk. Townsfolk deal
        only a tenth of their normal damage to invaders. A townsperson killed by
        an invader comes back after 15 minutes.
      </p>
    </Card.Content>
  </Card.Root>
</div>
