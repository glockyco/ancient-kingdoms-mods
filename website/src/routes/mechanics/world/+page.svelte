<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

  const SECTIONS = [
    { id: "game-modes", label: "Game Modes and Hardcore" },
    { id: "exploration", label: "Exploration and Maps" },
    { id: "map-notes", label: "Personal Map Notes" },
    { id: "binding-and-travel", label: "Binding and Travel" },
    { id: "portals", label: "Portals and Entry Requirements" },
  ];
</script>

<Seo
  title="World and Travel - Ancient Kingdoms"
  description="Game modes, exploration rewards, personal map notes, binding, travel, and portal requirements in Ancient Kingdoms."
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
  <PageSections sections={SECTIONS} />

  <Card.Root id="game-modes" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Game Modes and Hardcore</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UICharacterSelection.cs:152-205,275-322 — modes 0, 1, and 2 select a local world, an online server list, or LAN hosting and IP joining. -->
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
      <!-- Source: server-scripts/UICharacterEditor.cs:480-482 and server-scripts/Database.cs:GetMaxLevelChar — Hardcore starts unchecked and unlocks only when the highest saved character level is 50. -->
      <p>
        <span class="block"
          >Hardcore becomes selectable when a saved character reaches level 50.</span
        >
        <span class="block">It starts unchecked for each new character.</span>
      </p>
      <!-- Source: server-scripts/Player.cs:4042-4049,9392-9395 — Hardcore death deletes the character instead of saving it for ordinary respawn. -->
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
      <!-- Source: server-scripts/ZoneTrigger.cs:87-119,135-181 — a named area is recorded on first entry; discovery awards 10 city, 25 other, or 150 dungeon XP and increases Exploring. -->
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
      <!-- Source: server-scripts/UIMap.cs:258-324 — the game switches between its local and world maps. -->
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
      <!-- Source: server-scripts/Monster.cs:1195-1201,2228-2231 — some monsters only spawn within their configured in-game hour window. -->
      <p>
        <span class="block"
          >In-game time changes when some monsters can appear.</span
        >
        <span class="block"
          >See <MechanicsLink section="monster-spawns#spawn-windows"
            >spawn windows</MechanicsLink
          > for their timing rules.</span
        >
      </p>
      <!-- Source: server-scripts/UIMap.cs:130-153,327-342 — Temple of Valaark replaces the standard map with a special image and hides the player marker. -->
      <p>
        <span class="block"
          >Temple of Valaark shows a special map instead of the normal map
          panel.</span
        >
        <span class="block">It also hides the player marker.</span>
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
          >Notes are saved on this installation and shared by its characters.</span
        >
        <span class="block"
          >They appear on the local map for their zone, not on the world map.</span
        >
      </p>
      <!-- Source: server-scripts/UIMapNotesController.cs:121-140 and server-scripts/UIMap.cs:138-153 — notes are disabled in Temple of Valaark, which replaces the normal map panel. -->
      <p>Temple of Valaark has no map notes.</p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="binding-and-travel" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Binding and Travel</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Npc.cs:1783-1793, server-scripts/Player.cs:9938-9945,9960-9970, and server-scripts/TargetBuffSkill.cs:311-316 — accepting a soul binder or Bind Affinity confirmation records the player's current position and zone. -->
      <p>
        <span class="block"
          >Confirming a binding replaces your bind point with your current
          position and zone.</span
        >
        <span class="block"
          >A soul binder or Bind Affinity can request that confirmation.</span
        >
      </p>
      <!-- Source: server-scripts/TravelItem.cs:22-41 — a Bind Point travel item reads the saved bind point and teleports without changing it. The exported gate_scroll item is a TravelItem. -->
      <p>Gate Scroll returns to your saved bind point without changing it.</p>
      <!-- Source: server-scripts/UsableItem.cs:30-39 — CanUse refuses an item below its minLevel. -->
      <!-- Source: exported-data/items.json — scroll_of_binding has level_required 30. -->
      <!-- Source: server-scripts/ScrollItem.cs:67-79 — a bind scroll is refused in a dungeon. -->
      <!-- Source: server-scripts/PlayerSkills.cs:408-412 — a bind spell is refused in a dungeon. -->
      <p>
        <span class="block">Scroll of Binding requires level 30.</span>
        <span class="block"
          >Binding scrolls and binding spells cannot be used in dungeons.</span
        >
      </p>
      <!-- Source: server-scripts/TravelItem.cs:15-42 — blocked use in zone 23 returns before consuming a charge; successful use decrements one charge unless the item has infinite charges. -->
      <p>
        <span class="block"
          >Destination travel items teleport to their assigned destination and
          use one charge on successful use.</span
        >
        <span class="block"
          >Temple of Valaark blocks travel items before they consume a charge.</span
        >
      </p>
      <!-- Source: server-scripts/NpcTeleport.cs:21-40 and server-scripts/Player.cs:13884-13896 — a travel NPC confirms an offer with any gold price; paid travel checks available gold before charging. -->
      <p>
        <span class="block"
          >A travel NPC shows its offer and any gold cost before travel.</span
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
        <span class="block">Some portals open when you walk into them.</span>
        <span class="block">Other entrances require interaction.</span>
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
              <td class="py-2">The specified monster must die first.</td>
            </tr>
            <tr class="border-b border-border/60">
              <th scope="row" class="py-2 pr-6 text-left font-medium">Key</th>
              <td class="py-2"
                >A required key must be held by you or an eligible party member.</td
              >
            </tr>
            <tr>
              <th scope="row" class="py-2 pr-6 text-left font-medium"
                >Level and total item level</th
              >
              <td class="py-2"
                >Your character must meet each listed threshold.</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/Portal.cs:47-63 — requiresEveryoneKey disallows a party key on walk-in portals; level and total item level are checked per player. server-scripts/InteractablePortal.cs:98-115 and server-scripts/PlayerParty.cs:203-213 — interactable portals accept a key from an online party member and check the interacting player's own thresholds. -->
      <p>
        <span class="block"
          >Some walk-in portals accept a key from an online party member.</span
        >
        <span class="block"
          >When a portal requires everyone's key, each traveler needs their own.</span
        >
        <span class="block"
          >Interactable portals accept a key from an online party member.</span
        >
        <span class="block"
          >Each traveler still needs the required character level and total item
          level.</span
        >
      </p>
      <!-- Source: server-scripts/Player.cs:10928-10979,3532-3534, server-scripts/Skills.cs:1360-1380, and server-scripts/MountItem.cs:19-30 — portal travel strips invisibility buffs (including the exported invisible Resurrection Effects), dismounts players entering dungeons, and dungeons reject mounting. -->
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
</div>
