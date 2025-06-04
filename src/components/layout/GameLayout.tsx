"use client";

import type { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { ResourceBar } from '../game/ResourceBar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';


export function GameLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <ResourceBar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
