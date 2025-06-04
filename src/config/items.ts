import type { Item } from '@/lib/types';
import { ItemType, ArmourGroup, WeaponGroup, AccessoryGroup, ItemMaterial } from '@/lib/types';

export const initialItems: Record<string, Item> = {
  // --- Armour ---
  // Leather Set
  leatherHelmet: {
    id: 'leatherHelmet',
    name: 'Leather Helmet',
    description: 'Basic head protection.',
    icon: 'Shield', // Placeholder, find better icon like a helmet
    type: ItemType.Armour,
    group: ArmourGroup.Helmet,
    material: ItemMaterial.Leather,
    stats: { armorValue: 1, ppsBoost: 1 },
    equippable: true,
    slot: 'Head',
    consumable: false,
    rarity: 'Common',
  },
  leatherChestplate: {
    id: 'leatherChestplate',
    name: 'Leather Chestplate',
    description: 'Simple leather body armour.',
    icon: 'Shirt', // Placeholder
    type: ItemType.Armour,
    group: ArmourGroup.Chest,
    material: ItemMaterial.Leather,
    stats: { armorValue: 2, ppsBoost: 2 },
    equippable: true,
    slot: 'Body',
    consumable: false,
    rarity: 'Common',
  },

  // --- Weapons ---
  woodenKnife: {
    id: 'woodenKnife',
    name: 'Wooden Knife',
    description: 'A crudely fashioned wooden knife.',
    icon: 'PocketKnife',
    type: ItemType.Weapon,
    group: WeaponGroup.Knife,
    material: ItemMaterial.Wood,
    stats: { damageValue: 1, clickPowerBoost: 1 },
    equippable: true,
    slot: 'Weapon',
    consumable: false,
    rarity: 'Common',
  },
  
  // --- Accessories ---
  simpleRing: {
    id: 'simpleRing',
    name: 'Simple Ring',
    description: 'A plain metal ring. Slightly boosts focus.',
    icon: 'Disc', // Placeholder for Ring icon
    type: ItemType.Accessory,
    group: AccessoryGroup.Ring,
    material: ItemMaterial.Metal,
    stats: { ppsMultiplier: 0.01 }, // 1% PPS boost
    equippable: true,
    slot: 'Ring1', // Can be equipped in Ring1 or Ring2
    consumable: false,
    rarity: 'Common',
  },

  // --- Consumables ---
  minorPpsPotion: {
    id: 'minorPpsPotion',
    name: 'Minor PPS Potion',
    description: 'Temporarily boosts PPS by a small amount.',
    icon: 'TestTube',
    type: ItemType.Consumable,
    group: 'Potion',
    stats: {}, // Effect handled by consumeEffect
    equippable: false,
    consumable: true,
    consumeEffect: (gameState) => {
      // Example: Add a temporary boost or directly add points
      // This requires a more complex state for temporary effects
      // For now, let's say it gives instant points based on current PPS
      const pointsToAdd = (gameState.resources['points']?.perSecond || 1) * 10;
      gameState.resources['points'].amount += pointsToAdd;
      // In a real scenario, you'd add to a temporary buffs list in GameState
      return gameState;
    },
    rarity: 'Common',
  },

  // --- Artifacts ---
  artifact_time_crystal: {
    id: 'artifact_time_crystal',
    name: 'Time Crystal Shard',
    description: 'A fragment of crystallized time. Boosts Chrono Shard generation slightly when equipped.',
    icon: 'Diamond',
    type: ItemType.Accessory, // Or a new "Artifact" type if they have unique behaviors
    group: AccessoryGroup.Necklace, // Example, could be any slot or passive
    stats: { ppsMultiplier: 0.02 }, // 2% boost to all PPS
    equippable: true,
    slot: 'Necklace',
    consumable: false,
    rarity: 'Rare',
  },
  artifact_gold_nugget: {
    id: 'artifact_gold_nugget',
    name: 'Pulsing Gold Nugget',
    description: 'This nugget of ancient gold hums with energy, increasing gold find rate.',
    icon: 'Gem',
    type: ItemType.Accessory,
    group: AccessoryGroup.Ring,
    stats: { dropRateBoost: 0.05 }, // 5% boost to global drop rate
    equippable: true,
    slot: 'Ring2',
    consumable: false,
    rarity: 'Rare',
  }
};
