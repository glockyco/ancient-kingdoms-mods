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
        >Place, move, or remove furniture in your house.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/CustomStrucUI.cs:58-69,123-156 and server-scripts/StrucItemUi.cs:27-46 — the house catalog lists furniture and prices and opens only in a zone belonging to the player's account. -->
      <p>
        The house panel lists furniture and its gold price while you are at a
        house owned by your account.
      </p>
      <p>
        House purchase rules and <a
          href="/mechanics/inventory#house-chests"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >house chests</a
        > are covered in Inventory and Equipment.
      </p>
      <!-- Source: server-scripts/CustomStrucUI.cs:165-256 and server-scripts/Player.cs:13047-13064 — placement requires a footprint inside the owned buildable zone without a structure overlap; gold is deducted when the structure is created. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          A new piece must fit inside your house's buildable area without
          overlapping another structure.
        </li>
        <li>
          Placement costs the catalog price when the structure is created.
        </li>
      </ul>
      <!-- Source: server-scripts/CustomStrucUI.cs:72-85,219-225,259-311 and server-scripts/Player.cs:13079-13116 — movement repositions an owned structure without charging gold; confirmed removal deletes it without a refund. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Move mode repositions owned furniture without buying it again.</li>
        <li>
          Remove mode destroys it after confirmation and does not refund its
          price.
        </li>
      </ul>
      <!-- Source: server-scripts/HousingManager.cs:18-19 and server-scripts/CustomStrucUI.cs:58-69 and server-scripts/CraftingStation.cs:8-17,50-63 and server-scripts/Player.cs:13192-13209,13494-13535 — placed workstation structures retain their station ingredients and learned-recipe checks. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          Home workstations include a Craft Station, Cooking Oven, and Alchemy
          Workbench.
        </li>
        <li>
          They use the same ingredients and recipes as those stations elsewhere.
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
        >Appearance changes and the costume wardrobe.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Player.cs:2733-2763,8899-8951,8982-9027 — a nearby living barber serves a living player outside combat and appearance illusions; the player needs 100 gold to open and pays only on successful Apply. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>A barber changes your appearance for 100 gold.</li>
        <li>
          You must be alive, out of combat, near a living barber, and free of an
          active appearance illusion.
        </li>
        <li>
          You need 100 gold to open the service, but payment happens only on a
          successful Apply.
        </li>
        <li>Combat, death, or moving away can cancel the session.</li>
      </ul>
      <!-- Source: server-scripts/BarberAppearanceOptions.cs:8-78 and server-scripts/Player.cs:8998-9021 — race and gender determine available hair, secondary styles, and colors; only hair, beard, and eye appearance fields change. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Style choices depend on your current race and gender.</li>
        <li>
          Depending on your character, the options cover hair, beard, pattern,
          crest, or body style.
        </li>
        <li>Supported races can change hair and eye colors.</li>
      </ul>
      <!-- Source: server-scripts/UIBarber.cs:499-515,526-558 and server-scripts/Player.cs:6179-6221 — the preview changes the local appearance, hair color updates beard color, and Cancel restores the prior appearance without payment. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>Hair color changes beard color at the same time.</li>
        <li>Preview shows the result before payment.</li>
        <li>Cancel restores your previous appearance without a charge.</li>
      </ul>
      <!-- Source: server-scripts/EquipmentItem.cs:297-309, server-scripts/Player.cs:14244-14255 and server-scripts/Database.cs:2089-2105 — using costume equipment consumes the item and stores its appearance for that character. -->
      <p>
        Using a costume item consumes it and saves its appearance to your
        character's wardrobe.
      </p>
      <!-- Source: server-scripts/Structure.cs:154-161 and server-scripts/UIWardrobe.cs:38-57,97-118,146-180 and server-scripts/Player.cs:14313-14331 — wardrobe furniture opens the saved appearances, with independent head, chest, and leg skin slots that can be cleared. -->
      <ul class="list-disc space-y-1 pl-5">
        <li>
          Wardrobe furniture lets you select or clear saved Head, Chest, and
          Legs appearances.
        </li>
        <li>
          Those appearance slots change the displayed outfit without replacing
          equipment.
        </li>
      </ul>
      <!-- Source: server-scripts/GatherItem.cs:708-726 — each matching Fisherman's costume appearance adds 0.02 to the fishing reward probability after the fishing spot succeeds. -->
      <p>
        The Fisherman's Hat, Fisherman's Garb, and Fisherman's Trousers each add
        2 percentage points to the fishing reward check while selected in the
        wardrobe.
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
