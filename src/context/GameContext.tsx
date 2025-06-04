
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
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
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
      let clickPower = 1; // Base click power
      const character = prev.currentCharacterId ? initialCharacters[prev.currentCharacterId] : null;

      Object.values(prev.equippedItems).forEach(itemId => {
        if (itemId) {
          const itemDetails = initialItems[itemId];
          if (itemDetails && itemDetails.stats.clickPowerBoost) clickPower += itemDetails.stats.clickPowerBoost;
          if (itemDetails && itemDetails.stats.clickPowerMultiplier) clickPower *= (1 + itemDetails.stats.clickPowerMultiplier);
        }
      });

      if (newState.resources[resourceId]) {
        newState.resources[resourceId].amount += clickPower;
      } else {
        console.warn(`Resource ID "${resourceId}" not found in performClick.`);
      }
      newState.totalClicks += 1;
      return newState;
    });

    // Part 2: Asynchronous AI Loot Drop Logic
    const currentTotalPurchases = gameState.generatorTotalPurchases;
    const currentCharIdForAI = gameState.currentCharacterId;
    const currentGlobalDropRateMultiplier = gameState.permanentBoosts.globalDropRateMultiplier;
    
    const characterForAI = currentCharIdForAI ? initialCharacters[currentCharIdForAI] : null;
    const lootDropInput: Omit<LootDropOrchestrationInput, 'generatorTotalPurchasesString'> = {
      generatorTotalPurchases: currentTotalPurchases,
      characterDropRateBoost: characterForAI
        ? characterForAI.baseDropRateMultiplier * currentGlobalDropRateMultiplier
        : 1 * currentGlobalDropRateMultiplier,
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
            newState.inventory = [...newState.inventory]; // Ensure new array for inventory
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
    gameState.generatorTotalPurchases, 
    gameState.currentCharacterId, 
    gameState.permanentBoosts.globalDropRateMultiplier, 
    toast
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
      newState.resources = {...newState.resources, [generator.costResource]: {...newState.resources[generator.costResource], amount: newState.resources[generator.costResource].amount - totalCost}};
      newState.generators = {...newState.generators, [generatorId]: {...newState.generators[generatorId], quantity: newState.generators[generatorId].quantity + numToBuy}};
      newState.generatorTotalPurchases = {...newState.generatorTotalPurchases, [generatorId]: (newState.generatorTotalPurchases[generatorId] || 0) + numToBuy};
      

      // Artifact drop check for this generator
      let artifactDropped = false;
      let droppedArtifactName = '';
      if (generator.artifactDropRateFormula && generator.artifactIds && generator.artifactIds.length > 0) {
        try {
          const quantity = newState.generators[generatorId].quantity;
          // Sanitize and evaluate formula carefully: this is a simplified example
          const dropRate = eval(generator.artifactDropRateFormula.replace("quantity", String(quantity)));
          if (Math.random() < dropRate) {
            const artifactId = generator.artifactIds[Math.floor(Math.random() * generator.artifactIds.length)];
            newState.inventory = [...newState.inventory];
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
      newState.equippedItems = {...newState.equippedItems, [slot]: itemId };
      newState.inventory = [...newState.inventory];


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
      newState.equippedItems = {...newState.equippedItems, [slot]: null};
      newState.inventory = [...newState.inventory];

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
      
      let newState = { ...prev }; // Start with a fresh copy of previous state
      // Ensure deep copies for nested structures that will be modified
      newState.resources = JSON.parse(JSON.stringify(prev.resources));
      newState.inventory = JSON.parse(JSON.stringify(prev.inventory));


      for(let i=0; i < quantity; i++){
        if (itemToConsume.consumeEffect) {
            // Pass a mutable copy of the current iteration of newState to consumeEffect
            newState = itemToConsume.consumeEffect(newState); 
        }
      }
      
      const currentItemInInventoryIndex = newState.inventory.findIndex(invItem => invItem.itemId === itemId);
      if (currentItemInInventoryIndex > -1) {
        newState.inventory[currentItemInInventoryIndex].quantity -= quantity;
        if (newState.inventory[currentItemInInventoryIndex].quantity <= 0) {
          newState.inventory.splice(currentItemInInventoryIndex, 1);
        }
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
  
  // Achievements Check
  useEffect(() => {
    const newlyUnlocked: string[] = [];
    let stateChangedByAchievement = false;
    let achievementToastMessages: Array<{title: string, description: string}> = [];

    // Use a functional update for setGameState if we need to apply multiple rewards sequentially
    // or ensure we're working with the very latest state for each achievement check.
    // However, simple batching is often fine.
    
    let tempGameState = {...gameState}; // Work on a temporary copy for condition checking if needed

    Object.values(initialAchievements).forEach(ach => {
      if (!tempGameState.unlockedAchievements.includes(ach.id) && ach.condition(tempGameState)) {
        newlyUnlocked.push(ach.id);
        achievementToastMessages.push({ title: "Achievement Unlocked!", description: ach.name });
        stateChangedByAchievement = true;

        // Apply rewards directly to tempGameState for subsequent checks within this loop
        if (ach.reward.points) {
          Object.entries(ach.reward.points).forEach(([resId, amount]) => {
            if (tempGameState.resources[resId]) tempGameState.resources[resId].amount += amount;
          });
        }
        if (ach.reward.items) {
          ach.reward.items.forEach(rewardItem => {
            const existingItem = tempGameState.inventory.find(invItem => invItem.itemId === rewardItem.itemId);
            if (existingItem) {
              existingItem.quantity += rewardItem.quantity;
            } else {
              tempGameState.inventory.push({ itemId: rewardItem.itemId, quantity: rewardItem.quantity });
            }
          });
        }
        if (ach.reward.permanentBoosts) {
          const { stat, value } = ach.reward.permanentBoosts;
          if (stat === 'globalPpsMultiplier') tempGameState.permanentBoosts.globalPpsMultiplier += value;
          else if (stat === 'globalDropRateMultiplier') tempGameState.permanentBoosts.globalDropRateMultiplier += value;
          else tempGameState.permanentBoosts[stat] = (tempGameState.permanentBoosts[stat] || 0) + value;
        }
      }
    });

    if (stateChangedByAchievement || newlyUnlocked.length > 0) {
      setGameState(prev => {
        const newState = {...prev};
        // Re-apply rewards to the actual 'prev' state to ensure correctness
        // This avoids issues if tempGameState was based on a slightly stale 'gameState'
        // from the outer scope of the useEffect.
        newlyUnlocked.forEach(unlockedAchId => {
            const ach = initialAchievements[unlockedAchId];
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
                if (stat === 'globalPpsMultiplier') newState.permanentBoosts.globalPpsMultiplier += value;
                else if (stat === 'globalDropRateMultiplier') newState.permanentBoosts.globalDropRateMultiplier += value;
                else newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 0) + value;
            }
        });
        newState.unlockedAchievements = [...prev.unlockedAchievements, ...newlyUnlocked];
        return newState;
      });

      achievementToastMessages.forEach(msg => {
        setTimeout(() => toast(msg), 0);
      });
    }
  }, [gameState, toast]); // gameState.unlockedAchievements could be added but might cause loops if not careful

  // Save and Load
  const saveGame = useCallback(() => {
    try {
      localStorage.setItem('chronoClickerSave', JSON.stringify(gameState));
      setTimeout(() => toast({ title: "Game Saved!" }), 0);
    } catch (error) {
      console.error("Failed to save game:", error);
      setTimeout(() => toast({ title: "Save Failed", variant: "destructive" }), 0);
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
      if (importedState.resources && importedState.generators) {
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
  
  // Auto-load on mount
  useEffect(() => {
    loadGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Auto-save periodically
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
        saveGame();
    }, 30000); 
    return () => clearInterval(autoSaveInterval);
  }, [gameState, saveGame]);


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

