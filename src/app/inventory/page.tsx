
"use client";

import { useState } from 'react';
import { GameLayout } from '@/components/layout/GameLayout';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { Backpack, HelpCircle, Zap, Shield, Gem, Package, CircleSlash } from 'lucide-react'; // Corrected Package to Package from lucide
import type { Item, CharacterSlotType } from '@/lib/types';
import { MoreInfoModal } from '@/components/game/MoreInfoModal';
import { Badge } from "@/components/ui/badge"; // Added missing import for Badge
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CharacterSlots } from '@/lib/types';


export default function InventoryPage() {
  const { gameState, getItem, equipItem, consumeItem } = useGame();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string, content: React.ReactNode } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CharacterSlotType | undefined>(undefined);


  const openItemInfoModal = (item: Item) => {
    let statsString = Object.entries(item.stats)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`)
      .join('\n');
    if (!statsString) statsString = "No special stats.";
    
    const content = (
      <div className="space-y-1 text-sm">
        <p>{item.description}</p>
        <p><strong>Type:</strong> {item.type}</p>
        {item.group && <p><strong>Group:</strong> {item.group}</p>}
        {item.material && <p><strong>Material:</strong> {item.material}</p>}
        <p><strong>Rarity:</strong> {item.rarity || 'Common'}</p>
        <p className="mt-2"><strong>Stats:</strong></p>
        <pre className="whitespace-pre-wrap font-code text-xs bg-muted p-2 rounded-md">{statsString}</pre>
      </div>
    );
    setModalInfo({ title: `About ${item.name}`, content });
    setIsModalOpen(true);
  };
  
  const handleEquip = (item: Item) => {
    if (item.equippable) {
      if (item.slot) { // If item has a predefined slot
          // Check if the slot type matches the CharacterSlotType enum
          const slotKey = item.slot.charAt(0).toUpperCase() + item.slot.slice(1) as CharacterSlotType;
          if (CharacterSlots.includes(slotKey)){
            equipItem(item.id, slotKey);
            return;
          }
      }
      // If no predefined slot or not a direct match, try to find a compatible slot
      // This part can be complex. For simplicity, let's assume user selects slot for now.
      // Or, for items like rings, find first available ring slot.
      if (item.group === "Ring") {
        if (!gameState.equippedItems["Ring1"]) { equipItem(item.id, "Ring1"); return; }
        if (!gameState.equippedItems["Ring2"]) { equipItem(item.id, "Ring2"); return; }
      }
      // Fallback: if a slot is selected via UI, use it
      if(selectedSlot && item.slot === selectedSlot){
         equipItem(item.id, selectedSlot);
         return;
      }
      // If still not equipped, prompt user or handle error
      alert("Could not determine slot to equip. Select a slot or check item type.");
    }
  };


  return (
    <GameLayout>
      <div className="container mx-auto py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Backpack className="text-primary h-7 w-7" />
              Your Stash
            </CardTitle>
            <CardDescription>Manage your collected items. Equip, consume, or learn more about them.</CardDescription>
          </CardHeader>
          <CardContent>
            {gameState.inventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CircleSlash className="mx-auto h-16 w-16 mb-4" />
                <p className="text-xl font-semibold">Your inventory is empty.</p>
                <p>Explore and click to find items!</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-18rem)]"> {/* Adjust height as needed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                  {gameState.inventory.map(({ itemId, quantity }) => {
                    const item = getItem(itemId);
                    if (!item) return null;

                    const Icon = item.icon && LucideIcons[item.icon as keyof typeof LucideIcons] 
                      ? LucideIcons[item.icon as keyof typeof LucideIcons] 
                      : Package;

                    return (
                      <Card key={itemId} className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <Icon className="h-5 w-5 text-primary" />
                              {item.name}
                            </CardTitle>
                            <Button variant="ghost" size="icon-sm" onClick={() => openItemInfoModal(item)} aria-label={`More info about ${item.name}`}>
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardDescription className="text-xs">Qty: {quantity.toLocaleString()}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow py-1">
                          <p className="text-xs text-muted-foreground truncate h-8">{item.description}</p>
                          <div className="mt-1 space-x-1">
                            {item.stats.ppsBoost && <Badge variant="outline"><Zap className="h-3 w-3 mr-1"/>PPS</Badge>}
                            {item.stats.armorValue && <Badge variant="outline"><Shield className="h-3 w-3 mr-1"/>Armor</Badge>}
                            {item.stats.dropRateBoost && <Badge variant="outline"><Gem className="h-3 w-3 mr-1"/>Drop</Badge>}
                          </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row gap-2 pt-3">
                          {item.equippable && (
                            <Button size="sm" className="flex-1" onClick={() => handleEquip(item)}>Equip</Button>
                          )}
                          {item.consumable && (
                            <Button variant="secondary" size="sm" className="flex-1" onClick={() => consumeItem(itemId)}>Consume</Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
             {/* Example for selecting a slot if an item needs it and it's ambiguous */}
             {/* <Select onValueChange={(value) => setSelectedSlot(value as CharacterSlotType)}>
              <SelectTrigger className="w-[180px] mt-4">
                <SelectValue placeholder="Select slot to equip" />
              </SelectTrigger>
              <SelectContent>
                {CharacterSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
              </SelectContent>
            </Select> */}
          </CardContent>
        </Card>
      </div>
      {modalInfo && (
        <MoreInfoModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={modalInfo.title}
        >
          {modalInfo.content}
        </MoreInfoModal>
      )}
    </GameLayout>
  );
}
