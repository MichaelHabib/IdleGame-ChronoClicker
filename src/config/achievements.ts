import type { Achievement, GameState } from '@/lib/types';

export const initialAchievements: Record<string, Achievement> = {
  firstClick: {
    id: 'firstClick',
    name: 'The Journey Begins',
    description: 'You made your first click!',
    icon: 'MousePointerClick',
    condition: (gameState: GameState) => gameState.totalClicks >= 1,
    reward: { points: { points: 10 } },
    unlocked: false,
  },
  firstGenerator: {
    id: 'firstGenerator',
    name: 'Resourceful',
    description: 'Purchase your first generator.',
    icon: 'Settings2',
    condition: (gameState: GameState) => Object.values(gameState.generators).some(g => g.quantity > 0),
    reward: { points: { points: 50 }, items: [{ itemId: 'minorPpsPotion', quantity: 1 }] },
    unlocked: false,
  },
  pointsMilestone1: {
    id: 'pointsMilestone1',
    name: 'Shard Collector',
    description: 'Accumulate 100 Chrono Shards.',
    icon: 'Coins',
    condition: (gameState: GameState) => gameState.resources['points']?.amount >= 100,
    reward: { 
      points: { points: 100 },
      permanentBoosts: { stat: 'globalPpsMultiplier', value: 0.01 } // 1% global PPS boost
    },
    unlocked: false,
  },
  // Add more achievements
};
