<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
</script>

<Seo
  title="World and Travel - Ancient Kingdoms"
  description="Game modes, exploration rewards, seasonal events, personal map notes, binding, travel, and portal requirements in Ancient Kingdoms."
  path="/mechanics/world"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "World and Travel" },
    ]}
  />

  <h1 class="text-4xl font-bold">World and Travel</h1>
  <PageSections sections={MECHANICS_SECTIONS["/mechanics/world"]} />

  <Card.Root id="game-modes" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Game Modes and Hardcore</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UICharacterSelection.cs:160-211,284-331 — modes 0, 1, and 2 select a local world, an online server list, or LAN hosting and IP joining. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="py-2 pr-6 text-left font-medium">Mode</th>
              <th scope="col" class="py-2 text-left font-medium">Connection</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/60">
              <th scope="row" class="py-2 pr-6 text-left font-medium"
                >Single Player</th
              >
              <td class="py-2"
                >Starts a local world that does not listen for other players.</td
              >
            </tr>
            <tr class="border-b border-border/60">
              <th scope="row" class="py-2 pr-6 text-left font-medium"
                >Multiplayer Online</th
              >
              <td class="py-2"
                >Opens the online server list after character selection.</td
              >
            </tr>
            <tr>
              <th scope="row" class="py-2 pr-6 text-left font-medium"
                >Multiplayer LAN</th
              >
              <td class="py-2"
                >Hosts a local-network game or joins one by host IP address.</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/UICharacterEditor.cs:542-544 and server-scripts/Database.cs:CanCreateHardcoreCharacter — Hardcore starts unchecked and unlocks when a saved character is level 50 or Hardcore. -->
      <p>
        <span class="block"
          >Hardcore becomes selectable once a saved character reaches level 50
          or another Hardcore character exists.</span
        >
        <span class="block"
          >Hardcore starts unchecked for each new character.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:4139-4146,9929-9932 — Hardcore death deletes the character instead of saving it for ordinary respawn. -->
      <p>
        <span class="block"
          >Hardcore death deletes that character instead of allowing a normal
          respawn.</span
        >
        <span class="block"
          >See <MechanicsLink section="death#death"
            >Death and Remains</MechanicsLink
          > for the normal death rules.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="exploration" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Exploration and Maps</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/ZoneTrigger.cs:120-123,139-185 — a named area is recorded on first entry; discovery awards 10 city, 25 other, or 150 dungeon XP and increases Exploring. -->
      <p>
        <span class="block"
          >Discovering a named area gives experience once per character and
          advances
          <a
            href="/professions/exploring"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Exploring</a
          >.</span
        >
        <span class="block"
          >A city gives 10 XP, another area gives 25 XP, and a dungeon gives 150
          XP.</span
        >
        <span class="block"
          >See <MechanicsLink section="experience#zone-discovery-xp"
            >zone discovery XP</MechanicsLink
          > for the reward breakdown.</span
        >
      </p>
      <!-- Source: server-scripts/UIMap.cs:268-334 — the game switches between its local and world maps. -->
      <p>
        <span class="block">The in-game map has local and world views.</span>
        <span class="block"
          >The <a
            href="/map"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >compendium map</a
          > shows mapped places and entrances.</span
        >
      </p>
      <!-- Source: server-scripts/Monster.cs:1195-1201,2225-2228 — some monsters only spawn within their configured in-game hour window. -->
      <p>
        <span class="block"
          >Some monsters appear only during specific in-game hours.</span
        >
        <span class="block"
          >See <MechanicsLink section="monster-spawns#spawn-windows"
            >spawn windows</MechanicsLink
          > for their timing rules.</span
        >
      </p>
      <!-- Source: server-scripts/UIMap.cs:140-163,337-352 — Temple of Valaark replaces the standard map with a special image and hides the player marker. -->
      <p>
        <span class="block"
          ><a
            href="/zones/temple_of_valaark"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Temple of Valaark</a
          > shows a special map instead of the normal map panel.</span
        >
        <span class="block"
          >The Temple of Valaark map also hides your marker.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="map-notes" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Personal Map Notes</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UIMapNotesController.cs:47-51,427-437,464-469,522-552 — note text is limited to 80 characters, empty notes cannot be saved, and a zone accepts at most 50 notes. -->
      <p>
        <span class="block">Each map note holds up to 80 characters.</span>
        <span class="block">Each zone holds up to 50 notes.</span>
      </p>
      <!-- Source: server-scripts/UIMapNotesController.cs:200-250,253-268 — notes persist in a single local PlayerPrefs key and render on the local map for their zone. -->
      <p>
        <span class="block"
          >All characters on this installation share their saved map notes.</span
        >
        <span class="block"
          >Your notes appear on that zone's local map, not the world map.</span
        >
      </p>
      <!-- Source: server-scripts/UIMapNotesController.cs:121-140 and server-scripts/UIMap.cs:148-163 — notes are disabled in Temple of Valaark, which replaces the normal map panel. -->
      <p>Temple of Valaark has no map notes.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="binding-and-travel" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Binding and Travel</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:InteractNpc; Player.cs:UserCode_CmdBindPlayer; TargetBuffSkill.cs:Apply; ScrollItem.cs:UseAfterCast; website/data/compendium.db:skills.bind_affinity — confirming a binder or bind spell saves the player's current zone and position; Bind Affinity belongs to Ranger, Cleric, Wizard, Druid and Necromancer. -->
      <p>
        <span class="block"
          >Confirming a binding saves your current position and zone as your new
          bind point.</span
        >
        <span class="block"
          >A <a
            href="/npcs?npcs.role_keys=is_soul_binder"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >soul binder</a
          >, the
          <a
            href="/skills/bind_affinity"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Bind Affinity</a
          >
          spell, or a
          <a
            href="/items/scroll_of_binding"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Scroll of Binding</a
          >
          asks you to confirm a binding. Bind Affinity is available to Rangers, Clerics,
          Wizards, Druids, and Necromancers.</span
        >
      </p>
      <!-- Source: server-scripts/TravelItem.cs:22-41 — a Bind Point travel item reads the saved bind point and teleports without changing it. The exported gate_scroll item is a TravelItem. -->
      <p>
        <a
          href="/items/gate_scroll"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Gate Scroll</a
        > returns to your saved bind point without changing it.
      </p>
      <!-- Source: server-scripts/UsableItem.cs:30-39 — CanUse refuses an item below its minLevel. -->
      <!-- Source: exported-data/items.json — scroll_of_binding has level_required 30. -->
      <!-- Source: server-scripts/ScrollItem.cs:CheckCastTarget — a bind scroll is refused in a dungeon. -->
      <!-- Source: server-scripts/PlayerSkills.cs:809-813 — a bind spell is refused in a dungeon. -->
      <p>
        <span class="block"
          ><a
            href="/items/scroll_of_binding"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Scroll of Binding</a
          > requires level 30.</span
        >
        <span class="block"
          >The Scroll of Binding and bind spells such as Bind Affinity cannot be
          used in dungeons.</span
        >
      </p>
      <!-- Source: server-scripts/TravelItem.cs:15-42 — blocked use in zone 23 returns before consuming a charge; successful use decrements one charge unless the item has infinite charges. -->
      <p>
        <span class="block"
          >Destination travel items teleport you to their assigned destination
          and consume one charge on successful use.</span
        >
        <span class="block"
          ><a
            href="/zones/temple_of_valaark"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Temple of Valaark</a
          > blocks travel items before they consume a charge. Gate Scroll works in
          other dungeons.</span
        >
      </p>
      <!-- Source: server-scripts/NpcTeleport.cs:21-40 and server-scripts/Player.cs:14277-14289 — a travel NPC confirms an offer with any gold price; paid travel checks available gold before charging. -->
      <p>
        <span class="block"
          >A <a
            href="/npcs?npcs.role_keys=is_teleporter"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >travel NPC</a
          > shows its offer and any gold cost before travel.</span
        >
        <span class="block">Paid travel requires enough gold.</span>
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="portals" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Portals and Entry Requirements</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Portal.cs:25-32 and server-scripts/InteractablePortal.cs:80-91 — ordinary portals respond to entering their trigger; interactable portals respond to interaction. -->
      <p>
        <span class="block">Some portals activate when you walk into them.</span
        >
        <span class="block"
          >Other portals require you to interact with them.</span
        >
        <span class="block"
          >Explore their destinations on the <a
            href="/map"
            class="text-blue-600 hover:underline dark:text-blue-400">map</a
          >.</span
        >
      </p>
      <!-- Source: server-scripts/Portal.cs:33-75 and server-scripts/InteractablePortal.cs:92-126 — closed, living-monster, key, personal level, and personal total item level checks can block passage. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="py-2 pr-6 text-left font-medium"
                >Barrier</th
              >
              <th scope="col" class="py-2 text-left font-medium"
                >Passage rule</th
              >
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/60">
              <th scope="row" class="py-2 pr-6 text-left font-medium">Closed</th
              >
              <td class="py-2">No passage while the entrance is closed.</td>
            </tr>
            <tr class="border-b border-border/60">
              <th scope="row" class="py-2 pr-6 text-left font-medium"
                >Living monster</th
              >
              <td class="py-2">Blocked while a specific monster is alive.</td>
            </tr>
            <tr class="border-b border-border/60">
              <th scope="row" class="py-2 pr-6 text-left font-medium">Key</th>
              <td class="py-2"
                >Walk-in portals accept a key from any online party member
                unless each player needs their own key. Portals you click accept
                a key from any online party member.</td
              >
            </tr>
            <!-- Source: server-scripts/Portal.cs:OnTriggerEnter2D; InteractablePortal.cs:OnClick; UIEquipment.cs:Update — entry checks each player's own level and total item level, reports missing thresholds, and the equipment window displays the total. -->
            <tr>
              <th scope="row" class="py-2 pr-6 text-left font-medium"
                >Level and total item level</th
              >
              <td class="py-2"
                >Each player needs the required character level and total item
                level. A refusal message states the requirement. The equipment
                window shows your total item level.</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Player.cs:11302-11316,3615-3617, server-scripts/Skills.cs:1408-1428, and server-scripts/MountItem.cs:19-30 — portal travel strips invisibility buffs (including the exported invisible Resurrection Effects), dismounts players entering dungeons, and dungeons reject mounting. -->
      <p>
        <span class="block"
          >A successful portal transition removes invisibility, including
          resurrection protection.</span
        >
        <span class="block"
          >Entering a dungeon dismounts you, and you cannot mount inside.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
  <Card.Root id="seasonal-events" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Seasonal Events</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm text-muted-foreground">
      <!-- Source: server-scripts/EnviromentSystem.cs:142-147,158-185; server-scripts/Monster.cs:2214-2224 — Halloween uses UTC dates, checked hourly, and gates Halloween monsters. -->
      <p>
        <span class="font-medium text-foreground"
          >Halloween: October 19 through November 1, inclusive (UTC).</span
        >
        Halloween monsters can appear only while the event is active. See <MechanicsLink
          section="monster-spawns#other-spawns"
          >seasonal monster spawns</MechanicsLink
        >.
      </p>
      <!-- Source: server-scripts/EnviromentSystem.cs:142-147,158-185; server-scripts/Npc.cs:331-345,790-797,1431-1437 — the Winter Festival uses UTC dates, checked hourly, and gates Winter Festival NPCs. -->
      <p>
        <span class="font-medium text-foreground"
          >Winter Festival: December 19 through January 6, inclusive (UTC).</span
        > Winter Festival NPCs are unavailable outside the event.
      </p>
    </Card.Content>
  </Card.Root>
</div>
