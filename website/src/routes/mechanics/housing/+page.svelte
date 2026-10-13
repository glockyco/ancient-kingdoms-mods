<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";

  const SECTIONS = [
    { id: "furniture", label: "Furniture and Home Workstations" },
    { id: "appearance", label: "Barbers and Appearance" },
  ];
</script>

<Seo
  title="Housing and Appearance - Ancient Kingdoms"
  description="How to place home furniture, visit a barber, and use the costume wardrobe."
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
  <PageSections sections={SECTIONS} />

  <Card.Root id="furniture" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Furniture and Home Workstations</Card.Title>
      <Card.Description
        >Buy furniture for your account's house, then move it without another
        purchase.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/CustomStrucUI.cs:58-69,123-156 and server-scripts/StrucItemUi.cs:27-46 — the house catalog lists furniture and prices and opens only in a zone belonging to the player's account. -->
      <p>
        The house panel lists furniture and its gold price while you are at a
        house owned by your account.
      </p>
      <p>
        House purchase rules and house chests are covered on the
        <a
          href="/mechanics/inventory#house-chests"
          class="text-blue-600 dark:text-blue-400 hover:underline">Inventory</a
        > page.
      </p>
      <!-- Source: server-scripts/CustomStrucUI.cs:165-256 and server-scripts/Player.cs:13225-13242 — placement requires a footprint inside the owned buildable zone without a structure overlap; gold is deducted when the structure is created. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          A new piece must fit inside your house's buildable area without
          overlapping another structure.
        </li>
        <li>
          Placement costs the catalog price when the structure is created.
        </li>
      </ul>
      <!-- Source: server-scripts/CustomStrucUI.cs:72-85,219-225,259-311 and server-scripts/Player.cs:13257-13294 — movement repositions an owned structure without charging gold; confirmed removal deletes it without a refund. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Move mode repositions owned furniture without buying it again.</li>
        <li>
          Remove mode destroys the selected furniture after confirmation without
          refunding its price.
        </li>
      </ul>
      <!-- Source: server-scripts/HousingManager.cs:18-19 and server-scripts/CustomStrucUI.cs:58-69 and server-scripts/CraftingStation.cs:8-17,50-63 and server-scripts/Player.cs:13370-13387,13672-13713 — placed workstation structures retain their station ingredients and learned-recipe checks. -->
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
          >, and
          <a
            href="/items/alchemy_workbench"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Alchemy Workbench</a
          >.
        </li>
        <li>
          Home workstations use the same ingredients and recipes as stations
          elsewhere.
        </li>
        <li>An Alchemy Workbench still requires learned potion recipes.</li>
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
          You must be alive, out of combat, and within 2.5 yd of a living
          barber. The barber refuses you while an appearance-changing illusion
          or
          <a
            href="/skills/reaper_form"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Reaper Form</a
          > is active.
        </li>
        <li>
          You need 100 gold to open the service, but payment happens only on a
          successful Apply.
        </li>
        <li>Combat, death, or moving away can cancel the session.</li>
      </ul>
      <!-- Source: server-scripts/BarberAppearanceOptions.cs:8-78 and server-scripts/Player.cs:9387-9410 — race and gender determine available hair, secondary styles, and colors; only hair, beard, and eye appearance fields change. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Style choices depend on your current race and gender.</li>
        <li>
          Felarii choose Pattern. Drassar choose Crest and Body Type. Male
          Humans, Dwarves, and Fire Goblins can choose Beard.
        </li>
        <li>
          Every race except Felarii and Drassar can change hair and eye colors.
        </li>
      </ul>
      <!-- Source: server-scripts/UIBarber.cs:499-515,526-558 and server-scripts/Player.cs:6567-6609 — the preview changes the local appearance, hair color updates beard color, and Cancel restores the prior appearance without payment. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Hair color changes beard color at the same time.</li>
        <li>Preview shows the result before payment.</li>
        <li>Cancel restores your previous appearance without a charge.</li>
      </ul>
      <!-- Source: server-scripts/EquipmentItem.cs:297-309, server-scripts/Player.cs:14458-14469 and server-scripts/Database.cs:2112-2128 — using costume equipment consumes the item and stores its appearance for that character. -->
      <p>
        Using a costume item consumes it and saves its appearance to your
        character's wardrobe.
      </p>
      <!-- Source: server-scripts/Structure.cs:154-161 and server-scripts/UIWardrobe.cs:38-57,97-118,146-180 and server-scripts/Player.cs:14527-14545 — wardrobe furniture opens the saved appearances, with independent head, chest, and leg skin slots that can be cleared. -->
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
        > each add 2 percentage points to the chance of catching a fish listed for
        that spot after a bite. Select their appearances in the wardrobe to receive
        the bonus.
      </p>
      <p>All three add 6 percentage points.</p>
      <p>
        See <a
          href="/professions/fishing"
          class="text-blue-600 hover:underline dark:text-blue-400">Fishing</a
        > for the separate catch checks.
      </p>
    </Card.Content>
  </Card.Root>
</div>
