import type { Resource } from '@/lib/types';

export const initialResources: Record<string, Resource> = {
  points: { id: 'points', name: 'Chrono Shards', amount: 0, perSecond: 0, icon: 'Sparkles' },
  temporalDust: { id: 'temporalDust', name: 'Temporal Dust', amount: 0, perSecond: 0, icon: 'Wind' },
  etherealEssence: { id: 'etherealEssence', name: 'Ethereal Essence', amount: 0, perSecond: 0, icon: 'Feather' },
  cosmicFilaments: { id: 'cosmicFilaments', name: 'Cosmic Filaments', amount: 0, perSecond: 0, icon: 'Atom' },
  voidCrystals: { id: 'voidCrystals', name: 'Void Crystals', amount: 0, perSecond: 0, icon: 'Moon' },
  starlightShards: { id: 'starlightShards', name: 'Starlight Shards', amount: 0, perSecond: 0, icon: 'Star' },
  realityFibers: { id: 'realityFibers', name: 'Reality Fibers', amount: 0, perSecond: 0, icon: 'Spline' },
  dreamFragments: { id: 'dreamFragments', name: 'Dream Fragments', amount: 0, perSecond: 0, icon: 'Cloud' },
  memoryEchoes: { id: 'memoryEchoes', name: 'Memory Echoes', amount: 0, perSecond: 0, icon: 'AudioWaveform' },
  resource9: { id: 'resource9', name: 'Resource 9', amount: 0, perSecond: 0, icon: 'Square' },
  resource10: { id: 'resource10', name: 'Resource 10', amount: 0, perSecond: 0, icon: 'Square' },
  resource11: { id: 'resource11', name: 'Resource 11', amount: 0, perSecond: 0, icon: 'Square' },
  resource12: { id: 'resource12', name: 'Resource 12', amount: 0, perSecond: 0, icon: 'Square' },
  // Add more specific resources if needed
  mana: { id: 'mana', name: 'Mana Orbs', amount: 0, perSecond: 0, icon: 'Droplet' },
  gold: { id: 'gold', name: 'Ancient Gold', amount: 0, perSecond: 0, icon: 'Coins' },
};
