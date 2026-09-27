<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import RecruiterTable from "$lib/components/RecruiterTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { Alert } from "$lib/components/ui/alert";
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
  import Info from "@lucide/svelte/icons/info";
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
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full min-w-[560px] text-sm">
        <thead>
          <tr class="border-b text-left text-muted-foreground">
            <th class="px-4 py-2.5 font-medium">Class</th>
            <th class="px-4 py-2.5 font-medium">Resource</th>
            <th class="px-4 py-2.5 text-center font-medium">Heals</th>
            <th class="px-4 py-2.5 text-center font-medium">Buffs</th>
            <th class="px-4 py-2.5 text-center font-medium">Death save</th>
            <th class="px-4 py-2.5 font-medium">Grows fastest</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-2.5 font-medium">
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
              <td class="px-4 py-2.5 font-medium {resourceClass[row.resource]}"
                >{row.resource}</td
              >
              <!-- Source: server-scripts/Pet.cs:2184,2367,4544,4744 — hasHeals and hasBuffs switch on the pet AI heal and buff checks. -->
              <td class="px-4 py-2.5 text-center">
                {@render mark(row.has_heals)}
              </td>
              <td class="px-4 py-2.5 text-center">
                {#if row.type_monster === "Bard"}
                  <!-- Source: server-scripts/BardMercenarySkills.cs:LateUpdate,RefreshAura — Bard songs buff allies outside the pet buff AI. -->
                  <a href="{petHref(row.id, true)}#songs-title" class={link}
                    >Songs</a
                  >
                {:else}
                  {@render mark(row.has_buffs)}
                {/if}
              </td>
              <td class="px-4 py-2.5 text-center">
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
              <td class="px-4 py-2.5">{row.fastest.join(", ")}</td>
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
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full min-w-[640px] text-sm">
        <thead>
          <tr class="border-b text-muted-foreground">
            <th class="px-4 py-2.5 text-left font-medium">Class</th>
            {#each ATTRIBUTES as [, name] (name)}
              <th class="px-4 py-2.5 text-right font-medium">{name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class="border-b last:border-0 hover:bg-muted/30">
              <td class="px-4 py-2.5 font-medium">
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
                  class="px-4 py-2.5 text-right tabular-nums {every === 2
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

  <section id="how-it-works" class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How mercenaries work</h2>

    <div class="mt-4 divide-y">
      <div
        id="roster"
        class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]"
      >
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>
            Hire a mercenary at a <a href="#recruiters" class={link}
              >recruiter</a
            >.
          </div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Npc.cs:1893-1904, UIMercenaries.cs:CalculatePriceMercenaryLevel, Charisma.cs:17-20, UINpcTrading.cs:824-831, Utils.cs:GetRandomChar -->
            <p>
              <span class="block"
                >Recruiters serve you from level {MERC_MIN_LEVEL}.</span
              >
              <span class="block">
                The price is {fmt(hirePrice(MERC_MIN_LEVEL, 0))} gold at level {MERC_MIN_LEVEL}.
              </span>
              <span class="block">
                It rises to {fmt(hirePrice(50, MAX_VETERAN))} gold at level 50 with
                veteran level {MAX_VETERAN}.
              </span>
              <span class="block">
                Charisma lowers the price by 0.2% for each point, up to 25%.
              </span>
              <span class="block">
                A recruiter that prefers a race hires that race when the class
                allows it.
              </span>
              <span class="block">
                Otherwise, the race is random.
                <a href="/mechanics/mercenary-stats" class={link}
                  >Race odds and stat ranges</a
                >
              </span>
            </p>
            <p
              class="inline-block rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground"
            >
              price = round(20 + 400 × ((level − 10) ÷ 40)² + 15 × veteran
              level)
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>Summon it into your party.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/UIMercenaries.cs:297-299,380, Player.cs:10115-10120,10290-10305 -->
            <p>
              <span class="block">
                You can keep up to {MAX_HIRED} hired mercenaries.
              </span>
              <span class="block">
                Your level sets how many of them can be active:
              </span>
            </p>
            <ul class="flex flex-wrap gap-2">
              {#each LIMIT_STEPS as step (step.level)}
                <li
                  class="rounded-md border px-2.5 py-1 text-sm tabular-nums text-foreground"
                >
                  Level {step.level}+ · {step.limit} active
                </li>
              {/each}
            </ul>
            <p>
              <span class="block"
                >A party holds at most {MAX_PARTY} members.</span
              >
              <span class="block"
                >Each active mercenary counts as one member.</span
              >
              <span class="block"
                >In a full party, you cannot summon a mercenary.</span
              >
            </p>
          </div>
        </div>
      </div>
      <!-- Source: server-scripts/UITarget.cs:443-474; UIMercenaries.cs:530-582,588-615,646-700; Player.cs:10487-10509 — combat prevents target-panel dismissal, recall rejects dead mercenaries, and deletion checks equipped gear. -->
      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div>Manage your roster.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            <span class="block"
              >Dismissing a mercenary sends it back to your roster.</span
            >
            <span class="block">You cannot dismiss a mercenary in combat.</span>
            <span class="block"
              >A dead mercenary must be resurrected before you can summon it
              again.</span
            >
            <span class="block"
              >Dismiss an active mercenary before renaming them.</span
            >
            <span class="block"
              >Permanent deletion requires removing their equipped gear.</span
            >
            <span class="block"
              >Retrieve supplies before deletion if you want to keep them.</span
            >
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>It levels up with you.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel, PetSkills.cs:OnStartServer, Player.cs:10352-10365 -->
            <p>
              <span class="block">A mercenary always has your level.</span>
              <span class="block">
                Its attributes and resistances grow as the
                <a href="#growth" class={link}>growth table</a> shows.
              </span>
              <span class="block">
                Its skill ranks rise with your level and veteran level, up to
                each skill's max rank.
              </span>
              <span class="block">
                Each veteran level adds 0.25% to its Health multiplier and to
                its Mana or Rage multiplier.
              </span>
            </p>
            <p
              class="inline-block rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground"
            >
              skill rank = ⌊level ÷ 5⌋ + ⌊veteran level ÷ 10⌋
            </p>
            <!-- Source: server-scripts/BardMercenarySkills.cs:60-104 — a Bard mercenary gains a third combat song at level 40, and Final Cadence requires level 50 with all combat songs active. -->
            <p>
              <span class="block"
                ><a href={petHref("bard_mercenary", true)} class={link}
                  >Bard mercenaries</a
                > can sustain three combat songs from level 40 instead of two.</span
              >
              <span class="block"
                >At level 50, Final Cadence requires all three combat songs to
                be active.</span
              >
            </p>
            <Alert variant="info">
              <Info />
              <div>
                <!-- Source: server-scripts/Player.cs:4629-4652, Player.cs:10347-10348, Database.cs:SaveNewMercenary -->
                <p class="font-medium">
                  Veteran damage bonus disappears after summoning again
                </p>
                <p>
                  A veteran level gained while a mercenary is summoned adds +1
                  physical damage and +1 magic damage.
                </p>
                <p>
                  The game does not save this bonus. The next summon restores
                  the damage rolled at hire, or rolls again if that roll was 0.
                </p>
              </div>
            </Alert>
          </div>
        </div>
      </div>

      <div id="commands" class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">5</div>
        <div class="space-y-3">
          <div>Give it orders.</div>
          <!-- Source: server-scripts/GameManager.cs:1813-1829,1832-1919,1986-2039; Player.cs:8819-8845 — group orders affect combat pets too, while Warrior-first timing requires a Warrior mercenary. -->
          <p class="text-sm leading-6 text-muted-foreground">
            These orders also apply to your combat pet.
          </p>
          <!-- Source: server-scripts/Pet.cs:1488-1491,2198-2209,6007-6017; PetSkills.cs:170-200 — aggression gates attacks, while defensive stance clears a hostile action but retains support. -->
          <!-- Source: server-scripts/GameManager.cs:1813-1829,1832-1919,1922-1983,1986-2039; Player.cs:8819-8845; Pet.cs:5375-5415,5945-5993 — group toggles, Warrior-first attack order, and movement commands. -->
          <div class="overflow-x-auto">
            <table class="w-full min-w-[36rem] text-left text-sm leading-6">
              <thead class="border-b text-foreground">
                <tr
                  ><th class="py-2 pr-5">Order</th><th class="py-2">Effect</th
                  ></tr
                >
              </thead>
              <tbody class="text-muted-foreground">
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Aggressive</th
                  ><td class="py-2"
                    ><span class="block"
                      >The companion attacks the enemies you are fighting.</span
                    ><span class="block">It still heals and buffs.</span></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Defensive</th
                  ><td class="py-2"
                    ><span class="block"
                      >The companion stops attacking and drops its target.</span
                    ><span class="block">It still heals and buffs.</span></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Group stance</th
                  ><td class="py-2"
                    ><span class="block"
                      >If any companion is aggressive, all become defensive.</span
                    ><span class="block">Otherwise, all become aggressive.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Group attack</th
                  ><td class="py-2"
                    ><span class="block"
                      >A Warrior mercenary attacks first.</span
                    ><span class="block"
                      >Other aggressive companions join 1.5 seconds later.</span
                    ><span class="block"
                      >A defensive companion takes the target but waits until
                      you make it aggressive.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Individual attack</th
                  ><td class="py-2"
                    ><span class="block"
                      >The order sends one companion at your target and ends
                      Hold Position.</span
                    ><span class="block"
                      >The order interrupts its current action.</span
                    ><span class="block">It wakes a mesmerized target.</span
                    ><span class="block"
                      >The companion must be in aggressive stance.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Hold Position</th
                  ><td class="py-2"
                    ><span class="block"
                      >Companions stay in place until you order Follow or an
                      attack.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground">Follow</th
                  ><td class="py-2"
                    ><span class="block"
                      >Companions return to you and stop holding position.</span
                    ></td
                  ></tr
                >
                <tr
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Come Here</th
                  ><td class="py-2"
                    ><span class="block"
                      >The companion drops its target, stops casting, and moves
                      next to you.</span
                    ><span class="block"
                      >The order does not work while the companion is feared,
                      stunned, or rooted.</span
                    ></td
                  ></tr
                >
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="resurrection" class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">6</div>
        <div>
          <div>If it dies, resurrect it.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Pet.cs:OnDeath,UpdateServer_DEAD, Combat.cs:1350-1361 -->
            <p>
              <span class="block">The corpse stays for 5 minutes.</span>
              {#if deathSaveClasses.length > 0}
                <span class="block">
                  From level {DEATH_SAVE_MIN_LEVEL},
                  {#each deathSaveClasses as c, i (c.id)}{i > 0
                      ? " and "
                      : ""}<a
                      href="{petHref(c.id, true)}#death-save-title"
                      class={link}>{c.type_monster}</a
                    >{/each} mercenaries can survive a hit that would kill them.
                </span>
              {/if}
            </p>
            <!-- Source: server-scripts/TargetHealSkill.cs:232-253, Player.cs:ResurrectMercenaryNearOwner,UserCode_CmdResurrectMerc__String__Int64,ProcessMercenariesOnPlayerRespawn,10417 -->
            <div class="overflow-x-auto">
              <table class="text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="py-1.5 pr-6 font-medium text-foreground"
                      >Way back</th
                    >
                    <th class="py-1.5 pr-6 font-medium text-foreground">When</th
                    >
                    <th class="py-1.5 font-medium text-foreground">Health</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-t">
                    <td class="py-1.5 pr-6 text-foreground"
                      >A resurrect skill or scroll</td
                    >
                    <td class="py-1.5 pr-6">While the corpse stays</td>
                    <td class="py-1.5">10%</td>
                  </tr>
                  <tr class="border-t">
                    <td class="py-1.5 pr-6 text-foreground"
                      >A recruiter, for a fee</td
                    >
                    <td class="py-1.5 pr-6">At any time</td>
                    <td class="py-1.5"
                      >10%, or full at the next summon if the corpse is gone</td
                    >
                  </tr>
                  <tr class="border-t">
                    <td class="py-1.5 pr-6 text-foreground"
                      >Your respawn, for a fee each</td
                    >
                    <td class="py-1.5 pr-6">When you respawn</td>
                    <td class="py-1.5">10%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Source: server-scripts/UIMercenaries.cs:618-644,817-839 — recruiter resurrection handles one dead mercenary or all dead roster members, charging the full combined fee. -->
            <p>
              <span class="block"
                >A recruiter can resurrect one dead mercenary or all dead
                mercenaries in your roster.</span
              >
              <span class="block"
                >Resurrecting all requires enough gold for the complete group.</span
              >
            </p>
            <!-- Source: server-scripts/Player.cs:GetMercenaryResurrectionPrice, Combat.cs:739-755 -->
            <p>
              <span class="block">
                The fee is {fmt(resurrectionPrice(MERC_MIN_LEVEL, 0))} gold at level
                {MERC_MIN_LEVEL}.
              </span>
              <span class="block">
                It rises to {fmt(resurrectionPrice(50, MAX_VETERAN))} gold at level
                50 with veteran level {MAX_VETERAN}.
              </span>
              <span class="block">
                Charisma lowers the fee in the same way as the hire price.
              </span>
              <span class="block">
                Gear stays on the mercenary, and death does not lower its
                durability.
              </span>
            </p>
            <p
              class="inline-block rounded-md bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground"
            >
              fee = round(5 + 295 × ((level − 1) ÷ 49)^2.8 + 10 × veteran level)
            </p>
            <!-- Source: server-scripts/UsableItem.cs:30-39 — CanUse refuses an item below its minLevel. -->
            <!-- Source: exported-data/items.json — scroll_of_resurrection has level_required 30. -->
            <!-- Source: server-scripts/Pet.cs:5059-5075 — mercenary healing AI skips resurrection skills. -->
            <p>
              <span class="block"
                >A <a href="/items/scroll_of_resurrection" class={link}
                  >Scroll of Resurrection</a
                > requires level 30.</span
              >
              <span class="block"
                >Healer mercenaries do not cast resurrection automatically.</span
              >
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">7</div>
        <div>
          <div>If you die, your mercenaries leave.</div>
          <!-- Source: server-scripts/Player.cs:DestroyLivingMercenariesOnOwnerDeath,ReloadSummonedMercenaries,13004-13008, UIRespawn.cs:Respawn, Player.cs:ProcessMercenariesOnPlayerRespawn,10254-10273 -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            <span class="block">
              Living mercenaries return when you respawn or when someone
              resurrects you.
            </span>
            <span class="block">
              When you respawn, the game also pays the fee for each dead
              summoned mercenary, up to 4.
            </span>
            <span class="block">
              If you cannot pay for all of them, none of them return.
            </span>
            <!-- Source: server-scripts/UIRespawn.cs:30-63 — the paid mercenary return is available only through non-Hardcore respawn. -->
            <span class="block">
              Hardcore characters have no normal respawn, so this does not apply
              to them.
            </span>
          </p>
        </div>
      </div>
    </div>
  </section>

  <section id="equipment" class="space-y-4 rounded-lg border p-5">
    <h2 class="text-xl font-semibold">Equipping a mercenary</h2>
    <!-- Source: server-scripts/UITarget.cs:443-447; EquipmentItem.cs:157-212; MercenaryEquipment.cs:21-86 — the target-panel helmet icon opens equipment, with owner-level, class, slot, and two-handed checks. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Open the selected mercenary's equipment with the helmet icon.</span
      >
      <span class="block"
        >Each item must fit its slot and the mercenary's class.</span
      >
      <span class="block">Your level must meet its level requirement.</span>
      <span class="block"
        >A two-handed weapon cannot share the off-hand slot with a shield or
        instrument.</span
      >
    </p>
    <!-- Source: server-scripts/MercenaryEquipment.cs:116-187,201-256 — only durable items and augments grant attributes; three active matching pieces give attribute bonuses, with no five-piece skill bonus. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Equipment and augments increase a mercenary's attributes.</span
      >
      <span class="block"
        >Three matching, unbroken armor-set pieces give the set's attribute
        bonus.</span
      >
      <span class="block"
        >Mercenaries do not receive the five-piece skill bonus.</span
      >
      <span class="block">Broken gear gives no active attribute bonus.</span>
    </p>
    <!-- Source: server-scripts/ScrollItem.cs:11-65; UIEquipmentMercenary.cs:163-171; MercenaryEquipment.cs:286-309 — repair kits select an owned mercenary target and helmet visibility changes the appearance. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >A repair kit restores equipped gear up to the kit's quality.</span
      >
      <span class="block"
        >Target your mercenary first, or the kit repairs your own gear.</span
      >
      <span class="block"
        >Hiding a helmet changes its appearance, not its equipment slot.</span
      >
    </p>
    <p class="text-sm leading-6">
      <a href="#auto-consume" class={link}
        >Auto-Consume supplies and thresholds</a
      >
    </p>
  </section>

  <section id="auto-consume" class="space-y-4 rounded-lg border p-5">
    <h2 class="text-xl font-semibold">Auto-Consume</h2>
    <!-- Source: server-scripts/Pet.cs:288-302,2073-2162; UIEquipmentMercenary.cs:174-188; UIMercenaries.cs:576-583 — a per-mercenary saved toggle gates use of four dedicated supply slots while the owner is in combat. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Each mercenary has food, utility potion, healing potion, and resource
        potion slots.</span
      >
      <span class="block"
        >Supplies in your backpack do not fill these slots.</span
      >
      <span class="block"
        >The Auto-Consume toggle is saved separately for each mercenary.</span
      >
      <span class="block">Supplies are used only while you are in combat.</span>
    </p>
    <!-- Source: server-scripts/Pet.cs:2073-2162 — food and utility buff checks occur every 5–10 seconds; health and resource checks every 1–3 seconds with 15-second reuse and 90% efficiency gates. -->
    <div class="overflow-x-auto">
      <table class="w-full min-w-[32rem] text-left text-sm leading-6">
        <thead class="border-b text-foreground">
          <tr
            ><th class="py-2 pr-5">Supply</th><th class="py-2"
              >Automatic-use condition</th
            ></tr
          >
        </thead>
        <tbody class="text-muted-foreground">
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground">Food</th><td
              class="py-2"
              ><span class="block"
                >The mercenary eats food when it has no food buff.</span
              ><span class="block">It checks every 5–10 seconds.</span></td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Utility potion</th
            ><td class="py-2"
              ><span class="block"
                >The mercenary uses a utility potion when it has no buff from
                the potion's category.</span
              ><span class="block">It checks every 5–10 seconds.</span></td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Healing potion</th
            ><td class="py-2"
              ><span class="block"
                >The mercenary uses a healing potion below 50% Health.</span
              ><span class="block"
                >The mercenary must be missing at least 90% of the Health that
                the potion restores.</span
              ><span class="block">It checks every 1–3 seconds.</span></td
            ></tr
          >
          <tr
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Resource potion</th
            ><td class="py-2"
              ><span class="block"
                >The mercenary uses a resource potion below 25% Rage for a
                Warrior or Rogue, or below 25% Mana for other classes except
                Bard.</span
              ><span class="block"
                >The mercenary must be missing at least 90% of the Rage or Mana
                that the potion restores.</span
              ><span class="block">It checks every 1–3 seconds.</span></td
            ></tr
          >
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/Pet.cs:2124-2162 — healing and resource potions each have a 15-second reuse timer. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Healing and resource potions each have a 15-second reuse delay.</span
      >
    </p>
  </section>

  <section id="ai-behavior" class="space-y-4 rounded-lg border p-5">
    <h2 class="text-xl font-semibold">Healers, taunts, and area attacks</h2>
    <!-- Source: server-scripts/Pet.cs:4422-4459,4502-4539,4664-4679,5133-5171,5173-5219; PetSkills.cs:60-108,162-169 — target score, healing thresholds, range, efficiency, and offensive mana reserve. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Cleric and Druid healers consider you, your companions, and nearby
        party members and companions.</span
      >
      <span class="block"
        >Other party members must be within 12 units of the healer.</span
      >
      <span class="block"
        >Healers prioritize allies with less Health, allies under attack, and
        Warriors.</span
      >
      <span class="block"
        >Offensive skills preserve at least 35% of a healer's maximum Mana after
        casting.</span
      >
    </p>
    <!-- Source: server-scripts/Pet.cs:4422-4449,4588-4625,4664-4679,5133-5171 — candidate, heal-over-time, area, and direct-heal thresholds. -->
    <div class="overflow-x-auto">
      <table class="w-full min-w-[32rem] text-left text-sm leading-6">
        <thead class="border-b text-foreground">
          <tr
            ><th class="py-2 pr-5">Healing choice</th><th class="py-2"
              >Threshold</th
            ></tr
          >
        </thead>
        <tbody class="text-muted-foreground">
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Heal candidate</th
            ><td class="py-2"
              >The healer considers allies below 90% Health, or below 40% when
              urgent healing is needed.</td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Heal-over-time buff</th
            ><td class="py-2"
              >The healer considers an ally below 70% Health who does not
              already have that buff.</td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground">Area heal</th><td
              class="py-2"
              >The healer considers an area heal when at least 3 living allies
              below 60% Health are in range and can receive it.</td
            ></tr
          >
          <tr
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Single-target heal</th
            ><td class="py-2"
              ><span class="block"
                >The healer always considers a single-target heal at 75% Health
                or lower, rising to 85% when the healer has full Mana.</span
              ><span class="block"
                >Above that threshold, the ally must need at least half the
                heal.</span
              ></td
            ></tr
          >
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/Pet.cs:4452-4499,4542-4585,4898-4939 — cleansing takes priority and same-owner healers avoid duplicate noncritical direct heals. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Healers cleanse before healing when Cleanse is ready.</span
      >
      <span class="block"
        >Healers with the same owner avoid duplicate direct heals unless the
        target is below 40% Health.</span
      >
    </p>
    <!-- Source: server-scripts/PetSkills.cs:60-75,111-118; Pet.cs:1333-1444 — Warrior Challenge is chosen first; Battle Shout needs two nearby valid monsters already attacking party members. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Warriors prioritize Challenge against one target.</span
      >
      <span class="block"
        >In aggressive stance, Battle Shout takes priority when at least two
        attackable monsters within 20 units of you attack party members and are
        close enough to each other for the shout.</span
      >
    </p>
    <!-- Source: server-scripts/MonsterSkills.cs:177-279; Pet.cs:2702-2709,2814-2835 — telegraphed area avoidance needs a reachable safe destination; familiars and aggressive Warriors are excluded; healers can cast at the escape point. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Combat pets and mercenaries can evade monster area attacks with at
        least a 1-second cast and a reachable safe destination.</span
      >
      <span class="block"
        >Familiars and aggressive Warriors do not try this escape.</span
      >
      <span class="block"
        >A healer can cast support skills from the escape position.</span
      >
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
