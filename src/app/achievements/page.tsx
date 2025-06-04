"use client";

import { GameLayout } from '@/components/layout/GameLayout';
import { useGame } from '@/context/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { initialAchievements } from '@/config/achievements';
import * as LucideIcons from 'lucide-react';
import { Trophy, CheckCircle, Lock, Gift } from 'lucide-react';

export default function AchievementsPage() {
  const { gameState } = useGame();

  return (
    <GameLayout>
      <div className="container mx-auto py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <Trophy className="text-primary h-7 w-7" />
              Your Milestones
            </CardTitle>
            <CardDescription>Track your progress and celebrate your accomplishments.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-15rem)]"> {/* Adjust height */}
              <div className="space-y-4 p-1">
                {Object.values(initialAchievements).map((ach) => {
                  const isUnlocked = gameState.unlockedAchievements.includes(ach.id);
                  const Icon = ach.icon && LucideIcons[ach.icon as keyof typeof LucideIcons] 
                    ? LucideIcons[ach.icon as keyof typeof LucideIcons] 
                    : Gift;

                  return (
                    <Card key={ach.id} className={`transition-opacity ${isUnlocked ? 'opacity-100 border-green-500' : 'opacity-70 hover:opacity-100'}`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-lg font-medium flex items-center gap-2">
                           <Icon className={`h-5 w-5 ${isUnlocked ? 'text-green-500' : 'text-muted-foreground'}`} />
                           {ach.name}
                         </CardTitle>
                         {isUnlocked 
                           ? <CheckCircle className="h-5 w-5 text-green-500" /> 
                           : <Lock className="h-5 w-5 text-muted-foreground" />
                         }
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{ach.description}</p>
                        {isUnlocked && ach.reward && (
                          <div className="mt-2 text-xs space-y-1 border-t pt-2">
                            <p className="font-semibold">Rewards:</p>
                            {ach.reward.points && Object.entries(ach.reward.points).map(([resId, amount]) => (
                              <p key={resId}>+ {amount.toLocaleString()} {gameState.resources[resId]?.name || resId}</p>
                            ))}
                            {ach.reward.items && ach.reward.items.map(itemReward => (
                               <p key={itemReward.itemId}>+ {itemReward.quantity} x {initialItems[itemReward.itemId]?.name || itemReward.itemId}</p>
                            ))}
                            {ach.reward.permanentBoosts && (
                                <p>+ {ach.reward.permanentBoosts.value * 100}% to {ach.reward.permanentBoosts.stat.replace(/([A-Z])/g, ' $1')}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </GameLayout>
  );
}
