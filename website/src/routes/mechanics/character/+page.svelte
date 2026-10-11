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
                  >Strength adds a rounded 0.5 per point to physical
                  damage-over-time effects and Defense reductions from melee
                  debuffs.</span
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
                  >Poison damage from Rogue attacks gains a rounded +2.5 per
                  point.</span
                >
                <!-- Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute,GetDamageOverTimeAttributeBonus — poisonDiseaseScalesWithIntelligence selects Intelligence; unflagged poison and disease use Dexterity with a 1.5 multiplier. -->
                <span class="block"
                  >Dexterity-scaled poison and disease damage-over-time effects
                  gain round(Dexterity × 1.5).</span
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
                  >Defense, Magic Resist, and elemental resistance reductions
                  from magical debuffs gain a rounded +0.4 per point.</span
                >
                <span class="block"
                  >Physical and magic damage reductions from debuffs gain a
                  rounded +0.5 per point.</span
                >
                <!-- Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute,GetDamageOverTimeAttributeBonus; BuffSkill.cs:24-28 — poisonDiseaseScalesWithIntelligence selects Intelligence; damageOverTimeBonusPerIntelligencePoint defaults to 1.25. -->
                <span class="block"
                  >Intelligence-scaled damage-over-time effects, including
                  flagged poison and disease debuffs, gain round(Intelligence ×
                  the skill's Intelligence multiplier), normally 1.25.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Wisdom.cs:27-35,102-113; Buff.cs:47-60,113-150; BuffSkill.cs:GetBuffPowerAttribute; TargetBuffSkill.cs:434-445; AreaBuffSkill.cs:33-45 — protective buffs select Intelligence when scalesWithIntelligence, otherwise Wisdom; TargetBuffSkill triples the selected attribute for Rangers. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Wisdom</th>
              <td class="p-2">
                <span class="block"
                  >Direct heals gain up to +0.4% per point, or +1.2% for
                  Rangers, with a +500% cap.</span
                >
                <span class="block"
                  >Protective buffs use Wisdom, or Intelligence when the skill
                  scales with Intelligence. Each selected attribute point adds
                  +2 maximum health to maximum-health buffs and +2 ward
                  capacity.</span
                >
                <span class="block"
                  >Defense and Magic Resist buffs each gain round(selected
                  attribute × 0.15). Ranger targeted buffs triple the selected
                  attribute before scaling.</span
                >
                <!-- Source: server-scripts/BardSongSkill.cs:Apply and BardFinalCadenceSkill.cs:Apply — songs and Final Cadence scale with Charisma, not Wisdom. -->
                <span class="block"
                  >Bard songs and Final Cadence use Charisma instead of Wisdom.</span
                >
                <span class="block"
                  ><MechanicsLink section="combat#buffs"
                    >See the buff scaling rates</MechanicsLink
                  > for other resistances and effects.</span
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
                  >Bard songs and Final Cadence gain +0.1% power per point, up
                  to +200% power.</span
                >
                <span class="block"
                  ><MechanicsLink section="combat#buffs"
                    >See Bard Song Scaling</MechanicsLink
                  > for the effects it does not change.</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Experience.cs:114-352 — levels award one allocatable attribute point and class-dependent automatic attribute growth. -->
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
      <!-- Source: server-scripts/Experience.cs:232-260 — Necromancer gains Intelligence every 2 levels, Constitution every 3, Wisdom every 4, Dexterity every 5, and Strength and Charisma every 6. -->
      <p>
        Necromancers gain Intelligence every 2 levels, Constitution every 3,
        Wisdom every 4, Dexterity every 5, and Strength and Charisma every 6.
      </p>
      <!-- Source: server-scripts/PlayerEquipment.cs:190-221,259-285 — equipment and augments apply attribute bonuses. -->
      <!-- Source: server-scripts/PlayerSkills.cs:1782-1804 — passive skills apply attribute bonuses. -->
      <!-- Source: server-scripts/Skills.cs:1484-1516 — active buffs can change attribute values. -->
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
      <!-- Source: server-scripts/Health.cs:28-44,59-71 — Constitution, equipment, augments, passive skills, and buffs raise maximum health; equipment, augments, passive skills, and healing-over-time buffs raise recovery. -->
      <!-- Source: server-scripts/EnergyResource.cs:84-95 — resources recover only while the entity is alive. -->
      <p>
        <span class="block">Every class has health.</span>
        <span class="block">Constitution adds 25 maximum health per point.</span
        >
        <span class="block"
          >Equipment, augments, passive skills, and buffs can also raise maximum
          health.</span
        >
        <span class="block"
          >Equipment, augments, passive skills, and healing-over-time buffs
          increase health recovery.</span
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
            <!-- Source: server-scripts/Player.cs:1460-1471 — Cleric, Druid, Ranger, Wizard and Necromancer use Mana. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Mana</th>
              <td class="p-2">Cleric, Druid, Necromancer, Ranger, Wizard</td>
              <td class="p-2">
                <span class="block"
                  >Intelligence adds +20 maximum mana per point.</span
                >
                <span class="block"
                  >Wisdom adds neither maximum mana nor mana recovery.</span
                >
                <span class="block"
                  >Equipment, augments, passive skills, and buffs can increase
                  mana recovery.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Energy.cs:12-17,27-51 and server-scripts/Strength.cs:80-87 — rage capacity scales with Strength and baseline recovery is zero. -->
            <!-- Source: server-scripts/Combat.cs:996-1007,1171-1188,1375-1399 — damaging auto attacks and received single-target physical skill hits generate rage, with no melee-range check. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Rage</th>
              <td class="p-2">Warrior, Rogue</td>
              <td class="p-2">
                <span class="block"
                  >Strength adds +10 maximum rage per point.</span
                >
                <span class="block">Rage has no baseline recovery.</span>
                <span class="block"
                  >You build Rage by dealing auto-attack damage or taking
                  physical damage from a single-target skill.</span
                >
                <span class="block"
                  ><MechanicsLink section="combat#rage-generation"
                    >See exact rage formulas</MechanicsLink
                  >.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/PlayerSkills.cs:38-47,135-136 and server-scripts/ScriptableSkill.cs:120-138 — Bard uses limited active songs that require an instrument. -->
            <tr>
              <th class="p-2 font-medium text-foreground">Songs</th>
              <td class="p-2">Bard</td>
              <td class="p-2">
                <span class="block"
                  >Bards can play two songs at once by default.</span
                >
                <span class="block">Each song lasts for its own duration.</span>
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
      <!-- Source: server-scripts/Combat.cs:1225-1233 — Wizard Mystic Spark restores floor(35% times min(hit damage, target health before hit)) as mana. -->
      <!-- Source: server-scripts/Combat.cs:1284-1314 — Mana Shield spends one mana per point of damage absorbed. -->
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
      <Card.Description
        >Class skills and veteran skills use separate points.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Experience.cs:349-352 — each regular level awards one class skill point. -->
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
        <!-- Source: server-scripts/PlayerSkills.cs:1905-1963 — each upgrade checks rank limit, level, unspent and spent points, predecessors, and tier choices. -->
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
        <!-- Source: server-scripts/PlayerSkills.cs:1750-1759 — prerequisite checks exclude armor-set bonus levels. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1931-1963 — new choices are limited by tier, but existing choices can be upgraded. -->
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
        <!-- Source: server-scripts/Experience.cs:38-38,45-53,366-408 — at the level cap filled XP bars grant Veteran Points with a separate maximum. -->
        <!-- Source: server-scripts/PlayerSkills.cs:59-64,1918-1929,2464-2481 — veteran upgrades spend Veteran Points, not class skill points. -->
        <p>
          <span class="block"
            >At level 50, further XP earns Veteran Points instead of levels, up
            to the veteran limit of 200.</span
          >
          <span class="block"
            >Veteran skills spend Veteran Points rather than class skill points,
            but still have rank, prerequisite, and tier limits.</span
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
        <!-- Source: server-scripts/UISkills.cs:DualSpecButton2 — second specialization unlocks at level 50 for 10,000 gold. -->
        <!-- Source: server-scripts/UISkills.cs:295-326 — switching requires no unspent class skill points, no combat, an idle living player, and a 10-minute interval. -->
        <p>
          <span class="block"
            >At level 50, a second specialization costs 10,000 gold.</span
          >
          <span class="block"
            >Switching requires all class skill points spent and a living
            character out of combat while standing still.</span
          >
          <span class="block">You must wait 10 minutes between switches.</span>
        </p>
        <!-- Source: server-scripts/Player.cs:UserCode_CmdSetCurrentSpec__Int32__List_00601__List_00601 — switching loads the chosen class-skill ranks and its skillbar, removes the pet, and leaves veteran ranks untouched. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1775-1823 — specialization changes reset class skills, stop Bard songs, and preserve veteran skills. -->
        <p>
          <span class="block"
            >Your second specialization stores another set of class skills for
            the same class.</span
          >
          <span class="block"
            >Veteran skills are shared between both builds.</span
          >
          <span class="block"
            >Switching loads the selected class skills and skillbar, removes
            your pet, and stops Bard songs.</span
          >
        </p>
        <!-- Source: server-scripts/Player.cs:GetTotalAttributePoints,ChangeAttributeSpec — each allocation has level.current - 1 + GetTotalVeteranPoints points; switching applies attribute differences and recalculates unspent points. -->
        <p>
          Each specialization stores its own attribute allocation, with level −
          1 + total Veteran Points to spend in each. At level 50 with 200
          Veteran Points, each has 249 points. Switching swaps the allocation
          and restores that specialization's unspent points.
        </p>
        <!-- Source: server-scripts/Player.cs:InitializeAttributeSpecs; Player.cs:15118-15121 — an allocation that cannot be inferred is preserved until switching, when ResetAssignedAttributes runs for free. -->
        <p>
          If a saved character's attribute allocation cannot be inferred, its
          assigned attributes reset for free on the first specialization switch.
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
        <!-- Source: server-scripts/Player.cs:10932-10938,10964-10998 — class and veteran resets use separate commands and prices, with a Token of Redemption required for veteran reset. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1775-1868 — each reset returns points only for its own skill pool. -->
        <p>
          <span class="block"
            >Resetting class skills refunds class skill points but leaves
            veteran skills unchanged.</span
          >
          <span class="block"
            >A veteran reset costs 10,000 gold and one Token of Redemption.</span
          >
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
