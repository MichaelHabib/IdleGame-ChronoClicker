// This file is machine-generated - edit with caution!
'use server';

/**
 * @fileOverview Orchestrates loot drops based on game state, using AI to determine drop timing.
 *
 * - `orchestrateLootDrop` - A function that determines whether to trigger a loot drop.
 * - `LootDropOrchestrationInput` - The input type for the orchestrateLootDrop function.
 * - `LootDropOrchestrationOutput` - The return type for the orchestrateLootDrop function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LootDropOrchestrationInputSchema = z.object({
  generatorTotalPurchases: z
    .record(z.number())
    .describe('A map of generator IDs to the total number of purchases for each generator.'),
  generatorTotalPurchasesString: z
    .string()
    .describe('A JSON string representation of generator total purchases.'),
  characterDropRateBoost: z
    .number()
    .describe('The drop rate boost provided by the current character.'),
  baseDropChance: z.number().describe('The base chance for an item drop.'),
});
export type LootDropOrchestrationInput = z.infer<typeof LootDropOrchestrationInputSchema>;

const LootDropOrchestrationOutputSchema = z.object({
  shouldDrop: z.boolean().describe('Whether a loot drop should be triggered.'),
  reason: z.string().describe('The AI reasoning behind the drop decision.'),
});
export type LootDropOrchestrationOutput = z.infer<typeof LootDropOrchestrationOutputSchema>;

export async function orchestrateLootDrop(
  input: Omit<LootDropOrchestrationInput, 'generatorTotalPurchasesString'>
): Promise<LootDropOrchestrationOutput> {
  const flowInput: LootDropOrchestrationInput = {
    ...input,
    generatorTotalPurchasesString: JSON.stringify(input.generatorTotalPurchases),
  };
  return orchestrateLootDropFlow(flowInput);
}

const orchestrateLootDropPrompt = ai.definePrompt({
  name: 'orchestrateLootDropPrompt',
  input: {schema: LootDropOrchestrationInputSchema},
  output: {schema: LootDropOrchestrationOutputSchema},
  prompt: `You are an AI game master orchestrating loot drops in a clicker game. 

  Given the current game state, including the total purchases for each generator, 
  the character's drop rate boost, and the base drop chance, determine whether to trigger a loot drop.

  Consider the following factors:
  - Player engagement: Trigger drops to keep the player engaged and rewarded.
  - Game balance: Avoid making drops too frequent or predictable.
  - Generator progress: Consider the total purchases for each generator to reward activity.
  - Character bonuses: Factor in the character's drop rate boost.

  Here is the current game state:
  - Generator Total Purchases: {{{generatorTotalPurchasesString}}}
  - Character Drop Rate Boost: {{{characterDropRateBoost}}}
  - Base Drop Chance: {{{baseDropChance}}}

  Based on these factors, decide whether to trigger a loot drop and explain your reasoning.

  Output your decision as a JSON object with 'shouldDrop' (true or false) and 'reason' (a short explanation).
  `,
});

const orchestrateLootDropFlow = ai.defineFlow(
  {
    name: 'orchestrateLootDropFlow',
    inputSchema: LootDropOrchestrationInputSchema,
    outputSchema: LootDropOrchestrationOutputSchema,
  },
  async (inputWithStr: LootDropOrchestrationInput) => {
    const {output} = await orchestrateLootDropPrompt(inputWithStr);
    return output!;
  }
);

