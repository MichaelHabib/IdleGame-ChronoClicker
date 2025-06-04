import type { Character } from '@/lib/types';

export const initialCharacters: Record<string, Character> = {
  chronomancer: {
    id: 'chronomancer',
    name: 'The Chronomancer',
    description: 'A master of time, subtly bending it to accelerate production.',
    icon: 'UserCircle',
    basePpsMultiplier: 1.1, // 10% PPS boost
    baseDropRateMultiplier: 1.05, // 5% drop rate boost
  },
  archivist: {
    id: 'archivist',
    name: 'The Archivist',
    description: 'Uncovers hidden knowledge, significantly boosting discovery rates.',
    icon: 'Library',
    basePpsMultiplier: 1.0,
    baseDropRateMultiplier: 1.2, // 20% drop rate boost
  },
};

export const defaultCharacterId = 'chronomancer';
