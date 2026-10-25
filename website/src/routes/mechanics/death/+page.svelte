<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import { deathRecovery } from "$lib/calculation/death";
</script>

<Seo
  title="Death and Remains - Ancient Kingdoms"
  description="Death penalties, respawning, remains, resurrection, and permanent Hardcore death."
  path="/mechanics/death"
/>

<div class="container mx-auto max-w-4xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Death and Remains" },
    ]}
  />
  <h1 class="text-4xl font-bold">Death and Remains</h1>

  <Card.Root id="death" class="bg-muted/30">
    <Card.Header>
      <!-- Source: server-scripts/Player.cs:OnDeath,UserCode_CmdGetExpFromRemains,UserCode_CmdResurrect__Int32__Single__Single__NetworkIdentity; server-scripts/PlayerDead.cs:Start — death costs XP and durability, remains and Resurrection return XP, and remains use the player's name followed by "'s corpse". -->
      <Card.Description
        >Death costs XP and durability. Remains or Resurrection can restore some
        lost XP. Your remains appear in the game as your character's name
        followed by "'s corpse".</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6 text-sm text-muted-foreground">
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">On death</h3>
        <!-- Source: server-scripts/Experience.cs:Death; server-scripts/Player.cs:4148-4180 — death removes 10% of the bar requirement, rounded and limited to current XP, and one durability from every equipped item. -->
        <p>
          <span class="block"
            >You lose 10% of the XP needed to fill your current experience bar,
            rounded to whole XP. You cannot lose more XP than you have.</span
          >
          <span class="block"
            >Each equipped item loses one durability point.</span
          >
          <span class="block"
            ><MechanicsLink section="experience#death-xp"
              >See death XP</MechanicsLink
            > for the loss calculation.</span
          >
        </p>
        <!-- Source: server-scripts/Player.cs:4170-4177 — death removes an active pet. -->
        <!-- Source: server-scripts/Player.cs:OnDeath — death dismounts the player. -->
        <!-- Source: server-scripts/Skills.cs:OnDeath; website/data/compendium.db:skills.reaper_form.remain_after_death — Bard songs stop; buffs marked to survive death stay, but Reaper Form is removed. -->
        <p>
          <span class="block"
            >Your summoned pet disappears and your Bard songs stop.</span
          >
          <span class="block">You dismount.</span>
          <span class="block"
            >Most buffs end, including <a
              href="/skills/reaper_form"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Reaper Form</a
            >.</span
          >
          <span class="block"
            >See <MechanicsLink section="inventory#durability-and-repair"
              >Equipment durability and repair</MechanicsLink
            >.</span
          >
        </p>
        <!-- Source: server-scripts/Player.cs:DestroyLivingMercenariesOnOwnerDeath,ProcessMercenariesOnPlayerRespawn — living mercenaries leave; respawn may also return dead summoned mercenaries for a fee. -->
        <p>
          Living mercenaries leave until you respawn or are resurrected.
          Respawning also revives dead summoned mercenaries for a gold fee, but
          only if you can pay for all of them. See <a
            href="/mercenaries#how-it-works"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >mercenary recovery after your death</a
          >.
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Respawn and remains</h3>
        <!-- Source: server-scripts/Player.cs:3606-3633 — respawn creates remains at the death site, moves the player to the bind point, and revives at half health. -->
        <!-- Source: server-scripts/Entity.cs:351-362 — Revive rounds the specified fraction of maximum health. -->
        <p>
          Respawning leaves your remains where you died and returns you to your
          <a
            href="/mechanics/world#binding-and-travel"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >bind point</a
          >. You respawn with 50% of maximum Hit Points, rounded.
        </p>
        <!-- Source: server-scripts/Player.cs:UpdateServer_DEAD; server-scripts/BuffSkill.cs:ignoreSeeInvisibility; website/data/compendium.db skills.resurrection_effects — respawn applies 10 seconds of invisibility that defeats see-invisibility. -->
        <p>
          For 10 seconds after respawning, monsters ignore you (<a
            href="/skills/resurrection_effects"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Resurrection Effects</a
          >).
        </p>
        <!-- Source: server-scripts/PlayerDead.cs:8-8,82-95,132-137 — remains expire 900 seconds after creation or after use. -->
        <!-- Source: server-scripts/Player.cs:4143-4146 — a new death destroys the prior remains. -->
        <p>
          <span class="block"
            >Your remains last 15 minutes after you respawn, or until you die
            again.</span
          >
          <span class="block">You can use the remains only once.</span>
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Recovery</h3>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left text-sm">
            <thead>
              <tr class="border-b">
                <th class="p-2 font-medium text-foreground">Method</th>
                <th class="p-2 font-medium text-foreground">Lost XP returned</th
                >
                <th class="p-2 font-medium text-foreground">How it works</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/PlayerDead.cs:103-119 — only the character who died can collect unused remains. -->
              <!-- Source: server-scripts/Player.cs:14651-14660 — collecting remains returns half the stored XP loss and destroys the remains. -->
              <tr class="border-b">
                <th class="p-2 font-medium text-foreground"
                  >Collect your remains</th
                >
                <td class="p-2">50%, rounded</td>
                <td class="p-2">
                  <span class="block"
                    >After you respawn, return to your remains and collect them.</span
                  >
                  <span class="block">This restores no Hit Points or Mana.</span
                  >
                </td>
              </tr>
              <!-- Source: server-scripts/TargetHealSkill.cs:256-270 — Resurrection targets unused player remains after their owner respawns and passes the remains' coordinates to the player. -->
              <!-- Source: server-scripts/Player.cs:UserCode_CmdResurrect__Int32__Single__Single__NetworkIdentity — accepting moves the player to remains, sets Health to 60% max Health and Mana to 20% max Health, leaves Rage unchanged, and returns 75% lost XP. -->
              <!-- Source: server-scripts/EnergyResource.cs:current — Mana is capped by maximum Mana. -->
              <tr>
                <th class="p-2 font-medium text-foreground"
                  >Accept Resurrection</th
                >
                <td class="p-2">75%, rounded</td>
                <td class="p-2">
                  <span class="block"
                    >Resurrection returns you to your remains after you respawn.</span
                  >
                  <span class="block"
                    >Accepting sets your Hit Points to 60% of maximum Hit Points
                    and your Mana to 20% of maximum Hit Points, capped at
                    maximum Mana.</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Calculation calculation={deathRecovery()} />
        <!-- Source: server-scripts/Player.cs:13481-13482; server-scripts/EnergyResource.cs:21-35 — restored Mana uses maximum Health, capped by maximum Mana. -->
        <!-- Observed: docs/game-bugs/resurrection-restores-mana-from-maximum-health.md — both live resurrection trials restore Mana from maximum Health. -->
        <p>
          Rage is unchanged. The Mana amount uses maximum Hit Points because of
          a game defect.
        </p>
        <!-- Source: server-scripts/TargetHealSkill.cs:CorrectedTarget — Resurrection can target player remains or dead mercenaries. -->
        <p>
          <span class="block"
            ><a
              href="/skills/resurrection"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Resurrection</a
            >
            targets player remains or dead mercenaries.</span
          >
          <span class="block"
            ><a
              href="/mercenaries#resurrection"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >See mercenary resurrection</a
            > for their recovery rules.</span
          >
        </p>
        <!-- Source: server-scripts/TargetHealSkill.cs:Apply; website/data/compendium.db skills.resurrection.player_classes and items.scroll_of_resurrection — Clerics learn Resurrection; the scroll requires level 30. -->
        <p>
          Clerics cast Resurrection. Anyone level 30 or higher can use a
          <a
            href="/items/scroll_of_resurrection"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Scroll of Resurrection</a
          >.
        </p>
        <!-- Source: server-scripts/Player.cs:13462-13492 — resurrection restores resources and XP without changing equipment durability. -->
        <p>Resurrection does not repair your equipment.</p>
      </div>

      <!-- Source: server-scripts/Player.cs:4183-4190,10021-10024 — Hardcore death deletes the character instead of saving the normal death state. -->
      <p
        class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-foreground"
      >
        <span class="block"
          ><strong
            ><a
              href="/mechanics/world#game-modes"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Hardcore</a
            >:</strong
          > Death permanently deletes your character.</span
        >
        <span class="block"
          >A Hardcore character cannot respawn or recover through remains or
          Resurrection.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
