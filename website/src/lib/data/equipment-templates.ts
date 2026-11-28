// Source: server-scripts/PlayerEquipment.cs:GetEquipmentTemplateUnlockPrice — template 1 is free and templates 2 to 5 cost gold. Mercenaries unlock their templates at the same prices.
export const EQUIPMENT_TEMPLATE_COSTS = [0, 1000, 3000, 5000, 10000] as const;

// Source: server-scripts/MercenaryEquipment.cs:MaxEquipmentTemplates
export const MERCENARY_EQUIPMENT_TEMPLATES = 3;
