<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { mysticSparkMana } from "$lib/calculation/character";
  import { TOTAL_VETERAN_POINTS_NOTE } from "$lib/calculation/inputs";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import { getQualityTextColorClass } from "$lib/utils/format";

  let { data } = $props();

  const SECTIONS = [
    { id: "attributes", label: "The Six Attributes" },
    { id: "resources", label: "Health, Mana, Rage, and Songs" },
    {
      id: "skills-and-specializations",
      label: "Skills, Veteran Points, and Specializations",
    },
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
                <!-- Source: server-scripts/BuffSkill.cs:473-515 — non-melee poison and disease without Intelligence scaling use Dexterity times 1.5. -->
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
                <!-- Source: server-scripts/BuffSkill.cs:473-515 — fire, cold, magic and Intelligence-scaled poison/disease use the skill's Intelligence coefficient, except Charisma-scaled effects. -->
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
                <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount; server-scripts/TargetBuffSkill.cs:Apply; server-scripts/NecromancerDeathBloomSkill.cs:Apply — scroll healing and buffs skip attribute bonuses; Death Bloom uses Intelligence. -->
                <span class="block">
                  <a
                    href="/skills/death_bloom"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Death Bloom</a
                  >
                  uses Intelligence. Scrolls, such as the
                  <a
                    href="/items/runed_scroll_of_restoration"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Runed Scroll of Restoration</a
                  >
                  (<a
                    href="/skills/major_restoration"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Major Restoration</a
                  >), gain no attribute bonus to healing or buffs.
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
      <!-- Source: server-scripts/PlayerSkills.cs:1782-1804 — passive skills apply attribute bonuses. -->
      <!-- Source: server-scripts/Skills.cs:1484-1516 — active buffs can change attribute values. -->
      <p>
        Equipment, augments, passive skills, and buffs can also change your
        attributes.
        <!-- Source: server-scripts/Player.cs:12298-12333 — reading attribute books permanently raises their listed attributes. -->
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
            <!-- Source: server-scripts/Player.cs:1460-1471 — Cleric, Druid, Ranger, Wizard and Necromancer use Mana. -->
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
            <!-- Source: server-scripts/Combat.cs:996-1007,1171-1188,1375-1399 — damaging auto attacks and received single-target physical skill hits generate rage, with no melee-range check. -->
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
      <!-- Source: server-scripts/Combat.cs:1225-1233 — Wizard Mystic Spark restores floor(35% times min(hit damage, target health before hit)) as mana. -->
      <!-- Source: server-scripts/Combat.cs:1284-1314 — Mana Shield spends one mana per point of damage absorbed. -->
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
        <!-- Source: server-scripts/Player.cs:InitializeAttributeSpecs; Player.cs:15118-15121 — an allocation that cannot be inferred is preserved until switching, when ResetAssignedAttributes runs for free. -->
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
        <!-- Source: server-scripts/Player.cs:10932-10938,10964-10998 — class and veteran resets use separate commands and prices, with a Token of Redemption required for veteran reset. -->
        <!-- Source: server-scripts/PlayerSkills.cs:1775-1868 — each reset returns points only for its own skill pool. -->
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
</div>
