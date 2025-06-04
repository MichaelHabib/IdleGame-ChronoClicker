"use client";

import { useGame } from '@/context/GameContext';
import { ResourceDisplay } from './ResourceDisplay';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function ResourceBar() {
  const { gameState } = useGame();
  const displayResources = Object.values(gameState.resources).filter(r => r.id === 'points' || r.id === 'mana' || r.id === 'gold' || r.amount > 0 || r.perSecond > 0);

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b shadow-sm">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="container mx-auto px-4 h-16 flex items-center gap-x-4 sm:gap-x-6">
          {displayResources.map((resource) => (
            <ResourceDisplay key={resource.id} resource={resource} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </header>
  );
}
