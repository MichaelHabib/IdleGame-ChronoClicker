"use client";

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface ClickerButtonProps {
  onClick: () => void;
  resourceName: string;
}

export function ClickerButton({ onClick, resourceName }: ClickerButtonProps) {
  return (
    <Button
      size="lg"
      className="w-full py-8 text-xl font-headline shadow-lg hover:shadow-xl transition-shadow duration-300 transform active:scale-95"
      onClick={onClick}
      aria-label={`Generate ${resourceName}`}
    >
      <Sparkles className="mr-2 h-6 w-6 animate-pulse" />
      Generate {resourceName}
    </Button>
  );
}
