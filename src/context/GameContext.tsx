
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
    setGameState(prev => {
      const newState = { ...prev };
      let clickPower = 1; // Base click power
      const character = getCharacter();
      if(character) {
        // Apply character click bonus if any (not defined in types yet, add if needed)
      }
      // Apply item click bonuses
      Object.values(prev.equippedItems).forEach(itemId => {
        if(itemId) {
          const item = getItem(itemId);
          if (item && item.stats.clickPowerBoost) clickPower += item.stats.clickPowerBoost;
          if (item && item.stats.clickPowerMultiplier) clickPower *= (1 + item.stats.clickPowerMultiplier);
        }
      });

      newState.resources[resourceId].amount += clickPower;
      newState.totalClicks += 1;
      return newState;
    });

    // AI Loot Drop Logic
    // Use a snapshot of gameState for the AI call to avoid issues with stale closures
    setGameState(async prevGameStateSnapshot => {
      const character = initialCharacters[prevGameStateSnapshot.currentCharacterId!] || null;
      const lootDropInput: Omit<LootDropOrchestrationInput, 'generatorTotalPurchasesString'> = {
          generatorTotalPurchases: prevGameStateSnapshot.generatorTotalPurchases,
          characterDropRateBoost: character ? character.baseDropRateMultiplier * prevGameStateSnapshot.permanentBoosts.globalDropRateMultiplier : 1 * prevGameStateSnapshot.permanentBoosts.globalDropRateMultiplier,
          baseDropChance: 0.05, // Example: 5% base chance for AI to consider
      };

      try {
          const lootResult = await orchestrateLootDrop(lootDropInput);
          if (lootResult.shouldDrop) {
              // Select a random item
              const availableItems = Object.values(initialItems).filter(item => !item.id.startsWith("artifact_")); // Exclude specific artifacts from general pool
              if (availableItems.length > 0) {
                  const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
                  // Update state based on the *latest* previous state, not the snapshot
                  setGameState(prev => {
                      const newState = { ...prev };
                      const existingItem = newState.inventory.find(invItem => invItem.itemId === randomItem.id);
                      if (existingItem) {
                          existingItem.quantity += 1;
                      } else {
                          newState.inventory.push({ itemId: randomItem.id, quantity: 1 });
                      }
                      toast({ title: "Loot Drop!", description: `Found: ${randomItem.name}. AI Reason: ${lootResult.reason}` });
                      return newState;
                  });
              }
          }
      } catch (error) {
          console.error("Error orchestrating loot drop:", error);
          toast({ title: "Loot Drop Error", description: "Could not determine loot drop.", variant: "destructive" });
      }
      return prevGameStateSnapshot; // return the snapshot as it was before the async operation
    });

  }, [getCharacter, getItem, toast]);

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
        toast({ title: "Not enough resources", description: `You need more ${costResource.name} to buy ${generator.name}.`, variant: "destructive" });
        return prev;
      }

      const newState = { ...prev };
      newState.resources[generator.costResource].amount -= totalCost;
      newState.generators[generatorId].quantity += numToBuy;
      newState.generatorTotalPurchases[generatorId] = (newState.generatorTotalPurchases[generatorId] || 0) + numToBuy;

      // Artifact drop check for this generator
      if (generator.artifactDropRateFormula && generator.artifactIds && generator.artifactIds.length > 0) {
        try {
          const quantity = newState.generators[generatorId].quantity;
          // Sanitize and evaluate formula carefully: this is a simplified example
          // In a real app, use a proper math expression parser
          const dropRate = eval(generator.artifactDropRateFormula.replace("quantity", String(quantity)));
          if (Math.random() < dropRate) {
            const artifactId = generator.artifactIds[Math.floor(Math.random() * generator.artifactIds.length)];
            const existingArtifact = newState.inventory.find(invItem => invItem.itemId === artifactId);
            if (existingArtifact) {
                existingArtifact.quantity += 1;
            } else {
                newState.inventory.push({ itemId: artifactId, quantity: 1 });
            }
            const artifact = getItem(artifactId);
            toast({ title: "Artifact Found!", description: `Your ${generator.name} uncovered a ${artifact?.name || 'rare artifact'}!` });
          }
        } catch (e) {
          console.error("Error evaluating artifact drop rate formula:", e);
        }
      }
      
      toast({ title: "Generator Purchased!", description: `Bought ${numToBuy} x ${generator.name}` });
      return newState;
    });
  }, [toast, getItem]);

  const equipItem = useCallback((itemId: string, slot: CharacterSlotType) => {
    setGameState(prev => {
      const itemToEquip = getItem(itemId);
      if (!itemToEquip || !itemToEquip.equippable || itemToEquip.slot !== slot) { // Basic slot check, can be more complex
        toast({ title: "Cannot Equip", description: "Item cannot be equipped in this slot.", variant: "destructive"});
        return prev;
      }
      
      const currentEquippedId = prev.equippedItems[slot];
      const newState = { ...prev };
      newState.equippedItems[slot] = itemId; // Equip new item

      // Remove equipped item from inventory
      const itemInInventory = newState.inventory.find(invItem => invItem.itemId === itemId);
      if (itemInInventory) {
        itemInInventory.quantity -= 1;
        if (itemInInventory.quantity <= 0) {
          newState.inventory = newState.inventory.filter(invItem => invItem.itemId !== itemId);
        }
      } else {
         // This case should ideally not happen if UI is correct (item must be in inventory to equip)
         console.warn("Equipped item not found in inventory quantity check");
      }
      
      // Add previously equipped item back to inventory
      if (currentEquippedId) {
        const existingOldItem = newState.inventory.find(invItem => invItem.itemId === currentEquippedId);
        if (existingOldItem) {
          existingOldItem.quantity += 1;
        } else {
          newState.inventory.push({ itemId: currentEquippedId, quantity: 1 });
        }
      }
      toast({ title: "Item Equipped", description: `${itemToEquip.name} equipped.` });
      return newState;
    });
  }, [getItem, toast]);

  const unequipItem = useCallback((slot: CharacterSlotType) => {
    setGameState(prev => {
      const itemIdToUnequip = prev.equippedItems[slot];
      if (!itemIdToUnequip) return prev;

      const item = getItem(itemIdToUnequip);
      const newState = { ...prev };
      newState.equippedItems[slot] = null; // Unequip

      // Add item back to inventory
      const existingItem = newState.inventory.find(invItem => invItem.itemId === itemIdToUnequip);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        newState.inventory.push({ itemId: itemIdToUnequip, quantity: 1 });
      }
      toast({ title: "Item Unequipped", description: `${item?.name || 'Item'} unequipped.` });
      return newState;
    });
  }, [getItem, toast]);
  
  const consumeItem = useCallback((itemId: string, quantity: number = 1) => {
    setGameState(prev => {
      const itemToConsume = getItem(itemId);
      const itemInInventory = prev.inventory.find(invItem => invItem.itemId === itemId);

      if (!itemToConsume || !itemToConsume.consumable || !itemInInventory || itemInInventory.quantity < quantity) {
        toast({ title: "Cannot Consume", description: "Item not available or not consumable.", variant: "destructive"});
        return prev;
      }
      
      let newState = { ...prev };
      for(let i=0; i < quantity; i++){
        if (itemToConsume.consumeEffect) {
            newState = itemToConsume.consumeEffect(newState); // Apply effect
        }
      }
      
      itemInInventory.quantity -= quantity;
      if (itemInInventory.quantity <= 0) {
        newState.inventory = newState.inventory.filter(invItem => invItem.itemId !== itemId);
      }
      toast({ title: "Item Consumed", description: `${itemToConsume.name} consumed.` });
      return newState;
    });
  }, [getItem, toast]);

  const switchCharacter = useCallback((characterId: string) => {
    if (!initialCharacters[characterId]) {
      toast({ title: "Invalid Character", variant: "destructive" });
      return;
    }
    setGameState(prev => ({ ...prev, currentCharacterId: characterId, equippedItems: CharacterSlots.reduce((acc, slot) => ({ ...acc, [slot]: null }), {}) })); // Reset equipped items on char switch
    toast({ title: "Character Switched", description: `Now playing as ${initialCharacters[characterId].name}.` });
  }, [toast]);

  const setMultiplier = useCallback((multiplier: MultiplierValue) => {
    setGameState(prev => ({ ...prev, settings: { ...prev.settings, currentMultiplier: multiplier } }));
  }, []);
  
  // Achievements Check
  useEffect(() => {
    const newlyUnlocked: string[] = [];
    Object.values(initialAchievements).forEach(ach => {
      if (!gameState.unlockedAchievements.includes(ach.id) && ach.condition(gameState)) {
        newlyUnlocked.push(ach.id);
        
        // Apply rewards
        setGameState(prev => {
          const newState = {...prev};
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
            // Add other specific permanent boosts here
            else newState.permanentBoosts[stat] = (newState.permanentBoosts[stat] || 0) + value;
          }
          return newState;
        });
        toast({ title: "Achievement Unlocked!", description: ach.name });
      }
    });
    if (newlyUnlocked.length > 0) {
      setGameState(prev => ({ ...prev, unlockedAchievements: [...prev.unlockedAchievements, ...newlyUnlocked]}));
    }
  }, [gameState, toast]);

  // Save and Load
  const saveGame = useCallback(() => {
    try {
      localStorage.setItem('chronoClickerSave', JSON.stringify(gameState));
      toast({ title: "Game Saved!" });
    } catch (error) {
      console.error("Failed to save game:", error);
      toast({ title: "Save Failed", variant: "destructive" });
    }
  }, [gameState, toast]);

  const loadGame = useCallback((): boolean => {
    try {
      const savedGame = localStorage.getItem('chronoClickerSave');
      if (savedGame) {
        const loadedState = JSON.parse(savedGame) as GameState;
        // Basic validation/migration can be done here if state structure changes
        setGameState(loadedState);
        toast({ title: "Game Loaded!" });
        return true;
      }
    } catch (error) {
      console.error("Failed to load game:", error);
      toast({ title: "Load Failed", description: "Save data might be corrupted.", variant: "destructive" });
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
      toast({ title: "Save Exported!" });
    } catch (error) {
      console.error("Failed to export save:", error);
      toast({ title: "Export Failed", variant: "destructive" });
    }
  }, [gameState, toast]);

  const importSave = useCallback((jsonData: string): boolean => {
    try {
      const importedState = JSON.parse(jsonData) as GameState;
      // Add more validation as needed
      if (importedState.resources && importedState.generators) {
        setGameState(importedState);
        toast({ title: "Save Imported Successfully!" });
        return true;
      } else {
        toast({ title: "Import Failed", description: "Invalid save file format.", variant: "destructive" });
        return false;
      }
    } catch (error) {
      console.error("Failed to import save:", error);
      toast({ title: "Import Failed", description: "Could not parse save file.", variant: "destructive" });
      return false;
    }
  }, [setGameState, toast]);

  const resetGame = useCallback(() => {
    if(window.confirm("Are you sure you want to reset your game? All progress will be lost.")) {
      setGameState(defaultGameState); // Or a new deep copy of defaultGameState
      localStorage.removeItem('chronoClickerSave');
      toast({ title: "Game Reset", description: "Your progress has been reset." });
    }
  }, [toast]);
  
  // Auto-load on mount
  useEffect(() => {
    loadGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Auto-save periodically (e.g., every 30 seconds) and on significant changes
  // This simple version saves on every gameState change, which might be too frequent.
  // Debouncing or saving on specific actions might be better for performance.
  useEffect(() => {
    const autoSaveTimeout = setTimeout(() => {
        saveGame();
    }, 30000); // Autosave every 30 seconds
    return () => clearTimeout(autoSaveTimeout);
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

