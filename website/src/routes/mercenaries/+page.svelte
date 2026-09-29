<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import RecruiterTable from "$lib/components/RecruiterTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import {
    CLASSES,
    DEATH_SAVE_MIN_LEVEL,
    MAX_HIRED,
    MAX_PARTY,
    MAX_VETERAN,
    MERC_MIN_LEVEL,
    activeMercenaryLimit,
    hirePrice,
    mercenaryResource,
    resurrectionPrice,
  } from "$lib/utils/merc-stats";
  import { petHref } from "$lib/utils/pets";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Calculator from "@lucide/svelte/icons/calculator";
  import Check from "@lucide/svelte/icons/check";
  import Swords from "@lucide/svelte/icons/swords";

  let { data } = $props();

  const link = "text-blue-600 hover:underline dark:text-blue-400";
  const fmt = (n: number) => n.toLocaleString("en-US");

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/mercenaries",
      name: "Mercenaries — Ancient Kingdoms Compendium",
      description: `The ${data.mercenaries.length} hireable mercenary classes in Ancient Kingdoms, compared.`,
      items: data.mercenaries.map((m) => ({
        name: m.name,
        path: petHref(m.id, true),
      })),
    }),
  );

  const recruiterCount = $derived(
    new Set(data.recruiters.map((r) => r.npc_id)).size,
  );

  const ATTRIBUTES = [
    ["STR", "Strength"],
    ["DEX", "Dexterity"],
    ["CON", "Constitution"],
    ["INT", "Intelligence"],
    ["WIS", "Wisdom"],
    ["CHA", "Charisma"],
  ] as const;

  const rows = $derived(
    data.mercenaries.map((m) => {
      const cls = m.type_monster;
      const def = CLASSES[cls];
      if (!def) throw new Error(`No growth data for mercenary class ${cls}`);
      const fastest = ATTRIBUTES.filter(([key]) => def.div[key] === 2).map(
        ([, name]) => name,
      );
      return {
        ...m,
        resource: mercenaryResource(cls),
        fastest,
      };
    }),
  );

  const deathSaveClasses = $derived(rows.filter((r) => r.hasDeathSave));

  const resourceClass: Record<string, string> = {
    Rage: "text-stat-atk",
    Mana: "text-stat-mana",
    Songs: "text-foreground",
  };

  const LIMIT_STEPS = [10, 20, 30, 40].map((level) => ({
    level,
    limit: activeMercenaryLimit(level),
  }));
</script>

{#snippet mark(yes: boolean)}
  {#if yes}
    <Check
      class="inline-block h-4 w-4 align-middle text-emerald-500"
      aria-label="Yes"
    />
  {:else}
    <span class="text-muted-foreground" aria-label="No">—</span>
  {/if}
{/snippet}

<Seo
  title="Mercenaries - Ancient Kingdoms"
  description={`Compare the ${data.mercenaries.length} mercenary classes in Ancient Kingdoms. How hiring, party limits, growth, stance, and resurrection work, and where to find every recruiter.`}
  path="/mercenaries"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <div class="space-y-4">
    <Breadcrumb
      items={[{ label: "Home", href: "/" }, { label: "Mercenaries" }]}
    />
    <MercenaryNav mercenaries={data.links} current="overview" />
  </div>

  <section class="rounded-lg border p-6 md:p-8">
    <div class="flex flex-wrap items-start gap-4">
      <div class="rounded-lg bg-teal-500/10 p-3">
        <Swords class="h-7 w-7 text-teal-500 dark:text-teal-400" />
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
          Mercenaries
        </h1>
        <p class="mt-2 max-w-3xl text-muted-foreground">
          You can hire mercenaries to fight in your party, and they level up
          with you.
        </p>
      </div>
    </div>

    <!-- Source: server-scripts/Npc.cs:1893-1904, UIMercenaries.cs:297-299,380 -->
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">
          {data.mercenaries.length}
        </div>
        <div class="text-sm text-muted-foreground">Classes</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">{recruiterCount}</div>
        <div class="text-sm text-muted-foreground">Recruiters</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">{MERC_MIN_LEVEL}</div>
        <div class="text-sm text-muted-foreground">Level to hire</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">
          {activeMercenaryLimit(40)}
        </div>
        <div class="text-sm text-muted-foreground">Active at level 40</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">{MAX_HIRED}</div>
        <div class="text-sm text-muted-foreground">Hired at most</div>
      </div>
    </div>
  </section>

  <section id="classes" class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Compare the classes</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Every recruiter hires every class.
      </p>
    </div>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >Class</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >Resource</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-center font-medium"
              >Heals</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-center font-medium"
              >Buffs</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-center font-medium"
              >Death save</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >Grows fastest</th
            >
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          {#each rows as row (row.id)}
            <tr class="border-b last:border-0">
              <td class="px-4 py-2 font-medium">
                <EntityLink
                  href={petHref(row.id, true)}
                  name={row.type_monster}
                  domain="class"
                  entityId={row.type_monster.toLowerCase()}
                  imageKind="icon"
                  imageAvailable={row.class_icon}
                  variant="reference"
                  fallback={Swords}
                  size={28}
                />
              </td>
              <td class="px-4 py-2 font-medium {resourceClass[row.resource]}"
                >{row.resource}</td
              >
              <!-- Source: server-scripts/Pet.cs:2184,2367,4544,4744 — hasHeals and hasBuffs switch on the pet AI heal and buff checks. -->
              <td class="px-4 py-2 text-center">
                {@render mark(row.has_heals)}
              </td>
              <td class="px-4 py-2 text-center">
                {#if row.type_monster === "Bard"}
                  <!-- Source: server-scripts/BardMercenarySkills.cs:LateUpdate,RefreshAura — Bard songs buff allies outside the pet buff AI. -->
                  <a href="{petHref(row.id, true)}#songs-title" class={link}
                    >Songs</a
                  >
                {:else}
                  {@render mark(row.has_buffs)}
                {/if}
              </td>
              <td class="px-4 py-2 text-center">
                {#if row.hasDeathSave}
                  <a
                    href="{petHref(row.id, true)}#death-save-title"
                    class="inline-flex align-middle"
                    aria-label="{row.type_monster} death save"
                    ><Check class="h-4 w-4 text-emerald-500" /></a
                  >
                {:else}
                  {@render mark(false)}
                {/if}
              </td>
              <td class="px-4 py-2">{row.fastest.join(", ")}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section id="growth" class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Attribute growth</h2>
      <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel — each attribute gains 1 at every multiple of its class interval. -->
      <p class="mt-1 text-sm text-muted-foreground">
        Each table value is the number of levels a mercenary needs to gain +1 in
        that attribute.
      </p>
    </div>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >Class</th
            >
            {#each ATTRIBUTES as [, name] (name)}
              <th
                class="h-10 whitespace-nowrap px-4 text-left font-medium text-right"
                >{name}</th
              >
            {/each}
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          {#each rows as row (row.id)}
            <tr class="border-b last:border-0">
              <td class="px-4 py-2 font-medium">
                <EntityLink
                  href={petHref(row.id, true)}
                  name={row.type_monster}
                  domain="class"
                  entityId={row.type_monster.toLowerCase()}
                  imageKind="icon"
                  imageAvailable={row.class_icon}
                  variant="reference"
                  fallback={Swords}
                  size={28}
                />
              </td>
              {#each ATTRIBUTES as [key] (key)}
                {@const every = CLASSES[row.type_monster].div[key]}
                <td
                  class="px-4 py-2 text-right tabular-nums {every === 2
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'}">{every}</td
                >
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <!-- Source: exported-data/pets.json — every mercenary prefab has 1 + 1 per level in each resistance. -->
    <p class="text-sm text-muted-foreground">
      Every class also gains +1 to each resistance every level.
    </p>
  </section>

  <section id="how-it-works" class="space-y-4">
    <h2 class="text-xl font-semibold">How mercenaries work</h2>
    <!-- Source: server-scripts/Player.cs:10115-10120,10290-10305 — a party has five places, and a full party cannot summon another mercenary. -->
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      A party has {MAX_PARTY} places. A full party cannot summon another mercenary.
    </p>
  </section>

  <section id="roster" class="space-y-4">
    <h2 class="text-xl font-semibold">Hire and manage a mercenary</h2>
    <ol class="divide-y divide-border">
      <!-- Source: server-scripts/Npc.cs:1893-1904; server-scripts/UIMercenaries.cs:374-440 — recruiters hire from level 10; the roster holds at most 10. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">
            Hire at a <a href="#recruiters" class={link}>recruiter</a>.
          </p>
          <p class="mt-0.5 text-sm text-muted-foreground">
            You can hire from level {MERC_MIN_LEVEL} and keep up to {MAX_HIRED}
            mercenaries in your roster.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/UIMercenaries.cs:297-299; server-scripts/Player.cs:10115-10120,10290-10305 — the active limit rises at levels 20, 30 and 40 and a party holds five members. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">Summon it into your party.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Your active mercenary limit rises with your level, from 1 at level
            10 to 4 at level 40.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/UITarget.cs:443-474; server-scripts/UIMercenaries.cs:530-582,588-615,646-700 — dismissing returns a mercenary to the roster; combat prevents dismissal, and deletion requires unequipping gear. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">3</span>
        <div>
          <p class="font-medium">Dismiss it when you need party space.</p>
          <p class="mt-0.5 text-sm text-muted-foreground">
            Dismissal keeps the mercenary in your roster but is unavailable
            during combat. Unequip its gear before deleting it permanently.
          </p>
        </div>
      </li>
    </ol>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="overflow-x-auto rounded-md border bg-muted/30">
        <table class="w-full text-sm">
          <caption class="px-4 py-3 text-left font-semibold">
            Active mercenaries by player level
          </caption>
          <thead>
            <tr class="border-b">
              <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
                Level
              </th>
              <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
                Active limit
              </th>
            </tr>
          </thead>
          <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
            <!-- Source: server-scripts/UIMercenaries.cs:297-299; server-scripts/Player.cs:10115-10120 — levels 10/20/30/40 allow one/two/three/four active mercenaries. -->
            {#each LIMIT_STEPS as step (step.level)}
              <tr class="border-b last:border-0">
                <td class="px-4 py-2 font-medium">
                  {step.level}+
                </td>
                <td class="px-4 py-2">
                  {step.limit}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="overflow-x-auto rounded-md border bg-muted/30">
        <table class="w-full text-sm">
          <caption class="px-4 py-3 text-left font-semibold">
            Gold before Charisma discount
          </caption>
          <thead>
            <tr class="border-b">
              <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
                Level / veteran
              </th>
              <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
                Hire
              </th>
              <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
                Resurrect
              </th>
            </tr>
          </thead>
          <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
            <!-- Source: server-scripts/UIMercenaries.cs:434-440; server-scripts/Player.cs:GetMercenaryResurrectionPrice — the hire and resurrection formulas give 20/8, 420/300, and 3420/2300 gold at the listed levels. -->
            <tr class="border-b last:border-0">
              <td class="px-4 py-2 font-medium">
                {MERC_MIN_LEVEL} / 0
              </td>
              <td class="px-4 py-2">
                {fmt(hirePrice(MERC_MIN_LEVEL, 0))}
              </td>
              <td class="px-4 py-2">
                {fmt(resurrectionPrice(MERC_MIN_LEVEL, 0))}
              </td>
            </tr>
            <tr class="border-b last:border-0">
              <td class="px-4 py-2 font-medium">50 / 0</td>
              <td class="px-4 py-2">
                {fmt(hirePrice(50, 0))}
              </td>
              <td class="px-4 py-2">
                {fmt(resurrectionPrice(50, 0))}
              </td>
            </tr>
            <tr class="border-b last:border-0">
              <td class="px-4 py-2 font-medium">
                50 / {MAX_VETERAN}
              </td>
              <td class="px-4 py-2">
                {fmt(hirePrice(50, MAX_VETERAN))}
              </td>
              <td class="px-4 py-2">
                {fmt(resurrectionPrice(50, MAX_VETERAN))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:9-20; server-scripts/UINpcTrading.cs:824-831; server-scripts/Player.cs:GetMercenaryResurrectionPrice — both prices receive a Charisma discount of 0.2% per point, capped at 25%. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Each Charisma point cuts these prices by 0.2%, up to 25%.
    </p>
    <!-- Source: server-scripts/Utils.cs:GetRandomChar; server-scripts/Player.cs:UserCode_CmdBuyMercenary__Int32__Int64__String__Boolean — a recruiter's preferred race applies only when the class permits it. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      A recruiter's preferred race applies only if the class allows that race.
      See <a href="/mechanics/mercenary-stats" class={link}
        >race odds and stat ranges</a
      >.
    </p>
  </section>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Levels and veteran bonuses</h2>
    <!-- Source: server-scripts/Player.cs:4627-4652,10337-10365; server-scripts/PetSkills.cs:25-45; server-scripts/Health.cs:28-41; server-scripts/Mana.cs:28-41; server-scripts/Energy.cs:27-39 — the mercenary matches player level, skill ranks grow every five player levels and ten veteran points, Health and Mana maxima grow but Rage maximum does not. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Mercenaries match your level. Their attributes and resistances follow the <a
        href="#growth"
        class={link}>growth table</a
      >.
    </p>
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Skill rank is ⌊your level ÷ 5⌋ + ⌊total veteran points ÷ 10⌋, capped by
      each skill. Bard skills have a minimum rank of 1.
    </p>
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Each veteran point adds 0.25% of base Health to maximum Health and 0.25%
      of base Mana to maximum Mana for Mana users. It does not increase maximum
      Rage or a Bard's active-song limit.
    </p>
    <!-- Source: server-scripts/Player.cs:4627-4652,10077-10122,10337-10365; server-scripts/Database.cs:1900-1921 — veteran damage gained while summoned is not saved; a zero saved hire roll can cause a fresh roll on every summon. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Veteran points gained while summoned add 1 physical and 1 magic damage
      each. The game does not save these additions when you summon the mercenary
      again.
    </p>
  </section>

  <section id="resurrection" class="space-y-4">
    <h2 class="text-xl font-semibold">When a mercenary dies</h2>
    <!-- Source: server-scripts/Pet.cs:3966-3977 — the corpse remains for 300 seconds. -->
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      A corpse remains for 5 minutes.
    </p>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full min-w-[32rem] text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Way back
            </th>
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              When
            </th>
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Health on return
            </th>
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/TargetHealSkill.cs:232-253; server-scripts/Pet.cs:3966-3977 — resurrection skills and scrolls work while the five-minute corpse remains. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Skill or scroll</td>
            <td class="px-4 py-2">While the corpse remains</td>
            <td class="px-4 py-2">10%</td>
          </tr>
          <!-- Source: server-scripts/Player.cs:UserCode_CmdResurrectMerc__String__Int64,10337-10417 — recruiter resurrection works after corpse expiry and restores full Health at the next summon. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Recruiter, for a fee</td>
            <td class="px-4 py-2">Any time</td>
            <td class="px-4 py-2">
              10% while the corpse remains. Full at the next summon if the
              corpse is gone.
            </td>
          </tr>
          <!-- Source: server-scripts/Player.cs:ProcessMercenariesOnPlayerRespawn,10337-10417 — paid resurrection on player respawn returns dead summoned mercenaries with 10% Health. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Your respawn, for a fee</td>
            <td class="px-4 py-2">When you respawn</td>
            <td class="px-4 py-2">10%</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/UIMercenaries.cs:618-644,817-839; server-scripts/Player.cs:10254-10273 — recruiter can revive one or all for their full combined price; paid return on respawn is all-or-none. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      A recruiter can revive one mercenary or all dead roster members. Reviving
      all requires the full combined fee.
    </p>
    <!-- Source: server-scripts/Player.cs:DestroyLivingMercenariesOnOwnerDeath,ReloadSummonedMercenaries,ProcessMercenariesOnPlayerRespawn,10254-10273 — living mercenaries return when the player returns; dead summoned mercenaries return only if the player can pay the total fee. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      If you die, living mercenaries return when you do. Dead summoned
      mercenaries return on respawn only if you can pay for all of them.
    </p>
    <!-- Source: server-scripts/UIMercenaries.cs:530-582; server-scripts/Pet.cs:5059-5075 — a dead mercenary must be resurrected before another summon, and healer mercenaries do not automatically resurrect allies. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      You cannot summon a dead mercenary until you resurrect it. Healer
      mercenaries do not cast resurrection automatically.
    </p>
    <!-- Source: server-scripts/Pet.cs:3966-3977; server-scripts/Player.cs:GetMercenaryResurrectionPrice; server-scripts/Combat.cs:739-755 — gear stays equipped and death does not damage it. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Death does not damage the mercenary's equipped gear.
    </p>
    <!-- Source: server-scripts/Combat.cs:1157-1167,1350-1361 — Warrior and Rogue mercenaries can survive a fatal hit from owner level 50. -->
    {#if deathSaveClasses.length > 0}
      <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
        From level {DEATH_SAVE_MIN_LEVEL},
        {#each deathSaveClasses as c, i (c.id)}{i > 0 ? " and " : ""}<a
            href="{petHref(c.id, true)}#death-save-title"
            class={link}>{c.type_monster}</a
          >{/each} mercenaries can survive a fatal hit.
      </p>
    {/if}
  </section>

  <section id="equipment" class="space-y-4">
    <h2 class="text-xl font-semibold">Equipment</h2>
    <ol class="divide-y divide-border">
      <!-- Source: server-scripts/UITarget.cs:443-447; server-scripts/EquipmentItem.cs:157-212; server-scripts/MercenaryEquipment.cs:21-86 — target-panel helmet opens equipment; item slot, class and owner level are checked. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">
            Select a mercenary and open its equipment with the helmet icon.
          </p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Items must fit its class and slot, and you must meet their level
            requirement.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/ScrollItem.cs:11-65; server-scripts/UIEquipmentMercenary.cs:163-171 — repair kits target the selected mercenary; without selection they repair player gear. -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">
            Select the mercenary before using a repair kit.
          </p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Otherwise the kit repairs your own gear.
          </p>
        </div>
      </li>
    </ol>
    <!-- Source: server-scripts/MercenaryEquipment.cs:116-187,201-256 — three unbroken matching armor pieces add set attributes, but mercenaries receive no five-piece skill bonus. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Three matching, unbroken armor pieces give the set's attribute bonus.
      Mercenaries do not receive the five-piece skill bonus.
    </p>
  </section>

  <section id="auto-consume" class="space-y-4">
    <h2 class="text-xl font-semibold">Auto-Consume supplies</h2>
    <!-- Source: server-scripts/Pet.cs:288-302,2073-2162; server-scripts/UIEquipmentMercenary.cs:174-188; server-scripts/UIMercenaries.cs:576-583 — each mercenary has four dedicated supply slots and an individual saved toggle; they use supplies only during player combat. -->
    <ol class="divide-y divide-border">
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">
            Put supplies in the mercenary's dedicated slots.
          </p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Supplies in your backpack do not count.
          </p>
        </div>
      </li>
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">Enable Auto-Consume for each mercenary.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            It uses supplies only while you are in combat.
          </p>
        </div>
      </li>
    </ol>

    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full min-w-[32rem] text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Supply
            </th>
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Used when
            </th>
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Checks
            </th>
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/Pet.cs:2073-2123 — food and utility potions are checked every 5–10 seconds when their buff category is absent. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Food</td>
            <td class="px-4 py-2">No food buff</td>
            <td class="px-4 py-2">Every 5–10 s</td>
          </tr>
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Utility potion</td>
            <td class="px-4 py-2">No buff of its category</td>
            <td class="px-4 py-2">Every 5–10 s</td>
          </tr>
          <!-- Source: server-scripts/Pet.cs:2124-2138 — healing potions are checked every 1–3 seconds below 50% Health when at least 90% of their healing fits. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Healing potion</td>
            <td class="px-4 py-2">
              Below 50% Health; missing at least 90% of its heal
            </td>
            <td class="px-4 py-2">Every 1–3 s</td>
          </tr>
          <!-- Source: server-scripts/Pet.cs:2140-2162 — resources are checked every 1–3 seconds below 25%, with a 90% efficiency gate; Bard is excluded. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Resource potion</td>
            <td class="px-4 py-2">
              Below 25% Rage or Mana; missing at least 90% of its restore
            </td>
            <td class="px-4 py-2">Every 1–3 s</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/Pet.cs:2124-2162 — each healing/resource potion has a 15-second reuse timer; Bard cannot use the resource potion slot automatically. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Healing and resource potions each have a 15-second reuse delay.
    </p>
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Bards do not use resource potions automatically.
    </p>
  </section>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold">How companion combat works</h2>
  </section>
  <section id="commands" class="space-y-4">
    <h2 class="text-xl font-semibold">Orders and stances</h2>
    <!-- Source: server-scripts/GameManager.cs:1813-1829,1832-1919,1986-2039; server-scripts/Player.cs:8819-8845 — orders apply to mercenaries and combat pets. -->
    <p class="text-sm text-foreground">
      These orders also affect your combat pet.
    </p>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Order
            </th>
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Effect
            </th>
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/Pet.cs:1488-1491,2198-2209,6007-6017; server-scripts/PetSkills.cs:170-200 — stance gates attacks, but support skills continue. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Aggressive / Defensive</td>
            <td class="px-4 py-2">
              Attack your enemies / stop attacking. Healing and buffs continue
              in either stance.
            </td>
          </tr>
          <!-- Source: server-scripts/GameManager.cs:1813-1829 — group stance toggles all based on whether any companion is aggressive. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Group stance</td>
            <td class="px-4 py-2">
              If any companion is aggressive, set all to defensive. Otherwise
              set all to aggressive.
            </td>
          </tr>
          <!-- Source: server-scripts/GameManager.cs:1832-1919 — a Warrior mercenary attacks first, followed by other aggressive companions after 1.5 seconds. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Group attack</td>
            <td class="px-4 py-2">
              A Warrior mercenary attacks first. Other aggressive companions
              join 1.5 seconds later.
            </td>
          </tr>
          <!-- Source: server-scripts/GameManager.cs:1922-1983; server-scripts/Pet.cs:5375-5415 — individual attacks interrupt the current action, wake mesmerized targets and require aggressive stance. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Individual attack</td>
            <td class="px-4 py-2">
              Sends one aggressive companion at your target. It interrupts
              casting and wakes a mesmerized target.
            </td>
          </tr>
          <!-- Source: server-scripts/GameManager.cs:1986-2039; server-scripts/Pet.cs:5945-5993 — Hold Position lasts until Follow or attack; Come Here drops the target and stops casting. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Hold Position / Follow</td>
            <td class="px-4 py-2">
              Hold keeps companions in place. Follow brings them back to you.
            </td>
          </tr>
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Come Here</td>
            <td class="px-4 py-2">
              Drops the target, stops casting and moves the companion next to
              you.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="ai-behavior" class="space-y-4">
    <h2 class="text-xl font-semibold">Healing and avoiding attacks</h2>
    <!-- Source: server-scripts/Pet.cs:4422-4459,4502-4539,4664-4679,5133-5171; server-scripts/PetSkills.cs:162-169 — Cleric and Druid healers consider player and companions; other party members must be within 12 units. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Cleric and Druid healers can heal you and your companions. Other party
      members must be within 12 units of the healer.
    </p>
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Offensive skills leave at least 35% of a healer's maximum Mana available.
    </p>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              Healing choice
            </th>
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium">
              When it is considered
            </th>
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/Pet.cs:4588-4625 — heal-over-time checks allies below 70% Health without that buff. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Heal-over-time buff</td>
            <td class="px-4 py-2">Below 70% Health without that buff</td>
          </tr>
          <!-- Source: server-scripts/Pet.cs:4664-4679 — area heal requires three living allies below 60% Health in range. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Area heal</td>
            <td class="px-4 py-2">
              At least 3 living allies below 60% Health in range
            </td>
          </tr>
          <!-- Source: server-scripts/Pet.cs:5133-5171 — single-target heal triggers at 75% Health, or 85% with full Mana; above threshold, half of healing must fit. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2 font-medium">Single-target heal</td>
            <td class="px-4 py-2">
              At or below 75% Health, or 85% with full Mana
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/Pet.cs:4452-4499,4542-4585,4898-4939 — Cleanse takes priority; healers with the same owner avoid duplicate noncritical direct heals. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Healers use Cleanse before healing when it is ready.
    </p>
    <!-- Source: server-scripts/PetSkills.cs:60-75,111-118; server-scripts/Pet.cs:1333-1444 — Warriors choose Challenge first against one target; Battle Shout needs two nearby targets attacking party members. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Warriors prioritize Challenge. In aggressive stance, they use Battle Shout
      against at least two nearby enemies attacking party members.
    </p>
    <!-- Source: server-scripts/MonsterSkills.cs:177-279; server-scripts/Pet.cs:2702-2709,2814-2835 — companions can evade telegraphed attacks with at least a one-second cast; aggressive Warriors and familiars do not. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Companions can avoid area attacks with at least a 1-second cast if they
      can reach safety. Aggressive Warriors and familiars do not.
    </p>
  </section>

  <section id="recruiters" class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Where to hire</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        A preferred race applies only to the classes that allow it. Each
        mercenary page shows the race that class gets.
      </p>
    </div>
    <RecruiterTable
      recruiters={data.recruiters}
      urlKey="mercenary-recruiters"
    />
  </section>

  <section>
    <a
      href="/mechanics/mercenary-stats"
      class="group flex items-center gap-4 rounded-lg border p-5 transition-colors hover:bg-muted/30"
    >
      <div class="rounded-lg bg-teal-500/10 p-3">
        <Calculator class="h-6 w-6 text-teal-500" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-semibold group-hover:underline">
          Stat ranges and hiring odds
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          Compare Health, Mana, Attack Power, and Spell Power for every class
          and race at any level. See how many hires it takes to roll a strong
          mercenary.
        </p>
      </div>
      <ArrowRight class="h-5 w-5 shrink-0 text-muted-foreground" />
    </a>
  </section>
</div>
