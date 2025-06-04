
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


const defaultGameState: GameState = {
  points: 0,
  resources: JSON.parse(JSON.stringify(initialResources)),
  generators: JSON.parse(JSON.stringify(initialGenerators)),
  inventory: [],
  equippedItems: CharacterSlots.reduce((acc, slot) => ({ ...acc, [slot]: null }), {}),
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
  lastUpdate: Date.now(),
  totalClicks: 0,
};

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

const BASE_ITEM_DROP_CHANCE = 0.005; // 0.5% base chance to drop an item on click

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedGame = typeof window !== 'undefined' ? localStorage.getItem('chronoClickerSave') : null;
    if (savedGame) {
      try {
        const loadedState = JSON.parse(savedGame) as GameState;
        // Ensure new fields from defaultGameState are present if loading an older save
        const cleanDefault = JSON.parse(JSON.stringify(defaultGameState));
        return { ...cleanDefault, ...loadedState };
      } catch (error) {
        console.error("Failed to parse saved game data:", error);
        return JSON.parse(JSON.stringify(defaultGameState));
      }
    }
    return JSON.parse(JSON.stringify(defaultGameState));
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
        const newState = { ...prev };
        newState.resources = JSON.parse(JSON.stringify(prev.resources)); // Deep copy resources
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
      const newState = { ...prev };
      newState.resources = JSON.parse(JSON.stringify(prev.resources));
      newState.generators = JSON.parse(JSON.stringify(prev.generators)); // ensure generators are copied for accurate count
      newState.inventory = [...prev.inventory];
      newState.totalClicks = prev.totalClicks + 1;

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
      
      // Simplified loot drop logic
      const character = getCharacter();
      const characterDropMultiplier = character ? character.baseDropRateMultiplier : 1;
      const globalDropMultiplier = newState.permanentBoosts.globalDropRateMultiplier;
      let finalDropChance = BASE_ITEM_DROP_CHANCE * characterDropMultiplier * globalDropMultiplier;

      // Add a small bonus based on total generator quantity
      const totalGeneratorQuantity = Object.values(newState.generators).reduce((sum, gen) => sum + gen.quantity, 0);
      const generatorDropBonus = Math.min(0.02, (totalGeneratorQuantity / 200) * 0.001); // Max 2% additive bonus, 0.1% per 200 levels
      finalDropChance += generatorDropBonus;
      finalDropChance = Math.min(finalDropChance, 0.1); // Cap overall drop chance at 10% per click

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
            newState.inventory[existingItemIndex] = {
              ...newState.inventory[existingItemIndex],
              quantity: newState.inventory[existingItemIndex].quantity + 1,
            };
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
      setTimeout(() => { // Defer toast to avoid state update warnings
        toast({ title: "Item Found!", description: `You found a ${droppedItemName}!` });
      }, 0);
    }
  }, [getCharacter, getItem, toast, gameState.permanentBoosts.globalDropRateMultiplier, gameState.resources, gameState.equippedItems, gameState.generators ]);


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
      let currentCalcCost = generator.baseCost * Math.pow(generator.costScale, generator.quantity);

      if (currentMultiplier === Number.MAX_SAFE_INTEGER) {
          // Buy MAX: loop until cannot afford or a high limit is reached
          // Cap numToBuy to prevent potential infinite loops with rounding or very low costs.
          let tempQuantity = generator.quantity;
          for (let i = 0; i < 100000; i++) { // Limit max purchases in one MAX click for performance
              const costForThisOne = generator.baseCost * Math.pow(generator.costScale, tempQuantity + i);
              if (costResource.amount >= totalCost + costForThisOne) {
                  totalCost += costForThisOne;
                  numToBuy++;
              } else {
                  break;
              }
          }
      } else {
          for (let i = 0; i < currentMultiplier; i++) {
              const costForThisOne = generator.baseCost * Math.pow(generator.costScale, generator.quantity + i);
              if (costResource.amount >= totalCost + costForThisOne) {
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

      const newState = { ...prev };
      newState.resources = JSON.parse(JSON.stringify(prev.resources));
      newState.generators = JSON.parse(JSON.stringify(prev.generators));
      newState.inventory = [...prev.inventory]; // Create a new array for inventory

      newState.resources[generator.costResource].amount -= totalCost;
      newState.generators[generatorId].quantity += numToBuy;
      
      let artifactDropped = false;
      let droppedArtifactName = '';
      if (generator.artifactDropRateFormula && generator.artifactIds && generator.artifactIds.length > 0) {
        try {
          const quantity = newState.generators[generatorId].quantity;
          // Ensure Math.log is used
          const formulaString = generator.artifactDropRateFormula
            .replace(/\blog\b/gi, "Math.log") // case-insensitive replace for "log"
            .replace(/\bquantity\b/g, String(quantity));
          
          const dropRate = eval(formulaString);

          if (Math.random() < dropRate) {
            const artifactId = generator.artifactIds[Math.floor(Math.random() * generator.artifactIds.length)];
            const existingArtifactIndex = newState.inventory.findIndex(invItem => invItem.itemId === artifactId);
            if (existingArtifactIndex > -1) {
                 newState.inventory[existingArtifactIndex] = {...newState.inventory[existingArtifactIndex], quantity: newState.inventory[existingArtifactIndex].quantity + 1};
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
      // Validate item and slot compatibility
      if (!itemToEquip || !itemToEquip.equippable || (itemToEquip.slot && itemToEquip.slot !== slot && !(itemToEquip.group === "Ring" && (slot === "Ring1" || slot === "Ring2")) )) {
        // Allow rings to go into Ring1 or Ring2 if item.slot is generically "Ring"
        if(!(itemToEquip?.group === "Ring" && (slot === "Ring1" || slot === "Ring2") && itemToEquip.slot === "Ring")){
             setTimeout(() => {
                toast({ title: "Cannot Equip", description: "Item cannot be equipped in this slot.", variant: "destructive"});
             }, 0);
             return prev;
        }
      }
      
      const currentEquippedId = prev.equippedItems[slot];
      const newState = { ...prev };
      newState.equippedItems = {...prev.equippedItems, [slot]: itemId }; 
      newState.inventory = [...prev.inventory]; 

      const itemInInventoryIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (itemInInventoryIndex > -1) {
        newState.inventory[itemInInventoryIndex] = {...newState.inventory[itemInInventoryIndex], quantity: newState.inventory[itemInInventoryIndex].quantity - 1};
        if (newState.inventory[itemInInventoryIndex].quantity <= 0) {
          newState.inventory.splice(itemInInventoryIndex, 1);
        }
      } else {
         // This can happen if an item is gained through means other than loot drop/purchase (e.g. achievement)
         // and not added to inventory correctly before equipping. For now, log a warning.
         console.warn(`Item ${itemId} to be equipped was not found in inventory for quantity decrement.`);
      }
      
      if (currentEquippedId) { // If there was an item previously equipped in the slot
        const oldItemDetails = getItem(currentEquippedId);
        if (oldItemDetails) { // Ensure we know details about the old item
            const existingOldItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === currentEquippedId);
            if (existingOldItemIndex > -1) {
              newState.inventory[existingOldItemIndex] = {...newState.inventory[existingOldItemIndex], quantity: newState.inventory[existingOldItemIndex].quantity + 1};
            } else {
              newState.inventory.push({ itemId: currentEquippedId, quantity: 1 });
            }
        }
      }
      setTimeout(() => { // Defer toast
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
      const newState = { ...prev };
      newState.equippedItems = {...prev.equippedItems, [slot]: null};
      newState.inventory = [...prev.inventory];

      const existingItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemIdToUnequip);
      if (existingItemIndex > -1) {
        newState.inventory[existingItemIndex] = {...newState.inventory[existingItemIndex], quantity: newState.inventory[existingItemIndex].quantity + 1};
      } else {
        newState.inventory.push({ itemId: itemIdToUnequip, quantity: 1 });
      }
      setTimeout(() => { // Defer toast
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
        setTimeout(() => { // Defer toast
          toast({ title: "Cannot Consume", description: "Item not available, not consumable, or insufficient quantity.", variant: "destructive"});
        }, 0);
        return prev;
      }
      
      let tempState = { ...prev }; 
      tempState.resources = JSON.parse(JSON.stringify(prev.resources)); // Deep copy resources
      tempState.inventory = tempState.inventory.map(i => ({...i})); // Deep copy inventory items


      for(let i=0; i < quantityToConsume; i++){
        if (itemToConsume.consumeEffect) {
            // Pass a fresh copy of the gameState slice that the effect might modify
            const effectState = { 
                ...tempState, 
                resources: JSON.parse(JSON.stringify(tempState.resources)),
                inventory: tempState.inventory.map(inv => ({...inv})) // Deep copy inventory for effect
            };
            const modifiedEffectState = itemToConsume.consumeEffect(effectState);
            // Merge back changes from effect
            tempState.resources = modifiedEffectState.resources;
            tempState.inventory = modifiedEffectState.inventory; 
        }
      }
      
      // After all effects, update inventory for the consumed item itself
      const currentItemInInventoryIndex = tempState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (currentItemInInventoryIndex > -1 && tempState.inventory[currentItemInInventoryIndex].quantity >= quantityToConsume) {
        tempState.inventory[currentItemInInventoryIndex].quantity -= quantityToConsume;
        if (tempState.inventory[currentItemInInventoryIndex].quantity <= 0) {
          tempState.inventory.splice(currentItemInInventoryIndex, 1);
        }
      } else {
         // This might happen if consumeEffect itself removes the item, which is fine.
         // console.warn(`Item ${itemId} not found or insufficient quantity after consumeEffect.`);
      }
      
      setTimeout(() => { // Defer toast
        toast({ title: "Item Consumed", description: `${quantityToConsume} x ${itemToConsume.name} consumed.` });
      }, 0);
      return tempState;
    });
  }, [getItem, toast]);

  const switchCharacter = useCallback((characterId: string) => {
    if (!initialCharacters[characterId]) {
      setTimeout(() => { // Defer toast
        toast({ title: "Invalid Character", variant: "destructive" });
      }, 0);
      return;
    }
    setGameState(prev => ({ ...prev, currentCharacterId: characterId, equippedItems: CharacterSlots.reduce((acc, slot) => ({ ...acc, [slot]: null }), {}) })); // Reset equipped items on character switch
    setTimeout(() => { // Defer toast
      toast({ title: "Character Switched", description: `Now playing as ${initialCharacters[characterId].name}.` });
    }, 0);
  }, [toast]);

  const setMultiplier = useCallback((multiplier: MultiplierValue) => {
    setGameState(prev => ({ ...prev, settings: { ...prev.settings, currentMultiplier: multiplier } }));
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
            const newState = { ...prev };
            newState.resources = JSON.parse(JSON.stringify(prev.resources));
            newState.inventory = [...prev.inventory];
            newState.permanentBoosts = JSON.parse(JSON.stringify(prev.permanentBoosts));
            newState.unlockedAchievements = [...prev.unlockedAchievements, ...newlyUnlockedAchievementsDetails.map(ach => ach.id)];

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
                        // Ensure base is 1.0 for multipliers before adding percentage
                        newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 1.0) + value; 
                     } else {
                        newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 0) + value;
                     }
                }
            });
            return newState;
        });

        achievementToastMessages.forEach(msg => setTimeout(() => toast(msg), 0)); // Defer toasts
    }
  }, [gameState, toast]); // gameState as dependency is correct here

  const saveGame = useCallback(() => {
    try {
      const currentState = gameState; // Use a snapshot of gameState at the time of saving
      localStorage.setItem('chronoClickerSave', JSON.stringify(currentState));
      // console.log("Game saved at", new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to save game:", error);
      setTimeout(() => toast({ title: "Auto-Save Failed", variant: "destructive" }), 0); // Defer toast
    }
  }, [gameState, toast]); // gameState as dependency for saveGame is fine.

  const loadGame = useCallback((): boolean => {
    try {
      const savedGame = localStorage.getItem('chronoClickerSave');
      if (savedGame) {
        const loadedState = JSON.parse(savedGame) as GameState;
        const cleanDefault = JSON.parse(JSON.stringify(defaultGameState)); // Deep copy of default
        setGameState({ ...cleanDefault, ...loadedState }); // Merge with default to pick up new fields
        setTimeout(() => toast({ title: "Game Loaded!" }), 0); // Defer toast
        return true;
      }
    } catch (error) {
      console.error("Failed to load game:", error);
      setTimeout(() => toast({ title: "Load Failed", description: "Save data might be corrupted.", variant: "destructive" }), 0); // Defer toast
    }
    return false;
  }, [setGameState, toast]); // setGameState, toast are stable

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
      setTimeout(() => toast({ title: "Save Exported!" }), 0); // Defer toast
    } catch (error) {
      console.error("Failed to export save:", error);
      setTimeout(() => toast({ title: "Export Failed", variant: "destructive" }), 0); // Defer toast
    }
  }, [gameState, toast]); // gameState as dependency

  const importSave = useCallback((jsonData: string): boolean => {
    try {
      const importedState = JSON.parse(jsonData) as GameState;
      if (importedState && typeof importedState.resources === 'object' && typeof importedState.generators === 'object') {
        const cleanDefault = JSON.parse(JSON.stringify(defaultGameState));
        setGameState({ ...cleanDefault, ...importedState });
        setTimeout(() => toast({ title: "Save Imported Successfully!" }), 0); // Defer toast
        return true;
      } else {
        setTimeout(() => toast({ title: "Import Failed", description: "Invalid save file format.", variant: "destructive" }), 0); // Defer toast
        return false;
      }
    } catch (error) {
      console.error("Failed to import save:", error);
      setTimeout(() => toast({ title: "Import Failed", description: "Could not parse save file.", variant: "destructive" }), 0); // Defer toast
      return false;
    }
  }, [setGameState, toast]); // setGameState, toast are stable

  const resetGame = useCallback(() => {
    if(window.confirm("Are you sure you want to reset your game? All progress will be lost.")) {
      setGameState(JSON.parse(JSON.stringify(defaultGameState))); 
      localStorage.removeItem('chronoClickerSave');
      setTimeout(() => toast({ title: "Game Reset", description: "Your progress has been reset." }), 0); // Defer toast
    }
  }, [toast, setGameState]); // toast, setGameState are stable
  
  useEffect(() => {
    const autoSaveInterval = setInterval(saveGame, 30000); // Auto-save every 30 seconds
    return () => clearInterval(autoSaveInterval);
  }, [saveGame]); // saveGame is stable due to its own useCallback.

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
