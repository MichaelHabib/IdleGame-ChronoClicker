"use client";

import { GameLayout } from '@/components/layout/GameLayout';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as LucideIcons from 'lucide-react';
import { BarChart3, TrendingUp, Package } from 'lucide-react';
import { initialAchievements } from '@/config/achievements';
import { initialCharacters } from '@/config/characters';

export default function StatsPage() {
  const { gameState, calculatePps } = useGame();

  const allResources = Object.values(gameState.resources);
  const allGenerators = Object.values(gameState.generators);

  return (
    <GameLayout>
      <div className="container mx-auto py-8 space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <BarChart3 className="text-primary h-7 w-7" />
              Resource Overview
            </CardTitle>
            <CardDescription>Current status of all your resources.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Per Second</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allResources.map((res) => {
                    const Icon = res.icon && LucideIcons[res.icon as keyof typeof LucideIcons] ? LucideIcons[res.icon as keyof typeof LucideIcons] : LucideIcons.Box;
                    const pps = calculatePps(res.id); // Recalculate for display consistency
                    return (
                      <TableRow key={res.id}>
                        <TableCell><Icon className="h-5 w-5 text-muted-foreground" /></TableCell>
                        <TableCell className="font-medium">{res.name}</TableCell>
                        <TableCell className="text-right">{Math.floor(res.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">+{pps.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
               <TrendingUp className="text-primary h-7 w-7" />
              Generator Performance
            </CardTitle>
            <CardDescription>Contribution of each generator type.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icon</TableHead>
                    <TableHead>Generator</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total PPS Output</TableHead>
                    <TableHead>Produces</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allGenerators.map((gen) => {
                    const Icon = gen.icon && LucideIcons[gen.icon as keyof typeof LucideIcons] ? LucideIcons[gen.icon as keyof typeof LucideIcons] : LucideIcons.Settings2;
                    const producesResource = gameState.resources[gen.producesResource];
                    const ProducesIcon = producesResource?.icon && LucideIcons[producesResource.icon as keyof typeof LucideIcons] ? LucideIcons[producesResource.icon as keyof typeof LucideIcons] : LucideIcons.Zap;
                    return (
                      <TableRow key={gen.id}>
                        <TableCell><Icon className="h-5 w-5 text-muted-foreground" /></TableCell>
                        <TableCell className="font-medium">{gen.name}</TableCell>
                        <TableCell className="text-right">{gen.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">
                          +{(gen.basePps * gen.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                           <ProducesIcon className="h-4 w-4" /> {producesResource?.name || gen.producesResource}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Package className="text-primary h-7 w-7" />
                    Game Statistics
                </CardTitle>
                <CardDescription>Overall game progress metrics.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="font-semibold">Total Clicks:</span> {gameState.totalClicks.toLocaleString()}</div>
                <div><span className="font-semibold">Achievements Unlocked:</span> {gameState.unlockedAchievements.length} / {Object.keys(initialAchievements).length}</div>
                <div><span className="font-semibold">Current Character:</span> {gameState.currentCharacterId ? initialCharacters[gameState.currentCharacterId]?.name : 'None'}</div>
                <div><span className="font-semibold">Global PPS Multiplier:</span> x{gameState.permanentBoosts.globalPpsMultiplier.toFixed(2)}</div>
                <div><span className="font-semibold">Global Drop Rate Multiplier:</span> x{gameState.permanentBoosts.globalDropRateMultiplier.toFixed(2)}</div>
            </CardContent>
        </Card>

      </div>
    </GameLayout>
  );
}
