<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import { statName } from "$lib/stats";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import RecruiterTable from "$lib/components/RecruiterTable.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { Alert } from "$lib/components/ui/alert";
  import Calculation from "$lib/components/Calculation.svelte";
  import { mercenaryPrice, mercenaryRank } from "$lib/calculation/mercenaries";
  import { TOTAL_VETERAN_POINTS_NOTE } from "$lib/calculation/inputs";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import {
    CLASSES,
    DEATH_SAVE_MIN_LEVEL,
    MAX_HIRED,
    MAX_PARTY,
    MERC_MIN_LEVEL,
    activeMercenaryLimit,
    mercenaryResource,
  } from "$lib/utils/merc-stats";
  import { petHref } from "$lib/utils/pets";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Calculator from "@lucide/svelte/icons/calculator";
  import Check from "@lucide/svelte/icons/check";
  import Info from "@lucide/svelte/icons/info";
  import Swords from "@lucide/svelte/icons/swords";

  let { data } = $props();

  const link = "text-blue-600 hover:underline dark:text-blue-400";
  const rankCalculation = mercenaryRank();
  // The roster section defines the total once for all calculations on this page.
  delete rankCalculation.note;

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/mercenaries",
      name: "Mercenaries - Ancient Kingdoms Compendium",
      description: `The ${formatNumber(data.mercenaries.length)} hireable mercenary classes in Ancient Kingdoms, compared.`,
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
    ["STR", "strength"],
    ["DEX", "dexterity"],
    ["CON", "constitution"],
    ["INT", "intelligence"],
    ["WIS", "wisdom"],
    ["CHA", "charisma"],
  ] as const;

  const rows = $derived(
    data.mercenaries.map((m) => {
      const cls = m.type_monster;
      const def = CLASSES[cls];
      if (!def) throw new Error(`No growth data for mercenary class ${cls}`);
      const fastest = ATTRIBUTES.filter(([key]) => def.div[key] === 2).map(
        ([, id]) => statName(id),
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
    rage: "text-stat-atk",
    mana: "text-stat-mana",
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
  description={`Compare the ${formatNumber(data.mercenaries.length)} mercenary classes in Ancient Kingdoms. Learn how hiring, party limits, growth, stance, and resurrection work, and find every recruiter.`}
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

    <!-- Source: server-scripts/Npc.cs:1908-1919, UIMercenaries.cs:506-508,584 -->
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">
          {formatNumber(data.mercenaries.length)}
        </div>
        <div class="text-sm text-muted-foreground">Classes</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold tabular-nums">
          {formatNumber(recruiterCount)}
        </div>
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
                >{row.resource === "Songs"
                  ? row.resource
                  : statName(row.resource)}</td
              >
              <!-- Source: server-scripts/Pet.cs:2284,2467,4681,4881 — hasHeals and hasBuffs switch on the pet AI heal and buff checks. -->
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
            {#each ATTRIBUTES as [, id] (id)}
              <th class="px-4 py-2.5 text-right font-medium">{statName(id)}</th>
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
    <!-- Source: the export's pets.json — every mercenary prefab has 1 + 1 per level in each resistance. -->
    <p class="text-sm text-muted-foreground">
      Every class also gains +1 to each resistance every level.
    </p>
  </section>

  <section id="how-it-works" class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How mercenaries work</h2>

    <div class="mt-4 divide-y">
      <div
        id="roster"
        class="grid grid-cols-1 gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]"
      >
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>
            Hire a mercenary at a <a href="#recruiters" class={link}
              >recruiter</a
            >.
          </div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Npc.cs:1908-1919, UIMercenaries.cs:CalculatePriceMercenaryLevel, Charisma.cs:17-20, UINpcTrading.cs:923-930, Utils.cs:GetRandomChar -->
            <p>
              Recruiters serve you from level {MERC_MIN_LEVEL}. Hiring costs
              more as your level and veteran points rise. Charisma lowers the
              price. For a particular race, choose a recruiter that prefers it
              and check that your class allows it.
              <a href="/mechanics/mercenary-stats" class={link}
                >Compare races and hiring odds</a
              >.
            </p>
            <Calculation calculation={mercenaryPrice()} />
            <p id="total-veteran-points">
              {TOTAL_VETERAN_POINTS_NOTE}
              See
              <a href="/mechanics/experience#veteran-points" class={link}
                >Veteran points</a
              >
              for the counting and reset rules.
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>Summon it into your party.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/UIMercenaries.cs:506-508,584, Player.cs:10916-10921,11094-11113 -->
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
              A party holds at most {MAX_PARTY} members, including active mercenaries.
              Make room before summoning one.
            </p>
            <!-- Source: server-scripts/Player.cs:UserCode_CmdBuyMercenary__Int32__Int64__String__Boolean,10916-10921 — a hire spawns only while the party and the level limit have room, otherwise it is saved to the roster. -->
            <p>
              A new hire joins your party right away when there is room.
              Otherwise it waits in your roster.
            </p>
          </div>
        </div>
      </div>
      <!-- Source: server-scripts/UITarget.cs:478-509; UIEquipmentMercenary.cs:CanDisband; UIMercenaries.cs:CanUseRecruiter,OnRecallClicked,OnRenameClicked,OnDeleteClicked; Player.cs:11299-11321 — combat prevents dismissal and every recruiter action, recall rejects dead mercenaries, and deletion checks equipped gear. -->
      <div class="grid grid-cols-1 gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div>Manage your roster.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            <span class="block"
              >Dismissing a mercenary sends it back to your roster.</span
            >
            <span class="block"
              >You cannot dismiss a mercenary or use a recruiter in combat.</span
            >
            <span class="block"
              >A dead mercenary must be resurrected before you can summon it
              again.</span
            >
            <span class="block"
              >Dismiss an active mercenary before renaming it.</span
            >
            <span class="block"
              >Remove the mercenary's equipped gear before permanently deleting
              it.</span
            >
            <span class="block"
              >Retrieve supplies before deletion if you want to keep them.</span
            >
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>It levels up with you.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Player.cs:UpdateMercStatsByLevel,4825-4850,11161-11176; PetSkills.cs:RefreshSkillLevels; Health.cs:28-41; Mana.cs:28-41; Energy.cs:27-39; BardMercenarySkills.cs:69-78 — veteran points increase maximum Health and usable Mana, but not maximum Rage or the Bard song limit. -->
            <p>
              <span class="block">A mercenary always has your level.</span>
              <span class="block">
                Its attributes and resistances grow as the
                <a href="#growth" class={link}>growth table</a> shows.
              </span>
              <span class="block">
                Each total veteran point adds 0.25% of base Hit Points to
                maximum Hit Points. For Mana users other than Bards, it also
                adds 0.25% of base Mana to maximum Mana.
              </span>
              <span class="block">
                Warriors and Rogues keep the same maximum Rage as total veteran
                points rise.
              </span>
              <span class="block">
                Total veteran points do not change a Bard's active-song limit.
              </span>
            </p>
            <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — Bard and Necromancer skill ranks have a minimum of 1, and every skill has its own maximum rank. -->
            <div id="skill-ranks">
              <Calculation calculation={rankCalculation} />
              <p class="mt-2 text-muted-foreground">
                Find Max rank in the Skills table on each
                <a href="#classes" class={link}>mercenary class page</a>.
              </p>
            </div>
            <p>
              <a href={petHref("bard_mercenary", true)} class={link}
                >Bard songs and level unlocks</a
              >
            </p>
            <Alert variant="info">
              <Info />
              <div>
                <!-- Source: server-scripts/Player.cs:10953-10959,11156-11163 — hiring and resummoning add total veteran points to both base damage values after restoring the shared hire roll, including zero. -->
                <p class="font-medium">Veteran Attack Power and Spell Power</p>
                <p>
                  Each of your total veteran points adds 1 to the mercenary's
                  base Attack Power and Spell Power.
                </p>
              </div>
            </Alert>
          </div>
        </div>
      </div>

      <div
        id="commands"
        class="grid grid-cols-1 gap-3 py-4 md:grid-cols-[2rem_1fr]"
      >
        <div class="text-sm text-muted-foreground">5</div>
        <div class="space-y-3">
          <div>Give it orders.</div>
          <!-- Source: server-scripts/GameManager.cs:OnMercenaryHoldPositionKeyPressed,OnMercenaryAttackKeyPressed,OnMercenaryStanceKeyPressed; Player.cs:UserCode_CmdSetHoldPositionPets__Boolean — group orders affect combat pets too, while Warrior-first timing requires a Warrior mercenary. -->
          <p class="text-sm leading-6 text-muted-foreground">
            These orders apply to your mercenaries and combat companion.
          </p>
          <!-- Source: server-scripts/Pet.cs:1539-1542,2298-2309,UserCode_CmdSetAggresiveStance__Boolean__NetworkConnectionToClient; PetSkills.cs:NextBuffSkill — aggression gates attacks, while defensive stance clears a hostile action but retains support. -->
          <!-- Source: server-scripts/GameManager.cs:OnMercenaryHoldPositionKeyPressed,OnMercenaryAttackKeyPressed,AttackDelayMercs,OnMercenaryStanceKeyPressed; Player.cs:UserCode_CmdSetHoldPositionPets__Boolean; Pet.cs:ComeHereNow,UserCode_CmdAttackTarget__NetworkIdentity__NetworkConnectionToClient — group toggles, Warrior-first attack order, and movement commands. -->
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
                      >Your mercenaries and companion attack the enemies you are
                      fighting.</span
                    ><span class="block">They still heal and buff.</span></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Defensive</th
                  ><td class="py-2"
                    ><span class="block"
                      >Stop attacking but continue healing and buffing.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Group stance</th
                  ><td class="py-2"
                    ><span class="block"
                      >Switch everyone to defensive stance if anyone is
                      aggressive. Otherwise, switch everyone to aggressive.</span
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
                      >Other aggressive mercenaries and your companion join 1.5
                      seconds later.</span
                    ><span class="block"
                      >A defensive mercenary or companion takes the target but
                      waits until you make it aggressive.</span
                    ></td
                  ></tr
                >
                <!-- Source: server-scripts/Pet.cs:UserCode_CmdAttackTarget__NetworkIdentity__NetworkConnectionToClient — individual orders break the target's enchanted sleep. -->
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Individual attack</th
                  ><td class="py-2"
                    ><span class="block"
                      >In aggressive stance, the selected mercenary or companion
                      attacks your target and stops holding position.</span
                    ><span class="block"
                      >The order interrupts its current action.</span
                    ><span class="block"
                      >It ends <a href="/mechanics/combat#sleep" class={link}
                        >Sleep</a
                      > on the target.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Hold Position</th
                  ><td class="py-2"
                    ><span class="block"
                      >Mercenaries and companions stay in place until you order
                      Follow or an attack.</span
                    ></td
                  ></tr
                >
                <tr class="border-b"
                  ><th class="py-2 pr-5 font-medium text-foreground">Follow</th
                  ><td class="py-2"
                    ><span class="block"
                      >Mercenaries and companions return to you and stop holding
                      position.</span
                    ></td
                  ></tr
                >
                <tr
                  ><th class="py-2 pr-5 font-medium text-foreground"
                    >Come Here</th
                  ><td class="py-2"
                    ><span class="block"
                      >The selected mercenary or companion drops its target,
                      stops casting, and moves next to you.</span
                    ><span class="block"
                      >The order does not work while it is feared, stunned, or
                      rooted.</span
                    ></td
                  ></tr
                >
              </tbody>
            </table>
          </div>
          <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParseCompanionOrder; server-scripts/UISkillbar.cs:ExecuteCompanionMacro — macros send attack, stance, hold and follow orders to named mercenaries, all of them, or the combat pet. -->
          <p class="text-sm leading-6 text-muted-foreground">
            <a href="/mechanics/character#macros" class={link}
              >Skillbar macros</a
            >
            can give these orders to one mercenary by name, to all of them, or to
            your companion.
          </p>
        </div>
      </div>

      <div
        id="resurrection"
        class="grid grid-cols-1 gap-3 py-4 md:grid-cols-[2rem_1fr]"
      >
        <div class="text-sm text-muted-foreground">6</div>
        <div>
          <div>If it dies, resurrect it.</div>
          <div class="mt-1 space-y-2 text-sm leading-6 text-muted-foreground">
            <!-- Source: server-scripts/Pet.cs:OnDeath,UpdateServer_DEAD, Combat.cs:1401-1416,1255-1266 -->
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
            <!-- Source: server-scripts/TargetHealSkill.cs:257-278, Player.cs:ResurrectMercenaryNearOwner,UserCode_CmdResurrectMerc__String__Int64,ProcessMercenariesOnPlayerRespawn,11228 -->
            <div class="overflow-x-auto">
              <table class="text-sm">
                <thead>
                  <tr class="text-left">
                    <th class="py-1.5 pr-6 font-medium text-foreground"
                      >Recovery method</th
                    >
                    <th class="py-1.5 pr-6 font-medium text-foreground">When</th
                    >
                    <th class="py-1.5 font-medium text-foreground"
                      >Maximum Hit Points restored</th
                    >
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
            <!-- Source: server-scripts/UIMercenaries.cs:OnResurrectClicked,ResurrectAll — recruiter resurrection handles one dead mercenary or all dead roster members, charging the full combined fee. -->
            <p>
              <span class="block"
                >A recruiter can resurrect one dead mercenary or all dead
                mercenaries in your roster.</span
              >
              <span class="block"
                >Resurrecting all requires enough gold for the complete group.</span
              >
            </p>
            <!-- Source: server-scripts/Player.cs:GetMercenaryResurrectionPrice, Combat.cs:777-793 -->
            <p>
              Gear stays on the mercenary at its current durability after death.
            </p>
            <Calculation calculation={mercenaryPrice(true)} />
            <!-- Source: server-scripts/UsableItem.cs:30-39 — CanUse refuses an item below its minLevel. -->
            <!-- Source: the export's items.json — scroll_of_resurrection has level_required 30. -->
            <!-- Source: server-scripts/Pet.cs:5197-5213 — mercenary healing AI skips resurrection skills. -->
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

      <div class="grid grid-cols-1 gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">7</div>
        <div>
          <div>If you die, your mercenaries leave.</div>
          <!-- Source: server-scripts/Player.cs:DestroyLivingMercenariesOnOwnerDeath,ReloadSummonedMercenaries,13584-13588, UIRespawn.cs:Respawn, Player.cs:ProcessMercenariesOnPlayerRespawn,11058-11077 -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            <span class="block">
              Living mercenaries return when you respawn or when someone
              resurrects you.
            </span>
            <span class="block">
              When you respawn, you pay the resurrection fee for each dead
              summoned mercenary, up to 4.
            </span>
            <span class="block">
              If you cannot pay for all dead summoned mercenaries, none of the
              dead ones return.
            </span>
            <!-- Source: server-scripts/UIRespawn.cs:30-63 — the paid mercenary return is available only through non-Hardcore respawn. -->
            <span class="block">
              <a href="/mechanics/world#game-modes" class={link}
                >Hardcore characters</a
              >
              cannot respawn.
            </span>
          </p>
        </div>
      </div>
    </div>
  </section>

  <section id="equipment" class="space-y-4 rounded-lg border p-5">
    <h2 class="text-xl font-semibold">Equipping a mercenary</h2>
    <!-- Source: server-scripts/UITarget.cs:478-482; EquipmentItem.cs:172-234; MercenaryEquipment.cs:21-86 — the target-panel helmet icon opens equipment, with owner-level, class, slot, and two-handed checks. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Open the selected mercenary's equipment with the helmet icon.</span
      >
      <span class="block"
        >Each item must fit its slot and the mercenary's class.</span
      >
      <span class="block">Your level must meet its level requirement.</span>
      <span class="block"
        >With a two-handed weapon in the main hand, the off-hand cannot hold a
        shield or instrument.</span
      >
    </p>
    <!-- Source: server-scripts/Pet.cs:OnDeath; Combat.cs:777-793. -->
    <p class="text-sm leading-6 text-muted-foreground">
      Gear stays equipped when the mercenary dies. Death does not lower its
      durability.
    </p>
    <!-- Source: server-scripts/MercenaryEquipment.cs:116-187,201-256 — only durable items and augments grant attributes; three active matching pieces give attribute bonuses, with no five-piece skill bonus. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Equipment and augments increase a mercenary's attributes.</span
      >
      <span class="block"
        >Three matching, unbroken <a
          href="/mechanics/inventory#armor-sets"
          class={link}>armor-set pieces</a
        >
        give the set's attribute bonus.</span
      >
      <span class="block"
        >Mercenaries do not receive the five-piece skill bonus.</span
      >
      <span class="block">Broken gear gives no active attribute bonus.</span>
    </p>
    <!-- Source: server-scripts/ScrollItem.cs:UseAfterCast; UIEquipmentMercenary.cs:171-179; MercenaryEquipment.cs:289-328 — repair kits select an owned mercenary target and helmet visibility changes the appearance. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >A repair kit restores equipped gear up to the kit's quality.</span
      >
      <span class="block"
        >Target your mercenary first, or the kit repairs your own gear.</span
      >
      <span class="block">A hidden helmet remains equipped.</span>
    </p>
    <p class="text-sm leading-6">
      <a href="#auto-consume" class={link}
        >Auto-Consume supplies and thresholds</a
      >
    </p>
  </section>

  <section id="auto-consume" class="space-y-4 rounded-lg border p-5">
    <h2 class="text-xl font-semibold">Auto-Consume</h2>
    <!-- Source: server-scripts/Pet.cs:292-306,2173-2262; UIEquipmentMercenary.cs:182-196; UIMercenaries.cs:786-793 — a per-mercenary saved toggle gates use of four dedicated supply slots while the owner is in combat. -->
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
    <!-- Source: server-scripts/Pet.cs:UpdateServer — integer Random.Range checks food and utility potions every 5–9 seconds, Health and resource potions every 1–2 seconds, with 15-second reuse and 90% efficiency gates. -->
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
              ><span class="block">When no food buff is active.</span></td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Utility potion</th
            ><td class="py-2"
              ><span class="block"
                >When no buff from that potion category is active.</span
              ></td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Healing potion</th
            ><td class="py-2"
              ><span class="block"
                >Below 50% Hit Points, if at least 90% of the potion's healing
                would be used.</span
              ></td
            ></tr
          >
          <tr
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Resource potion</th
            ><td class="py-2"
              ><span class="block"
                >Below 25% Rage for Warriors and Rogues, or 25% Mana for Mana
                users other than Bards, if at least 90% of the potion would be
                used.</span
              ></td
            ></tr
          >
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/Pet.cs:2224-2262 — healing and resource potions each have a 15-second reuse timer. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Healing and resource potions each have a 15-second reuse delay.</span
      >
    </p>
  </section>

  <section id="ai-behavior" class="space-y-4 rounded-lg border p-5">
    <h2 class="text-xl font-semibold">Healers, taunts, and area attacks</h2>
    <!-- Source: server-scripts/Pet.cs:4559-4596,4639-4676,4801-4816,5271-5309,5311-5357; PetSkills.cs:163-214,268-275 — target score, healing thresholds, range, efficiency, and offensive mana reserve. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Cleric and Druid healers consider you, your mercenaries and companion,
        and other party members within 12 yd of the healer, along with those
        members' mercenaries and companions.</span
      >
      <span class="block"
        >Healers prioritize allies with fewer Hit Points, allies under attack,
        and Warriors.</span
      >
      <span class="block"
        >Healers reserve 35% of maximum Mana rather than spend it on attacks.</span
      >
    </p>
    <!-- Source: server-scripts/Pet.cs:OnAggro,UpdateServer_CASTING. -->
    <p class="text-sm leading-6 text-muted-foreground">
      Mercenaries skip training dummies when choosing targets automatically.
    </p>
    <!-- Source: server-scripts/Pet.cs:UpdateServer_CASTING,HasFrontalAttackSkill,GetPreferredRangedAreaClearance — Rogues and Bards seek the back of any target; Rangers, Wizards and Necromancers add bosses and elites; ranged classes count a frontal damage skill only within its cast range plus 1, and frontal projectiles always; ranged mercenaries hold a distance outside cast-time area attacks that their range allows. -->
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-left text-sm">
        <thead
          ><tr class="border-b"
            ><th class="px-4 py-2">Class</th><th class="px-4 py-2"
              >Moves behind the target after attacks</th
            ></tr
          ></thead
        >
        <tbody>
          <tr class="border-b"
            ><th class="px-4 py-2 font-medium">Rogue, Bard</th><td
              class="px-4 py-2">Against any target</td
            ></tr
          >
          <tr class="border-b bg-muted/50"
            ><th class="px-4 py-2 font-medium">Ranger, Wizard, Necromancer</th
            ><td class="px-4 py-2"
              >Against bosses, elites, and monsters with frontal attacks that
              can reach them</td
            ></tr
          >
          <tr class="border-b"
            ><th class="px-4 py-2 font-medium">Cleric, Druid</th><td
              class="px-4 py-2"
              >Against monsters with frontal attacks that can reach them</td
            ></tr
          >
          <tr class="bg-muted/50"
            ><th class="px-4 py-2 font-medium">Warrior</th><td class="px-4 py-2"
              >Does not move behind the target</td
            ></tr
          >
        </tbody>
      </table>
    </div>
    <p class="text-sm leading-6 text-muted-foreground">
      Ranged mercenaries also stay outside the area of a monster's cast-time
      area attacks when their own attack range allows it.
    </p>
    <!-- Source: server-scripts/Pet.cs:4559-4586,4725-4762,4801-4816,5271-5309 — candidate, heal-over-time, area, and direct-heal thresholds. -->
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
              >When healing starts</th
            ><td class="py-2"
              >Below 90% Hit Points. Below 40%, healing can interrupt an
              offensive cast.</td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Heal-over-time buff</th
            ><td class="py-2"
              >Below 70% Hit Points, without that buff already active.</td
            ></tr
          >
          <tr class="border-b"
            ><th class="py-2 pr-5 font-medium text-foreground">Area heal</th><td
              class="py-2"
              >At least 3 allies below 60% Hit Points within healing range.</td
            ></tr
          >
          <tr
            ><th class="py-2 pr-5 font-medium text-foreground"
              >Single-target heal</th
            ><td class="py-2"
              ><span class="block"
                >At 75% Hit Points or lower, or 85% with full Mana. Above that,
                the ally must need at least half the heal.</span
              ></td
            ></tr
          >
        </tbody>
      </table>
    </div>
    <!-- Source: server-scripts/Pet.cs:4589-4636,4679-4722,5035-5076 — cleansing takes priority and same-owner healers avoid duplicate noncritical direct heals. -->
    <!-- Source: server-scripts/Pet.cs:TryQueueHealSkill; website/data/compendium.db pet_skills, skills.is_cleanse — healer cleansing takes priority, using each class's cleanse skill. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Healers cleanse before healing when their cleanse skill is ready:
        <a href="/skills/radiant_cleansing" class={link}>Radiant Cleansing</a>
        for Clerics or
        <a href="/skills/puritys_touch" class={link}>Purity's Touch</a>
        for Druids.</span
      >
      <span class="block"
        >Healers with the same owner avoid duplicate direct heals unless the
        target is below 40% Hit Points.</span
      >
    </p>
    <!-- Source: server-scripts/PetSkills.cs:163-178,217-224; Pet.cs:1389-1502 — Warrior Challenge is chosen first; Battle Shout needs two nearby valid monsters already attacking party members. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Warriors prioritize <a href="/skills/challenge" class={link}
          >Challenge</a
        >
        over other attacks.</span
      >
      <span class="block"
        >In aggressive stance, <a href="/skills/battle_shout" class={link}
          >Battle Shout</a
        > takes priority against groups attacking your party. At least two monsters
        must be within 20 yd of you and close enough to hit together.</span
      >
    </p>
    <!-- Source: server-scripts/MonsterSkills.cs:177-279; Pet.cs:2811-2818,2923-2944 — telegraphed area avoidance needs a reachable safe destination; mercenaries react to any cast time and take the shortest safe path, companions need a cast time of at least 1 second; familiars and aggressive Warriors are excluded; healers can cast at the escape point. -->
    <p class="text-sm leading-6 text-muted-foreground">
      <span class="block"
        >Mercenaries try to dodge every area attack that has a cast time, and
        run to the nearest safe spot they can reach in time.</span
      >
      <span class="block"
        >Companions only dodge area attacks with cast times of at least 1
        second.</span
      >
      <span class="block"
        >Familiars and aggressive Warriors do not try this escape.</span
      >
      <span class="block">Healers can keep supporting you from safety.</span>
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
          Compare Hit Points, Mana, Attack Power, and Spell Power for every
          class and race at any level. See how many hires it takes to roll a
          strong mercenary.
        </p>
      </div>
      <ArrowRight class="h-5 w-5 shrink-0 text-muted-foreground" />
    </a>
  </section>
</div>
