import type { Resource } from '@/lib/types';

export const initialResources: Record<string, Resource> = {
  points: { id: 'points', name: 'Chrono Shards', amount: 0, perSecond: 0, icon: 'Sparkles' },
  resource1: { id: 'resource1', name: 'Resource 1', amount: 0, perSecond: 0, icon: 'Square' },
  resource2: { id: 'resource2', name: 'Resource 2', amount: 0, perSecond: 0, icon: 'Square' },
  resource3: { id: 'resource3', name: 'Resource 3', amount: 0, perSecond: 0, icon: 'Square' },
  resource4: { id: 'resource4', name: 'Resource 4', amount: 0, perSecond: 0, icon: 'Square' },
  resource5: { id: 'resource5', name: 'Resource 5', amount: 0, perSecond: 0, icon: 'Square' },
  resource6: { id: 'resource6', name: 'Resource 6', amount: 0, perSecond: 0, icon: 'Square' },
  resource7: { id: 'resource7', name: 'Resource 7', amount: 0, perSecond: 0, icon: 'Square' },
  resource8: { id: 'resource8', name: 'Resource 8', amount: 0, perSecond: 0, icon: 'Square' },
  resource9: { id: 'resource9', name: 'Resource 9', amount: 0, perSecond: 0, icon: 'Square' },
  resource10: { id: 'resource10', name: 'Resource 10', amount: 0, perSecond: 0, icon: 'Square' },
  resource11: { id: 'resource11', name: 'Resource 11', amount: 0, perSecond: 0, icon: 'Square' },
  resource12: { id: 'resource12', name: 'Resource 12', amount: 0, perSecond: 0, icon: 'Square' },
  // Add more specific resources if needed
  mana: { id: 'mana', name: 'Mana Orbs', amount: 0, perSecond: 0, icon: 'Droplet' },
  gold: { id: 'gold', name: 'Ancient Gold', amount: 0, perSecond: 0, icon: 'Coins' },
};
