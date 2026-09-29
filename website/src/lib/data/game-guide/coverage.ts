/**
 * Where the compendium covers each article of the in-game Adventurer's Guide.
 *
 * `reviewedBodySha256` is the SHA-256 of the English article body that the
 * mapped section was last checked against. When a game update edits an
 * article, `coverage.db.test.ts` names it; review the section, then record the
 * new digest.
 */
export interface GuideCoverage {
  readonly href: string;
  readonly reviewedBodySha256: string;
}

export const guideCoverage: Readonly<Record<string, GuideCoverage>> = {
  "classes.bard": {
    href: "/classes/bard#class-guide",
    reviewedBodySha256:
      "b512c4ff408bb36b0196664c8707d82195fd8aed35647f90db14442e8eb9e27e",
  },
  "classes.cleric": {
    href: "/classes/cleric#class-guide",
    reviewedBodySha256:
      "9db02376850176475d5d2c0c6f84f45ecf2535415d4f6a4a9e304e0c33953357",
  },
  "classes.druid": {
    href: "/classes/druid#class-guide",
    reviewedBodySha256:
      "d342d7eb2253ebf60c648d4f690dc3c69eae46ac19c83d9a7b0c20cc2c085ca9",
  },
  "classes.ranger": {
    href: "/classes/ranger#class-guide",
    reviewedBodySha256:
      "0dc25c12ef97de1d84bcaedcc44f0adb6168caf557472f7cdc0da0e7e7f4f173",
  },
  "classes.rogue": {
    href: "/classes/rogue#class-guide",
    reviewedBodySha256:
      "cce18bf00557e01a9ecef4f5658dd1d6a6a16b06818bc9aa112be00b291d06dc",
  },
  "classes.warrior": {
    href: "/classes/warrior#class-guide",
    reviewedBodySha256:
      "85fcddb176b34af264130fde4f4887efc189bfb1615787f0c5db59d48431ff52",
  },
  "classes.wizard": {
    href: "/classes/wizard#class-guide",
    reviewedBodySha256:
      "0f7e11e6c18ea255fcde80a84452a58a708f35907970d0c59c4394d7522f9734",
  },
  "combat.attributes": {
    href: "/mechanics/character#attributes",
    reviewedBodySha256:
      "efc3ac135a7b27adc1377a336abdd507352caf491f35e2ec0646113a1beea596",
  },
  "combat.bard-charm": {
    href: "/mechanics/bard#charm",
    reviewedBodySha256:
      "038fdef6eb5d517d588822295684b113d6c76748107c7ebf08d417b95fb3f76a",
  },
  "combat.bard-songs": {
    href: "/mechanics/bard#songs",
    reviewedBodySha256:
      "e6ab329906cce4d85e6711e29e721966d39028a1dbfc7ec07ee0840637d27ee4",
  },
  "combat.buffs-wards-cleanse": {
    href: "/mechanics/combat#effects-and-control",
    reviewedBodySha256:
      "656e34e985dbecab8d739580072289a4715f8935e42fc2a0bb3b3a6fb2a47484",
  },
  "combat.damage-defense": {
    href: "/mechanics/combat#combat-advantage",
    reviewedBodySha256:
      "7d802a11c75c709ec7958ef355b8b4e02d1104067cb2334f9ba41699f2b1437f",
  },
  "combat.death-resurrection": {
    href: "/mechanics/death#death",
    reviewedBodySha256:
      "496e2fb4017e761edc7d5ccab77ff41807fa07f635b73d8c48a9621cd48394ae",
  },
  "combat.resources": {
    href: "/mechanics/character#resources",
    reviewedBodySha256:
      "3dfd2728faab124ee68e5c87b92e7042369561c345cbaa8fa9f39df9621e275d",
  },
  "combat.skills-veteran-specs": {
    href: "/mechanics/character#skills-and-specializations",
    reviewedBodySha256:
      "cba96f1c6a48f5bf55b59de6229148df78e33444a65de919a8a8ecb48d2b0700",
  },
  "combat.targeting": {
    href: "/mechanics/combat#targeting",
    reviewedBodySha256:
      "da48efa2de28c1cdb4701023015742e5fb7907a27285fb166f86f9b4c0811f6a",
  },
  "companions.auto-consume": {
    href: "/mercenaries#auto-consume",
    reviewedBodySha256:
      "cffc6999d98cc58e06a2312afa35d8096495712b55b00ab550464342848b0705",
  },
  "companions.commands-stances": {
    href: "/mercenaries#commands",
    reviewedBodySha256:
      "ab0d261c3551bc689a64ec2d9d6a70a13752d30a0ede489da595ddf2dfcfeed7",
  },
  "companions.death-resurrection": {
    href: "/mercenaries#resurrection",
    reviewedBodySha256:
      "678b5810112f285eb6d960be06f7bcd2ce756a37782e95190e113191451dfd19",
  },
  "companions.friendly-whistles": {
    href: "/summons#friendly-followers",
    reviewedBodySha256:
      "6557677fbd6c9897320b28d71334323f9e638af3c877462d187cf4660ef23a47",
  },
  "companions.mercenary-equipment": {
    href: "/mercenaries#equipment",
    reviewedBodySha256:
      "58cc6093e09c2f4f4682c51ea7c268996a34c2220a0479f5c990de430e9aa28a",
  },
  "companions.mercenary-roster": {
    href: "/mercenaries#roster",
    reviewedBodySha256:
      "c6b6d1c8c2fe83ec2b1e86f0d45285eee9846185486b41775af0ba011b437780",
  },
  "companions.pets-familiars": {
    href: "/summons#pets-and-familiars",
    reviewedBodySha256:
      "88fd3588edbb5a158041bba17057f155d814db895ce7cbfbe595627c24054f92",
  },
  "companions.support-tanking-dodging": {
    href: "/mercenaries#ai-behavior",
    reviewedBodySha256:
      "14228469ef8262675a9f2a984bc0496f282cfee0f92e2dbe5db8651adbd3590b",
  },
  "items.armor-sets": {
    href: "/mechanics/inventory#armor-sets",
    reviewedBodySha256:
      "e8802e5d0cae1f6b67039330eeeff6ba24f28eeb746e501398330d3162b302ae",
  },
  "items.augments": {
    href: "/mechanics/crafting#augments",
    reviewedBodySha256:
      "79d9d11085fec0281dfffa0ba17dded6a0baed7cd016320d6de7826127dd4c30",
  },
  "items.backpacks": {
    href: "/mechanics/inventory#backpacks",
    reviewedBodySha256:
      "2cddd41d74316415e1b87b60e4f2b1277ed96a2bf073316e5fce027c45cf5984",
  },
  "items.bank": {
    href: "/mechanics/inventory#bank",
    reviewedBodySha256:
      "e15706426143b28c0d3d596e97dd7804d482fd54fc1c9e0da6bb0fc96cbbef61",
  },
  "items.barber-appearance": {
    href: "/mechanics/housing#appearance",
    reviewedBodySha256:
      "d2da499518d2f77479be512d4dc49069564a8b2a54a24b0d4a783dbedd9031ec",
  },
  "items.consumables-types": {
    href: "/mechanics/inventory#consumables",
    reviewedBodySha256:
      "ba7483223eb86228414f371d664658eaa9af2168a29da2de8f4b6b4af7490025",
  },
  "items.equipment-durability": {
    href: "/mechanics/inventory#durability-and-repair",
    reviewedBodySha256:
      "684cea2e3a313c01cd8a124b2230861633c34ec3a248ca236e0aadd69d0721b1",
  },
  "items.equipment-templates": {
    href: "/mechanics/inventory#equipment-templates",
    reviewedBodySha256:
      "5d77b4de69ea52e483450d6387f6d4d5b254b226f7c78ffb3c792f1a3a14d2bc",
  },
  "items.furniture": {
    href: "/mechanics/housing#furniture",
    reviewedBodySha256:
      "385526df1bd41ced882dc4d4c3136491d681be2e22669903dabb0fbe40c5bda9",
  },
  "items.houses-storage": {
    href: "/mechanics/inventory#house-chests",
    reviewedBodySha256:
      "8ab74eb041ab0f342c7d022089580add588e24279f3c4b8d88abbaf7ebcf1c50",
  },
  "items.inventory-stacks": {
    href: "/mechanics/inventory#item-movement",
    reviewedBodySha256:
      "9f3cbc1d564981ed96d054e18085b165f3c38112a2808602b563a49c1427857e",
  },
  "items.merchants-repair": {
    href: "/mechanics/inventory#merchants",
    reviewedBodySha256:
      "e3abe6bdc9382d9b4fbc41a978ecbbe2e225ee9fd4c530edbf30fa1c85f842af",
  },
  "professions.alchemy": {
    href: "/professions/alchemy#how-it-works",
    reviewedBodySha256:
      "b2495a033e1837d435f5ef8054a49fe0d792b5bb6f0b045bfae9c7fc60b91ba2",
  },
  "professions.cooking": {
    href: "/professions/cooking#how-it-works",
    reviewedBodySha256:
      "431864dfc69d22c599e1d70c2e3647babf94f4bd6c6ad13ec364c74401eddf2f",
  },
  "professions.crafting": {
    href: "/mechanics/crafting#crafting",
    reviewedBodySha256:
      "a493ed7559753f135748f60b2fa68869fa45545101b91988112c6c3a34cfb7d4",
  },
  "professions.fishing": {
    href: "/professions/fishing#how-it-works",
    reviewedBodySha256:
      "3cc795ebc3f80ce33806823a3332cad378a43ec1ced90a8f6b2069adaf5a7cce",
  },
  "professions.herbalism": {
    href: "/professions/herbalism#how-it-works",
    reviewedBodySha256:
      "95d530ae488c67653a7002968a91c3e3bb0b30fd879bcebafd22004795856af3",
  },
  "professions.hunting": {
    href: "/professions/hunter#how-it-works",
    reviewedBodySha256:
      "4b4a169b4b0fa8856710950bf8248c225a0c0b62edcc62841da9ca02898a1630",
  },
  "professions.mining": {
    href: "/professions/mining#how-it-works",
    reviewedBodySha256:
      "e0d5f09b4622bdd0c069d20a9f9bf778234090bc06ea241f5cb9308e75ded303",
  },
  "professions.radiant-sparks": {
    href: "/professions/radiant_seeker#how-it-works",
    reviewedBodySha256:
      "d593106287565076aea5cd0789e085f674dd03d96199dc53b99a3ad46a8e5ca9",
  },
  "professions.scroll-mastery": {
    href: "/professions/scroll_mastery#how-it-works",
    reviewedBodySha256:
      "0bee16d6a3ac1234ec34b457df06e14aa87c8a78ddcd81ff638b8a91c1f5d7b4",
  },
  "social.chat-follow": {
    href: "/mechanics/party#chat-and-follow",
    reviewedBodySha256:
      "2d44b477fc54347ddf64bdc50a9a17e67f36c314091795368d83ef43127fe845",
  },
  "social.guild-membership": {
    href: "/mechanics/guilds#membership",
    reviewedBodySha256:
      "64f6fa7c61ea14db5768fb11e5983e1e9741b1ca85d46dd0f17abaf6b0cfb571",
  },
  "social.guild-points": {
    href: "/mechanics/guilds#guild-points",
    reviewedBodySha256:
      "fec84ead69179cf0ed0049d77fdc8368f98ba715214cbd0f04e82a17d0b9a466",
  },
  "social.loot-rolls": {
    href: "/mechanics/party#loot-rolls",
    reviewedBodySha256:
      "b8c9e77fc76b50001b6a63c91280465d0613ec50956a5b7b5b4532f119c9812c",
  },
  "social.party-basics": {
    href: "/mechanics/party#party",
    reviewedBodySha256:
      "83083a4d39d6ccfb66c9d4ea9ac5e4c0f1e92dd4195742a3189279d502602a5a",
  },
  "social.shared-rewards": {
    href: "/mechanics/party#shared-rewards",
    reviewedBodySha256:
      "1ffd6e03b9bdb6dc58c16c81125561e7be0991b7495f51b4e50d02fe43740fd9",
  },
  "world.adventurers-guild": {
    href: "/professions/adventuring#how-it-works",
    reviewedBodySha256:
      "61f052c2df12187b6023d6b36dfb79827425b3e1b07f9ec1cb8eb3d90c563fe5",
  },
  "world.binding-and-travel": {
    href: "/mechanics/world#binding-and-travel",
    reviewedBodySha256:
      "aa2e85ad73cc454f7c910081d9bf6b7ee983a15ba0e1f75d669e0759196377d8",
  },
  "world.boss-encounters": {
    href: "/mechanics/monster-spawns#missing-boss",
    reviewedBodySha256:
      "3218ee1ff45d038d8f69adff5e98c7e0ca4e5207da7b615a48e5b91fedd80591",
  },
  "world.dungeon-renewal": {
    href: "/mechanics/monster-spawns#renewal-sages",
    reviewedBodySha256:
      "31e0156b44ed4dd9a7efeb9e10cfd55f127092f8aa146874762c1a0b3d0ae682",
  },
  "world.events-and-trials": {
    href: "/altars#how-altars-work",
    reviewedBodySha256:
      "5745b4f56540a28727a0287f57977b4d2dca2bd241c3e2cad744e0964e5491fa",
  },
  "world.exploration-and-maps": {
    href: "/mechanics/world#exploration",
    reviewedBodySha256:
      "fd4886caaf890f4aadfef627aaad67786188792da10f264654232e3c231dec68",
  },
  "world.factions-and-ranks": {
    href: "/mechanics/reputation#ladder",
    reviewedBodySha256:
      "633139e46be96c127a9c84b20390270768c6765167488eddb4bd7fa950a90d37",
  },
  "world.game-modes": {
    href: "/mechanics/world#game-modes",
    reviewedBodySha256:
      "57f3266f5b324f8c8dbc8efb0964464ad8b622c67e7d3104d050933e6753196a",
  },
  "world.journal-and-slayer": {
    href: "/professions/slayer#how-it-works",
    reviewedBodySha256:
      "5175b6f1de3f15d60c789e73307d19067914eb591c041ddc34376f265ae803f0",
  },
  "world.map-notes": {
    href: "/mechanics/world#map-notes",
    reviewedBodySha256:
      "588acc6082010f2b05cb2b7a2d356dff70f0158e2df013a34107201437d6f501",
  },
  "world.portals-and-entry": {
    href: "/mechanics/world#portals",
    reviewedBodySha256:
      "c17aa75509f4edb3b0a919c5004f2f2f57190614acfc9972c4a760d6c8bfe1bc",
  },
  "world.quest-availability": {
    href: "/quests#how-quests-work",
    reviewedBodySha256:
      "602706f20b7c4864f2721996e2fe1a7fe3a05a274dea1ba0e01c4cac6de2deef",
  },
  "world.quest-objectives": {
    href: "/quests#how-quests-work",
    reviewedBodySha256:
      "cffaedeb765df3c692e0b726d2c4c9f432dc0ef4a7b066334c505256f0d16122",
  },
};
