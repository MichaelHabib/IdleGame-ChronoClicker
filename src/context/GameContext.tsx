
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
import { orchestrateLootDrop, type LootDropOrchestrationInput } from '@/ai/flows/loot-drop-orchestrator';
import { useToast } from "@/hooks/use-toast";


const defaultGameState: GameState = {
  points: 0, // Kept for simplicity, but primary resource is 'points' in resources map
  resources: JSON.parse(JSON.stringify(initialResources)), // Deep copy
  generators: JSON.parse(JSON.stringify(initialGenerators)), // Deep copy
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
    gameSpeed: 1, // Ticks per second for game loop
  },
  lastUpdate: Date.now(),
  totalClicks: 0,
  generatorTotalPurchases: Object.keys(initialGenerators).reduce((acc, key) => ({...acc, [key]: 0}), {}),
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

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>(() => {
     // Load game state from localStorage on initial load
    const savedGame = typeof window !== 'undefined' ? localStorage.getItem('chronoClickerSave') : null;
    if (savedGame) {
      try {
        return JSON.parse(savedGame) as GameState;
      } catch (error) {
        console.error("Failed to parse saved game data:", error);
        return JSON.parse(JSON.stringify(defaultGameState)); // Fallback to default if parsing fails
      }
    }
    return JSON.parse(JSON.stringify(defaultGameState)); // Deep copy
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

    // Apply item boosts
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

  // Game Loop
  useEffect(() => {
    const gameTick = () => {
      setGameState(prev => {
        const newState = { ...prev };
        // Deep copy resources to ensure mutations are safe
        newState.resources = JSON.parse(JSON.stringify(prev.resources));
        const now = Date.now();
        const delta = (now - newState.lastUpdate) / 1000; // seconds

        Object.keys(newState.resources).forEach(resId => {
          const pps = calculatePps(resId);
          newState.resources[resId].perSecond = pps; // Update displayed PPS
          newState.resources[resId].amount += pps * delta;
        });
        
        newState.lastUpdate = now;
        return newState;
      });
    };

    const intervalId = setInterval(gameTick, 1000 / gameState.settings.gameSpeed);
    return () => clearInterval(intervalId);
  }, [gameState.settings.gameSpeed, calculatePps]);


  const performClick = useCallback(async (resourceId: string = 'points') => {
    // Part 1: Synchronous click effects
    setGameState(prev => {
      const newState = { ...prev };
      newState.resources = JSON.parse(JSON.stringify(prev.resources)); // Deep copy for modification
      newState.totalClicks = prev.totalClicks + 1;

      let clickPower = 1; // Base click power
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
      return newState;
    });

    // Part 2: Asynchronous AI Loot Drop Logic - ensure gameState used here is the latest committed state
    const currentGameState = gameState; // Capture current state for async operation
    const lootDropInput: Omit<LootDropOrchestrationInput, 'generatorTotalPurchasesString'> = {
      generatorTotalPurchases: currentGameState.generatorTotalPurchases,
      characterDropRateBoost: (currentGameState.currentCharacterId ? initialCharacters[currentGameState.currentCharacterId]?.baseDropRateMultiplier : 1) * currentGameState.permanentBoosts.globalDropRateMultiplier,
      baseDropChance: 0.05, // Example base chance
    };

    try {
      const lootResult = await orchestrateLootDrop(lootDropInput);

      if (lootResult.shouldDrop) {
        const availableItems = Object.values(initialItems).filter(item => !item.id.startsWith("artifact_"));
        if (availableItems.length > 0) {
          const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
          
          setGameState(prev => {
            const newState = { ...prev };
            newState.inventory = [...prev.inventory]; // Create new array for inventory
            const existingItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === randomItem.id);
            if (existingItemIndex > -1) {
              newState.inventory[existingItemIndex] = {
                ...newState.inventory[existingItemIndex],
                quantity: newState.inventory[existingItemIndex].quantity + 1,
              };
            } else {
              newState.inventory.push({ itemId: randomItem.id, quantity: 1 });
            }
            return newState;
          });
          setTimeout(() => {
            toast({ title: "Loot Drop!", description: `Found: ${randomItem.name}. AI Reason: ${lootResult.reason}` });
          }, 0);
        }
      }
    } catch (error) {
      console.error("Error orchestrating loot drop:", error);
      setTimeout(() => {
        toast({ title: "Loot Drop Error", description: "Could not determine loot drop.", variant: "destructive" });
      }, 0);
    }
  }, [
    gameState, // Dependency on the whole gameState to ensure fresh data for AI call
    toast, 
    getItem
  ]);

  const buyGenerator = useCallback((generatorId: string) => {
    setGameState(prev => {
      const generator = prev.generators[generatorId];
      if (!generator) return prev;

      const costResource = prev.resources[generator.costResource];
      const currentMultiplier = prev.settings.currentMultiplier === 'MAX' ? Number.MAX_SAFE_INTEGER : prev.settings.currentMultiplier;
      
      let totalCost = 0;
      let numToBuy = 0;
      let currentCalcCost = generator.baseCost * Math.pow(generator.costScale, generator.quantity);

      if (currentMultiplier === Number.MAX_SAFE_INTEGER) { // Buy MAX
          while(costResource.amount >= totalCost + currentCalcCost && numToBuy < 1000000) { // Cap MAX buy to 1M for performance
              totalCost += currentCalcCost;
              numToBuy++;
              currentCalcCost = generator.baseCost * Math.pow(generator.costScale, generator.quantity + numToBuy);
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
      // Ensure deep copies for objects that will be modified
      newState.resources = JSON.parse(JSON.stringify(prev.resources));
      newState.generators = JSON.parse(JSON.stringify(prev.generators));
      newState.generatorTotalPurchases = JSON.parse(JSON.stringify(prev.generatorTotalPurchases));
      newState.inventory = [...prev.inventory]; // Shallow copy for inventory array, then manage items immutably

      newState.resources[generator.costResource].amount -= totalCost;
      newState.generators[generatorId].quantity += numToBuy;
      newState.generatorTotalPurchases[generatorId] = (newState.generatorTotalPurchases[generatorId] || 0) + numToBuy;
      
      let artifactDropped = false;
      let droppedArtifactName = '';
      if (generator.artifactDropRateFormula && generator.artifactIds && generator.artifactIds.length > 0) {
        try {
          const quantity = newState.generators[generatorId].quantity;
          // Replace 'log' with 'Math.log' and 'quantity' with its value for eval
          const formulaString = generator.artifactDropRateFormula
            .replace(/\blog\b/g, "Math.log") // Use word boundary for log
            .replace(/\bquantity\b/g, String(quantity)); // Use word boundary for quantity
          
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
  }, [toast, getItem]);

  const equipItem = useCallback((itemId: string, slot: CharacterSlotType) => {
    setGameState(prev => {
      const itemToEquip = getItem(itemId);
      if (!itemToEquip || !itemToEquip.equippable || itemToEquip.slot !== slot) {
        setTimeout(() => {
          toast({ title: "Cannot Equip", description: "Item cannot be equipped in this slot.", variant: "destructive"});
        }, 0);
        return prev;
      }
      
      const currentEquippedId = prev.equippedItems[slot];
      const newState = { ...prev };
      newState.equippedItems = {...prev.equippedItems, [slot]: itemId }; // Create new object for equippedItems
      newState.inventory = [...prev.inventory]; // Create new array for inventory


      const itemInInventoryIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (itemInInventoryIndex > -1) {
        newState.inventory[itemInInventoryIndex] = {...newState.inventory[itemInInventoryIndex], quantity: newState.inventory[itemInInventoryIndex].quantity - 1};
        if (newState.inventory[itemInInventoryIndex].quantity <= 0) {
          newState.inventory.splice(itemInInventoryIndex, 1);
        }
      } else {
         console.warn("Equipped item not found in inventory quantity check");
      }
      
      if (currentEquippedId) {
        const existingOldItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === currentEquippedId);
        if (existingOldItemIndex > -1) {
          newState.inventory[existingOldItemIndex] = {...newState.inventory[existingOldItemIndex], quantity: newState.inventory[existingOldItemIndex].quantity + 1};
        } else {
          newState.inventory.push({ itemId: currentEquippedId, quantity: 1 });
        }
      }
      setTimeout(() => {
        toast({ title: "Item Equipped", description: `${itemToEquip.name} equipped.` });
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
      newState.equippedItems = {...prev.equippedItems, [slot]: null}; // Create new object
      newState.inventory = [...prev.inventory]; // Create new array

      const existingItemIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemIdToUnequip);
      if (existingItemIndex > -1) {
        newState.inventory[existingItemIndex] = {...newState.inventory[existingItemIndex], quantity: newState.inventory[existingItemIndex].quantity + 1};
      } else {
        newState.inventory.push({ itemId: itemIdToUnequip, quantity: 1 });
      }
      setTimeout(() => {
        toast({ title: "Item Unequipped", description: `${item?.name || 'Item'} unequipped.` });
      }, 0);
      return newState;
    });
  }, [getItem, toast]);
  
  const consumeItem = useCallback((itemId: string, quantity: number = 1) => {
    setGameState(prev => {
      const itemToConsume = getItem(itemId);
      const itemInInventory = prev.inventory.find(invItem => invItem.itemId === itemId);

      if (!itemToConsume || !itemToConsume.consumable || !itemInInventory || itemInInventory.quantity < quantity) {
        setTimeout(() => {
          toast({ title: "Cannot Consume", description: "Item not available or not consumable.", variant: "destructive"});
        }, 0);
        return prev;
      }
      
      let newState = { ...prev }; 
      newState.resources = JSON.parse(JSON.stringify(prev.resources));
      newState.inventory = JSON.parse(JSON.stringify(prev.inventory));


      for(let i=0; i < quantity; i++){
        if (itemToConsume.consumeEffect) {
            newState = itemToConsume.consumeEffect(newState); 
        }
      }
      
      // Need to find index again as consumeEffect might have modified inventory array
      const currentItemInInventoryIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (currentItemInInventoryIndex > -1 && newState.inventory[currentItemInInventoryIndex].quantity >= quantity) {
        newState.inventory[currentItemInInventoryIndex].quantity -= quantity;
        if (newState.inventory[currentItemInInventoryIndex].quantity <= 0) {
          newState.inventory.splice(currentItemInInventoryIndex, 1);
        }
      } else {
        // This case implies consumeEffect might have already removed it, or quantity issue
        console.warn(`Item ${itemId} not found or insufficient quantity after consumeEffect.`);
      }
      
      setTimeout(() => {
        toast({ title: "Item Consumed", description: `${itemToConsume.name} consumed.` });
      }, 0);
      return newState;
    });
  }, [getItem, toast]);

  const switchCharacter = useCallback((characterId: string) => {
    if (!initialCharacters[characterId]) {
      setTimeout(() => {
        toast({ title: "Invalid Character", variant: "destructive" });
      }, 0);
      return;
    }
    setGameState(prev => ({ ...prev, currentCharacterId: characterId, equippedItems: CharacterSlots.reduce((acc, slot) => ({ ...acc, [slot]: null }), {}) }));
    setTimeout(() => {
      toast({ title: "Character Switched", description: `Now playing as ${initialCharacters[characterId].name}.` });
    }, 0);
  }, [toast]);

  const setMultiplier = useCallback((multiplier: MultiplierValue) => {
    setGameState(prev => ({ ...prev, settings: { ...prev.settings, currentMultiplier: multiplier } }));
  }, []);
  
  useEffect(() => {
    let stateChangedByAchievement = false;
    let achievementToastMessages: Array<{title: string, description: string}> = [];
    let accumulatedRewards = {
        points: {} as Record<string, number>,
        items: [] as { itemId: string; quantity: number }[],
        permanentBoosts: {
            globalPpsMultiplier: 0,
            globalDropRateMultiplier: 0,
        } as Record<string, any>
    };
    const newlyUnlockedIds: string[] = [];

    Object.values(initialAchievements).forEach(ach => {
        if (!gameState.unlockedAchievements.includes(ach.id) && ach.condition(gameState)) {
            newlyUnlockedIds.push(ach.id);
            achievementToastMessages.push({ title: "Achievement Unlocked!", description: ach.name });
            stateChangedByAchievement = true;

            if (ach.reward.points) {
                Object.entries(ach.reward.points).forEach(([resId, amount]) => {
                    accumulatedRewards.points[resId] = (accumulatedRewards.points[resId] || 0) + amount;
                });
            }
            if (ach.reward.items) {
                ach.reward.items.forEach(rewardItem => {
                    const existing = accumulatedRewards.items.find(i => i.itemId === rewardItem.itemId);
                    if (existing) {
                        existing.quantity += rewardItem.quantity;
                    } else {
                        accumulatedRewards.items.push({ ...rewardItem });
                    }
                });
            }
            if (ach.reward.permanentBoosts) {
                const { stat, value } = ach.reward.permanentBoosts;
                accumulatedRewards.permanentBoosts[stat] = (accumulatedRewards.permanentBoosts[stat] || 0) + value;
            }
        }
    });

    if (stateChangedByAchievement) {
        setGameState(prev => {
            const newState = { ...prev };
            newState.resources = JSON.parse(JSON.stringify(prev.resources));
            newState.inventory = [...prev.inventory];
            newState.permanentBoosts = JSON.parse(JSON.stringify(prev.permanentBoosts));
            newState.unlockedAchievements = [...prev.unlockedAchievements, ...newlyUnlockedIds];

            Object.entries(accumulatedRewards.points).forEach(([resId, amount]) => {
                if (newState.resources[resId]) newState.resources[resId].amount += amount;
            });
            accumulatedRewards.items.forEach(rewardItem => {
                const existingItem = newState.inventory.find(invItem => invItem.itemId === rewardItem.itemId);
                if (existingItem) {
                    existingItem.quantity += rewardItem.quantity;
                } else {
                    newState.inventory.push({ itemId: rewardItem.itemId, quantity: rewardItem.quantity });
                }
            });
            Object.entries(accumulatedRewards.permanentBoosts).forEach(([stat, value]) => {
                 if (stat === 'globalPpsMultiplier' || stat === 'globalDropRateMultiplier') {
                    newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 1.0) + value; // Ensure base is 1 if adding percentage
                 } else {
                    newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 0) + value;
                 }
            });
            return newState;
        });

        achievementToastMessages.forEach(msg => setTimeout(() => toast(msg), 0));
    }
  }, [gameState, toast]);

  const saveGame = useCallback(() => {
    try {
      localStorage.setItem('chronoClickerSave', JSON.stringify(gameState));
      // console.log("Game Saved at " + new Date().toLocaleTimeString()); // Optional: remove for production
      // Toasts for manual save are in SettingsPage, this is for auto-save primarily
    } catch (error) {
      console.error("Failed to save game:", error);
      setTimeout(() => toast({ title: "Auto-Save Failed", variant: "destructive" }), 0);
    }
  }, [gameState, toast]);

  const loadGame = useCallback((): boolean => {
    try {
      const savedGame = localStorage.getItem('chronoClickerSave');
      if (savedGame) {
        const loadedState = JSON.parse(savedGame) as GameState;
        setGameState(loadedState);
        setTimeout(() => toast({ title: "Game Loaded!" }), 0);
        return true;
      }
    } catch (error) {
      console.error("Failed to load game:", error);
      setTimeout(() => toast({ title: "Load Failed", description: "Save data might be corrupted.", variant: "destructive" }), 0);
    }
    return false;
  }, [setGameState, toast]);

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
      // Basic validation
      if (importedState && typeof importedState.resources === 'object' && typeof importedState.generators === 'object') {
        setGameState(importedState);
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
  }, [setGameState, toast]);

  const resetGame = useCallback(() => {
    if(window.confirm("Are you sure you want to reset your game? All progress will be lost.")) {
      setGameState(JSON.parse(JSON.stringify(defaultGameState))); 
      localStorage.removeItem('chronoClickerSave');
      setTimeout(() => toast({ title: "Game Reset", description: "Your progress has been reset." }), 0);
    }
  }, [toast]);
  
  // Auto-load on mount is handled by useState initial value now.
  // No explicit loadGame() call needed in useEffect for initial load.

  // Auto-save periodically
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
        saveGame();
    }, 30000); // Auto-save every 30 seconds
    return () => clearInterval(autoSaveInterval);
  }, [saveGame]); // saveGame dependency is stable due to useCallback with gameState

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

