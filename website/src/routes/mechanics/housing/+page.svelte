<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
</script>

<Seo
  title="Housing and Appearance - Ancient Kingdoms"
  description="How to travel home, place home furniture, visit a barber, and use the costume wardrobe."
  path="/mechanics/housing"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Housing and Appearance" },
    ]}
  />

  <h1 class="text-4xl font-bold">Housing and Appearance</h1>
  <PageSections sections={MECHANICS_SECTIONS["/mechanics/housing"]} />
  <Card.Root id="return-home" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Return Home</Card.Title>
      <Card.Description
        >The house button in your inventory takes you to your house.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/UIInventoryTravelSlots.cs:OpenHomes; server-scripts/Player.cs:UserCode_CmdStartHomeTravel__String,UserCode_CmdTravelHome__String,GetHomeTravelFailure — the house button casts Teleport, then moves you to the house's return point, and refuses in combat. -->
      <p>
        Click the house at the top right of your equipment in the inventory
        window. After a 1.5-second cast, you arrive at your house. The cast
        dismounts you, and you can't start it in combat.
      </p>
      <!-- Source: server-scripts/UIInventoryTravelSlots.cs:Update — the house button is interactable, and drawn at full strength, only while the account owns a house. -->
      <p>
        The button stays dimmed until your account owns a house. See <a
          href="/mechanics/inventory#house-chests"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >house chests and shared storage</a
        > for buying one.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="furniture" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Furniture and Home Workstations</Card.Title>
      <Card.Description
        >Buy furniture for your account's house. Moving it costs no gold.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/CustomStrucUI.cs:85-96,213-257 and server-scripts/StrucItemUi.cs:27-45 — the house catalog lists furniture and prices and opens only in a zone belonging to the player's account. -->
      <p>
        The house panel lists furniture and its gold price while you are at a
        house owned by your account.
      </p>
      <p>
        See
        <a
          href="/mechanics/inventory#house-chests"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >house chests and shared storage</a
        > for buying a house and placing chests.
      </p>
      <!-- Source: server-scripts/CustomStrucUI.cs:267-361 and server-scripts/Player.cs:UserCode_CmdSpawnStruc__Int32__String__Vector3__Quaternion — placement requires a footprint inside the owned buildable zone without a structure overlap; gold is deducted when the structure is created. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          A new piece must fit inside your house's buildable area without
          overlapping another structure.
        </li>
        <li>
          You pay the price shown in the house panel when you place the piece.
        </li>
      </ul>
      <!-- Source: server-scripts/CustomStrucUI.cs:158-171,323-329,364-418 and server-scripts/Player.cs:UserCode_CmdMoveStruc__UInt32__String__Vector3__Quaternion,UserCode_CmdRemoveStruc__UInt32 — movement repositions an owned structure without charging gold; confirmed removal deletes it without a refund. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Use Move mode to rearrange your furniture for free.</li>
        <li>
          Remove mode destroys the selected furniture after you confirm. You get
          no refund.
        </li>
      </ul>
      <!-- Source: server-scripts/HousingManager.cs:18-19 and server-scripts/CustomStrucUI.cs:85-96 and server-scripts/CraftingStation.cs:9,19,52-65 and server-scripts/Player.cs:15490-15507,15796-15842 — placed workstation structures retain their station ingredients and learned-recipe checks. -->
      <!-- Source: server-scripts/HousingManager.cs:strucItems — the 0.9.35.5 house catalog, read in the running game, offers a Craft Station, Cooking Oven, Alchemy Workbench and Scribing Table. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          Home workstations include a <a
            href="/items/craft_station"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Craft Station</a
          >,
          <a
            href="/items/cooking_oven"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Cooking Oven</a
          >,
          <a
            href="/items/alchemy_workbench"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Alchemy Workbench</a
          >, and
          <a
            href="/items/scribing_table"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Scribing Table</a
          >.
        </li>
        <li>
          Home workstations use the same ingredients and recipes as stations
          elsewhere.
        </li>
        <li>An Alchemy Workbench requires learned potion recipes.</li>
      </ul>
      <!-- Source: server-scripts/Bookcase.cs:IsInRange,OnInteractServer; UIBooks.cs:ShowLibrary — a placed bookcase opens within 2 yd for the owning account and lists the character's learned books by name, without the learn button. -->
      <!-- Source: server-scripts/HousingManager.cs:strucItems — in the running 0.9.35.5 game, the Bookshelf is the only catalog structure whose prefab carries a Bookcase component. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          A placed <a
            href="/items/bookshelf"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Bookshelf</a
          > lets you reread every book your character has learned, listed by name.
        </li>
        <li>
          Only characters on the house owner's account can open it, from within
          2 yd.
        </li>
      </ul>
      <p>
        See <MechanicsLink section="crafting#crafting"
          >Crafting at a Station</MechanicsLink
        >,
        <a
          href="/professions/cooking"
          class="text-blue-600 hover:underline dark:text-blue-400">Cooking</a
        >, and
        <a
          href="/professions/alchemy"
          class="text-blue-600 hover:underline dark:text-blue-400">Alchemy</a
        >.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="appearance" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Barbers and Appearance</Card.Title>
      <Card.Description
        >Change your appearance at a barber or select saved outfits from your
        wardrobe.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:IsBarberSessionValid,HasActiveAppearanceIllusion,UserCode_CmdStartBarber__NetworkIdentity,UserCode_CmdApplyBarberAppearance__String__String__String__String__String — requires a living player outside combat, within 2.5 yd of a living barber, without an illusion buff or Reaper Form; 100 gold is charged on Apply. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          A <a
            href="/npcs?npcs.role_keys=is_barber"
            class="text-blue-600 dark:text-blue-400 hover:underline">barber</a
          > changes your appearance for 100 gold.
        </li>
        <li>
          Visit while alive and out of combat, within 2.5 yd of the barber.
          Appearance-changing illusions and
          <a
            href="/skills/reaper_form"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Reaper Form</a
          > prevent a visit.
        </li>
        <li>Have 100 gold available. You pay only when you Apply.</li>
        <li>
          <!-- Source: server-scripts/Player.cs:UpdateServer_BARBER,IsBarberSessionValid -->
          Entering combat, dying, being stunned or feared, or moving more than 2.5
          yd from the barber cancels the session.
        </li>
      </ul>
      <!-- Source: server-scripts/BarberAppearanceOptions.cs:8-75 and server-scripts/Player.cs:11461-11484 — race and gender determine available hair, secondary styles, and colors; only hair, beard, and eye appearance fields change. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Style choices depend on your current race and gender.</li>
        <li>
          Felarii choose Pattern. Drassar choose Crest and Body Type. Male
          Humans, male Dwarves, and male Fire Goblins can choose Beard.
        </li>
        <li>
          Every race except Felarii and Drassar can change hair and eye colors.
        </li>
      </ul>
      <!-- Source: server-scripts/UIBarber.cs:502-518,529-561 and server-scripts/Player.cs:7220-7262 — the preview changes the local appearance, hair color updates beard color, and Cancel restores the prior appearance without payment. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Hair color changes beard color at the same time.</li>
        <li>Preview is free. Cancel keeps your previous appearance.</li>
      </ul>
      <!-- Source: server-scripts/EquipmentItem.cs:330-342, server-scripts/Player.cs:16595-16606 and server-scripts/Database.cs:2059-2075 — using costume equipment consumes the item and stores its appearance for that character. -->
      <p>
        Using a costume item consumes it and saves its appearance to your
        character's wardrobe.
      </p>
      <!-- Source: server-scripts/Structure.cs:154-161 and server-scripts/UIWardrobe.cs:38-57,97-118,146-180 and server-scripts/Player.cs:16664-16682 — wardrobe furniture opens the saved appearances, with independent head, chest, and leg skin slots that can be cleared. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          <a
            href="/items/wardrobe"
            class="text-blue-600 dark:text-blue-400 hover:underline">Wardrobe</a
          > furniture lets you select or clear saved Head, Chest, and Legs appearances.
        </li>
        <li>
          Those appearance slots change the displayed outfit without replacing
          equipment.
        </li>
      </ul>
      <!-- Source: server-scripts/GatherItem.cs:OnInteractFishServer — after a successful spot check, each selected Fisherman's costume piece adds 0.02 to the chance of receiving the selected fish from that spot. -->
      <p>
        The <a
          href="/items/fishermans_hat"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Fisherman's Hat</a
        >,
        <a
          href="/items/fishermans_garb"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Fisherman's Garb</a
        >, and
        <a
          href="/items/fishermans_trousers"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Fisherman's Trousers</a
        > each add 2% to the chance of catching a fish listed for that spot after
        a bite. Select their appearances in the wardrobe to receive the bonus.
      </p>
      <p>All three add 6% to the catch chance.</p>
      <p>
        See <a
          href="/professions/fishing"
          class="text-blue-600 hover:underline dark:text-blue-400">Fishing</a
        > for the separate catch checks.
      </p>
    </Card.Content>
  </Card.Root>
</div>
