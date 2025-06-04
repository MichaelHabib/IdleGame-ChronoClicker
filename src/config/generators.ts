import type { Generator } from '@/lib/types';

export const initialGenerators: Record<string, Generator> = {
  timeAnchor: {
    id: 'timeAnchor',
    name: 'Temporal Anchor',
    description: 'Stabilizes a small point in time, slowly generating Chrono Shards.',
    icon: 'Anchor',
    baseCost: 10,
    costResource: 'points',
    costScale: 1.15,
    basePps: 1,
    producesResource: 'points',
    quantity: 0,
    artifactIds: ['artifact_time_crystal'],
    artifactDropRateFormula: 'log(quantity +1) / 20', // e.g. 20 purchases ~ log(21)/20 ~ 3/20 = 15%
  },
  manaWell: {
    id: 'manaWell',
    name: 'Mana Wellspring',
    description: 'A mystical well that slowly bubbles forth Mana Orbs.',
    icon: 'Disc3',
    baseCost: 50,
    costResource: 'points',
    costScale: 1.20,
    basePps: 0.5, // Produces 0.5 Mana Orbs per second
    producesResource: 'mana',
    quantity: 0,
  },
  goldMine: {
    id: 'goldMine',
    name: 'Ancient Gold Mine',
    description: 'Extracts flecks of ancient gold from the earth.',
    icon: 'Pickaxe',
    baseCost: 200,
    costResource: 'mana', // Costs Mana to operate
    costScale: 1.25,
    basePps: 0.1,
    producesResource: 'gold',
    quantity: 0,
    artifactIds: ['artifact_gold_nugget'],
    artifactDropRateFormula: 'log(quantity + 1) / 30',
  },
  libraryScrolls: {
    id: 'libraryScrolls',
    name: 'Library of Scrolls',
    description: 'Generates Temporal Dust through ancient texts.',
    icon: 'ScrollText',
    baseCost: 50,
    costResource: 'points',
    costScale: 1.18,
    basePps: 2,
    producesResource: 'temporalDust', // Changed from resource1
    quantity: 0,
  },
};
