
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GameState, Resource, Generator, Item, Character, Achievement, MultiplierValue, CharacterSlotType } from '@/lib/types';
import { initialResources } from '@/config/resources';
import { initialGenerators } from '@/config/generators';
import { initialItems } from '@/config/items';
import { initialCharacters, defaultCharacterId } from '@/config/characters';
import { initialAchievements } from '@/config/achievements';
import { CharacterSlots } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

// Add one of each equippable item by default to startingGear
const startingGear: { itemId: string; quantity: number }[] = Object.values(initialItems)
  .filter(item => item.equippable)
  .map(item => ({ itemId: item.id, quantity: 1 }));

// Define the static parts of the default game state. lastUpdate will be set dynamically.
const staticDefaultGameStateParts: Omit<GameState, 'lastUpdate'> = {
  points: 0,
  resources: JSON.parse(JSON.stringify(initialResources)),
  generators: JSON.parse(JSON.stringify(initialGenerators)),
  inventory: startingGear, // startingGear includes one of each equippable item
  equippedItems: CharacterSlots.reduce((acc, slot) => ({ ...acc, [slot]: null }), {} as GameState['equippedItems']),
  currentCharacterId: defaultCharacterId,
  unlockedAchievements: [],
  permanentBoosts: {
    globalPpsMultiplier: 1.0,
    globalDropRateMultiplier: 1.0,
  },
  settings: {
    currentMultiplier: 1,
    gameSpeed: 1,
  },
  totalClicks: 0,
};

// Function to get a fresh, complete default GameState with current timestamp
const getFreshDefaultGameState = (): GameState => ({
  ...JSON.parse(JSON.stringify(staticDefaultGameStateParts)), // Deep clone static parts
  lastUpdate: Date.now(), // Set current time
});


interface GameContextType {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  performClick: (resourceId?: string) => void;
  buyGenerator: (generatorId: string) => void;
  equipItem: (itemId: string, slot: CharacterSlotType) => void;
  unequipItem: (slot: CharacterSlotType) => void;
  consumeItem: (itemId: string, quantity?: number) => void;
  switchCharacter: (characterId: string) => void;
  setMultiplier: (multiplier: MultiplierValue) => void;
  saveGame: () => void;
  loadGame: () => boolean;
  exportSave: () => void;
  importSave: (jsonData: string) => boolean;
  resetGame: () => void;
  getCharacter: () => Character | null;
  getItem: (itemId: string) => Item | null;
  calculatePps: (resourceId: string) => number;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const BASE_ITEM_DROP_CHANCE = 0.005; // 0.5% base chance

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedGame = typeof window !== 'undefined' ? localStorage.getItem('chronoClickerSave') : null;
    if (savedGame) {
      try {
        const loadedState = JSON.parse(savedGame) as GameState;
        const freshDefault = getFreshDefaultGameState();
        // Merge, ensuring loadedState overwrites defaults where applicable, and lastUpdate is current.
        return { ...freshDefault, ...loadedState, lastUpdate: Date.now() };
      } catch (error) {
        console.error("Failed to parse saved game data:", error);
        return getFreshDefaultGameState(); // Fallback to fresh default
      }
    }
    return getFreshDefaultGameState(); // Fresh start
  });
  const { toast } = useToast();

  const getCharacter = useCallback((): Character | null => {
    if (!gameState.currentCharacterId) return null;
    return initialCharacters[gameState.currentCharacterId] || null;
  }, [gameState.currentCharacterId]);
  
  const getItem = useCallback((itemId: string): Item | null => {
    return initialItems[itemId] || null;
  }, []);


  const calculatePps = useCallback((resourceId: string): number => {
    let totalPps = 0;
    Object.values(gameState.generators).forEach(gen => {
      if (gen.producesResource === resourceId) {
        totalPps += gen.basePps * gen.quantity;
      }
    });

    const character = getCharacter();
    if (character) {
      totalPps *= character.basePpsMultiplier;
    }
    totalPps *= gameState.permanentBoosts.globalPpsMultiplier;

    Object.values(gameState.equippedItems).forEach(itemId => {
      if (itemId) {
        const item = getItem(itemId);
        if (item && item.stats.ppsMultiplier) {
          totalPps *= (1 + item.stats.ppsMultiplier);
        }
        if (item && item.stats.ppsBoost) {
          totalPps += item.stats.ppsBoost;
        }
      }
    });
    
    return totalPps;
  }, [gameState.generators, gameState.equippedItems, gameState.permanentBoosts.globalPpsMultiplier, getCharacter, getItem]);

  useEffect(() => {
    const gameTick = () => {
      setGameState(prev => {
        const newState: GameState = JSON.parse(JSON.stringify(prev));
        const now = Date.now();
        const delta = (now - newState.lastUpdate) / 1000; 

        Object.keys(newState.resources).forEach(resId => {
          const pps = calculatePps(resId);
          if(newState.resources[resId]){
            newState.resources[resId].perSecond = pps;
            newState.resources[resId].amount += pps * delta;
          }
        });
        
        newState.lastUpdate = now;
        return newState;
      });
    };

    const intervalId = setInterval(gameTick, 1000 / gameState.settings.gameSpeed);
    return () => clearInterval(intervalId);
  }, [gameState.settings.gameSpeed, calculatePps]);


  const performClick = useCallback((resourceId: string = 'points') => {
    let itemDroppedThisClick = false;
    let droppedItemName = '';

    setGameState(prev => {
      const newState: GameState = JSON.parse(JSON.stringify(prev));
      
      newState.totalClicks += 1;

      let clickPower = 1;
      Object.values(prev.equippedItems).forEach(itemId => {
        if (itemId) {
          const itemDetails = getItem(itemId);
          if (itemDetails && itemDetails.stats.clickPowerBoost) clickPower += itemDetails.stats.clickPowerBoost;
          if (itemDetails && itemDetails.stats.clickPowerMultiplier) clickPower *= (1 + itemDetails.stats.clickPowerMultiplier);
        }
      });

      if (newState.resources[resourceId]) {
        newState.resources[resourceId].amount += clickPower;
      } else {
        console.warn(`Resource ID "${resourceId}" not found in performClick.`);
      }
      
      const character = getCharacter();
      const characterDropMultiplier = character ? character.baseDropRateMultiplier : 1;
      const globalDropMultiplier = newState.permanentBoosts.globalDropRateMultiplier;
      let finalDropChance = BASE_ITEM_DROP_CHANCE * characterDropMultiplier * globalDropMultiplier;

      const totalGeneratorQuantity = Object.values(newState.generators).reduce((sum, gen) => sum + gen.quantity, 0);
      const generatorDropBonus = Math.min(0.02, (totalGeneratorQuantity / 200) * 0.001); 
      finalDropChance += generatorDropBonus;
      finalDropChance = Math.min(finalDropChance, 0.1); 

      if (Math.random() < finalDropChance) {
        const availableItems = Object.values(initialItems).filter(item => 
            !item.id.startsWith("artifact_") && 
            item.rarity !== 'Epic' && 
            item.rarity !== 'Legendary'
        );
        if (availableItems.length > 0) {
          const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
          
          const existingItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === randomItem.id);
          if (existingItemIndex > -1) {
            newState.inventory[existingItemIndex].quantity += 1;
          } else {
            newState.inventory.push({ itemId: randomItem.id, quantity: 1 });
          }
          itemDroppedThisClick = true;
          droppedItemName = randomItem.name;
        }
      }
      return newState;
    });

    if (itemDroppedThisClick) {
      setTimeout(() => { 
        toast({ title: "Item Found!", description: `You found a ${droppedItemName}!` });
      }, 0);
    }
  }, [getCharacter, getItem, toast, gameState.permanentBoosts.globalDropRateMultiplier, gameState.settings.currentMultiplier ]); // Added missing dependencies that were indirectly used or could affect logic flow.


  const buyGenerator = useCallback((generatorId: string) => {
    setGameState(prev => {
      const generator = prev.generators[generatorId];
      if (!generator) return prev;

      const costResource = prev.resources[generator.costResource];
      if (!costResource) {
        console.warn(`Cost resource ${generator.costResource} not found for generator ${generatorId}`);
        return prev;
      }
      
      const currentMultiplier = prev.settings.currentMultiplier === 'MAX' ? Number.MAX_SAFE_INTEGER : prev.settings.currentMultiplier;
      
      let totalCost = 0;
      let numToBuy = 0;
      
      const tempStateForCostCalc = JSON.parse(JSON.stringify(prev)); // Use a clone for cost calculation

      if (currentMultiplier === Number.MAX_SAFE_INTEGER) {
          let tempQuantity = tempStateForCostCalc.generators[generatorId].quantity;
          for (let i = 0; i < 100000; i++) { 
              const costForThisOne = generator.baseCost * Math.pow(generator.costScale, tempQuantity + i);
              if (tempStateForCostCalc.resources[generator.costResource].amount >= totalCost + costForThisOne) {
                  totalCost += costForThisOne;
                  numToBuy++;
              } else {
                  break;
              }
          }
      } else {
          let tempQuantity = tempStateForCostCalc.generators[generatorId].quantity;
          for (let i = 0; i < currentMultiplier; i++) {
              const costForThisOne = generator.baseCost * Math.pow(generator.costScale, tempQuantity + i);
              if (tempStateForCostCalc.resources[generator.costResource].amount >= totalCost + costForThisOne) {
                  totalCost += costForThisOne;
                  numToBuy++;
              } else {
                  break;
              }
          }
      }

      if (numToBuy === 0) {
        setTimeout(() => {
          toast({ title: "Not enough resources", description: `You need more ${costResource.name} to buy ${generator.name}.`, variant: "destructive" });
        }, 0);
        return prev;
      }

      const newState: GameState = JSON.parse(JSON.stringify(prev)); 

      newState.resources[generator.costResource].amount -= totalCost;
      newState.generators[generatorId].quantity += numToBuy;
      
      let artifactDropped = false;
      let droppedArtifactName = '';
      if (generator.artifactDropRateFormula && generator.artifactIds && generator.artifactIds.length > 0) {
        try {
          const quantity = newState.generators[generatorId].quantity;
          const formulaString = generator.artifactDropRateFormula
            .replace(/\blog\b/gi, "Math.log") 
            .replace(/\bquantity\b/g, String(quantity));
          
          const dropRate = eval(formulaString);

          if (Math.random() < dropRate) {
            const artifactId = generator.artifactIds[Math.floor(Math.random() * generator.artifactIds.length)];
            const existingArtifactIndex = newState.inventory.findIndex(invItem => invItem.itemId === artifactId);
            if (existingArtifactIndex > -1) {
                 newState.inventory[existingArtifactIndex].quantity += 1;
            } else {
                newState.inventory.push({ itemId: artifactId, quantity: 1 });
            }
            const artifact = getItem(artifactId);
            droppedArtifactName = artifact?.name || 'rare artifact';
            artifactDropped = true;
          }
        } catch (e) {
          console.error("Error evaluating artifact drop rate formula:", e);
        }
      }
      
      setTimeout(() => {
        toast({ title: "Generator Purchased!", description: `Bought ${numToBuy} x ${generator.name}` });
        if (artifactDropped) {
            toast({ title: "Artifact Found!", description: `Your ${generator.name} uncovered a ${droppedArtifactName}!` });
        }
      }, 0);
      return newState;
    });
  }, [toast, getItem, gameState.settings.currentMultiplier]);

  const equipItem = useCallback((itemId: string, slot: CharacterSlotType) => {
    setGameState(prev => {
      const itemToEquip = getItem(itemId);
      if (!itemToEquip || !itemToEquip.equippable) {
           setTimeout(() => {
              toast({ title: "Cannot Equip", description: "Item is not equippable.", variant: "destructive"});
           }, 0);
           return prev;
      }
      
      // Check compatibility for the specific slot
      let isCompatible = false;
      if (itemToEquip.slot === slot) { // Direct slot match
        isCompatible = true;
      } else if (itemToEquip.group === AccessoryGroup.Ring && (slot === "Ring1" || slot === "Ring2")) { // Ring logic
        isCompatible = true;
      } else if (itemToEquip.type === ItemType.Armour) {
        if (itemToEquip.group === ArmourGroup.Helmet && slot === "Head") isCompatible = true;
        if (itemToEquip.group === ArmourGroup.Chest && slot === "Body") isCompatible = true;
        if (itemToEquip.group === ArmourGroup.Leggings && slot === "Legs") isCompatible = true;
        if (itemToEquip.group === ArmourGroup.Boots && slot === "Feet") isCompatible = true;
      } else if (itemToEquip.type === ItemType.Weapon && slot === "Weapon") {
        isCompatible = true;
      } else if (itemToEquip.type === ItemType.Accessory) {
        if (itemToEquip.group === AccessoryGroup.Necklace && slot === "Necklace") isCompatible = true;
      }


      if (!isCompatible) {
          setTimeout(() => {
              toast({ title: "Cannot Equip", description: `${itemToEquip.name} cannot be equipped in the ${slot} slot.`, variant: "destructive"});
          }, 0);
          return prev;
      }
      
      const newState: GameState = JSON.parse(JSON.stringify(prev));
      const currentEquippedId = newState.equippedItems[slot];
      newState.equippedItems[slot] = itemId; 

      const itemInInventoryIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (itemInInventoryIndex > -1) {
        newState.inventory[itemInInventoryIndex].quantity -= 1;
        if (newState.inventory[itemInInventoryIndex].quantity <= 0) {
          newState.inventory.splice(itemInInventoryIndex, 1);
        }
      } else {
         console.warn(`Item ${itemId} to be equipped was not found in inventory for quantity decrement.`);
         // If for some reason it's not in inventory, we can't equip. This path should ideally not be hit if UI is correct.
         setTimeout(() => { toast({ title: "Equip Error", description: "Item not found in inventory.", variant: "destructive"}); }, 0);
         return prev; // Revert to previous state if item not found to remove
      }
      
      if (currentEquippedId) { 
        const oldItemDetails = getItem(currentEquippedId);
        if (oldItemDetails) { 
            const existingOldItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === currentEquippedId);
            if (existingOldItemIndex > -1) {
              newState.inventory[existingOldItemIndex].quantity += 1;
            } else {
              newState.inventory.push({ itemId: currentEquippedId, quantity: 1 });
            }
        }
      }
      setTimeout(() => { 
        toast({ title: "Item Equipped", description: `${itemToEquip.name} equipped to ${slot}.` });
      }, 0);
      return newState;
    });
  }, [getItem, toast]);

  const unequipItem = useCallback((slot: CharacterSlotType) => {
    setGameState(prev => {
      const itemIdToUnequip = prev.equippedItems[slot];
      if (!itemIdToUnequip) return prev;

      const item = getItem(itemIdToUnequip);
      const newState: GameState = JSON.parse(JSON.stringify(prev));
      newState.equippedItems[slot] = null;

      const existingItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemIdToUnequip);
      if (existingItemIndex > -1) {
        newState.inventory[existingItemIndex].quantity += 1;
      } else {
        newState.inventory.push({ itemId: itemIdToUnequip, quantity: 1 });
      }
      setTimeout(() => { 
        toast({ title: "Item Unequipped", description: `${item?.name || 'Item'} unequipped from ${slot}.` });
      }, 0);
      return newState;
    });
  }, [getItem, toast]);
  
  const consumeItem = useCallback((itemId: string, quantityToConsume: number = 1) => {
    setGameState(prev => {
      const itemToConsume = getItem(itemId);
      const itemInInventory = prev.inventory.find(invItem => invItem.itemId === itemId);

      if (!itemToConsume || !itemToConsume.consumable || !itemInInventory || itemInInventory.quantity < quantityToConsume) {
        setTimeout(() => { 
          toast({ title: "Cannot Consume", description: "Item not available, not consumable, or insufficient quantity.", variant: "destructive"});
        }, 0);
        return prev;
      }
      
      let tempState: GameState = JSON.parse(JSON.stringify(prev)); 

      for(let i=0; i < quantityToConsume; i++){
        if (itemToConsume.consumeEffect) {
            const effectState = JSON.parse(JSON.stringify(tempState)); 
            const modifiedEffectState = itemToConsume.consumeEffect(effectState);
            tempState = modifiedEffectState;
        }
      }
      
      const currentItemInInventoryIndex = tempState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (currentItemInInventoryIndex > -1 && tempState.inventory[currentItemInInventoryIndex].quantity >= quantityToConsume) {
        tempState.inventory[currentItemInInventoryIndex].quantity -= quantityToConsume;
        if (tempState.inventory[currentItemInInventoryIndex].quantity <= 0) {
          tempState.inventory.splice(currentItemInInventoryIndex, 1);
        }
      }
      
      setTimeout(() => { 
        toast({ title: "Item Consumed", description: `${quantityToConsume} x ${itemToConsume.name} consumed.` });
      }, 0);
      return tempState;
    });
  }, [getItem, toast]);

  const switchCharacter = useCallback((characterId: string) => {
    if (!initialCharacters[characterId]) {
      setTimeout(() => { 
        toast({ title: "Invalid Character", variant: "destructive" });
      }, 0);
      return;
    }
    setGameState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.currentCharacterId = characterId;
      // When switching characters, unequip all items and return them to inventory
      Object.keys(newState.equippedItems).forEach(slotKey => {
        const slot = slotKey as CharacterSlotType;
        const itemId = newState.equippedItems[slot];
        if (itemId) {
          const itemIndex = newState.inventory.findIndex(inv => inv.itemId === itemId);
          if (itemIndex > -1) {
            newState.inventory[itemIndex].quantity += 1;
          } else {
            newState.inventory.push({ itemId: itemId, quantity: 1 });
          }
          newState.equippedItems[slot] = null;
        }
      });
      return newState;
    }); 
    setTimeout(() => { 
      toast({ title: "Character Switched", description: `Now playing as ${initialCharacters[characterId].name}. All items returned to inventory.` });
    }, 0);
  }, [toast]);

  const setMultiplier = useCallback((multiplier: MultiplierValue) => {
    setGameState(prev => ({ ...JSON.parse(JSON.stringify(prev)), settings: { ...JSON.parse(JSON.stringify(prev.settings)), currentMultiplier: multiplier } }));
  }, []);
  
  useEffect(() => {
    let stateChangedByAchievement = false;
    let achievementToastMessages: Array<{title: string, description: string}> = [];
    
    const newlyUnlockedAchievementsDetails: Achievement[] = [];

    Object.values(initialAchievements).forEach(ach => {
        if (!gameState.unlockedAchievements.includes(ach.id) && ach.condition(gameState)) {
            newlyUnlockedAchievementsDetails.push(ach);
            achievementToastMessages.push({ title: "Achievement Unlocked!", description: ach.name });
            stateChangedByAchievement = true;
        }
    });

    if (stateChangedByAchievement) {
        setGameState(prev => {
            const newState: GameState = JSON.parse(JSON.stringify(prev));
            newState.unlockedAchievements = [...newState.unlockedAchievements, ...newlyUnlockedAchievementsDetails.map(ach => ach.id)];

            newlyUnlockedAchievementsDetails.forEach(ach => {
                if (ach.reward.points) {
                    Object.entries(ach.reward.points).forEach(([resId, amount]) => {
                        if (newState.resources[resId]) newState.resources[resId].amount += amount;
                    });
                }
                if (ach.reward.items) {
                    ach.reward.items.forEach(rewardItem => {
                        const existingItem = newState.inventory.find(invItem => invItem.itemId === rewardItem.itemId);
                        if (existingItem) {
                            existingItem.quantity += rewardItem.quantity;
                        } else {
                            newState.inventory.push({ itemId: rewardItem.itemId, quantity: rewardItem.quantity });
                        }
                    });
                }
                if (ach.reward.permanentBoosts) {
                    const { stat, value } = ach.reward.permanentBoosts;
                     if (stat === 'globalPpsMultiplier' || stat === 'globalDropRateMultiplier') {
                        newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 1.0) + value; 
                     } else {
                        const currentBoostValue = typeof (newState.permanentBoosts as any)[stat] === 'number' ? (newState.permanentBoosts as any)[stat] : 0;
                        (newState.permanentBoosts as any)[stat] = currentBoostValue + value;
                     }
                }
            });
            return newState;
        });

        achievementToastMessages.forEach(msg => setTimeout(() => toast(msg), 0)); 
    }
  }, [gameState.totalClicks, gameState.resources, gameState.generators, gameState.unlockedAchievements, toast]); // Dependencies for achievements

  const saveGame = useCallback(() => {
    try {
      const currentState = JSON.parse(JSON.stringify(gameState)); 
      localStorage.setItem('chronoClickerSave', JSON.stringify(currentState));
    } catch (error)
      {
      console.error("Failed to save game:", error);
      setTimeout(() => toast({ title: "Auto-Save Failed", variant: "destructive" }), 0); 
    }
  }, [gameState, toast]); 

  const loadGame = useCallback((): boolean => {
    try {
      const savedGame = localStorage.getItem('chronoClickerSave');
      if (savedGame) {
        const loadedState = JSON.parse(savedGame) as GameState;
        const freshDefault = getFreshDefaultGameState();
        setGameState({ ...freshDefault, ...loadedState, lastUpdate: Date.now() });
        setTimeout(() => toast({ title: "Game Loaded!" }), 0); 
        return true;
      }
    } catch (error) {
      console.error("Failed to load game:", error);
      setTimeout(() => toast({ title: "Load Failed", description: "Save data might be corrupted.", variant: "destructive" }), 0); 
    }
    return false;
  }, [toast]); 

  const exportSave = useCallback(() => {
    try {
      const jsonString = JSON.stringify(gameState);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chronoClickerSave.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTimeout(() => toast({ title: "Save Exported!" }), 0); 
    } catch (error) {
      console.error("Failed to export save:", error);
      setTimeout(() => toast({ title: "Export Failed", variant: "destructive" }), 0); 
    }
  }, [gameState, toast]); 

  const importSave = useCallback((jsonData: string): boolean => {
    try {
      const importedState = JSON.parse(jsonData) as GameState;
      if (importedState && typeof importedState.resources === 'object' && typeof importedState.generators === 'object') {
        const freshDefault = getFreshDefaultGameState();
        setGameState({ ...freshDefault, ...importedState, lastUpdate: Date.now() });
        setTimeout(() => toast({ title: "Save Imported Successfully!" }), 0); 
        return true;
      } else {
        setTimeout(() => toast({ title: "Import Failed", description: "Invalid save file format.", variant: "destructive" }), 0); 
        return false;
      }
    } catch (error) {
      console.error("Failed to import save:", error);
      setTimeout(() => toast({ title: "Import Failed", description: "Could not parse save file.", variant: "destructive" }), 0); 
      return false;
    }
  }, [toast]); 

  const resetGame = useCallback(() => {
    if(window.confirm("Are you sure you want to reset your game? All progress will be lost.")) {
      setGameState(getFreshDefaultGameState());
      localStorage.removeItem('chronoClickerSave');
      setTimeout(() => toast({ title: "Game Reset", description: "Your progress has been reset." }), 0); 
    }
  }, [toast]); 
  
  useEffect(() => {
    const autoSaveInterval = setInterval(saveGame, 10000); // Auto-save every 10 seconds
    return () => clearInterval(autoSaveInterval);
  }, [saveGame]); 

  return (
    <GameContext.Provider value={{ 
        gameState, setGameState, performClick, buyGenerator, equipItem, unequipItem, consumeItem,
        switchCharacter, setMultiplier, saveGame, loadGame, exportSave, importSave, resetGame,
        getCharacter, getItem, calculatePps
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

