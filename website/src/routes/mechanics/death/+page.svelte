<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import { deathRecovery } from "$lib/calculation/death";

  const SECTIONS = [{ id: "death", label: "Death and Remains" }];
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
  <PageSections sections={SECTIONS} />

  <Card.Root id="death" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Death and Remains</Card.Title>
      <Card.Description
        >Death costs XP and durability. Remains or Resurrection can restore some
        lost XP.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6 text-sm text-muted-foreground">
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">On death</h3>
        <!-- Source: server-scripts/Player.cs:4059-4091 — loss is limited to current XP and every equipped item loses one durability. -->
        <p>
          <span class="block"
            >Death removes XP from your current level's progress.</span
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
        <!-- Source: server-scripts/Player.cs:4081-4088 — death removes an active pet. -->
        <!-- Source: server-scripts/Skills.cs:OnDeath — Bard songs stop and buffs without remainAfterDeath are removed. -->
        <p>
          <span class="block"
            >Your summoned pet disappears and your Bard songs stop.</span
          >
          <span class="block"
            >Buffs, including Reaper Form, end unless their effects survive
            death.</span
          >
          <span class="block"
            ><MechanicsLink section="inventory#durability-and-repair"
              >Equipment durability and repair</MechanicsLink
            > covers repairs.</span
          >
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">Respawn and Remains</h3>
        <!-- Source: server-scripts/Player.cs:3544-3571 — respawn creates remains at the death site, moves the player to the bind point, and revives at half health. -->
        <!-- Source: server-scripts/Entity.cs:346-357 — Revive rounds the specified fraction of maximum health. -->
        <p>
          Respawning leaves your remains where you died and returns you to your
          bind point.
        </p>
        <!-- Source: server-scripts/PlayerDead.cs:8-8,82-95,132-137 — remains expire 900 seconds after creation or after use. -->
        <!-- Source: server-scripts/Player.cs:4054-4057 — a new death destroys the prior remains. -->
        <p>
          <span class="block"
            >Your remains last 15 minutes or until your next death, whichever
            comes first.</span
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
                <th class="p-2 font-medium text-foreground"
                  >Where and with what resources</th
                >
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/PlayerDead.cs:103-119 — only the owner can collect unused remains. -->
              <!-- Source: server-scripts/Player.cs:14345-14354 — collecting remains returns half the stored XP loss and destroys the remains. -->
              <tr class="border-b">
                <th class="p-2 font-medium text-foreground"
                  >Collect your remains</th
                >
                <td class="p-2">50%, rounded</td>
                <td class="p-2">
                  <span class="block"
                    >Collect your remains after respawning at your bind point.</span
                  >
                  <span class="block">No extra health or mana is restored.</span
                  >
                </td>
              </tr>
              <!-- Source: server-scripts/TargetHealSkill.cs:239-253 — Resurrection targets unused player remains after their owner respawns and passes the remains' coordinates to the player. -->
              <!-- Source: server-scripts/Player.cs:13139-13149,13163-13193 — accepting resurrection moves the player to the remains, restores 60% max health and mana equal to 20% max health, and returns 75% of lost XP. -->
              <!-- Source: server-scripts/EnergyResource.cs:21-35 — mana is capped by its own maximum when restored. -->
              <tr>
                <th class="p-2 font-medium text-foreground"
                  >Accept Resurrection</th
                >
                <td class="p-2">75%, rounded</td>
                <td class="p-2">
                  <span class="block"
                    >Resurrection returns you to your remains after you respawn.</span
                  >
                  <span class="block">It restores Health and Mana.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Calculation calculation={deathRecovery()} />
        <!-- Source: server-scripts/Player.cs:13182-13183; server-scripts/EnergyResource.cs:21-35 — restored Mana uses maximum Health, capped by maximum Mana. -->
        <!-- Observed: docs/game-bugs/resurrection-restores-mana-from-maximum-health.md — both live resurrection trials restore Mana from maximum Health. -->
        <p>
          Resurrection restores Mana from maximum Health, a game defect, capped
          at maximum Mana.
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
        <!-- Source: server-scripts/Player.cs:13163-13193 — resurrection restores resources and XP without changing equipment durability. -->
        <p>Equipment keeps its current durability after Resurrection.</p>
      </div>

      <!-- Source: server-scripts/Player.cs:4094-4101,9781-9784 — Hardcore death deletes the character instead of saving the normal death state. -->
      <p
        class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-foreground"
      >
        <span class="block"
          ><strong>Hardcore:</strong> Death permanently deletes your character.</span
        >
        <span class="block"
          >A Hardcore character cannot respawn or recover through remains or
          Resurrection.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
