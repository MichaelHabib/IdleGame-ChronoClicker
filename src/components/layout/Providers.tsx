"use client";

import type { ReactNode } from 'react';
import { GameProvider } from '@/context/GameContext';
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <GameProvider>
        {children}
      </GameProvider>
    </TooltipProvider>
  );
}
