"use client";

import type { Resource } from '@/lib/types';
import * as LucideIcons from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ResourceDisplayProps {
  resource: Resource;
}

export function ResourceDisplay({ resource }: ResourceDisplayProps) {
  const IconComponent = resource.icon && LucideIcons[resource.icon as keyof typeof LucideIcons] 
    ? LucideIcons[resource.icon as keyof typeof LucideIcons] 
    : LucideIcons.Box; // Default icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
          <IconComponent className="h-5 w-5 text-primary" />
          <div className="flex flex-col text-sm">
            <span className="font-medium leading-none">{Math.floor(resource.amount).toLocaleString()}</span>
            <span className="text-xs text-muted-foreground leading-none">{resource.name}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{resource.name}</p>
        <p>Amount: {resource.amount.toFixed(2)}</p>
        <p>Per Second: {resource.perSecond.toFixed(2)}</p>
      </TooltipContent>
    </Tooltip>
  );
}
