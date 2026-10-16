<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { mysticSparkMana } from "$lib/calculation/character";
  import { TOTAL_VETERAN_POINTS_NOTE } from "$lib/calculation/inputs";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import { getQualityTextColorClass } from "$lib/utils/format";

  let { data } = $props();
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
  <PageSections sections={MECHANICS_SECTIONS["/mechanics/character"]} />

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
            <!-- Source: server-scripts/Strength.cs:GetDamageBonus,GetEnergyBonus; server-scripts/BuffSkill.cs:GetDebuffPowerAttribute,GetDamageOverTimeAttributeBonus; server-scripts/Buff.cs:defenseBonus — Strength adds Damage and Rage capacity; melee damage-over-time and Defense reductions gain 50% of Strength, rounded. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Strength</th>
              <td class="p-2">
                <span class="block"
                  >Each point adds 1 Attack Power and 10 maximum Rage.</span
                >
                <span class="block"
                  >Melee damage-over-time effects and Armor Class reductions
                  gain 50% of Strength, rounded. With 100 Strength, they deal 50
                  more damage per tick or reduce Armor Class by 50 more.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Constitution.cs:7-15,23-25,38-50,73-76 — CON adds health, Poison Resist and block, but not health recovery or Defense. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Constitution</th>
              <td class="p-2">
                <span class="block"
                  >Each Constitution point adds 25 maximum Health and 0.03
                  percentage points of Block Chance. You receive Poison Resist
                  equal to 25% of Constitution, rounded. With 100 Constitution,
                  you receive 25 Poison Resist.</span
                >
                <span class="block"
                  >It adds no Armor Class and no health recovery.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Dexterity.cs:7-17,59-71,84-106 — DEX affects accuracy, critical chance and resistance, bow damage, and poison effects. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Dexterity</th>
              <td class="p-2">
                <span class="block"
                  >Each point adds 0.05 percentage points of Accuracy and
                  Critical Resist and 0.03 percentage points of Critical Strike.</span
                >
                <span class="block"
                  >Bow damage gains 150% of Dexterity, rounded. With 100
                  Dexterity, it gains 150 damage.</span
                >
                <span class="block"
                  >Poison damage from Rogue attacks gains 250% of Dexterity,
                  rounded. With 100 Dexterity, it gains 250 damage.</span
                >
                <!-- Source: server-scripts/BuffSkill.cs:485-527 — non-melee poison and disease without Intelligence scaling use Dexterity times 1.5. -->
                <span class="block"
                  >Dexterity-scaled poison and disease damage-over-time effects
                  gain 150% of Dexterity per tick, rounded. With 100 Dexterity,
                  they gain 150 damage per tick.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Intelligence.cs:7-23,36-39,101-124 — INT adds mana, magic damage, and selected magical debuffs and damage-over-time effects. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Intelligence</th>
              <td class="p-2">
                <span class="block"
                  >Each point adds 20 maximum Mana. Spell Power gains 150% of
                  Intelligence, rounded. With 100 Intelligence, it gains 150.</span
                >
                <span class="block"
                  >Armor Class, Magic Resist, and elemental resistance
                  reductions from magical debuffs gain 40% of Intelligence,
                  rounded. With 100 Intelligence, the reduction grows by 40.</span
                >
                <span class="block"
                  >Attack Power and Spell Power reductions from debuffs gain 50%
                  of Intelligence, rounded. With 100 Intelligence, the reduction
                  grows by 50.</span
                >
                <!-- Source: server-scripts/BuffSkill.cs:485-527 — fire, cold, magic and Intelligence-scaled poison/disease use the skill's Intelligence coefficient, except Charisma-scaled effects. -->
                <span class="block"
                  >Fire, cold, magic, and Intelligence-scaled poison and disease
                  damage-over-time effects gain the skill's percentage of
                  Intelligence per tick, rounded. Usually this is 125%, giving
                  125 damage per tick with 100 Intelligence. <a
                    href="/skills/ensnare"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Ensnare</a
                  >
                  uses 115%, giving 115 instead. Bard song damage-over-time gains
                  no Intelligence bonus. Charisma raises its power instead (see
                  <a
                    href="/mechanics/combat#songs"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Song Strength</a
                  >).</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Wisdom.cs:GetHealBonus — direct heals gain 0.4% per Wisdom point, tripled for Rangers and capped at 500%. -->
            <!-- Source: server-scripts/Buff.cs:healthMaxBonus,defenseBonus,magicResistBonus; server-scripts/BuffSkill.cs:GetBuffPowerAttribute; server-scripts/TargetBuffSkill.cs:434-445; server-scripts/AreaBuffSkill.cs:33-45 — protective buffs select Intelligence or Wisdom, with targeted Ranger buffs tripling that attribute. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Wisdom</th>
              <td class="p-2">
                <span class="block"
                  >Direct heals gain 0.4% per Wisdom point (1.2% for Rangers),
                  up to a 500% bonus.</span
                >
                <span class="block"
                  >Protective buffs use Wisdom, or Intelligence when the skill
                  scales with Intelligence. Each selected attribute point adds 2
                  maximum Health to maximum-health buffs and 2 points of ward
                  capacity.</span
                >
                <span class="block"
                  >Armor Class and Magic Resist buffs each gain 15% of the
                  selected attribute, rounded. With 100 selected attribute
                  points, you receive 15 extra Armor Class or Magic Resist.
                  Ranger targeted buffs triple the selected attribute before
                  scaling.</span
                >
                <!-- Source: server-scripts/BardSongSkill.cs:Apply and BardFinalCadenceSkill.cs:Apply — songs and Final Cadence scale with Charisma, not Wisdom. -->
                <span class="block"
                  >Bard songs and <a
                    href="/skills/final_cadence"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Final Cadence</a
                  > use Charisma instead of Wisdom.</span
                >
                <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount,Apply; server-scripts/TargetBuffSkill.cs:Apply; server-scripts/NecromancerDeathBloomSkill.cs:Apply — ordinary scroll healing and buffs skip attributes, but pet and mercenary healing uses the player's Wisdom bonus. -->
                <span class="block">
                  <a
                    href="/skills/death_bloom"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Death Bloom</a
                  >
                  uses Intelligence. Scroll healing and buffs normally gain no attribute
                  bonus. The
                  <a
                    href="/items/runed_scroll_of_restoration"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Runed Scroll of Restoration</a
                  >
                  (<a
                    href="/skills/major_restoration"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Major Restoration</a
                  >) is an exception when healing a mercenary. It gains your
                  Wisdom healing bonus, tripled for a Ranger.
                </span>
                <span class="block"
                  ><MechanicsLink section="combat#buffs"
                    >See the buff scaling rates</MechanicsLink
                  > for other resistances and effects.</span
                >
                <span class="block"
                  >Wisdom adds neither maximum Mana nor mana recovery.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:GetDiscountPurchaseBonus,GetIncreaseSellBonus,GetBardPowerMultiplier; server-scripts/UINpcTrading.cs:CalculatePurchaseItemPrice,CalculateSellItemPrice; server-scripts/PlayerNpcTrading.cs:CalculateRepairItemPrice — Charisma scales merchant discounts, sales, repairs, and Bard power with separate caps. -->
            <tr>
              <th class="p-2 font-medium text-foreground">Charisma</th>
              <td class="p-2">
                <span class="block"
                  >Each point lowers merchant prices and raises sale prices by
                  0.2%, up to 25%, and lowers repair costs by 0.2%, up to 50%.
                  See <a
                    href="/mechanics/inventory#merchants"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Merchants, Buyback, and Repairs</a
                  >.</span
                >
                <span class="block"
                  >Bard songs and <a
                    href="/skills/final_cadence"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Final Cadence</a
                  > gain 0.1% power per point, up to a 200% bonus.</span
                >
                <span class="block"
                  ><MechanicsLink section="combat#songs"
                    >See Song Strength</MechanicsLink
                  > for which song effects Charisma scales.</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <RoundingDefinition />
      <!-- Source: server-scripts/Experience.cs:114-352 — levels award one allocatable attribute point and class-dependent automatic attribute growth. -->
      <p>
        <span class="block"
          >Each level grants one attribute point to allocate. Your class also
          raises attributes on levels that are multiples of 2, 3, 4, 5, or 6.</span
        >
        <span class="block"
          ><MechanicsLink section="experience#level-rewards"
            >See the class growth table</MechanicsLink
          > for the schedule.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerEquipment.cs:190-221,259-285 — equipment and augments apply attribute bonuses. -->
      <!-- Source: server-scripts/PlayerSkills.cs:1839-1861 — passive skills apply attribute bonuses. -->
      <!-- Source: server-scripts/Skills.cs:1484-1516 — active buffs can change attribute values. -->
      <p>
        Equipment, augments, passive skills, and buffs can also change your
        attributes.
        <!-- Source: server-scripts/Player.cs:12477-12512 — reading attribute books permanently raises their listed attributes. -->
        Reading certain
        <a
          href="/professions/lore_keeping"
          class="text-blue-600 dark:text-blue-400 hover:underline">books</a
        >
        permanently raises attributes.
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
        <span class="block"
          >Equipment, augments, passive skills, and buffs can also raise maximum
          Health.</span
        >
        <span class="block"
          >Equipment, augments, passive skills, and healing-over-time buffs
          increase health recovery.</span
        >
        <span class="block"
          >See <a
            href="#attributes"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >The Six Attributes</a
          > for attribute bonuses to maximum Health, Mana, and Rage.</span
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
            <!-- Source: server-scripts/Player.cs:1477-1488 — Cleric, Druid, Ranger, Wizard and Necromancer use Mana. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Mana</th>
              <td class="p-2">Cleric, Druid, Necromancer, Ranger, Wizard</td>
              <td class="p-2">
                <span class="block"
                  >Intelligence raises maximum Mana, not mana recovery.</span
                >
                <span class="block"
                  >Equipment, augments, passive skills, and buffs can increase
                  mana recovery.</span
                >
              </td>
            </tr>
            <!-- Source: server-scripts/Energy.cs:12-17,27-51 and server-scripts/Strength.cs:80-87 — rage capacity scales with Strength and baseline recovery is zero. -->
            <!-- Source: server-scripts/Combat.cs:1007-1018,1182-1199,1386-1410 — damaging auto attacks and received single-target physical skill hits generate rage, with no melee-range check. -->
            <tr class="border-b">
              <th class="p-2 font-medium text-foreground">Rage</th>
              <td class="p-2">Warrior, Rogue</td>
              <td class="p-2">
                <span class="block">Strength raises maximum Rage.</span>
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
      <!-- Source: server-scripts/Combat.cs:1236-1244 — Wizard Mystic Spark restores floor(35% times min(hit damage, target health before hit)) as mana. -->
      <!-- Source: server-scripts/Combat.cs:1295-1325 — Mana Shield spends one mana per point of damage absorbed. -->
      <p>
        <span class="block"
          ><a
            href="/skills/mystic_spark"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Mystic Spark</a
          > restores Mana equal to 35% of damage before shield absorption, counting
          at most the target's Health before the hit, rounded down. Against a target
          without shields, use the hit's damage number.</span
        >
        <span class="block"
          ><a
            href="/skills/mana_shield"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Mana Shield</a
          > spends one Mana for each damage point it prevents.</span
        >
        <span class="block"
          ><MechanicsLink section="combat#ward-and-mana-shield"
            >See when wards and Mana Shield absorb damage</MechanicsLink
          >.</span
        >
      </p>
      <Calculation calculation={mysticSparkMana()} />
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
        <!-- Source: server-scripts/PlayerSkills.cs:1962-2020 — each upgrade checks rank limit, level, unspent and spent points, predecessors, and tier choices. -->
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
        <!-- Source: server-scripts/PlayerSkills.cs:1807-1816 — prerequisite checks exclude armor-set bonus levels. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1988-2020 — new choices are limited by tier, but existing choices can be upgraded. -->
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
        <!-- Source: server-scripts/PlayerSkills.cs:59-64,1975-1986,2521-2538 — veteran upgrades spend Veteran Points, not class skill points. -->
        <!-- Source: server-scripts/PlayerSkills.cs:CanLearnTierSkill; website/data/compendium.db skills.tier — all veteran skills have tier 0, which allows every choice. -->
        <p>
          <span class="block"
            >At level 50, further XP grants Veteran Points while your total is
            below 200.</span
          >
          <span class="block"
            >Veteran skill upgrades spend unspent Veteran Points and follow rank
            and prerequisite limits. Veteran skills have no tier limit.</span
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
        <!-- Source: server-scripts/PlayerSkills.cs:1832-1880 — specialization changes reset class skills, stop Bard songs, and preserve veteran skills. -->
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
          Each specialization stores its own attribute allocation. Each has
          points equal to your level minus 1, plus your total veteran points. At
          level 50 with 200 total veteran points, each has 249 points. Switching
          applies that specialization's allocation and restores its unspent
          points.
        </p>
        <p>{TOTAL_VETERAN_POINTS_NOTE}</p>
        <!-- Source: server-scripts/PlayerSkills.cs:GetTotalVeteranPoints,ResetVeteranSkillPoints — ranks that cost 2 points count and refund only 1 point. -->
        <p>
          <a
            href="/mechanics/experience#veteran-points"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Veteran Point counting and reset losses</a
          > explains how the game miscounts ranks that cost 2 Veteran Points.
        </p>
        <!-- Source: server-scripts/Player.cs:InitializeAttributeSpecs; Player.cs:15297-15300 — an allocation that cannot be inferred is preserved until switching, when ResetAssignedAttributes runs for free. -->
        <p>
          If the game cannot determine a saved character's attribute allocation,
          the first specialization switch resets assigned attributes for free.
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
        <!-- Source: server-scripts/Npc.cs:OnInteract; server-scripts/Player.cs:UserCode_CmdResetAttributes — attribute and class-skill resets use the same price; active debuffs prevent an attribute reset. -->
        <p>
          {#if data.skillMaster}
            <a
              href="/npcs/{data.skillMaster.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{data.skillMaster.name}</a
            >
          {:else}The Skill Master{/if}
          resets your class skills.
          {#if data.attributeMaster}
            <a
              href="/npcs/{data.attributeMaster.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{data.attributeMaster.name}</a
            >
          {:else}The Attribute Master{/if}
          resets your assigned attribute points for the same price, but not while
          a debuff is on you.
        </p>
        <!-- Source: server-scripts/Player.cs:11091-11097,11123-11157 — class and veteran resets use separate commands and prices, with a Token of Redemption required for veteran reset. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1832-1925 — each reset returns points only for its own skill pool. -->
        <p>
          <span class="block"
            >Resetting class skills refunds class skill points but leaves
            veteran skills unchanged. It also removes your pet and stops Bard
            songs.</span
          >
          <span class="block">
            {#if data.veteranMaster}
              <a
                href="/npcs/{data.veteranMaster.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >{data.veteranMaster.name}</a
              >, the Veteran Master,
            {:else}The Veteran Master{/if}
            resets veteran skills for 10,000 gold and one
            {#if data.redemptionToken}
              <ItemLink
                itemId={data.redemptionToken.id}
                itemName={data.redemptionToken.name}
                colorClass={getQualityTextColorClass(
                  data.redemptionToken.quality,
                )}
                tooltipHtml={data.redemptionToken.tooltip_html}
                imageAvailable={data.redemptionToken.visual_public_path}
              />
            {:else}
              <a
                href="/items/token_of_redemption"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Token of Redemption</a
              >
            {/if}.
          </span>
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="macros" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Skillbar Macros</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6 text-sm text-muted-foreground">
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Create and save</h3>
        <!-- Source: server-scripts/UISkillbar.cs:Awake,OpenMacroMenu; server-scripts/UISkillbarSlot.cs:OnPointerClick; server-scripts/UISkillbarMacros.cs:Open,OpenEditor,Save,Delete — right-click an empty slot to create a macro or an existing macro to edit or delete it. -->
        <p>
          Right-click an empty skillbar slot and choose Create Macro. Enter a
          name and commands, then Save. Right-click an existing macro to open
          its editor, where you can change it or choose Delete.
        </p>
        <!-- Source: server-scripts/SkillbarMacro.cs:Validate; server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/UISkillbarMacros.cs:Build — names allow 1-24 characters, with up to 5 lines of 240 characters each and at least one nonblank command. -->
        <p>
          Use a name of 1 to 24 characters and up to 5 command lines, each up to
          240 characters. Blank lines are ignored. At least one command is
          required.
        </p>
        <!-- Source: server-scripts/UISkillbar.cs:HandleSlotClick,ApplySkillbarSlotDragState; server-scripts/GameManager.cs:SkillbarKeyPressed,ExtraSkillbarKeyPressed; server-scripts/PlayerSkillbar.cs:SaveMacro,Load,OnDragAndDrop_SkillbarSlot_SkillbarSlot — clicks and slot shortcuts run macros, unlocked slots allow moving them, and local skillbar preferences separate characters and specializations. -->
        <p>
          Click the macro or use its slot's shortcut to run it. Unlock the
          skillbar to drag it between slots. Macros are saved locally with your
          skillbar, separately for each character and specialization.
        </p>
        <!-- Source: server-scripts/UISkillbarMacros.cs:RefreshCompletions,Tick,AcceptCompletion; server-scripts/SkillbarMacroCompletion.cs:GetSuggestions — the editor suggests commands, learned active skills and carried usable items, and Tab accepts the first suggestion. -->
        <p>
          The editor suggests commands, learned active skills, and carried
          usable items as you type. Click a suggestion to select it, or press
          Tab to accept the first one.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Commands</h3>
        <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse,Split; server-scripts/UISkillbar.cs:FindMacroSkill,FindMacroItem,MacroNameArgument — commands and full English or current-language names are case-insensitive, and skill or item names may have enclosing double quotes. -->
        <p>
          Use the full English skill or item name, or its name in your current
          game language. Commands and names ignore letter case, and double
          quotes around a skill or item name are optional.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm">
            <thead>
              <tr class="border-b">
                <th class="p-2 font-medium text-foreground">Command</th>
                <th class="p-2 font-medium text-foreground">Action</th>
              </tr>
            </thead>
            <tbody class="[&>tr:nth-child(even)]:bg-muted/30">
              <!-- Source: server-scripts/UISkillbar.cs:ExecuteMacroCommand,UseEntry — cast requires a learned non-passive skill and uses the normal skillbar action. -->
              <tr class="border-b">
                <td class="p-2"><code>/cast skill name</code></td>
                <td class="p-2">Use a learned active skill.</td>
              </tr>
              <!-- Source: server-scripts/UISkillbar.cs:ExecuteMacroCommand,FindMacroItem; server-scripts/PlayerInventory.cs:EnumeratePreferredSlotsOrdered — item lookup searches inventory slots, including backpack storage, and requires a usable item. -->
              <tr class="border-b">
                <td class="p-2"><code>/useitem item name</code></td>
                <td class="p-2">Use an item in your inventory or backpacks.</td>
              </tr>
              <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/UISkillbar.cs:ExecuteMacroCommand — say and s send local chat. -->
              <tr class="border-b">
                <td class="p-2"
                  ><code>/say message</code> or <code>/s message</code></td
                >
                <td class="p-2">Speak nearby.</td>
              </tr>
              <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/UISkillbar.cs:ExecuteMacroCommand — party and p submit party chat. -->
              <tr class="border-b">
                <td class="p-2"
                  ><code>/party message</code> or <code>/p message</code></td
                >
                <td class="p-2">Send a party message.</td>
              </tr>
              <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/UISkillbar.cs:ExecuteMacroCommand — guild and g submit guild chat. -->
              <tr class="border-b">
                <td class="p-2"
                  ><code>/guild message</code> or <code>/g message</code></td
                >
                <td class="p-2">Send a guild message.</td>
              </tr>
              <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/UISkillbar.cs:ExecuteMacroCommand — whisper and w submit the recipient and message to whisper chat. -->
              <tr class="border-b">
                <td class="p-2"
                  ><code>/whisper player message</code> or
                  <code>/w player message</code></td
                >
                <td class="p-2">Whisper to a player.</td>
              </tr>
              <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/Player.cs:TryFollowSelectedPlayer — follow takes no argument and requires another living player in the same zone. -->
              <tr class="border-b">
                <td class="p-2"><code>/follow</code></td>
                <td class="p-2"
                  >Follow your selected living player in the same zone, other
                  than yourself. Takes no arguments.</td
                >
              </tr>
              <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse — pause accepts integer tenths from 1 through 600. -->
              <tr>
                <td class="p-2"><code>/pause number</code></td>
                <td class="p-2"
                  >Wait 0.1 to 60 seconds. Use a whole number from 1 to 600, in
                  tenths of a second.</td
                >
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/UISkillbar.cs:ExecuteMacroCommand — chat replaces lowercase %t with the current target's entity name, or an empty string without a target. -->
        <p>
          In chat commands, <code>%t</code> becomes your current target's name
          when that line runs. It becomes empty text if you have no target. For
          example: <code>/p Attacking %t</code>.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Timing and limits</h3>
        <!-- Source: server-scripts/SkillbarMacroCommand.cs:TryParse; server-scripts/SkillbarMacroSequence.cs:Tick — a pause-prefixed combined line executes one command before its delay. -->
        <p>
          <code>/pause 10</code> waits 1 second. To combine a command and a
          pause on one line, use <code>/pause 50, /cast Grand Symphony</code>.
          This attempts Grand Symphony first, then waits 5 seconds before the
          next line. Only one command can follow the comma.
        </p>
        <!-- Source: server-scripts/SkillbarMacroSequence.cs:Start,Tick; server-scripts/UISkillbar.cs:ExecuteMacroCommand,UseEntry; server-scripts/PlayerSkills.cs:TryUse — commands run once in order without cast-aware waits or macro retries, while ordinary skill use retains its queue, movement, and requirement checks. -->
        <p>
          Commands run once, from top to bottom. The macro does not loop, wait
          for casts or cooldowns, or retry failed actions. Add pauses for your
          cast times. Normal target, range, resource, equipment, and cooldown
          rules still apply. Normal skill use can still queue a skill behind a
          current cast or move you into range.
        </p>
        <!-- Source: server-scripts/UISkillbar.cs:ExecuteMacroCommand; server-scripts/SkillbarMacroSequence.cs:Tick — unknown, unlearned or passive skills and missing usable items stop the sequence, but cooldown warnings and unsuccessful ordinary actions do not. -->
        <p>
          An unknown, unlearned, or passive skill, or a missing usable item,
          stops the remaining commands. A cooldown warning does not stop the
          sequence. Failed target, range, or resource checks and an invalid
          follow target do not stop the remaining commands either.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Stopping a macro</h3>
        <!-- Source: server-scripts/GameManager.cs:OnCancelActionKeyPressed; server-scripts/UISkillbar.cs:TryRunMacro; server-scripts/SkillbarMacroSequence.cs:Start,Stop — Cancel stops the sequence, the same macro toggles it off, and a different macro replaces it. -->
        <p>
          Use your Cancel action to stop the remaining commands. Activating the
          same macro again stops it. Starting a different macro replaces the
          current sequence.
        </p>
        <!-- Source: server-scripts/UISkillbar.cs:TickMacro; server-scripts/UISkillbarMacros.cs:Open; server-scripts/GameManager.cs:IsGameplayUIInputBlocked — sequences stop on death, inactive or changed characters, specialization or zone changes, stun, fear, barber use, blocking UI, confirmation or popup dialogs, and position jumps over 8 units between updates. -->
        <p>
          The sequence also stops on death, stun, fear, a character,
          specialization, or zone change, or a position jump of more than 8 yd
          between updates. Opening the macro editor, using the barber, opening
          the Adventurer's Guide, rebinding controls, or a confirmation or popup
          dialog also stops it.
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
