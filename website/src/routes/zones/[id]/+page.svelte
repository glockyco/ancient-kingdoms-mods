<script lang="ts">
  import type { ZoneNpc, ZoneMonster } from "$lib/types/zones";
  import { Button } from "$lib/components/ui/button";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Sword from "@lucide/svelte/icons/sword";
  import PawPrint from "@lucide/svelte/icons/paw-print";
  import Users from "@lucide/svelte/icons/users";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Gem from "@lucide/svelte/icons/gem";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Flame from "@lucide/svelte/icons/flame";

  let { data } = $props();

  // Split monsters by type
  // Critters are: type_name='Critter' OR (level 1 ambient creatures with no gold drops)
  function isCritter(m: ZoneMonster): boolean {
    return (
      m.type_name === "Critter" ||
      (m.level === 1 && m.gold_min === 0 && m.gold_max === 0)
    );
  }

  const bosses = $derived(data.monsters.filter((m) => m.is_boss));
  const elites = $derived(
    data.monsters.filter((m) => m.is_elite && !m.is_boss),
  );
  const critters = $derived(
    data.monsters.filter((m) => !m.is_boss && !m.is_elite && isCritter(m)),
  );
  const creatures = $derived(
    data.monsters.filter((m) => !m.is_boss && !m.is_elite && !isCritter(m)),
  );

  // Sort monsters by level desc, health desc, name asc
  function sortMonsters(a: ZoneMonster, b: ZoneMonster): number {
    if (a.level !== b.level) return b.level - a.level;
    if (a.health !== b.health) return b.health - a.health;
    return a.name.localeCompare(b.name);
  }

  const sortedBosses = $derived([...bosses].sort(sortMonsters));
  const sortedElites = $derived([...elites].sort(sortMonsters));
  const sortedCreatures = $derived([...creatures].sort(sortMonsters));
  const sortedCritters = $derived([...critters].sort(sortMonsters));

  // Monster pagination
  const monsterPageSize = 10;
  let bossPage = $state(0);
  let elitePage = $state(0);
  let creaturePage = $state(0);
  let critterPage = $state(0);

  const paginatedBosses = $derived(
    sortedBosses.slice(
      bossPage * monsterPageSize,
      (bossPage + 1) * monsterPageSize,
    ),
  );
  const bossPageCount = $derived(
    Math.ceil(sortedBosses.length / monsterPageSize),
  );

  const paginatedElites = $derived(
    sortedElites.slice(
      elitePage * monsterPageSize,
      (elitePage + 1) * monsterPageSize,
    ),
  );
  const elitePageCount = $derived(
    Math.ceil(sortedElites.length / monsterPageSize),
  );

  const paginatedCreatures = $derived(
    sortedCreatures.slice(
      creaturePage * monsterPageSize,
      (creaturePage + 1) * monsterPageSize,
    ),
  );
  const creaturePageCount = $derived(
    Math.ceil(sortedCreatures.length / monsterPageSize),
  );

  const paginatedCritters = $derived(
    sortedCritters.slice(
      critterPage * monsterPageSize,
      (critterPage + 1) * monsterPageSize,
    ),
  );
  const critterPageCount = $derived(
    Math.ceil(sortedCritters.length / monsterPageSize),
  );

  // NPC sorting and pagination
  type NpcSortKey = "name" | "roles";
  let npcSortKey = $state<NpcSortKey>("name");
  let npcSortAsc = $state(true);
  let npcPage = $state(0);
  const npcPageSize = 10;

  function getNpcRoles(npc: ZoneNpc): string[] {
    const roles: string[] = [];
    if (npc.roles.is_merchant) roles.push("Merchant");
    if (npc.roles.is_quest_giver) roles.push("Quest Giver");
    if (npc.roles.can_repair_equipment) roles.push("Repairs");
    if (npc.roles.is_bank) roles.push("Banker");
    if (npc.roles.is_skill_master) roles.push("Skill Master");
    if (npc.roles.is_veteran_master) roles.push("Veteran Master");
    if (npc.roles.is_reset_attributes) roles.push("Respec");
    if (npc.roles.is_soul_binder) roles.push("Soul Binder");
    if (npc.roles.is_inkeeper) roles.push("Innkeeper");
    if (npc.roles.is_taskgiver_adventurer) roles.push("Tasks");
    if (npc.roles.is_merchant_adventurer) roles.push("Adventurer Merchant");
    if (npc.roles.is_recruiter_mercenaries) roles.push("Mercenary Recruiter");
    if (npc.roles.is_guard) roles.push("Guard");
    if (npc.roles.is_faction_vendor) roles.push("Faction Vendor");
    if (npc.roles.is_essence_trader) roles.push("Essence Trader");
    if (npc.roles.is_priestess) roles.push("Priestess");
    if (npc.roles.is_augmenter) roles.push("Augmenter");
    return roles;
  }

  const sortedNpcs = $derived.by(() => {
    return [...data.npcs].sort((a, b) => {
      let cmp = 0;
      if (npcSortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (npcSortKey === "roles") {
        cmp = getNpcRoles(a).length - getNpcRoles(b).length;
      }
      return npcSortAsc ? cmp : -cmp;
    });
  });

  const paginatedNpcs = $derived(
    sortedNpcs.slice(npcPage * npcPageSize, (npcPage + 1) * npcPageSize),
  );
  const npcPageCount = $derived(Math.ceil(data.npcs.length / npcPageSize));

  function toggleNpcSort(key: NpcSortKey) {
    if (npcSortKey === key) {
      npcSortAsc = !npcSortAsc;
    } else {
      npcSortKey = key;
      npcSortAsc = true;
    }
    npcPage = 0;
  }

  // Group gathering resources by type
  const plants = $derived(data.gatherResources.filter((r) => r.is_plant));
  const minerals = $derived(data.gatherResources.filter((r) => r.is_mineral));
  const radiantSparks = $derived(
    data.gatherResources.filter((r) => r.is_radiant_spark),
  );
  const otherResources = $derived(
    data.gatherResources.filter(
      (r) => !r.is_plant && !r.is_mineral && !r.is_radiant_spark,
    ),
  );
</script>

<svelte:head>
  <title>{data.zone.name} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Zones", href: "/zones" },
      { label: data.zone.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3">
      <h1 class="text-3xl font-bold">{data.zone.name}</h1>
      {#if data.zone.is_dungeon}
        <span
          class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Dungeon
        </span>
      {:else}
        <span
          class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
        >
          Overworld
        </span>
      {/if}
    </div>

    <div class="mt-2 flex gap-4 text-sm text-muted-foreground">
      {#if data.zone.level_min !== null || data.zone.level_max !== null}
        <span>
          Level: {#if data.zone.level_min === data.zone.level_max}
            {data.zone.level_min}
          {:else}
            {data.zone.level_min ?? "?"} - {data.zone.level_max ?? "?"}
          {/if}
        </span>
      {/if}
      {#if data.zone.weather_type}
        <span>Weather: {data.zone.weather_type}</span>
      {/if}
    </div>
  </div>

  <!-- Bosses Section -->
  {#if sortedBosses.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Crown class="h-5 w-5 text-cyan-500" />
        Bosses ({sortedBosses.length})
      </h2>
      <div class="rounded-md border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-3 py-2 text-left font-medium">Name</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Level</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Health</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Drops</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedBosses as monster, i (monster.id)}
              <tr
                class="border-b border-l-4 border-l-cyan-500 transition-colors hover:bg-muted/50 {i %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
              >
                <td class="px-3 py-2">
                  <a
                    href="/monsters/{monster.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {monster.name}
                  </a>
                </td>
                <td class="px-3 py-2 text-right">{monster.level}</td>
                <td class="px-3 py-2 text-right tabular-nums"
                  >{monster.health.toLocaleString()}</td
                >
                <td class="px-3 py-2 text-right">{monster.drop_count}</td>
              </tr>
            {/each}
            {#each Array.from({ length: bossPageCount > 1 ? monsterPageSize - paginatedBosses.length : 0 }, (_, i) => i) as i (i)}
              <tr
                class="border-b border-l-4 border-l-transparent {(paginatedBosses.length +
                  i) %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
                ><td class="px-3 py-2">&nbsp;</td><td></td><td></td><td
                ></td></tr
              >
            {/each}
          </tbody>
        </table>
      </div>
      {#if bossPageCount > 1}
        <div class="flex items-center justify-between pt-4">
          <div class="text-sm text-muted-foreground">
            Page {bossPage + 1} of {bossPageCount}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (bossPage = Math.max(0, bossPage - 1))}
              disabled={bossPage === 0}
            >
              <ChevronLeft class="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                (bossPage = Math.min(bossPageCount - 1, bossPage + 1))}
              disabled={bossPage >= bossPageCount - 1}
            >
              Next
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Elites Section -->
  {#if sortedElites.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Shield class="h-5 w-5 text-purple-500" />
        Elites ({sortedElites.length})
      </h2>
      <div class="rounded-md border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-3 py-2 text-left font-medium">Name</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Level</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Health</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Drops</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedElites as monster, i (monster.id)}
              <tr
                class="border-b border-l-4 border-l-purple-500 transition-colors hover:bg-muted/50 {i %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
              >
                <td class="px-3 py-2">
                  <a
                    href="/monsters/{monster.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {monster.name}
                  </a>
                </td>
                <td class="px-3 py-2 text-right">{monster.level}</td>
                <td class="px-3 py-2 text-right tabular-nums"
                  >{monster.health.toLocaleString()}</td
                >
                <td class="px-3 py-2 text-right">{monster.drop_count}</td>
              </tr>
            {/each}
            {#each Array.from({ length: elitePageCount > 1 ? monsterPageSize - paginatedElites.length : 0 }, (_, i) => i) as i (i)}
              <tr
                class="border-b border-l-4 border-l-transparent {(paginatedElites.length +
                  i) %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
                ><td class="px-3 py-2">&nbsp;</td><td></td><td></td><td
                ></td></tr
              >
            {/each}
          </tbody>
        </table>
      </div>
      {#if elitePageCount > 1}
        <div class="flex items-center justify-between pt-4">
          <div class="text-sm text-muted-foreground">
            Page {elitePage + 1} of {elitePageCount}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (elitePage = Math.max(0, elitePage - 1))}
              disabled={elitePage === 0}
            >
              <ChevronLeft class="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                (elitePage = Math.min(elitePageCount - 1, elitePage + 1))}
              disabled={elitePage >= elitePageCount - 1}
            >
              Next
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Creatures Section -->
  {#if sortedCreatures.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Sword class="h-5 w-5 text-red-500" />
        Creatures ({sortedCreatures.length})
      </h2>
      <div class="rounded-md border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-3 py-2 text-left font-medium">Name</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Level</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Health</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Drops</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedCreatures as monster, i (monster.id)}
              <tr
                class="border-b border-l-4 border-l-red-500 transition-colors hover:bg-muted/50 {i %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
              >
                <td class="px-3 py-2">
                  <a
                    href="/monsters/{monster.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {monster.name}
                  </a>
                </td>
                <td class="px-3 py-2 text-right">{monster.level}</td>
                <td class="px-3 py-2 text-right tabular-nums"
                  >{monster.health.toLocaleString()}</td
                >
                <td class="px-3 py-2 text-right">{monster.drop_count}</td>
              </tr>
            {/each}
            {#each Array.from({ length: creaturePageCount > 1 ? monsterPageSize - paginatedCreatures.length : 0 }, (_, i) => i) as i (i)}
              <tr
                class="border-b border-l-4 border-l-transparent {(paginatedCreatures.length +
                  i) %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
                ><td class="px-3 py-2">&nbsp;</td><td></td><td></td><td
                ></td></tr
              >
            {/each}
          </tbody>
        </table>
      </div>
      {#if creaturePageCount > 1}
        <div class="flex items-center justify-between pt-4">
          <div class="text-sm text-muted-foreground">
            Page {creaturePage + 1} of {creaturePageCount}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (creaturePage = Math.max(0, creaturePage - 1))}
              disabled={creaturePage === 0}
            >
              <ChevronLeft class="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                (creaturePage = Math.min(
                  creaturePageCount - 1,
                  creaturePage + 1,
                ))}
              disabled={creaturePage >= creaturePageCount - 1}
            >
              Next
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Altars Section -->
  {#if data.altars.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Flame class="h-5 w-5 text-orange-500" />
        Altars ({data.altars.length})
      </h2>
      <div class="rounded-md border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="w-[220px] px-3 py-2 text-left font-medium">Name</th>
              <th class="px-3 py-2 text-left font-medium">Activation Item</th>
              <th class="w-[100px] px-3 py-2 text-right font-medium">Level</th>
              <th class="w-[100px] px-3 py-2 text-right font-medium">Waves</th>
            </tr>
          </thead>
          <tbody>
            {#each data.altars as altar, i (altar.id)}
              <tr
                class="border-b border-l-4 border-l-orange-500 transition-colors hover:bg-muted/50 {i %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
              >
                <td class="px-3 py-2">{altar.name}</td>
                <td class="px-3 py-2">
                  {#if altar.required_activation_item_id}
                    <a
                      href="/items/{altar.required_activation_item_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {altar.required_activation_item_name}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">-</span>
                  {/if}
                </td>
                <td class="px-3 py-2 text-right">
                  {#if altar.min_level_required > 1}
                    {altar.min_level_required}
                  {:else}
                    <span class="text-muted-foreground">-</span>
                  {/if}
                </td>
                <td class="px-3 py-2 text-right">{altar.total_waves}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Critters Section -->
  {#if sortedCritters.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <PawPrint class="h-5 w-5 text-green-500" />
        Critters ({sortedCritters.length})
      </h2>
      <div class="rounded-md border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-3 py-2 text-left font-medium">Name</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Level</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Health</th>
              <th class="w-[150px] px-3 py-2 text-right font-medium">Drops</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedCritters as monster, i (monster.id)}
              <tr
                class="border-b border-l-4 border-l-green-500 transition-colors hover:bg-muted/50 {i %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
              >
                <td class="px-3 py-2">
                  <a
                    href="/monsters/{monster.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {monster.name}
                  </a>
                </td>
                <td class="px-3 py-2 text-right">{monster.level}</td>
                <td class="px-3 py-2 text-right tabular-nums"
                  >{monster.health.toLocaleString()}</td
                >
                <td class="px-3 py-2 text-right">{monster.drop_count}</td>
              </tr>
            {/each}
            {#each Array.from({ length: critterPageCount > 1 ? monsterPageSize - paginatedCritters.length : 0 }, (_, i) => i) as i (i)}
              <tr
                class="border-b border-l-4 border-l-transparent {(paginatedCritters.length +
                  i) %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
                ><td class="px-3 py-2">&nbsp;</td><td></td><td></td><td
                ></td></tr
              >
            {/each}
          </tbody>
        </table>
      </div>
      {#if critterPageCount > 1}
        <div class="flex items-center justify-between pt-4">
          <div class="text-sm text-muted-foreground">
            Page {critterPage + 1} of {critterPageCount}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (critterPage = Math.max(0, critterPage - 1))}
              disabled={critterPage === 0}
            >
              <ChevronLeft class="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                (critterPage = Math.min(critterPageCount - 1, critterPage + 1))}
              disabled={critterPage >= critterPageCount - 1}
            >
              Next
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- NPCs Section -->
  {#if data.npcs.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Users class="h-5 w-5 text-blue-500" />
        NPCs ({data.npcs.length})
      </h2>
      <div class="rounded-md border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="w-[220px] px-3 py-2 text-left font-medium">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-foreground"
                  onclick={() => toggleNpcSort("name")}
                >
                  Name
                  {#if npcSortKey === "name"}
                    {#if npcSortAsc}
                      <ChevronUp class="h-4 w-4" />
                    {:else}
                      <ChevronDown class="h-4 w-4" />
                    {/if}
                  {:else}
                    <ChevronsUpDown class="h-4 w-4 opacity-50" />
                  {/if}
                </button>
              </th>
              <th class="px-3 py-2 text-left font-medium">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-foreground"
                  onclick={() => toggleNpcSort("roles")}
                >
                  Roles
                  {#if npcSortKey === "roles"}
                    {#if npcSortAsc}
                      <ChevronUp class="h-4 w-4" />
                    {:else}
                      <ChevronDown class="h-4 w-4" />
                    {/if}
                  {:else}
                    <ChevronsUpDown class="h-4 w-4 opacity-50" />
                  {/if}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedNpcs as npc, i (npc.id)}
              <tr
                class="border-b border-l-4 border-l-blue-500 transition-colors hover:bg-muted/50 {i %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"
              >
                <td class="px-3 py-2">
                  <a
                    href="/npcs/{npc.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {npc.name}
                  </a>
                </td>
                <td class="px-3 py-2">
                  {#if getNpcRoles(npc).length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each getNpcRoles(npc) as role (role)}
                        <span
                          class="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200 min-w-[150px]"
                        >
                          {role}
                        </span>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-muted-foreground">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
            {#each Array.from({ length: npcPageCount > 1 ? npcPageSize - paginatedNpcs.length : 0 }, (_, i) => i) as i (i)}
              <tr
                class="border-b border-l-4 border-l-transparent {(paginatedNpcs.length +
                  i) %
                  2 ===
                1
                  ? 'bg-muted/30'
                  : ''}"><td class="px-3 py-2">&nbsp;</td><td></td></tr
              >
            {/each}
          </tbody>
        </table>
      </div>
      {#if npcPageCount > 1}
        <div class="flex items-center justify-between pt-4">
          <div class="text-sm text-muted-foreground">
            Page {npcPage + 1} of {npcPageCount}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => (npcPage = Math.max(0, npcPage - 1))}
              disabled={npcPage === 0}
            >
              <ChevronLeft class="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                (npcPage = Math.min(npcPageCount - 1, npcPage + 1))}
              disabled={npcPage >= npcPageCount - 1}
            >
              Next
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Gathering Resources Section -->
  {#if data.gatherResources.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Resources ({data.gatherResources.length})
      </h2>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#if plants.length > 0}
          <div class="rounded-md border p-4">
            <h3
              class="mb-3 font-medium text-green-600 dark:text-green-400 flex items-center gap-2"
            >
              <Leaf class="h-4 w-4" />
              Plants ({plants.length})
            </h3>
            <ul class="space-y-1">
              {#each plants as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if minerals.length > 0}
          <div class="rounded-md border p-4">
            <h3
              class="mb-3 font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2"
            >
              <Pickaxe class="h-4 w-4" />
              Minerals ({minerals.length})
            </h3>
            <ul class="space-y-1">
              {#each minerals as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if radiantSparks.length > 0}
          <div class="rounded-md border p-4">
            <h3
              class="mb-3 font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2"
            >
              <Sparkles class="h-4 w-4" />
              Radiant Sparks ({radiantSparks.length})
            </h3>
            <ul class="space-y-1">
              {#each radiantSparks as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if otherResources.length > 0}
          <div class="rounded-md border p-4">
            <h3
              class="mb-3 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2"
            >
              <Scroll class="h-4 w-4" />
              Other ({otherResources.length})
            </h3>
            <ul class="space-y-1">
              {#each otherResources as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Zone Connections Section -->
  {#if data.connectedZones.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Connected Zones ({data.connectedZones.length})
      </h2>
      <div class="flex flex-wrap gap-2">
        {#each data.connectedZones as zone (zone.id)}
          <a
            href="/zones/{zone.id}"
            class="inline-flex items-center rounded-md border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            {zone.name}
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>
