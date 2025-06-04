"use client";

import { useGame } from '@/context/GameContext';
import type { MultiplierValue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"


const multipliers: MultiplierValue[] = [1, 5, 10, 25, 50, 250, 1000, 'MAX']; // Simplified for brevity

export function MultiplierButtons() {
  const { gameState, setMultiplier } = useGame();
  const currentMultiplier = gameState.settings.currentMultiplier;

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline">Purchase Multiplier</CardTitle>
      </CardHeader>
      <CardContent>
        <ToggleGroup 
          type="single" 
          defaultValue={String(currentMultiplier)} 
          onValueChange={(value) => {
            if (value) {
              setMultiplier(value === 'MAX' ? 'MAX' : parseInt(value, 10) as MultiplierValue);
            }
          }}
          className="grid grid-cols-4 gap-2"
          aria-label="Purchase multiplier"
        >
          {multipliers.map((multiplier) => (
             <ToggleGroupItem 
                key={multiplier} 
                value={String(multiplier)} 
                aria-label={`Set multiplier to ${multiplier}`}
                className="h-auto p-2 text-xs sm:text-sm"
              >
              {multiplier}x
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}
