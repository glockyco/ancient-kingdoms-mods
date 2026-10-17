<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import { MECHANICS_SECTIONS } from "$lib/data/mechanics-sections";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import * as Card from "$lib/components/ui/card";
  import Calculation from "$lib/components/Calculation.svelte";
  import { repairCost, merchantPrice } from "$lib/calculation/inventory";
  import {
    SOURCE_TYPE_CONFIG,
    type ItemSourceType,
  } from "$lib/constants/source-types";
  import {
    getQualityTextColorClass,
    formatNumber,
    formatPercent,
  } from "$lib/utils/format";
  import { reputationTierName } from "$lib/utils/reputation";
  import type {
    BackpackSource,
    HouseStorageLocation,
    InventoryMechanicsPageData,
  } from "./+page.server";

  const MAX_VISIBLE_SOURCES_PER_TYPE = 3;
  const BANK_TAB_COSTS = [
    0, 200, 1000, 2000, 5000, 10000, 15000, 20000, 50000, 100000,
  ];
  const BANK_TAB_ROWS = BANK_TAB_COSTS.map((cost, index) => ({
    tab: index + 1,
    cost,
    totalSlots: (index + 1) * 30,
  }));
  const EQUIPMENT_TEMPLATE_COSTS = [0, 1000, 3000, 5000, 10000];
  const EQUIPMENT_TEMPLATE_ROWS = EQUIPMENT_TEMPLATE_COSTS.map(
    (cost, index) => ({
      template: index + 1,
      cost,
    }),
  );

  let { data }: { data: InventoryMechanicsPageData } = $props();

  function formatGold(value: number): string {
    return value === 0 ? "Free" : formatNumber(value);
  }

  function getHouseRequirement(house: HouseStorageLocation): string {
    if (house.faction_id && house.faction_required > 0) {
      return `${reputationTierName(data.reputationTiers, house.faction_required)} (${formatNumber(house.faction_required)})`;
    }
    if (house.faction_id) return "No reputation requirement";
    return "None recorded";
  }

  function getSourcesByType(
    sources: BackpackSource[],
  ): [ItemSourceType, BackpackSource[]][] {
    const grouped: [ItemSourceType, BackpackSource[]][] = [];

    for (const source of sources) {
      const group = grouped.find(([type]) => type === source.type);
      if (group) {
        group[1].push(source);
      } else {
        grouped.push([source.type, [source]]);
      }
    }

    return grouped;
  }

  function visibleSources(sources: BackpackSource[]): BackpackSource[] {
    return sources.slice(0, MAX_VISIBLE_SOURCES_PER_TYPE);
  }
</script>

<Seo
  title="Inventory - Ancient Kingdoms"
  description="Inventory, the Combined Backpack, bank tabs, account-shared house chests, merchants, equipment, and consumables in Ancient Kingdoms."
  path="/mechanics/inventory"
/>

<div class="container mx-auto max-w-5xl space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Inventory" },
    ]}
  />

  <h1 class="text-4xl font-bold">Inventory</h1>

  <PageSections sections={MECHANICS_SECTIONS["/mechanics/inventory"]} />

  <Card.Root id="overview" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Storage at a glance</Card.Title>
      <Card.Description>
        Compare storage capacity for one character with storage shared across
        your account.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Storage</th>
              <th class="py-2 pr-4 text-left font-medium">Scope</th>
              <th class="py-2 pr-4 text-left font-medium">Capacity</th>
              <th class="py-2 text-left font-medium">How to expand</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/UIHousing.cs:Start — online houses are bound to the server on which they were purchased. -->
            <!-- Source: server-scripts/Player.cs:AddKey -->
            {#each [["Inventory", "Character", "24 base inventory slots plus backpack storage", "Equip backpacks"], ["Backpack slots", "Character", "9 dedicated bag slots", "Fixed"], ["Bank item storage", "Character", "300 slots, 30 per tab", "Unlock bank tabs with gold"], ["House chests", "Account (on the server where you bought the house)", "560 slots, 8 chest sections", "Buy a house, then buy chests"], ["Banked gold", "Account", "Separate gold vault", "Fixed"], ["Equipment", "Character", "16 equipped slots", "Fixed"], ["Keys", "Character", "One of each key", "Not needed"]] as row (row[0])}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4 font-medium">{row[0]}</td>
                <td class="py-2 pr-4">{row[1]}</td>
                <td class="py-2 pr-4">{row[2]}</td>
                <td class="py-2">{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="backpacks" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Backpacks</Card.Title>
      <Card.Description>
        Backpacks equip into nine dedicated backpack slots in the Combined
        Backpack window. Each equipped bag unlocks backpack storage slots,
        separate from the 24 base inventory slots.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5">
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/UIBigBackpack.cs + server-scripts/GameManager.cs:OnBackpackKeyPressed — the Backpack input action shows or hides the UIBigBackpack panel. -->Open
          the Combined Backpack window with the Backpack key (default
          <kbd
            class="rounded border border-border bg-muted px-1 py-0.5 font-mono text-sm"
            >B</kbd
          >) or the skillbar button.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:559-565 — backpack slots reject non-backpack items. -->Backpack
          slots accept backpacks only.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:604-618 and server-scripts/BackpackItem.cs:7,11-18 — only backpacks marked Unique are blocked when the same name is already equipped. -->
          <span class="block"
            >You can equip only one copy of each unique backpack at a time.</span
          >
          <span class="block"
            >You can equip multiple copies of other backpacks.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:589-605 — removal or downgrade is blocked if items would be locked away. -->Removing
          or downgrading a bag fails if its stored items would lose their slots.
        </li>
        <!-- Source: server-scripts/PlayerInventory.cs:652-662,701-707,795-801 — the bag drag handler blocks extended slots after the first; bank and house chest drags reject equipped bags. -->
        <li>
          <span class="block"
            >You cannot move an equipped bag directly to the bank or a house
            chest.</span
          >
          <span class="block">Drag it to a base inventory slot first.</span>
          <span class="block"
            ><!-- Source: server-scripts/PlayerInventory.cs:OnDragAndDrop_InventorySlot_InventorySlot; docs/game-bugs/moving-the-only-backpack-into-its-first-storage-slot-hides-it.md — observed defect hides the only bag after dropping it in extension slot 24. -->
            Because of a game defect, dropping your only equipped bag onto the first
            backpack storage slot hides it from both inventory windows. Do not move
            it there.</span
          >
        </li>
      </ul>

      <!-- Source: website/src/lib/server/item-source-summary.ts:getMinimumSourceLevel -->
      <p class="text-sm text-muted-foreground">
        Source Level is the lowest level among the bag's known sources. It does
        not limit who can equip the bag.
      </p>

      {#if data.backpacks.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium">Bag</th>
                <th class="py-2 pr-4 text-right font-medium">Slots</th>
                <th class="py-2 pr-4 text-right font-medium">Unique</th>
                <th class="py-2 pr-4 text-right font-medium">Source Level</th>
                <th class="py-2 text-left font-medium">Known sources</th>
              </tr>
            </thead>
            <tbody>
              {#each data.backpacks as backpack (backpack.id)}
                <tr
                  class="border-b border-border/50 align-top hover:bg-muted/30"
                >
                  <td class="py-2 pr-4">
                    <ItemLink
                      itemId={backpack.id}
                      itemName={backpack.name}
                      colorClass={getQualityTextColorClass(backpack.quality)}
                      tooltipHtml={backpack.tooltip_html}
                      imageAvailable={data.itemIconPaths[backpack.id]}
                      maxWidth="185px"
                    />
                  </td>
                  <td class="py-2 pr-4 text-right font-mono"
                    >{backpack.backpack_slots}</td
                  >
                  <td class="py-2 pr-4 text-right font-mono">
                    {backpack.backpack_is_unique ? "Yes" : "No"}
                  </td>
                  <td class="py-2 pr-4 text-right font-mono">
                    {#if backpack.min_source_level !== null}
                      {backpack.min_source_level}
                    {:else}
                      <span class="text-muted-foreground">—</span>
                    {/if}
                  </td>
                  <td class="py-2">
                    {#if backpack.sources.length === 0}
                      <span class="text-muted-foreground">No known source</span>
                    {:else}
                      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {#each getSourcesByType(backpack.sources) as [type, sources] (type)}
                          {@const sourceConfig = SOURCE_TYPE_CONFIG[type]}
                          <div class="flex flex-wrap items-center gap-1.5">
                            <sourceConfig.icon
                              class="h-4 w-4 shrink-0 {sourceConfig.color}"
                            />
                            {#if type !== "fishing"}
                              <span class="text-muted-foreground"
                                >{type === "random"
                                  ? "Opened from"
                                  : sourceConfig.label}:</span
                              >
                            {/if}
                            {#each visibleSources(sources) as source, i (source.id)}
                              <span>
                                <a
                                  href="{sourceConfig.linkPrefix}{source.id}"
                                  class="text-blue-600 dark:text-blue-400 hover:underline"
                                  >{type === "crafting"
                                    ? `${backpack.name} recipe`
                                    : source.name}</a
                                >{i < visibleSources(sources).length - 1
                                  ? ","
                                  : ""}
                              </span>
                            {/each}
                            {#if sources.length > MAX_VISIBLE_SOURCES_PER_TYPE}
                              <a
                                href="/items/{backpack.id}"
                                class="text-sm text-muted-foreground hover:underline"
                              >
                                +{sources.length - MAX_VISIBLE_SOURCES_PER_TYPE}
                                more
                              </a>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">No backpacks found.</p>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root id="bank" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Bank tabs and gold</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Player.cs:405 — characters start with one bank tab unlocked. -->
        <!-- Source: server-scripts/Player.cs:13685-13710 and 13720-13748 — bank gold withdraw and deposit commands. -->
        You start with bank tab 1. Unlock additional tabs in order. Deposit gold to
        share it across your account, or withdraw it to carry it.
      </p>
      <!-- Source: server-scripts/Npc.cs:1727-1755 and server-scripts/UIBank.cs:83-99 — interacting with a nearby banker opens the bank, which requires the player to remain alive and out of combat. -->
      <p class="text-sm text-muted-foreground">
        Open the bank at a Banker while alive and out of combat.
      </p>
      <!-- Source: server-scripts/UIBank.cs:83-99 — bank closes without a living, out-of-combat player targeting a nearby banker within 2 units. -->
      <p class="text-sm text-muted-foreground">
        It closes if you die, enter combat, target something else, or move more
        than 2 yd from the Banker.
      </p>
      <!-- Source: server-scripts/PlayerBank.cs:390-449 — Auto Stack moves carried stackable items only when the selected tab already contains that item, filling existing stacks before empty slots. -->
      <p class="text-sm text-muted-foreground">
        Auto Stack banks carried stackable items already found in the selected
        tab. It fills existing stacks before empty slots. Other items stay in
        your inventory.
      </p>
      <div class="overflow-x-auto">
        <!-- Source: server-scripts/UIBank.cs:294-307 — bank tab unlock price ladder. -->
        <!-- Source: server-scripts/Player.cs:UserCode_CmdSetNumberBankTabsUnlocked__Int32 — server charges current unlock price before increasing unlocked bank tabs. -->
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium">Unlocking tab</th>
              <th class="py-2 pr-4 text-right font-medium">Gold cost</th>
              <th class="py-2 text-right font-medium">Total slots</th>
            </tr>
          </thead>
          <tbody>
            {#each BANK_TAB_ROWS as row (row.tab)}
              <tr class="border-b border-border/50 hover:bg-muted/30">
                <td class="py-2 pr-4">{row.tab}</td>
                <td class="py-2 pr-4 text-right font-mono"
                  >{formatGold(row.cost)}</td
                >
                <td class="py-2 text-right font-mono">{row.totalSlots}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="house-chests" class="bg-muted/30">
    <Card.Header>
      <Card.Title>House chests and shared storage</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6">
      <p class="text-sm text-muted-foreground">
        <!-- Source: server-scripts/Housing.cs:33-49 — entering an unowned house area opens the house purchase flow. -->
        <!-- Source: server-scripts/ChestHouse.cs:OnInteractClient and UserCode_CmdOpenChestHouse__NetworkIdentity__String — only the owning account can open house chest UI. -->
        <!-- Source: server-scripts/UIChest.cs:42-56; server-scripts/PlayerChest.cs:259-290,309-318 — chest type selects a shared section and fixed 70-slot range. -->
        <span class="block"
          >A house belongs to the account that bought it. A house owned by
          another account cannot be bought.</span
        >
        <!-- Source: server-scripts/UIHousing.cs:Start -->
        <span class="block"
          >An online house stays on the server where you bought it.</span
        >
        <span class="block"
          >Each chest type opens one account-wide 70-slot section. Every chest
          of that type opens the same section.</span
        >
      </p>
      <!-- Source: server-scripts/Housing.cs:33-49 and server-scripts/ChestHouse.cs:83-98,167-175 — the house claim and chest access compare account identity. -->
      <p class="text-sm text-muted-foreground">
        <span class="block"
          >Only the owning account can access its house chests.</span
        >
        <span class="block">Bank items remain character-specific.</span>
      </p>

      <div class="space-y-2 text-sm text-muted-foreground">
        <h3 class="font-semibold text-foreground">Buying and placing chests</h3>
        <p>
          <!-- Source: server-scripts/Housing.cs:33-38 — owned house trigger shows the H-key house panel prompt. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:122-134 — H opens the structure panel only inside an owned house buildable zone. -->
          While inside a house you own, press
          <kbd
            class="rounded border border-border bg-muted px-1.5 py-0.5 text-sm text-foreground"
            >H</kbd
          > to open the house panel.
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:57-68 — panel lists structure items and prices from HousingManager.strucItems. -->
          <!-- Source: server-scripts/StrucItemUi.cs:29-39 — selecting a chest checks gold, shows the shared-storage warning, and enters placement mode. -->
          Choose a chest from that panel, confirm the purchase warning, then place
          it inside the buildable house area.
        </p>
        <p>
          <span class="block"
            ><!-- Source: server-scripts/CustomStrucUI.cs:204-227 — left click or F places the selected structure, or drops a moved one at the new spot. -->
            <!-- Source: server-scripts/CustomStrucUI.cs:79-85, 330-349 and Player.cs:13436-13448 — move mode hides the structure, then repositions the same one without charging gold. -->
            Place the selected chest with left click or
            <kbd
              class="rounded border border-border bg-muted px-1.5 py-0.5 text-sm text-foreground"
              >F</kbd
            >.</span
          >
          <span class="block"
            >Chests can be moved after placement without paying again.</span
          >
          <span class="block"
            >Moving a chest does not remove its stored items.</span
          >
        </p>
        <p>
          <!-- Source: server-scripts/CustomStrucUI.cs:71-76 and 261-279 — remove mode destroys a selected structure. -->
          <!-- Source: server-scripts/CustomStrucUI.cs:101-108 and Player.cs:10547-10580 — selling a house pays its resale value and destroys the placed structures; warning says chest items can be retrieved after buying another house. -->
          <span class="block">Destroying a chest refunds nothing.</span>
          <span class="block"
            >Selling the house removes its <a
              href="/mechanics/housing#furniture"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >furniture</a
            >.</span
          >
          <span class="block"
            >Account-wide chest items remain available after you buy another
            house.</span
          >
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-semibold">House locations</h3>
        {#if data.houses.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 pr-4 text-left font-medium">House</th>
                  <th class="py-2 pr-4 text-left font-medium">Zone</th>
                  <th class="py-2 pr-4 text-right font-medium">Base price</th>
                  <th class="py-2 pr-4 text-left font-medium">Requirement</th>
                  <th class="py-2 text-left font-medium">Map</th>
                </tr>
              </thead>
              <tbody>
                {#each data.houses as house (house.id)}
                  <tr class="border-b border-border/50 hover:bg-muted/30">
                    <td class="py-2 pr-4 font-medium">{house.name}</td>
                    <td class="py-2 pr-4">
                      {#if house.zone_id}<a
                          href="/zones/{house.zone_id}"
                          class="text-blue-600 dark:text-blue-400 hover:underline"
                          >{house.zone_name}</a
                        >{:else}Unknown{/if}
                    </td>
                    <td class="py-2 pr-4 text-right font-mono"
                      >{formatNumber(house.base_price)}</td
                    >
                    <td class="py-2 pr-4">
                      <!-- Source: server-scripts/Player.cs:TargetRpcHouse; Utils.cs:GetFactionRankName — the purchase panel names the required reputation rank. -->
                      {#if house.faction_id}<a
                          href="/factions/{house.faction_id}"
                          class="text-blue-600 dark:text-blue-400 hover:underline"
                          >{house.faction_name}</a
                        >:
                      {/if}{getHouseRequirement(house)}
                    </td>
                    <td class="py-2"
                      ><MapLink
                        entityId={house.id}
                        entityType="house"
                        compact
                      /></td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">No houses found.</p>
        {/if}
      </div>
      <!-- Source: server-scripts/Housing.cs:OnTriggerEnter2D; Player.cs:UserCode_CmdSpawnStruc__Int32__String__Vector3__Quaternion__Boolean — house purchase applies Charisma; placed structures charge their catalog price. -->
      <p class="text-sm text-muted-foreground">
        Base price is before your Charisma discount of up to 25%. See <a
          href="#merchants"
          class="text-blue-600 dark:text-blue-400 hover:underline">Merchants</a
        >. Chest and furniture prices get no discount.
      </p>

      <div class="space-y-2">
        <h3 class="font-semibold">Chest sections</h3>
        {#if data.houseChests.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 pr-4 text-left font-medium">Chest</th>
                  <th class="py-2 pr-4 text-left font-medium">Slots</th>
                  <th class="py-2 pr-4 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {#each data.houseChests as chest (chest.id)}
                  <tr class="border-b border-border/50 hover:bg-muted/30">
                    <td class="py-2 pr-4 font-medium">
                      <ItemLink
                        itemId={chest.id}
                        itemName={chest.name}
                        tooltipHtml={chest.tooltip_html}
                        imageAvailable={data.itemIconPaths[chest.id]}
                      />
                    </td>
                    <td class="py-2 pr-4 font-mono"
                      >{chest.slot_end - chest.slot_start + 1} slots</td
                    >
                    <td class="py-2 pr-4 text-right font-mono"
                      >{formatNumber(chest.structure_price)}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">No house chests found.</p>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root id="item-movement" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Item movement and stacks</Card.Title>
      <Card.Description>
        Items fill base inventory slots before backpack storage slots. You can
        split stacks or move items between storage locations.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/ItemSlot.cs:23-27 and PlayerInventory.cs:1992-2006 — stack increases are clamped by target max stack. -->Matching
          stacks merge up to the target stack limit.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:621-626,670-683,1717-1729 — Shift-drag to an empty slot offers a quantity picker. -->
          Hold Shift and drag a stack onto an empty slot to choose how many items
          to move.
        </li>
        <!-- Source: server-scripts/PlayerInventory.cs:701-757,795-853,1914-1976 and server-scripts/PlayerBank.cs:53-72 — splitting supports carried slots and transfers to or from bank and house chest slots. -->
        <li>
          <span class="block"
            >Splitting also works between inventory and bank or house chest
            slots.</span
          >
          <span class="block"
            >Use an empty destination for an exact quantity.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:OnDragAndDrop_InventorySlot_InventorySlot -->
          Dragging an item onto a slot that holds a different item swaps the two.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerInventory.cs:OnDragAndClear_InventorySlot; ScriptableItem.cs:ToolTip — destruction checks destroyable; the tooltip tag is No-Destroy. -->
          Items tagged No-Destroy cannot be destroyed.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
  <Card.Root id="merchants" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Merchants, buyback, and repairs</Card.Title>
      <Card.Description>
        Buy or sell at a Merchant, repair at an NPC offering Repairs, and buy
        back recently sold items.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerNpcTrading.cs:170-226 — trading requires an idle player near a merchant; purchases check token or gold cost and storage for the full delivered quantity, including pack contents. -->
      <p>
        <span class="block"
          >To buy, stand still within 2.4 yd of a Merchant without casting.</span
        >
        <span class="block"
          >Selling and buyback work the same way within 2 yd.</span
        >
        <span class="block">Purchases cost gold or the specified token.</span>
        <span class="block">The full quantity must fit in inventory.</span>
        <span class="block"
          >Buying a pack puts its contents directly in inventory.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerNpcTrading.cs:250-318,52-60 — only sellable items are accepted; damaged equipment loses sale value; Charisma adds at most 25% to the sale price. -->
      <p>Damaged equipment sells for less.</p>
      <Calculation calculation={merchantPrice(false)} />
      <Calculation calculation={merchantPrice(true)} />
      <!-- Source: server-scripts/UINpcTrading.cs:143-159 and server-scripts/PlayerNpcTrading.cs:377-397 — the sale dialog warns about attached augments; removal returns an augment when there is carried space. -->
      <p>
        Remove an augment you want to keep before selling the equipment. See <a
          href="/mechanics/crafting#augments"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >augment removal</a
        >.
      </p>
      <!-- Source: server-scripts/PlayerNpcTrading.cs:17,295-317,495-526 — sales enter a 20-stack player buyback list for 600 seconds; any trading NPC can sell the full stack back for the recorded payout if it fits. -->
      <p>
        <span class="block"
          >Buyback keeps your last 20 sold stacks for 10 minutes.</span
        >
        <span class="block"
          >Any Merchant sells a stack back for the gold you received for it.</span
        >
        <span class="block">The entire stack must fit in inventory.</span>
        <span class="block">New sales push out the oldest entries.</span>
      </p>
      <!-- Source: server-scripts/PlayerNpcTrading.cs:19-49,413-479 — only repair-enabled merchants repair damaged gear; price uses half the sell value times missing durability fraction, less a capped Charisma discount, at least 1 gold. -->
      <p>
        <span class="block">Not every Merchant repairs.</span>
        <span class="block"
          >An NPC offering Repairs fixes your equipped and carried gear and your
          active mercenaries' equipment.</span
        >
      </p>
      <Calculation calculation={repairCost()} />
    </Card.Content>
  </Card.Root>

  <Card.Root id="loot" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Loot pickup</Card.Title>
      <Card.Description>
        Gold, keys, and quest items each go to their own place when you loot
        them. Some drops go to a group roll when more than one player can loot.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — loot pickup states and 2.4-unit reach check. -->Loot
          pickup works within 2.4 yd.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — gold deposits directly as carried gold and splits among nearby party members. -->Gold
          goes directly to carried gold.
        </li>
        <li>
          Nearby party members <a
            href="/mechanics/party#shared-rewards"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >split gold pickups</a
          >.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 — keys are added to key storage instead of inventory slots. -->Keys
          go to key storage.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32; GatherInventoryQuest.cs:OnCompleted — Gather consumes on pickup; Have and Deliver count inventory; Deliver removes on completion. -->
          Picking up an item for an accepted Gather quest advances the quest and uses
          the item up.
        </li>
        <li>
          Have and Deliver <a
            href="/quests"
            class="text-blue-600 dark:text-blue-400 hover:underline">quests</a
          >
          count items in your inventory. A Deliver quest takes them when you turn
          it in.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerLooting.cs:UserCode_CmdTakeItem__Entity__Int32 -->
          If your inventory is full, the item stays in the loot window.
        </li>
        <li>
          <!-- Source: server-scripts/ChestLoot.cs:323-340 and Npc.cs:UserCode_CmdLootMonster — eligible shared chest/NPC drops route through group roll when more than one player can loot. -->
          <!-- Source: server-scripts/Monster.cs:UserCode_CmdLootMonster -->
          When more than one player can loot the same enemy, NPC, or world loot chest,
          these go to a
          <a
            href="/mechanics/party#loot-rolls"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >group roll</a
          >
          instead of direct pickup:
          <ul class="list-disc space-y-1 pl-5">
            <li>Uncommon or better items</li>
            <li>Keys and chest keys</li>
            <li>Items worth more than 200 gold</li>
            <li>XP potions</li>
            <li>From enemies, also Merge items and scrolls</li>
          </ul>
          Quest-only items never roll.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="equipment-templates" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Equipment templates</Card.Title>
      <Card.Description>
        <!-- Source: server-scripts/PlayerEquipment.cs:32,42-47,396-398,1669-1691 — each character can use up to five equipment templates and switch between stored loadouts. -->
        Store up to five gear loadouts per character and swap between them.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerEquipment.cs:485-494 — template 2 through 5 unlock prices. -->
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {#each EQUIPMENT_TEMPLATE_ROWS as row (row.template)}
          <div
            class="min-w-0 rounded border border-border bg-muted/50 px-2 py-2 text-center"
          >
            <span class="block truncate text-sm">Template {row.template}</span>
            <span class="block truncate font-mono text-foreground"
              >{row.cost === 0 ? "Free" : `${formatGold(row.cost)} gold`}</span
            >
          </div>
        {/each}
      </div>

      <ul class="list-disc space-y-1 pl-5">
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:57-58,468-482,1670-1704 — template entries store an item hash and augment name, and switching applies all sixteen stored equipment slots. -->
          Switching applies saved choices to all 16 equipment slots.
        </li>
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:42-45,409-436 and server-scripts/Database.cs:3205-3207 — characters start with template 1 unlocked, and character creation captures starting equipment into template 1. -->
          Template 1 starts out holding the gear your character was created with.
        </li>
        <!-- Source: server-scripts/PlayerEquipment.cs:455-482,1640-1655 — active template tracks equipment changes and unlocking copies current gear then activates the new template. -->
        <li>
          <span class="block"
            >Changing gear updates the saved items of your active template.</span
          >
          <span class="block"
            >Unlocking another template copies your current gear and activates
            the new template.</span
          >
        </li>
        <!-- Source: server-scripts/PlayerEquipment.cs:526-565,596-605,679-685 and server-scripts/PlayerInventory.cs:239-265 — template selection searches equipped and carried slots, including unlocked backpack storage, for the saved item and augment pair. -->
        <li>
          <span class="block"
            >Switching uses equipped and carried gear, including unlocked
            backpack storage slots.</span
          >
          <span class="block"
            >It cannot retrieve items from the bank or a house chest.</span
          >
          <span class="block"
            >Attached augments must match the saved choice.</span
          >
        </li>
        <li>
          <!-- Source: server-scripts/PlayerEquipment.cs:538-567,608-620 — unavailable or unusable saved items leave the destination equipment slot empty. -->
          Missing or unusable saved items leave their equipment slots empty.
        </li>
        <!-- Source: server-scripts/PlayerEquipment.cs:568-579,622-676 — incompatible two-handed and off-hand combinations or insufficient carried space for removed gear refuse the entire switch. -->
        <li>
          A switch fails if it would pair a two-handed weapon with an off-hand
          item, or if the gear it removes does not fit in your inventory.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <Card.Root id="durability-and-repair" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Equipment durability and repair</Card.Title>
      <Card.Description>
        Broken equipment loses its bonuses until repaired.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerEquipment.cs:OnStartServer; website/data/compendium.db:items.stats.max_durability — 16 equipment slots, most gear 10 points; Rusty Pickaxe 10, other pickaxes 20–250. -->
      <p>
        Equipment has 16 equipped slots. Most gear has 10 durability points. The
        Rusty Pickaxe also has 10, and other pickaxes have 20 to 250.
      </p>
      <!-- Source: server-scripts/Player.cs:OnDeath — each equipped item loses one durability point. -->
      <p>
        <span class="block"
          >Each death costs every equipped item 1 durability point, which is 10%
          on most gear.</span
        >
        <span class="block"
          ><a
            href="/mechanics/death#death"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Death and Remains</a
          > explains what happens to carried items.</span
        >
      </p>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt; server-scripts/PlayerEquipment.cs:57-58 — after the miss or resistance check, a successful armor-breaking chance selects any of the 16 player equipment slots and removes 1–4 points from unbroken gear, including mercenary gear. -->
      <p>
        On a successful hit, an armor-breaking skill can select one of your 16
        equipment slots at random. If it holds unbroken gear, that item loses
        1–4 durability points. Mercenary gear can lose durability the same way.
      </p>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — each skill's armor-breaking chance determines whether an equipment slot is selected after a successful hit. -->
      <p>
        Skills with this effect (chance per successful hit to select a slot):
        {#each data.armorBreakingSkills as skill, i (skill.id)}
          {i > 0 ? ", " : ""}<a
            href="/skills/{skill.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{skill.name}</a
          >
          ({formatPercent(skill.break_armor_prob, { decimals: 0 })})
        {/each}.
      </p>
      <!-- Source: server-scripts/Equipment.cs:6-58 and server-scripts/PlayerEquipment.cs:194-319,1614-1625 — gear at zero durability gives no equipment or attached augment attribute bonuses and no longer counts toward its armor set. -->
      <p>
        <span class="block"
          >At zero durability, gear stays equipped but provides no equipment or
          attached augment bonuses.</span
        >
        <span class="block">It stops counting toward armor set bonuses.</span>
      </p>
      <!-- Source: server-scripts/ScrollItem.cs:37-91 — a repair kit restores damaged equipped items up to its quality; targeting an owned mercenary redirects it, and no qualifying item leaves the kit unused. -->
      <p>
        <span class="block"
          >A <a
            href="/items/magic_repair_kit"
            class="text-blue-600 dark:text-blue-400 hover:underline">Magic</a
          >,
          <a
            href="/items/epic_repair_kit"
            class="text-blue-600 dark:text-blue-400 hover:underline">Epic</a
          >, or
          <a
            href="/items/legendary_repair_kit"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Legendary Repair Kit</a
          >
          restores equipped items of its quality or lower to full durability.</span
        >
        <span class="block"
          >Target your own mercenary to repair that mercenary instead.</span
        >
        <span class="block"
          >A kit remains unused if none of the equipped gear it can repair is
          damaged.</span
        >
        <span class="block"
          >Repair kits require the same 1-second cast as other scrolls. See
          <a
            href="#scroll-casting"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >scroll casting</a
          >.</span
        >
      </p>
      <!-- Source: server-scripts/ScrollItem.cs:48-82, server-scripts/PlayerNpcTrading.cs:28-42,413-441 and server-scripts/Player.cs:4598-4601 — kits act on equipped slots; repair merchants accept carried equipment, including broken pickaxes. -->
      <p>
        <span class="block">Kits do not repair inventory tools.</span>
        <span class="block"
          >A broken <a
            href="/items"
            class="text-blue-600 dark:text-blue-400 hover:underline">pickaxe</a
          >
          cannot
          <a
            href="/professions/mining"
            class="text-blue-600 dark:text-blue-400 hover:underline">mine</a
          >
          until you repair it at an NPC offering Repairs.</span
        >
      </p>
      <p>
        <a
          href="#merchants"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >Merchant repairs</a
        >
        cover carried gear and show the repair price.
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="armor-sets" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Armor sets</Card.Title>
      <Card.Description
        >Set bonuses count only equipped pieces of the same set with durability
        left.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PlayerEquipment.cs:287-317,1614-1625 and server-scripts/MercenaryEquipment.cs:148-185 — three matching equipped working pieces give attributes; five give player skill levels; mercenaries apply only the three-piece attributes. -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="py-2 pr-4 text-left font-medium"
                >Equipped set pieces</th
              >
              <th class="py-2 text-left font-medium">Bonus</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4">3 equipped</td>
              <td class="py-2">The set's attribute bonuses</td>
            </tr>
            <tr>
              <td class="py-2 pr-4">5 equipped</td>
              <td class="py-2">The set's skill rank bonuses</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Source: server-scripts/MercenaryEquipment.cs:148-185,226-241 and server-scripts/EquipmentItem.cs:525-527 — mercenary set processing has the three-piece attribute threshold but no five-piece skill threshold. -->
      <p>
        <span class="block"
          >Mercenary armor sets grant only the three-piece attribute bonus.</span
        >
        <span class="block"
          >See <a
            href="/mercenaries#equipment"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >mercenary equipment</a
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root id="consumables" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Consumables and item types</Card.Title>
      <Card.Description
        >Use potions and food for buffs, or scrolls to activate skills without
        learning them.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/PotionItem.cs:77-85,119-144, server-scripts/FoodItem.cs:14-35 and server-scripts/ScrollItem.cs:93-128 — potions restore resources or apply buffs, food and drink apply buffs, and spell scrolls invoke skills. -->
      <p>
        <span class="block"
          >Potions restore Hit Points, Mana, or Rage, grant experience, or apply
          buffs.</span
        >
        <span class="block">Food and drink apply buffs.</span>
        <span class="block"
          >Skill scrolls cast a skill without teaching it.</span
        >
      </p>
      <!-- Source: server-scripts/ScrollItem.cs:UseAfterCast — successful skill scrolls can increase mastery, then cast at round(mastery × 20), clamped to 1 and the skill's maximum. -->
      <p>
        Skill scrolls can raise <a
          href="/professions/scroll_mastery"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Scroll Mastery</a
        >. To find the casting rank, divide your Scroll Mastery percentage by 5
        and round to the nearest whole number. The minimum is rank 1 and the
        maximum is the skill's highest rank.
      </p>
      <!-- Source: server-scripts/ScrollItem.cs:7,13-35,91-136; PlayerInventory.cs:StartScrollCast,UpdateScrollCast — ScrollItem casts for 1 second; UseAfterCast applies the effect, item cooldown and charge consumption only after successful completion. -->
      <p id="scroll-casting">
        Skill scrolls, the Scroll of Binding, and repair kits take 1 second to
        cast. Starting one cancels your current and queued skills. Completing it
        uses a charge, starts its cooldown, and ends invisibility. Items with
        infinite charges are not consumed.
      </p>
      <!-- Source: server-scripts/PlayerInventory.cs:UpdateScrollCast; Player.cs:3166-3224 — scroll casts cancel on an active skill, movement, a destroyed start target, changed or empty slot, death, stun, fear, cancel action or trade, and complete on the target saved when the cast began. -->
      <p>
        Moving, using a skill, losing your target, changing or removing the
        casting item, stun, fear, death, trading, or cancelling interrupts the
        cast. Changing selection does not redirect it. A skill scroll's original
        target must remain valid until the cast finishes.
      </p>
      <!-- Source: server-scripts/uMMORPG.Scripts.ScriptableItems/RecipeItem.cs:10-27 and server-scripts/CraftingStation.cs:8-10,50-58 — recipe items teach a potion recipe once; station crafting uses its configured material combinations. -->
      <p>
        <span class="block"
          >Using a recipe item consumes it and teaches its potion recipe. You
          cannot use a recipe you already know.</span
        >
        <span class="block"
          >Crafting materials need a matching recipe at a station.</span
        >
        <span class="block"
          >See <a
            href="/mechanics/crafting#crafting"
            class="text-blue-600 hover:underline dark:text-blue-400">crafting</a
          >.</span
        >
      </p>
      <!-- Source: server-scripts/UsableItem.cs:14-26,30-56 — items with the same cooldown category share a cooldown; an unset category defaults to the item name, and use removes invisibility. -->
      <p>
        <span class="block"
          >Some items share a cooldown, so using one starts it for all of them.</span
        >
        <span class="block">Other items have their own cooldown.</span>
        <span class="block">Using an item removes invisibility.</span>
      </p>
      <!-- Source: server-scripts/PotionItem.cs:Use; FoodItem.cs:Use; website/data/compendium.db:skills.buff_category — ordinary Food and Drink replace their respective categories, and attribute/resistance potions replace matching potion buffs. -->
      <p>
        Food and drink replace buffs in their respective categories. An
        attribute or resistance potion replaces the potion buff for that same
        attribute or resistance.
      </p>
      {#if data.dungeonRefusedPotions.length > 0}
        <!-- Source: server-scripts/PotionItem.cs:Use; UsableItem.cs:Use — the refusal comes after invisibility ends. -->
        <!-- Runtime verification: docs/game-bugs/refused-dungeon-potion-ends-invisibility.md -->
        <p>
          {#each data.dungeonRefusedPotions as potion, index (potion.id)}{index >
            0
              ? ", "
              : ""}<a
              href="/items/{potion.id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{potion.name}</a
            >{/each}
          {data.dungeonRefusedPotions.length === 1 ? "does" : "do"} not work inside
          dungeons, and trying to drink {data.dungeonRefusedPotions.length === 1
            ? "it"
            : "one"} there ends invisibility.
        </p>
      {/if}
      <!-- Source: server-scripts/ScriptableItem.cs:ToolTip; PlayerNpcTrading.cs:UserCode_CmdSellItem__String__Int32__Int32__Int64; PlayerTrading.cs:UserCode_CmdOfferItem__Int32__Int32; PlayerInventory.cs:OnDragAndClear_InventorySlot — No-Trade, Cannot sell and No-Destroy expose separate permissions. -->
      <p>
        <span class="block"
          >No-Trade, Cannot sell, and No-Destroy are separate restrictions on
          trading with players, selling to merchants, and destroying an item.</span
        >
        <span class="block"
          >A No-Trade item can still be sold to a Merchant unless it is also
          Cannot sell.</span
        >
      </p>
    </Card.Content>
  </Card.Root>
</div>
