<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

  const SECTIONS = [
    { id: "attributes", label: "The Six Attributes" },
    { id: "resources", label: "Health, Mana, Rage, and Songs" },
    { id: "skills-and-specializations", label: "Skills and Specializations" },
  ];
</script>

<Seo
  title="Character Build - Ancient Kingdoms"
  description="The six attributes, class resources, skill prerequisites, Veteran Points, and specializations."
  path="/mechanics/character"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Character Build" },
    ]}
  />
  <h1 class="text-4xl font-bold">Character Build</h1>
  <PageSections sections={SECTIONS} />

  <Card.Root id="attributes" class="bg-muted/30">
    <Card.Header>
      <Card.Title>The Six Attributes</Card.Title>
      <Card.Description>What each attribute changes.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Attribute</th>
              <th class="p-2 font-medium text-foreground">Effect</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/Strength.cs:7-17,80-98 — STR adds physical damage, rage capacity, and selected debuff strength. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Strength</th>
              <td class="p-2">
                <span class="block"
                  >+1 physical damage and +10 maximum rage per point.</span
                >
                <span class="block"
                  >Selected physical debuffs gain a rounded +0.5 per point.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Constitution.cs:7-15,23-25,38-50,73-76 — CON adds health, Poison Resist and block, but not health recovery or Defense. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Constitution</th>
              <td class="p-2">
                <span class="block"
                  >+25 maximum health, rounded +0.25 Poison Resist, and +0.03
                  percentage points of block chance per point.</span
                >
                <span class="block"
                  >It does not add armor or health recovery.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Dexterity.cs:7-17,59-71,84-106 — DEX affects accuracy, critical chance and resistance, bow damage, and poison effects. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Dexterity</th>
              <td class="p-2">
                <span class="block"
                  >+0.05 percentage points of accuracy and critical resistance,
                  and +0.03 percentage points of critical chance per point.</span
                >
                <span class="block"
                  >Bow damage gains a rounded +1.5 per point.</span
                >
                <span class="block"
                  >Some poison effects also scale with Dexterity.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Intelligence.cs:7-23,36-39,101-124 — INT adds mana, magic damage, and selected magical debuffs and damage-over-time effects. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Intelligence</th>
              <td class="p-2">
                <span class="block"
                  >+20 maximum mana and rounded +1.5 magic damage per point.</span
                >
                <span class="block"
                  >Some magical debuffs and damage-over-time effects also scale
                  with Intelligence.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Wisdom.cs:27-35,102-113,136-170 — WIS improves healing and selected protective buffs, not the mana pool or recovery. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Wisdom</th>
              <td class="p-2">
                <span class="block"
                  >Direct heals gain up to +0.4% per point, or +1.2% for
                  Rangers, with a +500% cap.</span
                >
                <span class="block"
                  >Selected protective buffs and wards also improve.</span
                >
                <span class="block"
                  >Wisdom adds neither maximum mana nor mana recovery.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:9-40 — CHA affects buy/sell modifiers and Bard power, capped at triple base Bard power. -->
            <tr>
              <th class="p-2 font-medium text-foreground">Charisma</th>
              <td class="p-2">
                <span class="block">Improves purchase and sale prices.</span>
                <span class="block"
                  >Bard effects gain +0.1% power per point, up to +200% power.</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Experience.cs:113-322 — levels award one allocatable attribute point and class-dependent automatic attribute growth. -->
      <p>
        <span class="block"
          >Each level grants one attribute point to allocate and automatic
          attribute growth based on your class.</span
        >
        <span class="block"
          ><MechanicsLink section="experience#level-rewards"
            >See the class growth table</MechanicsLink
          > for the schedule.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerEquipment.cs:190-221,259-285 — equipment and augments apply attribute bonuses. -->
      <!-- Source: server-scripts/PlayerSkills.cs:1381-1403 — passive skills apply attribute bonuses. -->
      <!-- Source: server-scripts/Skills.cs:1436-1468 — active buffs can change attribute values. -->
      <p>
        Equipment, augments, passive skills, and buffs can also change your
        attributes.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="resources" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Health, Mana, Rage, and Songs</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Health.cs:28-44,59-71 — max health and recovery use separate bonuses. -->
      <!-- Source: server-scripts/EnergyResource.cs:84-95 — resources recover only while the entity is alive. -->
      <p>
        <span class="block">All classes have health.</span>
        <span class="block"
          >Maximum health and health recovery use separate bonuses.</span
        >
      </p>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Resource</th>
              <th class="p-2 font-medium text-foreground">Classes</th>
              <th class="p-2 font-medium text-foreground">Pool and recovery</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/Mana.cs:28-54 — max mana and mana recovery have distinct calculations. -->
            <!-- Source: server-scripts/Intelligence.cs:21-28,96-99 and server-scripts/Wisdom.cs:27-35,102-105 — Intelligence adds pool but neither attribute adds recovery. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Mana</th>
              <td class="p-2">Cleric, Druid, Ranger, Wizard</td>
              <td class="p-2">
                <span class="block"
                  >Intelligence adds +20 maximum mana per point.</span
                >
                <span class="block"
                  >Wisdom does not increase the pool or regeneration.</span
                >
                <span class="block">Recovery has its own bonuses.</span>
              </td>
            </tr>
            <!-- Source: server-scripts/Energy.cs:12-17,27-51 and server-scripts/Strength.cs:80-87 — rage capacity scales with Strength and baseline recovery is zero. -->
            <!-- Source: server-scripts/Combat.cs:994-1025,1364-1388 — damaging auto attacks and received Normal-type TargetDamageSkill hits generate rage, with no melee-range check. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Rage</th>
              <td class="p-2">Warrior, Rogue</td>
              <td class="p-2">
                <span class="block"
                  >Strength adds +10 maximum rage per point.</span
                >
                <span class="block">Rage has no baseline recovery.</span>
                <span class="block"
                  >Dealing auto-attack damage or taking physical damage builds
                  it.</span
                >
                <span class="block"
                  ><MechanicsLink section="combat#rage-generation"
                    >See exact rage formulas</MechanicsLink
                  >.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/PlayerSkills.cs:38-47,108-109 and server-scripts/ScriptableSkill.cs:120-138 — Bard uses limited active songs that require an instrument. -->
            <tr>
              <th class="p-2 font-medium text-foreground">Songs</th>
              <td class="p-2">Bard</td>
              <td class="p-2">
                <span class="block"
                  >Two active-song slots by default, with individual song
                  durations.</span
                >
                <span class="block">Songs require an instrument.</span>
                <span class="block"
                  ><MechanicsLink section="bard#songs"
                    >See song rules</MechanicsLink
                  >.</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Combat.cs:1221-1229 — Wizard Mystic Spark restores floor(35% times min(hit damage, target health before hit)) as mana. -->
      <!-- Source: server-scripts/Combat.cs:1281-1310 — Mana Shield spends one mana per point of damage absorbed. -->
      <p>
        <span class="block"
          >Wizard's Mystic Spark restores ⌊0.35 × min(hit damage, target health
          before hit)⌋ mana.</span
        >
        <span class="block"
          >Mana Shield spends one mana for each damage point it prevents.</span
        >
        <span class="block"
          ><MechanicsLink section="combat#special"
            >See ward and Mana Shield priority</MechanicsLink
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="skills-and-specializations" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Skills, Veteran Points, and Specializations</Card.Title>
      <Card.Description>Separate points and separate builds.</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Experience.cs:319-322 — each regular level awards one class skill point. -->
      <p>
        <span class="block"
          >Each regular level grants one class skill point.</span
        >
        <span class="block"
          ><MechanicsLink section="experience#level-rewards"
            >See level rewards</MechanicsLink
          > for the full progression.</span
        >
      </p>
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Learning skills</h3>
        <!-- Source: server-scripts/ScriptableSkill.cs:53-70 — requirements include spent points, up to two ranked predecessors, level, and tier. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1504-1562 — each upgrade checks rank limit, level, unspent and spent points, predecessors, and tier choices. -->
        <p>
          <span class="block"
            >A rank can require a character level, unspent points, points
            already spent in its pool, and up to two prerequisite skills at
            specified ranks.</span
          >
          <span class="block"
            >An armor-set skill bonus does not count as a purchased prerequisite
            rank.</span
          >
        </p>
        <!-- Source: server-scripts/PlayerSkills.cs:1349-1358 — prerequisite checks exclude armor-set bonus levels. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1530-1562 — new choices are limited by tier, but existing choices can be upgraded. -->
        <p>
          <span class="block"
            >You can choose up to two different skills in tiers 1 and 3.</span
          >
          <span class="block">Tiers 2 and 4 allow one choice each.</span>
          <span class="block"
            >You can still upgrade a skill already chosen in a full tier.</span
          >
        </p>
      </div>
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Veteran skills</h3>
        <!-- Source: server-scripts/Experience.cs:38-38,45-53,335-372 — at the level cap filled XP bars grant Veteran Points with a separate maximum. -->
        <!-- Source: server-scripts/PlayerSkills.cs:57-62,1517-1528,2032-2049 — veteran upgrades spend Veteran Points, not class skill points. -->
        <p>
          <span class="block"
            >At level 50, further XP earns Veteran Points instead of levels, up
            to the veteran limit of 200.</span
          >
          <span class="block"
            >Veteran skills spend a separate point pool and still check ranks,
            prerequisites, and tier limits.</span
          >
          <span class="block"
            ><MechanicsLink section="experience#veteran-points"
              >See Veteran Point costs</MechanicsLink
            >.</span
          >
        </p>
      </div>
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Second specialization</h3>
        <!-- Source: server-scripts/UISkills.cs:238-289 — second specialization unlocks at level 50 for 100,000 gold. -->
        <!-- Source: server-scripts/UISkills.cs:294-325 — switching requires no unspent class skill points, no combat, an idle living player, and a 10-minute interval. -->
        <p>
          <span class="block"
            >At level 50, a second specialization costs 100,000 gold.</span
          >
          <span class="block"
            >Switching requires all class skill points spent and a living
            character out of combat while standing still.</span
          >
          <span class="block">You must wait 10 minutes between switches.</span>
        </p>
        <!-- Source: server-scripts/Player.cs:14897-14927 — switching loads the chosen class-skill ranks and its skillbar, removes the pet, and leaves veteran ranks untouched. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1374-1422 — specialization changes reset class skills, stop Bard songs, and preserve veteran skills. -->
        <p>
          <span class="block"
            >A second specialization holds another class-skill build for the
            same class.</span
          >
          <span class="block"
            >Veteran skills are shared between both builds.</span
          >
          <span class="block"
            >Switching loads the selected class skills and skillbar, removes
            your pet, and stops Bard songs.</span
          >
        </p>
        <!-- Source: server-scripts/Utils.cs:506-525 — class skill reset price increases at levels 10, 20, 30, and 40. -->
        <p>
          <span class="block"
            >A class-skill reset costs 100 gold below level 10.</span
          >
          <span class="block"
            >The price rises to 250 at level 10, 500 at level 20, 1,000 at level
            30, and 3,000 at level 40.</span
          >
        </p>
        <!-- Source: server-scripts/Player.cs:10523-10529,10555-10589 — class and veteran resets use separate commands and prices, with a Token of Redemption required for veteran reset. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1374-1467 — each reset returns points only for its own skill pool. -->
        <p>
          <span class="block"
            >Class-skill and veteran-skill resets are separate.</span
          >
          <span class="block"
            >A veteran reset costs 10,000 gold and one Token of Redemption.</span
          >
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
