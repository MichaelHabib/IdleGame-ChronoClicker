"use client";

import { GameLayout } from '@/components/layout/GameLayout';
import { ClickerButton } from '@/components/game/ClickerButton';
import { GeneratorCard } from '@/components/game/GeneratorCard';
import { MultiplierButtons } from '@/components/game/MultiplierButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGame } from '@/context/GameContext';
import { Sparkles } from 'lucide-react';

export default function ChronoChamberPage() {
  const { gameState, performClick } = useGame();
  const primaryResource = gameState.resources['points'];

  return (
    <GameLayout>
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clicker Section */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-2xl">
                  <Sparkles className="text-primary h-7 w-7" />
                  Chrono Forge
                </CardTitle>
                <CardDescription>Click to generate {primaryResource.name}!</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">
                    {Math.floor(primaryResource.amount).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {primaryResource.name}
                  </p>
                </div>
                <ClickerButton 
                  onClick={() => performClick('points')}
                  resourceName={primaryResource.name}
                />
                <p className="text-sm text-muted-foreground">
                  +{primaryResource.perSecond.toFixed(2)} {primaryResource.name}/s
                </p>
              </CardContent>
            </Card>
            <MultiplierButtons />
          </div>

          {/* Generators Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Temporal Generators</CardTitle>
                <CardDescription>Acquire and upgrade generators to automate resource production.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-20rem)] pr-3"> {/* Adjust height as needed */}
                  <div className="space-y-4">
                    {Object.values(gameState.generators).map((generator) => (
                      <GeneratorCard key={generator.id} generator={generator} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
