"use client";

import { useState } from 'react';
import { GameLayout } from '@/components/layout/GameLayout';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialCharacters } from '@/config/characters';
import * as LucideIcons from 'lucide-react';
import { User, ShieldCheck, Zap, HelpCircle, CheckCircle } from 'lucide-react';
import type { CharacterSlotType } from '@/lib/types';
import { CharacterSlots } from '@/lib/types';
import { MoreInfoModal } from '@/components/game/MoreInfoModal';
import Image from 'next/image';

export default function CharacterPage() {
  const { gameState, switchCharacter, getCharacter, getItem, unequipItem } = useGame();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", content: "" });

  const currentCharacter = getCharacter();

  const openCharacterInfoModal = (charId: string) => {
    const char = initialCharacters[charId];
    if (char) {
      setModalContent({
        title: `About ${char.name}`,
        content: char.description + `\n\nPPS Multiplier: x${char.basePpsMultiplier.toFixed(2)}\nDrop Rate Multiplier: x${char.baseDropRateMultiplier.toFixed(2)}`
      });
      setIsModalOpen(true);
    }
  };
  
  const openItemInfoModal = (itemId: string) => {
    const item = getItem(itemId);
    if (item) {
      let statsString = Object.entries(item.stats)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`)
        .join('\n');
      if (!statsString) statsString = "No special stats.";

      setModalContent({
        title: `About ${item.name}`,
        content: `${item.description}\n\nType: ${item.type}\nGroup: ${item.group || 'N/A'}\nMaterial: ${item.material || 'N/A'}\nRarity: ${item.rarity || 'Common'}\n\nStats:\n${statsString}`
      });
      setIsModalOpen(true);
    }
  };

  return (
    <GameLayout>
      <div className="container mx-auto py-8 space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <User className="text-primary h-7 w-7" />
              Select Your Persona
            </CardTitle>
            <CardDescription>Choose a character to embody. Each offers unique bonuses.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(initialCharacters).map((char) => {
              const Icon = char.icon && LucideIcons[char.icon as keyof typeof LucideIcons] ? LucideIcons[char.icon as keyof typeof LucideIcons] : LucideIcons.UserCircle2;
              const isCurrent = gameState.currentCharacterId === char.id;
              return (
                <Card key={char.id} className={`transition-all ${isCurrent ? 'ring-2 ring-primary shadow-xl' : 'hover:shadow-md'}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} /> 
                        {char.name}
                     </CardTitle>
                     <Button variant="ghost" size="icon" onClick={() => openCharacterInfoModal(char.id)} aria-label={`More info about ${char.name}`}>
                        <HelpCircle className="h-4 w-4" />
                     </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground truncate">{char.description}</p>
                    <div className="text-xs mt-2 space-y-1">
                        <p className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" /> PPS Multiplier: x{char.basePpsMultiplier.toFixed(2)}</p>
                        <p className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" /> Drop Rate Multiplier: x{char.baseDropRateMultiplier.toFixed(2)}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => switchCharacter(char.id)}
                      disabled={isCurrent}
                      variant={isCurrent ? "secondary" : "default"}
                    >
                      {isCurrent ? <><CheckCircle className="mr-2 h-4 w-4" /> Selected</> : 'Select Persona'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {currentCharacter && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Equipped Gear ({currentCharacter.name})</CardTitle>
              <CardDescription>Manage items equipped by your current persona.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {CharacterSlots.map((slot) => {
                const equippedItemId = gameState.equippedItems[slot];
                const item = equippedItemId ? getItem(equippedItemId) : null;
                const ItemIcon = item?.icon && LucideIcons[item.icon as keyof typeof LucideIcons] 
                    ? LucideIcons[item.icon as keyof typeof LucideIcons] 
                    : LucideIcons.Package;

                return (
                  <Card key={slot} className="flex flex-col items-center justify-center p-3 min-h-[120px] bg-muted/30">
                    <p className="text-sm font-semibold text-muted-foreground">{slot}</p>
                    {item ? (
                      <div className="text-center mt-1">
                        <Avatar className="mx-auto mb-1">
                           <AvatarImage asChild src="#">
                              <ItemIcon className="h-6 w-6 text-primary" />
                           </AvatarImage>
                           <AvatarFallback><ItemIcon className="h-6 w-6 text-primary" /></AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium truncate w-full">{item.name}</p>
                        <div className="flex gap-1 mt-1">
                            <Button variant="outline" size="xs" onClick={() => openItemInfoModal(item.id)}><HelpCircle className="h-3 w-3" /></Button>
                            <Button variant="destructive" size="xs" onClick={() => unequipItem(slot)}>Unequip</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">(Empty)</p>
                    )}
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
      <MoreInfoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalContent.title}
      >
        <pre className="whitespace-pre-wrap font-body text-sm">{modalContent.content}</pre>
      </MoreInfoModal>
    </GameLayout>
  );
}
