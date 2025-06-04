"use client";

import type { Generator } from '@/lib/types';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Assuming progress bar for some visual
import { HelpCircle, Zap, Gem, PlusCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { MoreInfoModal } from './MoreInfoModal';
import { useState } from 'react';

interface GeneratorCardProps {
  generator: Generator;
}

export function GeneratorCard({ generator }: GeneratorCardProps) {
  const { gameState, buyGenerator, getItem } = useGame();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const costResource = gameState.resources[generator.costResource];
  const producesResource = gameState.resources[generator.producesResource];
  const currentCost = generator.baseCost * Math.pow(generator.costScale, generator.quantity);

  const IconComponent = generator.icon && LucideIcons[generator.icon as keyof typeof LucideIcons] 
    ? LucideIcons[generator.icon as keyof typeof LucideIcons] 
    : LucideIcons.Box;

  const CostIcon = costResource.icon && LucideIcons[costResource.icon as keyof typeof LucideIcons]
    ? LucideIcons[costResource.icon as keyof typeof LucideIcons]
    : Gem;
  
  const ProducesIcon = producesResource.icon && LucideIcons[producesResource.icon as keyof typeof LucideIcons]
    ? LucideIcons[producesResource.icon as keyof typeof LucideIcons]
    : Zap;

  const canAfford = costResource.amount >= currentCost;

  const modalContent = (
    <div>
      <h3 className="font-headline text-lg">{generator.name}</h3>
      <p className="text-sm text-muted-foreground mb-2">{generator.description}</p>
      <p>Base PPS: {generator.basePps.toFixed(2)} {producesResource.name}</p>
      <p>Cost Scale: {generator.costScale.toFixed(2)}x per purchase</p>
      <p>Current Cost: {currentCost.toFixed(0)} {costResource.name}</p>
      {generator.artifactIds && generator.artifactIds.length > 0 && (
        <div className="mt-2">
          <h4 className="font-semibold">Potential Artifacts:</h4>
          <ul className="list-disc list-inside text-sm">
            {generator.artifactIds.map(id => {
              const artifact = getItem(id);
              return <li key={id}>{artifact?.name || id}</li>;
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Drop chance increases with quantity.</p>
        </div>
      )}
    </div>
  );


  return (
    <>
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 font-headline text-xl">
                <IconComponent className="h-6 w-6 text-primary" />
                {generator.name}
              </CardTitle>
              <CardDescription>Owned: {generator.quantity.toLocaleString()}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)} aria-label="More info about this generator">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pb-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <ProducesIcon className="h-4 w-4 text-green-500" /> Produces:
            </span>
            <span>
              {(generator.basePps * generator.quantity).toFixed(2)} {producesResource.name}/s
            </span>
          </div>
           {/* Optional: Progress towards next big milestone or artifact */}
           { generator.quantity > 0 && generator.artifactIds &&
            <Progress value={(generator.quantity % 10) * 10} className="h-2" aria-label={`Progress for ${generator.name}`} />
          }
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => buyGenerator(generator.id)} 
            disabled={!canAfford && gameState.settings.currentMultiplier !== 'MAX' && gameState.settings.currentMultiplier <=1 } // MAX might still buy some
            aria-label={`Buy ${generator.name}`}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Buy ({currentCost.toFixed(0)} 
            <CostIcon className="ml-1 h-4 w-4" />)
          </Button>
        </CardFooter>
      </Card>
      <MoreInfoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`About ${generator.name}`}
      >
        {modalContent}
      </MoreInfoModal>
    </>
  );
}
