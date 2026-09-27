<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

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
      <Card.Description>What you lose and how you can recover.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6 text-sm text-muted-foreground">
      <div class="space-y-2">
        <h3 class="font-semibold text-foreground">On death</h3>
        <!-- Source: server-scripts/Player.cs:4007-4039 — loss is limited to current XP and every equipped item loses one durability. -->
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
        <!-- Source: server-scripts/Player.cs:4029-4036 — death removes an active pet. -->
        <!-- Source: server-scripts/Skills.cs:1424-1442 — Bard songs stop and buffs without remainAfterDeath are removed. -->
        <p>
          <span class="block"
            >Your summoned pet disappears and your Bard songs stop.</span
          >
          <span class="block">Buffs end unless they persist through death.</span
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
        <!-- Source: server-scripts/Player.cs:3506-3533 — respawn creates remains at the death site, moves the player to the bind point, and revives at half health. -->
        <!-- Source: server-scripts/Entity.cs:329-340 — Revive rounds the specified fraction of maximum health. -->
        <p>
          Respawning leaves your remains where you died and returns you to your
          bind point at 50% health.
        </p>
        <!-- Source: server-scripts/PlayerDead.cs:8-8,82-95,132-137 — remains expire 900 seconds after creation or after use. -->
        <!-- Source: server-scripts/Player.cs:4002-4005 — a new death destroys the prior remains. -->
        <p>
          <span class="block"
            >Remains last 15 minutes, but a later death removes the previous
            remains.</span
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
              <!-- Source: server-scripts/Player.cs:14131-14140 — collecting remains returns half the stored XP loss and destroys the remains. -->
              <tr class="border-b">
                <th class="p-2 font-medium text-foreground"
                  >Collect your remains</th
                >
                <td class="p-2 font-mono">50%</td>
                <td class="p-2">
                  <span class="block"
                    >Return to the death location after respawning.</span
                  >
                  <span class="block">No extra health or mana is restored.</span
                  >
                </td>
              </tr>
              <!-- Source: server-scripts/TargetHealSkill.cs:231-245 — Resurrection targets unused player remains after their owner respawns and passes the remains' coordinates to the player. -->
              <!-- Source: server-scripts/Player.cs:12961-12971,12985-13015 — accepting resurrection moves the player to the remains, restores 60% max health and mana equal to 20% max health, and returns 75% of lost XP. -->
              <!-- Source: server-scripts/EnergyResource.cs:21-35 — mana is capped by its own maximum when restored. -->
              <tr>
                <th class="p-2 font-medium text-foreground"
                  >Accept Resurrection</th
                >
                <td class="p-2 font-mono">75%</td>
                <td class="p-2">
                  <span class="block"
                    >After respawning, return to your remains at 60% health.</span
                  >
                  <span class="block"
                    >Restore mana equal to 20% of maximum health, capped at
                    maximum mana.</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/TargetHealSkill.cs:17-35,232-253 — Resurrection can target player remains or dead mercenaries. -->
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
        <!-- Source: server-scripts/Player.cs:12985-13015 — resurrection restores resources and XP without changing equipment durability. -->
        <p>Resurrection does not repair equipment.</p>
      </div>

      <!-- Source: server-scripts/Player.cs:4042-4049,9392-9395 — Hardcore death deletes the character instead of saving the normal death state. -->
      <p
        class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-foreground"
      >
        <span class="block"
          ><strong>Hardcore:</strong> Death permanently deletes your character.</span
        >
        <span class="block"
          >Respawning, remains, and resurrection cannot undo it.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
