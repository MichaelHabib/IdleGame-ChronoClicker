
// Core Resources
export interface Resource {
  id: string;
  name: string;
  amount: number;
  perSecond: number;
  icon?: string; // Lucide icon name or SVG path
}

// Generators (Upgrades)
export interface Generator {
  id: string;
  name: string;
  description: string;
  icon?: string;
  baseCost: number;
  costResource: string; // ID of the resource used to buy this generator
  costScale: number; // e.g., 1.15 for 15% increase per purchase
  basePps: number; // Points per second this generator produces at quantity 1
  producesResource: string; // ID of the resource this generator produces
  quantity: number;
  artifactDropRateFormula?: string; // e.g., "log(quantity)/10" - for specific artifact drops
  artifactIds?: string[]; // IDs of artifacts this generator can drop
}

// Items
export enum ItemType {
  Armour = "Armour",
  Weapon = "Weapon",
  Accessory = "Accessory",
  Consumable = "Consumable",
}

export enum ArmourGroup {
  Helmet = "Helmet",
  Chest = "Chest",
  Leggings = "Leggings",
  Boots = "Boots",
}

export enum WeaponGroup {
  Knife = "Knife",
  Sword = "Sword",
  Bow = "Bow",
  Staff = "Staff",
}

export enum AccessoryGroup {
  Necklace = "Necklace",
  Ring = "Ring",
}

export enum ItemMaterial {
  // Armour
  Leather = "Leather",
  Copper = "Copper", // Shared
  Iron = "Iron",     // Shared
  Gold = "Gold",     // Shared
  Diamond = "Diamond", // Shared
  // Weapon
  Wood = "Wood",
  // Accessory (generic, or add specific like Gemstone, Silver)
  Metal = "Metal", 
  Gem = "Gem",
}

export interface ItemStats {
  ppsBoost?: number; // Flat PPS boost
  ppsMultiplier?: number; // Multiplicative PPS boost (e.g., 0.05 for 5%)
  dropRateBoost?: number; // Multiplicative drop rate boost
  clickPowerBoost?: number; // Flat click power boost
  clickPowerMultiplier?: number; // Multiplicative click power boost
  armorValue?: number;
  damageValue?: number;
  [key: string]: any; // For other arbitrary stats
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: ItemType;
  group?: ArmourGroup | WeaponGroup | AccessoryGroup | string; // string for consumables group
  material?: ItemMaterial | string;
  stats: ItemStats;
  equippable: boolean;
  slot?: string; // e.g., "head", "weapon", "ring1"
  consumable: boolean;
  consumeEffect?: (gameState: GameState) => GameState; // Function to apply effect
  passiveBonus?: boolean; // If true, grants bonus just by being in inventory (rare)
  value?: number; // For selling, if implemented
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
}

// Character
export type CharacterSlotType = 'Head' | 'Body' | 'Legs' | 'Feet' | 'Weapon' | 'Necklace' | 'Ring1' | 'Ring2';
export const CharacterSlots: CharacterSlotType[] = ['Head', 'Body', 'Legs', 'Feet', 'Weapon', 'Necklace', 'Ring1', 'Ring2'];

export interface Character {
  id: string;
  name: string;
  description: string;
  icon?: string;
  basePpsMultiplier: number; // e.g., 1.0 for no bonus, 1.1 for 10%
  baseDropRateMultiplier: number; // e.g., 1.0 for no bonus, 1.2 for 20%
  // inventorySlots defined by CharacterSlotType array
}

// Achievements
export interface AchievementReward {
  points?: Record<string, number>; // ResourceID: amount
  items?: { itemId: string; quantity: number }[];
  permanentBoosts?: {
    stat: string; // e.g., "globalPpsMultiplier", "globalDropRateMultiplier"
    value: number; // Multiplier or flat value depending on stat
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  // Condition will be evaluated against GameState in GameContext
  condition: (gameState: GameState) => boolean;
  reward: AchievementReward;
  unlocked: boolean;
}

// Multiplier
export type MultiplierValue = 1 | 5 | 10 | 25 | 50 | 250 | 1000 | 10000 | 100000 | 1000000 | 'MAX';


// Game State
export interface GameState {
  points: number; // Primary currency, can be deprecated if resources are robust
  resources: Record<string, Resource>; // Indexed by resource ID
  generators: Record<string, Generator>; // Indexed by generator ID
  inventory: { itemId: string; quantity: number }[];
  equippedItems: Partial<Record<CharacterSlotType, string | null>>; // slotType: itemId
  currentCharacterId: string | null;
  unlockedAchievements: string[]; // list of achievement IDs
  permanentBoosts: {
    globalPpsMultiplier: number;
    globalDropRateMultiplier: number;
    [key: string]: number; // For other boosts
  };
  settings: {
    currentMultiplier: MultiplierValue;
    gameSpeed: number; // Base 1, affects game ticks
  };
  lastUpdate: number; // Timestamp of the last game loop tick
  totalClicks: number;
}
