import { SITE_NAME, SITE_URL, canonicalUrl } from "./site";

export const SITE_ID = `${SITE_URL}/#website`;
export const ORG_ID = `${SITE_URL}/#org`;
export const AUTHOR_ID = `${SITE_URL}/#author`;
export const LOGO_PATH = "/icons/pwa-512.png";

const AUTHOR_NAME = "WoW_Much";
const AUTHOR_KOFI_URL = "https://ko-fi.com/wowmuch";
const AUTHOR_STEAM_URL =
  "https://steamcommunity.com/profiles/76561198107304856/";

const ORG_DESCRIPTION =
  "Fan-made wiki, interactive world map, and game database for Ancient Kingdoms";

interface IdRef {
  "@id": string;
}

interface ImageObjectNode {
  "@type": "ImageObject";
  url: string;
  width: number;
  height: number;
}

export interface WebSiteNode {
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  inLanguage: string;
  publisher: IdRef;
}

export function buildWebSite(): WebSiteNode {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export interface OrganizationNode {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  description: string;
  logo: ImageObjectNode;
  founder: IdRef;
}

export function buildOrganization(): OrganizationNode {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: ORG_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}${LOGO_PATH}`,
      width: 512,
      height: 512,
    },
    founder: { "@id": AUTHOR_ID },
  };
}

export interface PersonNode {
  "@type": "Person";
  "@id": string;
  name: string;
  url: string;
  sameAs: string[];
}

export function buildPerson(): PersonNode {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: AUTHOR_NAME,
    url: AUTHOR_KOFI_URL,
    sameAs: [AUTHOR_KOFI_URL, AUTHOR_STEAM_URL],
  };
}

export interface CollectionItem {
  name: string;
  path: string;
}

export interface CollectionPageSpec {
  path: string;
  name: string;
  description?: string;
  items: CollectionItem[];
}

interface ItemListEntry {
  "@type": "ListItem";
  position: number;
  name: string;
  url: string;
}

export interface CollectionPageNode {
  "@type": "CollectionPage";
  "@id": string;
  url: string;
  name: string;
  description?: string;
  isPartOf: IdRef;
  mainEntity: {
    "@type": "ItemList";
    numberOfItems: number;
    itemListOrder: "https://schema.org/ItemListOrderAscending";
    itemListElement: ItemListEntry[];
  };
}

export function buildCollectionPage(
  spec: CollectionPageSpec,
): CollectionPageNode {
  const node: CollectionPageNode = {
    "@type": "CollectionPage",
    "@id": `${canonicalUrl(spec.path)}#page`,
    url: canonicalUrl(spec.path),
    name: spec.name,
    isPartOf: { "@id": SITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: spec.items.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: spec.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: canonicalUrl(item.path),
      })),
    },
  };
  if (spec.description) node.description = spec.description;
  return node;
}

export type JsonLdNode =
  | WebSiteNode
  | OrganizationNode
  | PersonNode
  | CollectionPageNode;
